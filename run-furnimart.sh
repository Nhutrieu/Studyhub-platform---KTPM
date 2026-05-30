#!/bin/bash

# ========================================
# FurniMart - Docker Compose Run Script
# Chạy từng nhóm service theo thứ tự phụ thuộc
# ========================================

echo "==== Step 1: Start MongoDB ===="
docker-compose up -d mongodb
echo "Waiting 10s for MongoDB to be healthy..."
sleep 10

echo "==== Step 2: Start Auth & User Services ===="
docker-compose up -d auth-service user-service
echo "Waiting 10s..."
sleep 10

echo "==== Step 3: Start Product & Category Services ===="
docker-compose up -d product-service category-service
echo "Waiting 10s..."
sleep 10

echo "==== Step 4: Start Order, Shipping, Warehouse & Cart ===="
docker-compose up -d order-service shipping-service warehouse-service cart-service
echo "Waiting 10s..."
sleep 10

echo "==== Step 5: Start Payment & Wallet ===="
docker-compose up -d payment-service wallet-service
echo "Waiting 10s..."
sleep 10

echo "==== Step 6: Start Promotion Service ===="
docker-compose up -d promotion-service
echo "Waiting 10s..."
sleep 10

echo "==== Step 7: Start Review & Chat Services ===="
docker-compose up -d review-service chat-service
echo "Waiting 10s..."
sleep 10

echo "==== Step 8: Start Dashboard & Settings Services ===="
docker-compose up -d dashboard-service settings-service
echo "Waiting 10s..."
sleep 10

echo "==== Step 9: Start Upload Service ===="
docker-compose up -d upload-service
echo "Waiting 5s..."
sleep 5

echo "==== Step 10: Start Branch Service & API Gateway ===="
docker-compose up -d branch-service api-gateway
echo "Waiting 10s..."
sleep 10

echo "==== Step 11: Start Frontend ===="
docker-compose up -d frontend
echo "Waiting 5s..."
sleep 5

echo "==== All FurniMart services should be up! ===="
docker-compose ps
