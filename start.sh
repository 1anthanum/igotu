#!/bin/bash
# IGOTU 一键启动脚本 (macOS / Linux)
set -e

echo "🌿 IGOTU — I Got You"
echo "===================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ 需要安装 Node.js 20+: https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 版本过低 ($(node -v))，需要 18+"
  exit 1
fi

echo "✅ Node.js $(node -v)"

# Install root dependencies (concurrently)
if [ ! -d "node_modules" ]; then
  echo "📦 安装根目录依赖..."
  npm install --silent
fi

# Install backend dependencies
if [ ! -d "backend/node_modules" ]; then
  echo "📦 安装后端依赖..."
  cd backend && npm install && cd ..
fi

# Install frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
  echo "📦 安装前端依赖..."
  cd frontend && npm install && cd ..
fi

# Create .env if missing
if [ ! -f "backend/.env" ]; then
  echo "📝 创建默认 .env..."
  cp .env.example backend/.env
fi

# Ask about seed data
if [ ! -f "backend/igotu.db" ]; then
  echo ""
  echo "🌱 首次启动，是否填充测试数据？(y/N)"
  read -r SEED_ANSWER
  if [ "$SEED_ANSWER" = "y" ] || [ "$SEED_ANSWER" = "Y" ]; then
    echo "🌱 填充种子数据..."
    cd backend && npx ts-node src/scripts/seed.ts && cd ..
  fi
fi

echo ""
echo "🚀 启动中..."
echo "   后端: http://localhost:3000/api/health"
echo "   前端: http://localhost:5173"
echo ""

# Start both servers
npx concurrently -n "API,WEB" -c "blue,green" \
  "cd backend && npm run dev" \
  "cd frontend && npm run dev"
