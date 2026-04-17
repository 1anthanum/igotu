@echo off
REM IGOTU 一键启动脚本 (Windows)
echo 🌿 IGOTU — I Got You
echo ====================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ 需要安装 Node.js 20+: https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js detected

REM Install root dependencies
if not exist "node_modules" (
    echo 📦 安装根目录依赖...
    call npm install --silent
)

REM Install backend dependencies
if not exist "backend\node_modules" (
    echo 📦 安装后端依赖...
    cd backend && call npm install && cd ..
)

REM Install frontend dependencies
if not exist "frontend\node_modules" (
    echo 📦 安装前端依赖...
    cd frontend && call npm install && cd ..
)

REM Create .env if missing
if not exist "backend\.env" (
    echo 📝 创建默认 .env...
    copy .env.example backend\.env
)

echo.
echo 🚀 启动中...
echo    后端: http://localhost:3000/api/health
echo    前端: http://localhost:5173
echo.

npx concurrently -n "API,WEB" -c "blue,green" "cd backend && npm run dev" "cd frontend && npm run dev"
