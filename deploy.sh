#!/bin/bash
set -e

# Configuration
REGION="us-east-1"
ECR_REPO="653306034344.dkr.ecr.us-east-1.amazonaws.com/motogt-frontend"
API_URL="https://api.motogt.com"

echo "🔐 Authenticating with ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin 653306034344.dkr.ecr.$REGION.amazonaws.com

echo "🏗️  Building Docker image with API URL..."
docker build --build-arg VITE_API_BASE_URL=$API_URL -t motogt-frontend .

echo "🏷️  Tagging image..."
docker tag motogt-frontend:latest $ECR_REPO:latest

echo "📤 Pushing to ECR..."
docker push $ECR_REPO:latest

echo "✅ Deployment complete!"
echo ""
echo "⚠️  IMPORTANT: Ensure AWS App Runner has this environment variable set:"
echo "   VITE_API_BASE_URL=$API_URL"
