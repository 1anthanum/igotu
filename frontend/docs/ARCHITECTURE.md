# IGOTU 前端架构

## 数据流

```
用户操作 → Vue 组件 → Pinia Store → API 层 → 后端
                ↓
            Composable (useMoodTheme, useMoodCheckIn ...)
                ↓
            CSS 变量 (--mood-accent, --mood-glow ...)
                ↓
            全局视觉响应
```

## 页面路由 & 层级

| 路由 | 页面 | depth | 说明 |
|---|---|---|---|
| `/` | HomePage | 0 | 主页（低能量→Sanctuary / 正常→引导+工具+记录）|
| `/chat` | ChatView | 1 | AI 对话（session 管理 + GrowthTree） |
| `/toolbox` | ToolboxView | 1 | 工具箱入口 |
| `/toolbox/breathing` | BreathingExercise | 2 | 呼吸练习 |
| `/toolbox/grounding` | GroundingExercise | 2 | 接地练习 |
| `/toolbox/cognitive` | CognitiveRestructuring | 2 | 认知重构 |
| `/toolbox/phq9` | PHQ9Assessment | 2 | PHQ-9 量表 |
| `/toolbox/crisis-prep` | CrisisPrep | 2 | 危机预案 |
| `/crisis/soundscape` | CrisisSoundscapeView | 2 | Layer 1 声景通道（独立全屏） |
| `/crisis/breathing` | CrisisBreathingView | 2 | Layer 1 简化呼吸（独立全屏） |
| `/report` | DevelopmentReportView | 1 | Layer 3 发展摘要（情绪趋势/工具使用/危机概览）|
| `/mood` | MoodView | 1 | 情绪记录（MoodPicker + EmotionCircumplex）|
| `/analytics` | AnalyticsView | 1 | 数据分析（趋势/热力图/分类/散点）|
| `/therapy` | TherapyBridge | 1 | 治疗师桥接 |
| `/settings` | SettingsView | 1 | 设置 |
| `/login` | LoginView | 0 | 登录/注册 |
| `/demo` | DemoLanding | 0 | Demo 着陆页 |

`depth` 决定转场方向：高→低 = slide-back, 低→高 = slide-forward, 同级 = cross-fade。

## Pinia Stores

| Store | 文件 | 职责 |
|---|---|---|
| `auth` | `stores/auth.ts` | 登录状态、token、demo 模式 |
| `chat` | `stores/chat.ts` | 会话管理、消息列表、发送/加载 |
| `mood` | `stores/mood.ts` | 情绪记录的 CRUD |
| `achievements` | `stores/achievements.ts` | 今日打卡、模板、日历数据 |
| `analytics` | `stores/analytics.ts` | 鼓励语、月度统计、模式洞察 |

## Composables

| Composable | 文件 | 职责 | 被谁使用 |
|---|---|---|---|
| `useMoodThemeStore` | `composables/useMoodTheme.ts` | 情绪→主题映射，CSS 变量注入，个性化渐变 | 全局 |
| `useMoodCheckIn` | `composables/useMoodCheckIn.ts` | 每日签到弹窗逻辑 | App.vue, HomePage |
| `useMoodInsights` | `composables/useMoodInsights.ts` | 情绪洞察卡片数据 | HomePage |
| `useSessionTree` | `composables/useSessionTree.ts` | 对话 session → 树形结构 | GrowthTree |
| `useOpeningPreference` | `composables/useOpeningPreference.ts` | 开场白偏好 | ChatView |
| `useOnboarding` | `composables/useOnboarding.ts` | 新手引导步骤 | WelcomeModal |
| `useExerciseTracker` | `composables/useExerciseTracker.ts` | 练习完成追踪 | 工具箱组件 |
| `useCrisisTracker` | `composables/useCrisisTracker.ts` | 危机时刻标记、次日跟进检测、危机统计 | SanctuaryView, NextDayCheckIn, useDevelopmentReport |
| `useDevelopmentReport` | `composables/useDevelopmentReport.ts` | 聚合情绪/工具/危机数据，生成发展摘要 | DevelopmentReportView |
| `useTherapyBridge` | `composables/useTherapyBridge.ts` | 治疗师桥接状态 | TherapyBridge |

## 组件目录

| 目录 | 组件数 | 领域 |
|---|---|---|
| `achievements/` | 3 | 打卡卡片、模板选择器、快速记录 |
| `analytics/` | 2 | 周报摘要、模式洞察 |
| `chat/` | 2 | 聊天消息气泡、选项按钮 |
| `demo/` | 1 | Demo 模式横幅 |
| `effects/` | 3 | 粒子背景、渐变网格、庆祝烟花 |
| `encouragement/` | 1 | 鼓励语卡片 |
| `layout/` | 1 | 顶部导航栏 |
| `mood/` | 9 | 情绪选择器、历史、洞察、签到、脉搏、引导、周报 |
| `onboarding/` | 2 | 欢迎弹窗、引导提示 |
| `crisis/` | 2 | Layer 1 感官工具（SoundScape、BreathingMinimal） |
| `report/` | 1 | 双轨情绪曲线图表（MoodCurveChart，SVG + PNG 导出） |
| `sanctuary/` | 1 | 低能量模式全屏陪伴（整合 crisis/ 组件） |
| `therapy/` | 1 | 治疗师桥接 |
| `toolbox/` | 6 | 呼吸/接地/认知/PHQ9/危机预案 |
| `tree/` | 4 | 成长树可视化 |
| `visualization/` | 5 | 趋势图/热力图/分类/散点/日时间线 |

## localStorage 数据键

| 键名 | 格式 | 使用者 |
|---|---|---|
| `igotu_mood_log` | `[{score, valence, arousal, timestamp}]` | MoodPicker, WeeklyDigest, DayTimeline, InsightCards, 个性化渐变 |
| `igotu_last_mood` | `"1"-"5"` | useMoodTheme (init 时恢复) |
| `igotu_locale` | `"zh" \| "en"` | i18n |
| `igotu_auth_token` | JWT string | auth store |
| `igotu_onboarding_*` | 各种标志位 | onboarding 系统 |
| `igotu_opening_pref` | 开场白偏好 | useOpeningPreference |
| `igotu_crisis_markers` | `CrisisMarker[]`（90天保留，max 200） | useCrisisTracker |
| `igotu_exercise_records` | `ExerciseRecord[]` | useExerciseTracker |

## 新增功能检查清单

添加新组件时，确认：

1. 是否需要注册路由？→ `router/index.ts`，设置正确的 `depth`
2. 是否有用户可见文字？→ `i18n/zh.ts` + `en.ts`
3. 是否有动画？→ 添加 `body.low-energy` 和 `prefers-reduced-motion` 覆盖
4. 是否读写 localStorage？→ 登记到上表
5. 是否需要测试？→ `__tests__/` 添加对应文件
