FROM node:22-alpine AS builder

WORKDIR /app

# Configure npm for better network handling
RUN npm config set fetch-timeout 300000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Setup upload-service
WORKDIR /app
COPY services/upload-service/package*.json ./
RUN (npm ci --no-audit --no-fund 2>/dev/null) || npm install --no-audit --no-fund

# Copy upload-service source
COPY services/upload-service ./

# Build upload-service
RUN npm run build

FROM node:22-alpine

WORKDIR /app

# Configure npm for better network handling
RUN npm config set fetch-timeout 300000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Copy package files
COPY services/upload-service/package*.json ./

# Install production dependencies
RUN (npm ci --omit=dev --no-audit --no-fund 2>/dev/null) || npm install --omit=dev --no-audit --no-fund

# Copy built application
COPY --from=builder /app/dist ./dist

EXPOSE 3012

CMD ["node", "dist/main.js"]
