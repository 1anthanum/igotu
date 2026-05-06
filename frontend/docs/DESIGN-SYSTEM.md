# IGOTU 设计系统

## 视觉基底

**生物光（Bioluminescence）**：深墨绿背景中透出柔和自然光。所有视觉决策以"黑暗中的微光"为比喻根基。

## 情绪色彩映射

| Score | 隐喻 | Accent | GradientFrom | GradientTo | Glow Intensity |
|---|---|---|---|---|---|
| 1 | 深夜的萤火虫 | `#8b5cf6` 紫罗兰 | `#2e1065` | `#1a0a3e` | 0.3 |
| 2 | 黎明前的微光 | `#6366f1` 靛蓝 | `#1e1b4b` | `#0f0d2e` | 0.5 |
| 3 | 安静的苔藓 | `#14b8a6` 青绿 | `#0a2e28` | `#061a17` | 0.6 |
| 4 | 新叶舒展 | `#10b981` 翠绿 | `#052e16` | `#021a0d` | 0.8 |
| 5 | 阳光穿过树冠 | `#f59e0b` 暖琥珀 | `#451a03` | `#2a1001` | 1.0 |

**规则**：永远不要硬编码这些颜色。使用 CSS 变量 `var(--mood-accent)` 等。

## CSS 变量全表

主题变量（由 `useMoodThemeStore.applyToDOM()` 注入 `:root`）：

```
--mood-accent          主强调色
--mood-accent-soft     深底强调
--mood-glow            微发光底色
--mood-gradient-from   渐变起始
--mood-gradient-to     渐变终止
--mood-chart           图表主色
--mood-hover-bg        悬浮背景
--mood-nav-active      导航激活背景
--mood-nav-active-text 导航激活文字
--mood-light-line      装饰线
--mood-comfort-glow    温暖包裹光（低情绪）
--glow-intensity       光效强度倍率 (0-1)
--animation-speed      动画速度倍率
--mood-font-weight     正文字重
--mood-line-height     行高
--mood-letter-spacing  字距
--personal-gradient    个性化渐变 CSS (7天混合)
--personal-gradient-from / to / mid  个性化渐变分量
```

静态系统色（`:root` 中定义，不随情绪变化）：

```
--bg-primary           #060f0d    最深背景
--bg-secondary         #0a1a16   次级背景
--bg-card              rgba(10,25,20,0.6)  卡片背景
--bg-card-hover        rgba(16,35,28,0.7)  卡片悬浮
--border-subtle        rgba(100,220,180,0.06)  微弱边框
--border-medium        rgba(100,220,180,0.12)  中等边框
--text-primary         #d0e8dc   正文
--text-secondary       #6aa88e   次要文字
--text-muted           #3a7a64   弱化文字
```

## 响应式断点

主容器 `.app-container` 的宽度阶梯：

| 视口宽度 | max-width | 说明 |
|---|---|---|
| < 1024px | 720px | 窄窗口 |
| ≥ 1024px | 960px | 标准桌面 |
| ≥ 1280px | 1100px | 宽屏 |
| ≥ 1536px | 1280px | 超宽屏 |

导航栏行为：
- < 1024px：只显示 emoji icon
- ≥ 1024px：显示文字标签

卡片间距：
- < 900px：`padding: 1rem`，`border-radius: 1rem`
- 默认：`padding: 1.5rem`，`border-radius: 1.25rem`
- ≥ 1280px：`padding: 1.75rem`

## 动画系统

### 弹性缓动
全局使用 `cubic-bezier(0.34, 1.56, 0.64, 1)`（spring easing），用于：
- 按钮/卡片 hover 弹起
- 导航指示器 scaleX
- 输入框聚焦线展开
- 成就卡片 seed-pop

### 动画清单

