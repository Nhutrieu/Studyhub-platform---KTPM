#!/usr/bin/env node
/**
 * Generate TypeScript types from OpenAPI spec
 * Fetches the spec from the running API Gateway and generates types
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API_URL = process.env.API_URL || 'http://localhost:3001';
const apiUrl = new URL(API_URL);
const OUTPUT_DIR = path.join(__dirname, '..', 'frontend', 'lib', 'api', 'generated');
const SPEC_FILE = path.join(OUTPUT_DIR, 'openapi-spec.json');
const TYPES_FILE = path.join(OUTPUT_DIR, 'api-types.ts');

console.log('🔄 Fetching OpenAPI specification from API Gateway...');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

//  Fetch OpenAPI JSON from API Gateway
const client = apiUrl.protocol === 'https:' ? https : http;
const specUrl = new URL('/api-json', apiUrl);

client.get(specUrl, (res) => {
    let data = '';
    const { statusCode } = res;

    if (statusCode && statusCode >= 400) {
        console.error(`❌ Error fetching OpenAPI spec: ${statusCode} ${res.statusMessage}`);
        res.resume();
        process.exit(1);
    }

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            // Save spec to file
            fs.writeFileSync(SPEC_FILE, data);
            console.log(`✅ OpenAPI spec saved to ${SPEC_FILE}`);

            // Generate TypeScript types
            console.log('🔄 Generating TypeScript types...');
            execSync(
                `npx openapi-typescript "${SPEC_FILE}" --output "${TYPES_FILE}"`,
                { stdio: 'inherit' }
            );

            console.log(`✅ TypeScript types generated at ${TYPES_FILE}`);
            console.log('✨ Type generation complete!');
        } catch (error) {
            console.error('❌ Error generating types:', error.message);
            process.exit(1);
        }
    });
}).on('error', (error) => {
    console.error('❌ Error fetching OpenAPI spec:', error.message);
    console.error('Make sure the API Gateway is running at', API_URL);
    process.exit(1);
});
