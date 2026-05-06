# IGOTU Claude Code Prompt 参考

> 记录可复用的 Claude Code prompt 模板，用于代码重构和批量操作。
> 使用方式：在 Claude Code 终端中直接粘贴 ``` 内的 prompt。

---

## 1. i18n 模块化拆分

### 背景

`src/i18n/zh.ts` 和 `en.ts` 各约 870 行，含 30+ 个顶层命名空间。随着功能增加会继续膨胀。拆分目标是"按页面/领域找到对应文件"——新增功能时只改一个模块文件即可。

### Prompt

```
任务：将 IGOTU 前端的 i18n 从单文件拆分为按领域组织的模块化结构。

=== 当前状态 ===

src/i18n/
├── index.ts   # 主入口，有 useI18n() composable、locale 管理、t() 函数
│              # 关键行：import { zh } from './zh'; import { en } from './en';
│              # 关键行：const messages: Record<Locale, Record<string, any>> = { zh, en };
├── zh.ts      # export const zh = { common: {...}, nav: {...}, ... } — 约 870 行
└── en.ts      # export const en = { ... } — 镜像结构

index.ts 中的 useI18n、t()、resolve()、setLocale() 逻辑不需要改动，
只需要让 zh 和 en 对象从模块合并而来。

=== 目标结构 ===

src/i18n/
├── index.ts          # 不改动 useI18n 逻辑，只修改 import 来源
├── locales/
│   ├── zh/
│   │   ├── index.ts      # 导入所有模块，用 spread 合并，导出 zh
│   │   ├── common.ts     # { common, nav }
│   │   ├── auth.ts       # { login, demo, demoBanner, onboarding }
│   │   ├── home.ts       # { home, sanctuary, moodPoetic, guidance }
│   │   ├── chat.ts       # { chat }
│   │   ├── toolbox.ts    # { toolbox, breathing, grounding, cognitive, crisisPrep, crisisResult, phq9 }
│   │   ├── mood.ts       # { moodCheckIn, circumplex, pulse, emotion, moodPicker, moodHistory, moodThreshold }
│   │   ├── crisis.ts     # { nextDayCheckIn, report (含 moodCurve 子对象) }
│   │   ├── analytics.ts  # { analytics, analyticsSections, weeklyDigest, dayTimeline, insights, visualization }
│   │   └── settings.ts   # { settings, achievements, growthTree, therapy }
│   └── en/
│       └── (完全镜像 zh/ 的文件和键结构)

=== 模块文件格式 ===

每个模块文件用 `export default { ... }` 导出一个扁平的部分对象。
键名必须与原 zh.ts/en.ts 中的顶层键名完全一致。
示例 (zh/common.ts)：

```ts
export default {
  common: {
    back: '返回',
    // ...
  },
  nav: {
    home: '首页',
    // ...
  },
};
```

=== zh/index.ts 合并方式 ===

使用 object spread 合并（因为所有模块的顶层键互不重叠，不需要 deepMerge）：

```ts
import common from './common';
import auth from './auth';
// ... 其他模块
export const zh = { ...common, ...auth, /* ... */ };
```

=== 主 index.ts 修改 ===

只改两行 import：
- import { zh } from './zh';        → import { zh } from './locales/zh';
- import { en } from './en';        → import { en } from './locales/en';

其余逻辑（useI18n、t()、resolve()）完全不动。

=== 硬性约束 ===

1. 不修改 src/i18n/index.ts 中 useI18n / t / resolve / setLocale 的任何逻辑
2. 不修改任何 .vue 组件文件——这是纯 i18n 层的重构
3. 不改变任何翻译键名——所有 t('xxx.yyy') 调用无需修改
4. zh/ 和 en/ 的文件名和模块划分必须完全一致
5. 不引入任何第三方库
6. 拆分完成后删除根目录的 zh.ts 和 en.ts

=== 验证步骤 ===

1. grep -r "from.*i18n/zh" src/ 和 grep -r "from.*i18n/en" src/ — 确认没有组件直接引用旧路径
   （只有 index.ts 引用，已更新为 locales/ 路径）
2. npx vue-tsc --noEmit — 确认类型无错误
3. 对比新旧：确认 zh 对象的顶层键数量与原文件一致（当前约 33 个顶层键）
```

### 关于 deepMerge 的决策说明

原版 prompt 使用了 deepMerge 工具函数。这是**不必要的复杂度**。原因：zh.ts 中的 30+ 个顶层键（`common`, `nav`, `chat`, `report` 等）互不重叠——每个模块文件拥有独占的顶层键集合。因此 object spread (`{ ...a, ...b }`) 足够。deepMerge 只有在同一个顶层键被多个模块文件分别贡献时才需要，而我们的拆分方案避免了这种情况。

如果未来某个模块过大（比如 `mood.ts` 超过 200 行），可以进一步拆分为 `mood-checkin.ts` 和 `mood-display.ts`，但仍然各自拥有独立的顶层键，不需要 deepMerge。

---

## 2. localStorage schema versioning（待用）

### 背景

localStorage 中存储的数据结构（CrisisMarker、mood_log 等）未来会演变。需要加入 schema version 以支持数据迁移。

### Prompt

```
任务：为 IGOTU 前端的 localStorage 数据添加 schema version 机制。

涉及的 localStorage key 和对应 composable：
- igotu_crisis_markers → src/composables/useCrisisTracker.ts
- igotu_mood_log → （由 stores/mood.ts 或 MoodPicker 写入，需要先确认）
- igotu_exercise_records → src/composables/useExerciseTracker.ts

要求：
1. 创建 src/utils/storageSchema.ts，提供通用的版本化读写函数：
   - `readVersioned<T>(key: string, currentVersion: number, migrations: Migration[]): T[]`
   - `writeVersioned<T>(key: string, data: T[], version: number): void`
   - Migration 类型：`{ fromVersion: number, toVersion: number, migrate: (data: any[]) => any[] }`
2. 存储格式变为 `{ _version: number, data: T[] }`
3. 读取时如果发现 _version < currentVersion，按 migrations 链逐步升级
4. 读取时如果没有 _version 字段（旧数据），视为 version 0，从 v0 → v1 开始迁移
5. 重构 useCrisisTracker 和 useExerciseTracker 使用新的读写函数
6. 为 CrisisMarker 定义 v1 schema（当前结构），确保旧数据（无 _version）能无损升级
7. 不修改任何组件文件——这是纯数据层的重构
```

---