| 动画名 | 用途 | 时长 |
|---|---|---|
| `card-light-breathe` | 卡片顶部光线呼吸 | 5s infinite |
| `text-shimmer-sweep` | AI 消息文字光泽 | 2s once, delay 0.6s |
| `seed-pop` | 成就卡片弹出 | 0.5s once |
| `seed-ring-expand` | 成就光环扩散 | 0.6s once |
| `poetic-pulse` | 诗意卡片脉冲 | 2s infinite |
| `bio-breathe` | 在线状态呼吸点 | 2s infinite |
| `float-in` | 通用入场上浮 | 0.5s once |
| `pulse-glow` | 脉冲发光 | 2s infinite |
| `glow-pulse` | SoundScape 外层光晕 | 4s infinite |
| `wave-dance` | SoundScape 波形条 | 1.2s infinite |
| `icon-float` | SoundScape 播放中 icon 浮动 | 3s infinite |
| `layer1-expand` | Layer 1 工具展开过渡 | 0.6s / 0.3s once |
| `card-enter` | NextDayCheckIn 卡片入场 | 0.5s once |
| `checkin-overlay` | NextDayCheckIn 遮罩淡入 | 0.4s once |
| `response-fade` | NextDayCheckIn 回应文字淡入 | 0.6s once |
| `animate-float-in` | DevelopmentReport 卡片依次入场 | 0.5s once (staggered) |

### 低能量模式

`body.low-energy` 时，以下效果 **必须** 禁用：
- 卡片光线呼吸 (`card-light-breathe`)
- 输入聚焦线过渡
- 文字光泽
- 粒子/渐变背景
- SoundScape glow-pulse（降低到 duration: 3s → 无）
- BreathingMinimal 粒子和 glow（隐藏）
- NextDayCheckIn card-enter 和 overlay 动画
- DevelopmentReport animate-float-in 入场动画
- 所有非必要动画

### prefers-reduced-motion

`@media (prefers-reduced-motion: reduce)` 时，以下效果 **必须** 禁用：
- 所有 `animation`
- 所有 `transition`（通过 `!important`）
- 入场动画（直接 opacity:1, transform:none）

**新增动画时必须同时添加这两个覆盖。**

## MoodCurveChart 视觉规范

双轨情绪曲线组件，用于 DevelopmentReportView。

**主轨**：Catmull-Rom 平滑曲线连接情绪数据点，曲线下方半透明渐变填充。数据点颜色跟随情绪分数（1→紫罗兰, 5→琥珀）。

**副轨**：危机时刻以垂直半透明琥珀色带标注，底部有圆点标记。

**辅助标记**：当日最低情绪 ≤ 2 时，用紫色空心菱形标注。

**交互**：Hover 数据点显示时间 + 分数 tooltip，含竖向参考线。

**导出**：SVG → Canvas → PNG（2x 分辨率），含标题、日期范围、底部水印。背景色 `#060f0d`。

**低能量模式**：`body.low-energy` 时禁用曲线 drop-shadow。

**prefers-reduced-motion**：禁用 data-dot hover transition。

## 排版

自适应排版随情绪变化：

| 情绪 | font-weight | line-height | letter-spacing |
|---|---|---|---|
| 1 (低落) | 300 (轻) | 1.9 (宽松) | 0.02em |
| 2 (不太好) | 300 | 1.8 | 0.015em |
| 3 (一般) | 400 (正常) | 1.7 | 0 |
| 4 (还不错) | 400 | 1.65 | -0.005em |
| 5 (很好) | 500 (中粗) | 1.6 (紧凑) | -0.01em |

设计意图：低情绪时文字更轻更松散，减少视觉压力。

## 组件视觉规范

### 卡片 `.card`
- 半透明背景 `var(--bg-card)` + `backdrop-filter: blur(12px)`
- 顶部 2px 装饰线（光呼吸动画）
- Hover: 上浮 2px + 增强阴影 + 边框变亮
- 噪点纹理（SVG fractalNoise，opacity 0.03-0.04）

### 聊天气泡
- 用户：右侧，mood 悬浮背景色
- AI：左侧，卡片背景 + 微弱边框
- 最大宽度：`min(80%, 640px)`
- AI 气泡入场后 0.6s 播放文字光泽

### 导航指示器
- 底部 2px 发光线，`scaleX(0→1)` 动画
- 颜色跟随 `--mood-accent`

### 输入框聚焦
- 底部发光线从 0 扩展到 60% 宽度
- 使用 `.input-focus-wrapper:focus-within` 检测

## 新增视觉元素检查清单

1. 使用 CSS 变量，不硬编码颜色
2. 添加 `body.low-energy` 覆盖
3. 添加 `prefers-reduced-motion` 覆盖
4. 在此文档登记新动画
5. 确认在 800px 和 1400px 宽度下表现正常
