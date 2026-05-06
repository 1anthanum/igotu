# IGOTU Frontend — 项目上下文

> 心理健康陪伴 app，Vue 3 + TypeScript + Pinia + Tailwind CSS
> 视觉基底：生物光（Bioluminescence）— 深墨绿 + 情绪响应式配色

## 快速定位

| 你要做什么 | 先读哪个文档 |
|---|---|
| 改视觉/动画/配色/响应式 | `docs/DESIGN-SYSTEM.md` |
| 改架构/加页面/加 store | `docs/ARCHITECTURE.md` |
| 写代码/命名/模式选择 | `docs/CONVENTIONS.md` |
| 理解产品方向/三层交互模型 | `docs/PRODUCT-VISION.md` |

## 核心概念（30 秒理解）

1. **情绪分数 1-5** 驱动全局主题：每个分数对应一套调色板，通过 CSS 变量实时切换
2. **低能量模式**（mood ≤ 2）：自动简化 UI，禁用复杂动画，进入 Sanctuary 陪伴模式
3. **localStorage 是情绪数据源**：`igotu_mood_log` 存储所有情绪记录，多个组件共享读取
4. **i18n 双语**：所有用户可见文字走 `@/i18n`，中文优先，英文对照

## 技术栈

- **框架**: Vue 3.5 (Composition API + `<script setup>`)
- **状态**: Pinia (5 stores: auth, chat, mood, achievements, analytics)
- **路由**: Vue Router 4 (depth-based transitions)
- **样式**: Tailwind 3 + 自定义 CSS 变量系统 (`src/styles/main.css`)
- **主题**: `useMoodThemeStore` (Pinia) — 情绪 → 调色板 → CSS 变量 → DOM
- **测试**: Vitest + Vue Test Utils (单元) / Playwright (E2E)

## 目录结构

```
src/
├── api/            # 后端 API 封装 (axios)
├── components/     # 按领域分组的 Vue 组件 (15 个子目录)
├── composables/    # 可复用逻辑 (8 个 use* hooks)
├── i18n/           # 国际化 (zh.ts / en.ts)
├── router/         # 路由配置 (depth 用于转场方向)
├── stores/         # Pinia stores (5 个)
├── styles/         # main.css — 全局样式 + 主题变量
├── types/          # TypeScript 类型定义
├── views/          # 页面级组件 (8 个)
├── __tests__/      # Vitest 单元测试
├── App.vue         # 根组件（背景层 + 路由出口）
└── main.ts         # 入口
e2e/                # Playwright E2E 测试
```

## 关键文件速查

| 文件 | 职责 | 改动影响范围 |
|---|---|---|
| `styles/main.css` | 全局样式、CSS 变量、动画、响应式断点 | 全局 |
| `composables/useMoodTheme.ts` | 情绪 → 主题映射、调色板、低能量模式、个性化渐变 | 全局 |
| `App.vue` | 根容器宽度 (`app-container`)、背景层、路由转场 | 全局 |
| `components/layout/AppHeader.vue` | 导航栏、响应式 icon/text 切换 | 全局 |
| `i18n/zh.ts` + `en.ts` | 所有用户可见文字 | 全局 |
| `router/index.ts` | 路由定义、depth、auth 守卫 | 全局 |

## 修改清单（每次改动后更新）

改动任何功能后，检查以下项是否需要同步：

- [ ] `main.css` — 新动画是否需要 `body.low-energy` 和 `prefers-reduced-motion` 覆盖？
- [ ] `i18n/zh.ts` + `en.ts` — 新增用户可见文字是否已添加双语键？
- [ ] 相关 `__tests__/` — 是否有对应测试覆盖新逻辑？
- [ ] `docs/DESIGN-SYSTEM.md` — 新视觉元素是否已记录？
- [ ] `docs/ARCHITECTURE.md` — 新组件/store/composable 是否已登记？
