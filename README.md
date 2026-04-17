---
title: IGOTU
emoji: 🌿
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# 🌿 IGOTU — I Got You | 一站式抑郁应对平台

为抑郁症患者设计的综合应对平台。记录微成就、AI 对话陪伴、情绪追踪、认知行为疗法工具、呼吸引导——你需要的一切都在这里。

## 设计理念

- **超低门槛**：一键操作，低能量时也能使用
- **永不内疚**：没有"打卡中断"提示，只有正向回顾
- **专业温暖**：基于 CBT 和临床工具，但语言始终温柔
- **隐私优先**：数据只属于你

## 核心功能

| 模块 | 功能 | 来源 |
|------|------|------|
| 首页 | 微成就记录 + 热力图 + 鼓励语 | MicroWins |
| 对话 | AI 陪伴对话（Claude API） | Inner Voice |
| 工具箱 | PHQ-9 / 呼吸引导 / 扎根练习 / 认知重构 | Inner Voice |
| 情绪 | 情绪记录 + 趋势图 | 合并 |
| 分析 | 综合数据分析 + 模式洞察 | MicroWins |

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + Vite + TypeScript + Tailwind CSS + Pinia + Chart.js |
| 后端 | Node.js + Express + TypeScript |
| AI | Anthropic Claude API（通过后端代理） |
| 数据库 | SQLite（文件数据库，零配置） |
| 部署 | Docker / Hugging Face Spaces |

## 快速启动

### 方式一：Hugging Face Spaces

1. Fork 此 Space
2. 在 Space Settings → Secrets 中设置环境变量：
   - `JWT_SECRET`：自定义随机字符串
   - `ANTHROPIC_API_KEY`：（可选）启用 AI 对话功能
3. Space 会自动构建部署

> SQLite 数据库存储在 HF Spaces 的 `/data` 持久卷中，重启不会丢失数据。

### 方式二：Docker（本地）

```bash
cp .env.example .env
# 编辑 .env：设置 JWT_SECRET，可选添加 ANTHROPIC_API_KEY
docker-compose up -d
```

访问 http://localhost

### 方式三：本地开发

**前置条件**：Node.js 20+

```bash
# 1. 启动后端
cd backend
npm install
cp .env.example .env   # 编辑配置
npm run dev

# 2. 启动前端（新终端）
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

> 无需安装数据库！SQLite 会在首次启动时自动创建 `igotu.db` 文件。

## API 端点

### 原有（微成就）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册 |
| POST | /api/auth/login | 登录 |
| POST | /api/achievements | 记录成就 |
| GET | /api/achievements/today | 今日成就 |
| GET | /api/achievements/calendar | 热力图数据 |
| GET | /api/analytics/weekly | 周报 |
| GET | /api/encouragement/current | 鼓励语 |

### 新增（IGOTU 模块）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/chat/sessions | 创建对话 |
| POST | /api/chat/sessions/:id/messages | 发送消息 |
| POST | /api/mood | 记录情绪 |
| GET | /api/mood/trend | 情绪趋势 |
| POST | /api/phq9 | 提交 PHQ-9 |
| GET | /api/phq9 | PHQ-9 历史 |
| POST | /api/exercises | 记录练习 |
| POST | /api/cognitive | 保存认知重构 |

## 项目结构

```
igotu/
├── backend/
│   ├── src/
│   │   ├── config/       # 数据库、JWT、环境变量
│   │   ├── middleware/    # 认证、错误处理
│   │   ├── routes/        # API 路由
│   │   ├── services/      # 业务逻辑
│   │   ├── utils/         # 系统提示词、常量、日期工具
│   │   └── migrations/    # SQL 迁移
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── views/         # 页面
│   │   ├── components/    # UI 组件
│   │   ├── stores/        # Pinia 状态管理
│   │   ├── api/           # API 调用层
│   │   └── router/        # Vue Router
│   └── Dockerfile
│
├── Dockerfile             # 统一部署 Dockerfile（HF Spaces）
└── docker-compose.yml     # 本地 Docker 部署
```

## 安全提醒

- AI 对话功能不替代专业医疗
- PHQ-9 是筛查工具，不是诊断
- 如需紧急帮助：全国心理援助热线 400-161-9995
