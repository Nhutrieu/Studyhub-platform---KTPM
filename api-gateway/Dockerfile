FROM node:22-alpine AS builder

WORKDIR /app

# Configure npm for better network handling
RUN npm config set fetch-timeout 300000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Setup api-gateway
WORKDIR /app
COPY api-gateway/package*.json ./
RUN (npm ci --no-audit --no-fund 2>/dev/null) || npm install --no-audit --no-fund

# Copy api-gateway source
COPY api-gateway ./

# Build api-gateway
RUN npm run build

FROM node:22-alpine

WORKDIR /app

# Configure npm for better network handling
RUN npm config set fetch-timeout 300000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Copy package files
COPY api-gateway/package*.json ./

# Install production dependencies
RUN for i in 1 2 3 4 5; do \
      npm ci --omit=dev --no-audit --no-fund && break || \
      (echo "Attempt $i failed, retrying in 10 seconds..." && sleep 10); \
    done


# Copy built application
COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/main.js"]
