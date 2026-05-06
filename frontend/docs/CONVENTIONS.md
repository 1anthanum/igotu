# IGOTU 编码约定

## Vue 组件

### 文件结构
```vue
<script setup lang="ts">
// 1. Vue 核心导入
// 2. Store / Composable 导入
// 3. 子组件导入
// 4. Props / Emits 定义
// 5. 响应式状态
// 6. Computed
// 7. 方法
// 8. 生命周期钩子
</script>

<template>
  <!-- 单根元素 -->
</template>

<style scoped>
/* 组件私有样式 */
</style>
```

### 命名
- 组件文件：`PascalCase.vue`（如 `MoodPicker.vue`）
- Composable：`useCamelCase.ts`（如 `useMoodTheme.ts`）
- Store：`camelCase.ts`（如 `achievements.ts`），defineStore id 同名
- 测试文件：`camelCase.test.ts`，放在 `__tests__/`

### Props
- 使用 `defineProps<{...}>()` 泛型语法
- 可选 props 带 `?` 后缀

### Emits
- 使用 `defineEmits<{...}>()` 泛型语法
- 事件名 camelCase（如 `selectChoice`）

## 样式

### 优先级
1. Tailwind utility class（简单布局/间距）
2. `:style` 绑定（动态主题色，如 `var(--mood-accent)`）
3. `<style scoped>`（组件动画/伪元素）
4. `main.css`（全局共享样式、CSS 变量）

### CSS 变量使用
```css
/* ✅ 正确 */
color: var(--text-primary);
background: var(--mood-accent);

/* ❌ 错误 */
color: #d0e8dc;
background: #14b8a6;
```

### 动画
- 缓动函数统一使用 `cubic-bezier(0.34, 1.56, 0.64, 1)`
- 每个动画必须有 `body.low-energy` 禁用规则
- 每个动画必须有 `prefers-reduced-motion` 禁用规则
- 时长超过 2s 的循环动画考虑性能影响

## 状态管理

### Pinia Store 模式
```ts
export const useXxxStore = defineStore('xxx', () => {
  // ref → state
  // computed → getters
  // function → actions
  return { /* 只暴露需要的 */ };
});
```

### localStorage 约定
- 键名前缀 `igotu_`
- 读取时 try-catch 包裹（防 JSON.parse 失败）
- 类型断言后做范围校验

## i18n

### 添加新文字
1. 在 `zh.ts` 中添加键值
2. 在 `en.ts` 中添加对应翻译
3. 组件中使用 `const { t } = useI18n()`

### 键名规则
```
{领域}.{功能}.{具体}
```
示例：`weeklyDigest.title`、`chat.botName`、`home.toolChat`

### 数组型内容
诗意文案等随机内容使用数组：
```ts
moodPoetic: {
  1: ['深夜里，你点亮了一盏灯', '萤火虫正在为你闪烁', ...],
}
```

## 测试

### 单元测试 (Vitest)
- 每个 composable / store 至少一个测试文件
- 新增视觉组件测试渲染、props、关键交互
- Mock 外部依赖（API、router、其他 store）
- 测试 localStorage 交互时先 `localStorage.clear()`

### E2E 测试 (Playwright)
- 放在 `e2e/` 目录
- 测试关键用户路径（导航、聊天、情绪记录）
- 3 种视口：默认 1280、窄 800、宽 1536
- Demo 模式绕过登录

### 测试文件命名
```
__tests__/moodTheme.test.ts      # composable 测试
__tests__/chatMessage.test.ts    # 组件测试
e2e/navigation.spec.ts           # E2E 测试
```

## Git 提交

### 消息格式
```
<type>(<scope>): <description>

feat(mood): 添加情绪诗意过渡
fix(chat): 修复会话重命名溢出
style(theme): 调整低能量模式动画
docs: 更新设计系统文档
test(chat): 补充消息渲染测试
```

## 性能注意事项

- `computed` 优先于 `watch`（惰性求值）
- 大列表使用 `v-for` + `:key`，避免 index 作为 key
- SVG 动画用 CSS 而非 JS（GPU 加速）
- `backdrop-filter: blur()` 有性能开销，低能量模式考虑移除
- localStorage 读写是同步操作，避免在渲染循环中频繁调用
