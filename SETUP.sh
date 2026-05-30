#!/bin/bash

# FurniMart - Quick Start Script
# Automatically sets up and runs the complete FurniMart stack

set -e

echo "🚀 FurniMart - Quick Start"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Node.js version
echo -e "${BLUE}✓ Checking Node.js version...${NC}"
NODE_VERSION=$(node -v)
echo "  Node version: $NODE_VERSION"
NPM_VERSION=$(npm -v)
echo "  NPM version: $NPM_VERSION"
echo ""

# Check Docker (optional)
if command -v docker &> /dev/null; then
    echo -e "${BLUE}✓ Docker found${NC}"
    DOCKER_VERSION=$(docker --version)
    echo "  $DOCKER_VERSION"
else
    echo -e "${YELLOW}⚠ Docker not found (optional)${NC}"
fi
echo ""

# Setup function
setup_service() {
    local service=$1
    local port=$2
    
    echo -e "${BLUE}Setting up $service...${NC}"
    
    if [ ! -d "$service" ]; then
        echo -e "${RED}✗ Directory $service not found!${NC}"
        return 1
    fi
    
    cd "$service"
    
    if [ ! -d "node_modules" ]; then
        echo "  📦 Installing dependencies..."
        npm install --legacy-peer-deps 2>&1 | grep -E "^(added|up to|audit|npm).*$" || true
    else
        echo "  ✓ Dependencies already installed"
    fi
    
    if [ -f ".env.example" ] && [ ! -f ".env.local" ]; then
        echo "  📝 Creating .env.local from .env.example"
        cp .env.example .env.local
    fi
    
    cd ..
    echo -e "${GREEN}✓ $service ready (port $port)${NC}"
    echo ""
}

# Main setup
echo -e "${YELLOW}Starting FurniMart Setup${NC}"
echo ""

# Backend setup
echo "=== Backend Setup ==="
setup_service "api-gateway" "3001"

# Services setup (optional)
if [ -d "services/auth-service" ]; then
    echo "=== Microservices Setup ==="
    for service_dir in services/*/; do
        if [ -d "$service_dir" ]; then
            service_name=$(basename "$service_dir")
            echo -e "${BLUE}Setting up $service_name...${NC}"
            cd "$service_dir"
            if [ ! -d "node_modules" ]; then
                npm install --legacy-peer-deps 2>&1 | grep -E "^(added|up to|audit|npm).*$" || true
            fi
            cd ../../
        fi
    done
    echo ""
fi

# Frontend setup
echo "=== Frontend Setup ==="
setup_service "frontend" "3000"

# Database setup (if MongoDB is needed)
if command -v docker &> /dev/null; then
    echo "=== Database Setup ==="
    echo -e "${BLUE}Checking MongoDB...${NC}"
    if docker ps -a --format '{{.Names}}' | grep -q "furnimart-mongo"; then
        echo "✓ MongoDB container exists"
    else
        echo "  Creating MongoDB container..."
        docker run -d \
            --name furnimart-mongo \
            -p 27017:27017 \
            -v furnimart_db:/data/db \
            mongo:7.0
        echo "  ✓ MongoDB container created"
    fi
    echo ""
fi

# Summary
echo "=== Setup Complete ==="
echo ""
echo -e "${GREEN}✓ All services ready!${NC}"
echo ""
echo "📚 Documentation:"
echo "  - Frontend Status: FRONTEND_COMPLETE.md"
echo "  - Deployment: DEPLOYMENT_GUIDE.md"
echo "  - Frontend Architecture: FRONTEND_ARCHITECTURE.md"
echo ""
echo "🚀 Start Development:"
echo ""
echo "  Terminal 1 - API Gateway:"
echo "    cd api-gateway && npm run dev"
echo ""
echo "  Terminal 2 - Frontend:"
echo "    cd frontend && npm run dev"
echo ""
echo "  Then open: http://localhost:3000"
echo ""
echo "Or use Docker Compose:"
echo "  docker-compose up -d"
echo ""
echo -e "${GREEN}Happy coding! 🎉${NC}"
