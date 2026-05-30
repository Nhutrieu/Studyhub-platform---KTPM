const fs = require('fs');
const path = require('path');

const services = [
  'auth-service',
  'user-service',
  'product-service',
  'order-service',
  'cart-service',
  'payment-service',
  'shipping-service',
  'warehouse-service',
  'review-service',
  'promotion-service',
  'branch-service',
  'chat-service',
  'dispute-service',
  'settings-service',
  'dashboard-service',
  'upload-service',
  'category-service',
  'wallet-service',
];

const sharedFiles = {
  'config/rbac-matrix.ts': 'common/config/rbac-matrix.ts',
  'common/decorators/user.decorator.ts': 'common/decorators/user.decorator.ts',
  'common/decorators/roles.decorator.ts': 'common/decorators/roles.decorator.ts',
  'common/guards/jwt-auth.guard.ts': 'common/guards/jwt-auth.guard.ts',
  'common/guards/roles.guard.ts': 'common/guards/roles.guard.ts',
  'common/exceptions/http-exception.filter.ts': 'common/exceptions/http-exception.filter.ts',
  'common/interceptors/response.interceptor.ts': 'common/interceptors/response.interceptor.ts',
  'common/strategies/jwt.strategy.ts': 'common/strategies/jwt.strategy.ts',
  'common/auth/auth.module.ts': 'common/auth/auth.module.ts',
};

const sharedBasePath = path.join(__dirname, '..', 'shared');
const servicesBasePath = path.join(__dirname, '..', 'services');

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  console.log(`✓ Copied: ${path.relative(process.cwd(), dest)}`);
}

function updateImports(filePath, serviceName) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace @shared imports with relative imports
  const importReplacements = [
    {
      pattern: /from ['"]@shared\/common\/decorators\/user\.decorator['"]/g,
      replacement: "from '../common/decorators/user.decorator'",
    },
    {
      pattern: /from ['"]@shared\/common\/decorators\/roles\.decorator['"]/g,
      replacement: "from '../common/decorators/roles.decorator'",
    },
    {
      pattern: /from ['"]@shared\/common\/guards\/jwt-auth\.guard['"]/g,
      replacement: "from '../common/guards/jwt-auth.guard'",
    },
    {
      pattern: /from ['"]@shared\/common\/guards\/roles\.guard['"]/g,
      replacement: "from '../common/guards/roles.guard'",
    },
    {
      pattern: /from ['"]@shared\/common\/exceptions\/http-exception\.filter['"]/g,
      replacement: "from '../common/exceptions/http-exception.filter'",
    },
    {
      pattern: /from ['"]@shared\/common\/interceptors\/response\.interceptor['"]/g,
      replacement: "from '../common/interceptors/response.interceptor'",
    },
    {
      pattern: /from ['"]@shared\/common\/strategies\/jwt\.strategy['"]/g,
      replacement: "from '../common/strategies/jwt.strategy'",
    },
    {
      pattern: /from ['"]@shared\/common\/auth\/auth\.module['"]/g,
      replacement: "from '../common/auth/auth.module'",
    },
    {
      pattern: /from ['"]@shared\/common\/base\/base\.service['"]/g,
      replacement: "from '../common/base/base.service'",
    },
    {
      pattern: /from ['"]@shared\/config\/rbac-matrix['"]/g,
      replacement: "from '../common/config/rbac-matrix'",
    },
    // For main.ts files (one level up)
    {
      pattern: /from ['"]@shared\/common\/exceptions\/http-exception\.filter['"]/g,
      replacement: "from './common/exceptions/http-exception.filter'",
      context: 'main.ts',
    },
    {
      pattern: /from ['"]@shared\/common\/interceptors\/response\.interceptor['"]/g,
      replacement: "from './common/interceptors/response.interceptor'",
      context: 'main.ts',
    },
  ];

  for (const replacement of importReplacements) {
    if (replacement.context && !filePath.endsWith(replacement.context)) {
      continue;
    }
    if (replacement.pattern.test(content)) {
      content = content.replace(replacement.pattern, replacement.replacement);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Updated imports in: ${path.relative(process.cwd(), filePath)}`);
  }
}

function updateTsConfig(servicePath) {
  const tsconfigPath = path.join(servicePath, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) return;

  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  
  if (tsconfig.compilerOptions?.paths?.['@shared/*']) {
    delete tsconfig.compilerOptions.paths['@shared/*'];
    // Keep other paths if exist
    if (Object.keys(tsconfig.compilerOptions.paths).length === 0) {
      delete tsconfig.compilerOptions.paths;
    }
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf8');
    console.log(`  ✓ Updated tsconfig.json`);
  }
}

function updateDockerfile(servicePath, serviceName) {
  const dockerfilePath = path.join(servicePath, 'Dockerfile');
  if (!fs.existsSync(dockerfilePath)) return;

  let content = fs.readFileSync(dockerfilePath, 'utf8');
  let modified = false;

  // Remove shared package build steps
  const linesToRemove = [
    /# Copy shared package files[\s\S]*?COPY shared\/types \.\/shared\/types/,
    /# Install shared dependencies and build[\s\S]*?RUN npm run build/,
    /# Pack shared package[\s\S]*?RUN mv furnimart-shared-.*\.tgz \.\.\/shared\.tgz/,
    /# Install packed shared package[\s\S]*?RUN npm install \.\/shared\.tgz --no-save/,
    /# Copy shared dist to match tsconfig[\s\S]*?RUN mkdir -p \/shared && cp -r \/app\/shared\/dist \/shared\/dist/,
    /# Copy and install shared package[\s\S]*?RUN npm install \.\/shared\.tgz --no-save/,
    /# Create symlink for shared dist[\s\S]*?RUN mkdir -p \/shared && ln -s \/app\/node_modules\/@furnimart\/shared\/dist \/shared\/dist/,
  ];

  for (const pattern of linesToRemove) {
    if (pattern.test(content)) {
      content = content.replace(pattern, '');
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(dockerfilePath, content, 'utf8');
    console.log(`  ✓ Updated Dockerfile`);
  }
}

function processService(serviceName) {
  console.log(`\n📦 Processing ${serviceName}...`);
  const servicePath = path.join(servicesBasePath, serviceName);
  const srcPath = path.join(servicePath, 'src');

  if (!fs.existsSync(servicePath)) {
    console.log(`  ⚠️  Service not found: ${serviceName}`);
    return;
  }

  // Copy shared files
  for (const [sharedFile, destFile] of Object.entries(sharedFiles)) {
    const src = path.join(sharedBasePath, sharedFile);
    const dest = path.join(srcPath, destFile);
    
    if (fs.existsSync(src)) {
      copyFile(src, dest);
    } else {
      console.log(`  ⚠️  Source file not found: ${sharedFile}`);
    }
  }

  // Update imports in all TypeScript files
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory() && file !== 'node_modules' && file !== 'dist') {
        walkDir(filePath);
      } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        updateImports(filePath, serviceName);
      }
    }
  }

  if (fs.existsSync(srcPath)) {
    walkDir(srcPath);
  }

  // Update tsconfig.json
  updateTsConfig(servicePath);

  // Update Dockerfile
  updateDockerfile(servicePath, serviceName);

  console.log(`✅ Completed ${serviceName}`);
}

// Main execution
console.log('🚀 Starting to copy shared code to services...\n');

for (const service of services) {
  processService(service);
}

console.log('\n✨ All services processed!');
console.log('\n📝 Next steps:');
console.log('1. Review the changes');
console.log('2. Test build each service: cd services/<service> && npm run build');
console.log('3. Test Docker build: docker build -t <service> services/<service>');


