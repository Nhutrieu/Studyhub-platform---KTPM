FROM node:22-alpine AS builder

WORKDIR /app

# Configure npm for better network handling
RUN npm config set fetch-timeout 300000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000







# Setup dispute-service
WORKDIR /app
COPY services/dispute-service/package*.json ./
RUN (npm ci --no-audit --no-fund 2>/dev/null) || npm install --no-audit --no-fund



# Copy dispute-service source
COPY services/dispute-service ./



# Build dispute-service
RUN npm run build

FROM node:22-alpine

WORKDIR /app

# Configure npm for better network handling
RUN npm config set fetch-timeout 300000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Copy package files
COPY services/dispute-service/package*.json ./

# Install production dependencies
RUN (npm ci --omit=dev --no-audit --no-fund 2>/dev/null) || npm install --omit=dev --no-audit --no-fund





# Copy built application
COPY --from=builder /app/dist ./dist

EXPOSE 3010

CMD ["node", "dist/main.js"]
