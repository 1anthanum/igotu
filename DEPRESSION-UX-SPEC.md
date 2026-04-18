# IGOTU — 抑郁患者体验设计规范 v3

## 核心洞察

抑郁症的三个关键症状直接影响用户与界面的交互方式：

1. **启动困难（Activation Barrier）**：不是"不想做"，而是"无法启动"。每一次点击都像搬一块石头。
2. **认知迟缓（Cognitive Fog）**：阅读理解下降，决策能力减弱，信息过载极易触发逃避。
3. **情绪钝化（Emotional Blunting）**：对刺激反应减弱，太强烈的视觉效果会制造不匹配的压力。

---

## 设计原则

### P1. 一触即达（One-Tap Rule）
> 最重要的操作必须在 **1 次点击** 内可以启动。

- 首页呼吸练习：点击即进入沉浸模式（默认最简单的 4-6 技巧）
- 情绪记录：点击光谱条即完成记录
- AI 对话：点击选项按钮即开始（不需要打字）

### P2. 自适应密度（Adaptive Density）
> 界面在低情绪时 **自动简化**，减少选择、放大触摸目标、缩短文字。

情绪 1-2（低能量模式）：
- 导航：只显示图标，不显示文字
- 首页：只显示 2 个快捷工具（呼吸 + 聊聊）
- 工具箱：置顶推荐最简单的工具
- 按钮：增大 touch target 至 48px+
- 文字：缩短到最核心的一句话

情绪 3-5（正常模式）：
- 显示完整界面

### P3. 温柔缓冲（Gentle Buffering）
> 所有反馈都像轻拍肩膀，不像拍手叫好。

- ✅ "种子已种下" — 安静确认
- ✅ "你来了就很好" — 无条件接纳
- ❌ "太棒了！继续加油！" — 制造压力
- ❌ "连续第 3 天！" — 暗示中断是失败

### P4. 随时可走（Safe Exit Everywhere）
> 每个流程在每一步都有 **不带愧疚** 的退出方式。

- "稍后再说" 替代 "取消"
- "先到这里" 替代 "停止"
- 退出不弹确认框，进度自动保存
- 安全退出按钮始终可见，且不用鲜艳颜色

### P5. 舒适包裹（Comfort Wrapping）
> 低情绪时，界面像毛毯一样包裹用户。

- 情绪 1-2：屏幕边缘出现极微弱的暖光（comfort glow）
- 动画速度降低 40%（更缓慢，更安静）
- 色温微偏暖（紫色基底加一丝粉调）
- 对比度降低（文字不那么刺眼）

---

## 自适应 UI 系统

### 触发条件
```
currentMood <= 2  →  低能量模式（lowEnergy = true）
currentMood >= 3  →  正常模式
```

### CSS 变量扩展
```css
:root {
  /* 新增 */
  --animation-speed: 1;         /* 低能量时 0.6 */
  --touch-target-min: 44px;     /* 低能量时 52px */
  --text-density: normal;       /* 低能量时 reduced */
  --comfort-glow: none;         /* 低能量时 微暖光晕 */
}
```

### 组件级适应

| 组件 | 正常模式 | 低能量模式 |
|------|---------|-----------|
| AppHeader | 图标 + 文字导航 | 只显示图标 + 活跃页面显示文字 |
| HomePage 快捷工具 | 3 个（呼吸、聊聊、记录感受） | 2 个（呼吸、聊聊）+ 温柔问候 |
| BreathingExercise | 选择技巧 → 调循环 → 开始 | **一键开始**（默认 4-6，3循环） |
| PHQ9 问题 | 完整文字描述 | 加入 emoji 辅助标记 |
| ToolboxView | 4 个工具并列 | 置顶推荐 + "什么都不想做也可以" |
| 鼓励文案 | 正常语气 | 更短、更温柔 |

---

## 具体改动清单

### 1. useMoodTheme.ts 扩展
- 新增 `isLowEnergy` 计算属性（mood ≤ 2）
- 新增 `animationSpeed` 计算属性（mood 1→0.5, mood 2→0.7, 其他→1）
- 新增 `comfortGlow` CSS 变量（低情绪时的暖光）
- 新增 `touchTargetMin` CSS 变量
- `applyToDOM()` 中设置 body class `low-energy`

### 2. main.css 新增
- `.low-energy` 全局 class：
  - 所有 animation-duration 乘以 `var(--animation-speed)`
  - `.btn-primary`, `.btn-secondary` 最小高度 52px
  - `.card` padding 增大
- `@media (prefers-reduced-motion)` 支持
- `.comfort-glow` 效果：底部/边缘微暖光
- `.safe-exit-hint` 安全退出提示样式

### 3. AppHeader.vue
- 低能量模式：导航只显示 emoji 图标
- 添加导航项图标（🏠 💭 🧰 🌿 📊 ⚙️）

### 4. HomePage.vue
- 低能量模式：quick tools 从 3 个减为 2 个
- 添加情绪感知问候（低情绪时："你来了就好" 替代 "你今天还好吗？"）
- 添加 comfort glow 边框

### 5. BreathingExercise.vue
- 添加"快速开始"按钮（跳过配置，直接进沉浸模式）
- 低能量模式下默认显示快速开始为主要操作
- 安全退出文案改为 "先到这里"

### 6. PHQ9Assessment.vue
- 每个问题前加 emoji 视觉锚点
- 每一步都显示 "稍后再说 →" 安全退出
- 低能量模式下选项间距增大

### 7. GroundingExercise.vue
- textarea 改为可选（添加 "跳过文字" 按钮）
- 点击 emoji 也可以推进到下一步

### 8. ChatView.vue
- 添加快速回复建议（3 个温和的 tag 按钮）
- 输入框占位符随情绪变化

### 9. ToolboxView.vue
- 低能量模式：顶部显示 "什么都不想做？也可以只是待着"
- 智能推荐：低情绪优先推荐呼吸（最低门槛）

---

## 视觉效果改动

### Comfort Glow（舒适光晕）
低情绪时（mood 1-2），在页面底部和边缘添加极微弱的暖色光：
```css
.comfort-glow::after {
  content: '';
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: 200px;
  background: radial-gradient(ellipse at bottom, rgba(139,92,246,0.03), transparent);
  pointer-events: none;
  z-index: 0;
}
```

### 动画减速
低情绪时所有动画时长乘以 1.6：
```css
.low-energy .animate-float-in { animation-duration: 0.8s; }
.low-energy .page-enter-active,
.low-energy .page-leave-active { transition-duration: 0.4s; }
```

### 对比度柔化
低情绪时文字亮度微降：
```css
.low-energy {
  --text-primary: #bdd4c8;  /* 从 #d0e8dc 降低 */
  --text-secondary: #5e9a80; /* 从 #6aa88e 降低 */
}
```

---

## 不做什么

- ❌ 弹窗确认退出（"确定要离开吗？"）
- ❌ 红色警告色用于日常操作
- ❌ 任何形式的"连续天数"展示
- ❌ 强制完成才能保存进度
- ❌ 低情绪时显示分析/对比数据
- ❌ 使用 "!" 感叹号的鼓励语
