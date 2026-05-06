# CLAUDE.md — AI 协作守则

> 本文件是 IGOTU 项目对所有 AI 编码助手（Claude、Copilot、Cursor 等）的行为约束。
> **每次让 AI 修改本仓库代码前，请把本文件作为前置上下文喂给它。**
> 本文件与 [CLINICAL_INVARIANTS.md](./CLINICAL_INVARIANTS.md) 配套使用，后者列出具体的不可变区域。
>
> 文件结构：
> - **Part I — 通用纪律**（§1–§7）：项目性质、风险分级、五条硬规则、检查表、提交规范——所有任务都适用。
> - **Part II — 分区协议**（§8–§15）：按代码区域给出具体的修改协议——你打开一个文件后，先找到它属于哪个区，再读对应的协议。
> - **Part III — 安全网**（§16–§19）：停下的触发条件、永远不做的事、与文件本身的关系。

---

# Part I — 通用纪律

## 1. 项目性质（你必须先理解的事）

IGOTU 是一个**抑郁应对平台**，真实用户是处于不同程度心理困扰中的人，部分用户可能正处于急性危机状态。
本项目的代码不只是软件，它是**临床干预内容的承载体**。

这意味着：
- 一个 UI bug = 用户体验问题（可接受）
- 一个临床内容 bug = 用户安全问题（不可接受）

**任何降低临床内容可靠性的修改，都比"不改"更糟糕。** 当你犹豫时，默认选择不改并询问人类。

---

## 2. 技术栈（仅供定位，不是讨论焦点）

- 前端：Vue 3 + TypeScript + Pinia + Vue Router + Tailwind + Vite + i18n（zh/en）
- 后端：Express + TypeScript + better-sqlite3 + Zod + JWT
- AI：`@anthropic-ai/sdk`，含离线规则回退（`OfflineChat.ts`）
- 测试：Vitest（前后端），Playwright（前端 E2E，已安装但未充分使用）
- 部署：Docker + docker-compose

---

## 3. 风险分级（贯穿全文的术语）

| 风险等级 | 区域示例 | AI 可否独立修改 |
|---------|---------|---------------|
| **A — 临床敏感** | OfflineChat 规则、PHQ-9、危机文案、呼吸/grounding 参数 | ❌ 必须人工临床审查 |
| **B — 契约层** | types/、migrations/、API 路由签名、zod schema | ⚠️ 需要列出影响并获得用户书面确认 |
| **C — 状态/逻辑层** | stores/、services/、composables/、middlewares/ | ⚠️ 必须附带测试 |
| **D — 视觉/可调层** | 组件样式、i18n 文案、主题、ambient 效果 | ✅ 可独立修改，但需说明原因 |

**默认假设你拿到的任务属于 B 类**。除非任务明确属于 D 类，否则不要默认自由发挥。

每个分区协议（§8–§15）都会标明该区的主导风险等级以及可能的"等级升级"情形。

---

## 4. AI 协作的五条硬规则

### 规则一：临床内容只读

下列内容你**只能阅读和分析，不能修改**，除非用户在当前对话中明确说"我已咨询临床顾问，现在授权你修改 X"：

- `backend/src/services/OfflineChat.ts` 中的 `RULES` 数组（关键词、优先级、回应文本、热线号码）
- `backend/src/utils/constants.ts` 中的 `ENCOURAGEMENT` 对象
- 任何与 PHQ-9 题目、计分、severity 分级相关的代码或 SQL CHECK 约束
- 呼吸练习的节律参数（如 4-7-8）、grounding 练习的步骤数（如 5-4-3-2-1）
- 危机相关组件中的提示文案（`CrisisPrep.vue`、`CrisisBreathingView.vue`、`CrisisSoundscapeView.vue`、`BreathingMinimal.vue`）

完整清单见 [CLINICAL_INVARIANTS.md](./CLINICAL_INVARIANTS.md)，分区协议 §8 也会复述这些边界。

如果用户要求你修改上述任一处，**先停下来引用 CLINICAL_INVARIANTS.md 的对应条款，并要求用户书面确认临床审查已完成**。

### 规则二：边界跨越必须显式

当你的修改横跨多个目录或多个层（前端 ↔ 后端 ↔ 数据库），先列出影响范围再动手。
特别警惕这些跨层操作：

- 修改 `frontend/src/types/` 时必须检查 `backend/src/routes/` 是否对应
- 修改数据库迁移时必须创建新的迁移文件，**绝不修改已存在的 `001_*.sql`、`002_*.sql`**
- 修改 `frontend/src/api/` 中的请求结构时必须确认 `backend` 路由的 zod schema

跨层操作的具体规范见 §9（契约层）。

### 规则三：不变量先于实现

下列约束是项目的不变量，无论代码怎么演变都不能违反：

- `mood_score` ∈ [1, 5]（数据库 CHECK 约束）
- `energy_level` ∈ [1, 5]
- `phq9.score` ∈ [0, 27]
- `cognitive_records.intensity_before/after` ∈ [1, 10]
- `chat_messages.role` ∈ {'user', 'assistant'}
- `exercise_logs.type` ∈ {'breathing', 'grounding'}
- `achievements.category` 必须来自 `CATEGORIES` 枚举
- 用户身份认证：所有 `requiresAuth: true` 的路由必须经过 JWT 验证
- Demo 模式只能访问 `DEMO_ALLOWED_ROUTES` 中列出的路由

修改任何代码前，先在本对话中复述与之相关的不变量，再开始改。

### 规则四：先定位分区，再开始修改

打开任何文件后，**第一步永远是定位它在 §8–§15 的哪个分区**。然后阅读该分区的协议（关键约束、必备前提、必备测试、反模式）。这一步不是可选的——它是规则三的延伸。

如果你判断该文件不在任何已列出的分区，请向用户提问，不要自行扩张分区范围。

### 规则五：上下文不足时拒绝执行

如果你修改一个文件时，没有读过它的：
- 直接调用方
- 直接被调用方
- 相关测试
- 相关类型定义

**那么你的上下文不够，应该停下来要更多信息，而不是猜测着改。**

新手 AI 协作最常见的失败模式是"看似合理地猜测"。猜测带来的回归 bug 比报错带来的成本高一个量级。

---

## 5. 修改前的强制自检清单

每次开始修改前，在你的回应中明确回答以下问题（可以简短，但不能省略）：

1. 这次修改属于哪个分区（§8–§15）？主导风险等级是 A/B/C/D 中的哪一个？
2. 这次修改会触动 [CLINICAL_INVARIANTS.md](./CLINICAL_INVARIANTS.md) 中的任何条目吗？
3. 这次修改横跨了哪些层（前端/后端/数据库/类型/路由/状态）？
4. 这次修改可能破坏哪些既有不变量（见规则三）？
5. 是否需要新增或修改测试？依据是哪个分区的"必备测试"项？

如果第 2 题答"是"，**立即停止，等待用户书面授权**。
如果第 1 题答 A 或 B 但用户没有提供足够上下文，请向用户索取，不要自行假设。

---

## 6. 修改后的强制自检清单

提交修改前，在你的回应中回答：

1. 我修改了哪些文件？每个文件的改动是什么意图？所属分区是什么？
2. 我新增/修改了哪些测试？如果没新增，为什么（对照所属分区的"必备测试"项）？
3. 我对其他文件产生了什么副作用？哪些消费方需要同步更新？
4. 是否需要数据库迁移？是否需要 i18n 同步（zh + en）？
5. 这次修改可以被一行 git revert 安全回滚吗？如果不能，列出依赖。

---

## 7. 提交规范

- 提交信息使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：
  `feat:` / `fix:` / `refactor:` / `test:` / `docs:` / `chore:` / `clinical:`
- **`clinical:` 前缀专门用于临床内容（A 类）变更**，必须在 commit body 中引用临床审查记录（如 issue 编号或临床顾问签字日期）
- 一个 commit 只做一件事
- 跨包/跨层的改动应拆成多个 commit，按依赖顺序提交
- commit body 中可注明所属分区，例如 `Zone: §10 后端服务层`

---

# Part II — 分区协议

> 这一部分是本文件的核心。每个分区独立成节，结构统一为：**范围 → 主导风险 → 关键约束 → 修改前提 → 必备测试 → 反模式 → 何时升级**。
> 你可以把它当作"打开文件后第一时间检索的目录"。

## 8. 分区一：临床内容区（A 区）

### 范围
- `backend/src/services/OfflineChat.ts`（整个 `RULES` 数组、热线号码、关键词与优先级）
- `backend/src/utils/constants.ts` 中的 `ENCOURAGEMENT` 对象
- `backend/src/routes/phq9.ts` 中与计分、severity 映射相关的逻辑
- `frontend/src/components/toolbox/PHQ9Assessment.vue`
- `frontend/src/components/toolbox/BreathingExercise.vue`、`GroundingExercise.vue`
- `frontend/src/components/toolbox/CognitiveRestructuring.vue`
- `frontend/src/components/crisis/` 下所有组件
- `frontend/src/views/CrisisPrep.vue`、`CrisisBreathingView.vue`、`CrisisSoundscapeView.vue`

### 主导风险
A（临床敏感）。除非另有说明，假设此区任何变更都是 A 级。

### 关键约束
1. **量表与参数完全锁定**（A1 级，详见 [CLINICAL_INVARIANTS.md §2](./CLINICAL_INVARIANTS.md)）：
   - PHQ-9：9 题、0–3 分制、0–27 总分、五段 severity 阈值（5/10/15/20）
   - 4-7-8 呼吸：吸 4 / 停 7 / 呼 8
   - 5-4-3-2-1 grounding：5 视觉 / 4 听觉 / 3 触觉 / 2 嗅觉 / 1 味觉
2. **危机热线硬编码、可复制粘贴**：
   - 不得移入 `.env` 或 JSON 配置
   - 不得改成图标、按钮文本或图片
   - 任何 priority ≥ 90 的规则，回应文本必须至少出现一个热线号码
3. **关键词只可加不可减**：自伤 priority 100、被动意念 priority 90，阈值不可降低
4. **零内疚原则**（详见 [CLINICAL_INVARIANTS.md §3.1](./CLINICAL_INVARIANTS.md)）：
   - 不假设用户"应该"达到某种节奏
   - 0 记录情况必须有正向回应（不可空、不可批评）
   - 不使用"加油""坚持""超棒"等词
5. **CBT 流程顺序锁定**：识别想法 → 情绪 → 扭曲 → 支持证据 → 反证 → 平衡想法 → 重新评估强度。`intensity_before/after` 必须分别采集

### 修改前提
进入本区做任何**写**操作之前，必须在对话中具备以下三项之一：
- (a) 用户引用 [CLINICAL_INVARIANTS.md](./CLINICAL_INVARIANTS.md) 中具体条款，并写明"我已咨询临床顾问，授权修改 X"
- (b) 修改是 A1 条款明确允许的"扩张"——例如增加自伤识别关键词（不删除、不重排）
- (c) 修改限于**外壳**而非临床参数本身——例如 BreathingExercise 的 UI 配色、计时器视觉，但不动 4-7-8 比例

不满足以上三项之一，**只读不写**，并向用户引用对应条款。

### 必备测试
- 修改 `OfflineChat.ts`：必须有断言"自伤关键词命中后，回应文本包含 `400-161-9995`"的回归测试
- 修改 PHQ-9 计分：必须有覆盖 5/10/15/20 边界的 severity 测试
- 修改 ENCOURAGEMENT：必须有断言 0 记录回应非空且不含黑名单词（"加油"等）的测试
- 修改 CBT 步骤：必须有 E2E 或组件测试覆盖 `intensity_before/after` 的采集

### 反模式（永远不要做）
- ❌ 把热线提取为配置项："let HOTLINE = process.env.CRISIS_HOTLINE"
- ❌ 把"加油，你可以的"加进 ENCOURAGEMENT
- ❌ 把 4-7-8 改成 4-4-4 因为"用户更容易记住"
- ❌ 删除任何被动意念关键词，理由是"误报太多"
- ❌ 把 PHQ-9 题目意译成"更日常的说法"
- ❌ 把 5-4-3-2-1 简化为 5-4-3 因为"嗅觉味觉很难"

### 何时升级
本区已是最高级。"升级"在这里意味着**降级到只读**——任何不确定的情况，都按只读处理。

---

## 9. 分区二：契约层（B 区）

### 范围
- `frontend/src/types/`（含 `api.ts` 等）
- `backend/src/routes/` 中的 zod schema 定义
- `backend/src/migrations/` 已存在的迁移文件
- `frontend/src/api/client.ts` 中的请求/响应类型
- 数据库 schema（通过迁移文件体现）

### 主导风险
B（契约层）。改动会同时波及前端、后端、数据库三方。

### 关键约束
1. **迁移文件不可篡改**：`001_initial_schema.sql`、`002_igotu_modules.sql` 一旦合并，永远只能新增 `00X_*.sql`，不可在原文件上修改
2. **CHECK 约束只可放宽不可收紧**：扩大范围 / 新增枚举值需新迁移；缩小范围 / 删除枚举值会让历史数据失效，禁止
3. **前后端类型必须一一对应**：每个 `frontend/src/types/api.ts` 中的接口都必须能映射到一个 `backend/src/routes/*.ts` 的 zod schema
4. **请求/响应 schema 与数据库列同步**：例如 `mood_score: z.number().min(1).max(5)` 必须与 SQL 的 `CHECK (mood_score BETWEEN 1 AND 5)` 一致
5. **不得用手写校验替换 zod**：见 §16

### 修改前提
1. 在对话中**列出所有受影响位置**：前端类型、后端 schema、数据库列、迁移文件、API 调用方
2. 对应 §5 自检清单的第 3 题（横跨层）必须显式列出
3. 任何 schema 字段的删除或改名，需用户书面确认（"yes, rename `xxx` to `yyy`"）

### 必备测试
- 新增字段：必须有契约测试断言前端 type 与后端 zod schema 字段一致
- 新增表 / 列：必须有覆盖 CHECK 约束边界的迁移测试（如 `mood_score = 0` 应被拒绝、`= 5` 应被接受）
- 改名：必须有迁移脚本测试覆盖旧数据是否能正确转换

### 反模式（永远不要做）
- ❌ 直接修改 `001_initial_schema.sql` 添加列
- ❌ 把 `chat_messages.role` 加一个 `'system'` 值而不更新所有消费方
- ❌ 把后端 zod 改成 `z.any()` 来"先让前端跑通"
- ❌ 在 `frontend/src/types/api.ts` 加字段但不动后端
- ❌ 把热线相关字段加入 schema（热线属于 §8 临床区，不应进入契约层）

### 何时升级
- 涉及 `phq9_results`、`exercise_logs`、`cognitive_records` 表 → 升级为 A 级，按 §8 处理
- 涉及认证字段（如 `users.password_hash`、JWT payload）→ 走 §14 横切协议

---

## 10. 分区三：后端服务层（C 区 · backend）

### 范围
- `backend/src/services/`（**除 `OfflineChat.ts` 外**，OfflineChat 属 §8）
- `backend/src/middlewares/`（**除认证中间件外**，认证属 §14）
- `backend/src/routes/` 中的业务逻辑（zod schema 部分属 §9）
- `backend/src/utils/`（**除 `constants.ts` 中的 `ENCOURAGEMENT` 外**，那部分属 §8）
- `backend/src/db/`、`backend/src/scripts/`

### 主导风险
C（状态/逻辑层）。改动通常局限于服务端，但可能间接波及契约层（§9）或临床区（§8）。

### 关键约束
1. **同步代码不得无端改异步**：better-sqlite3 是同步 API，把它包装为 Promise 只为"看起来更现代"是反模式
2. **不得绕过 zod 校验**：路由处理函数必须通过 zod 校验后的对象访问输入
3. **服务层不得直接访问 `req`/`res`**：保持服务可测试性
4. **JWT 与认证逻辑不得在此区扩展**：见 §14
5. **错误处理用统一中间件**：不在每个路由 try/catch 后 `res.json({error})`

### 修改前提
1. 读完目标函数的所有调用方（`grep` 一次足够）
2. 读完该模块对应的测试（如有）
3. 对照 §3 不变量列表，确认未触动数据库 CHECK 约束相关的字段处理

### 必备测试
- 新增/修改业务逻辑分支：必须新增对应单元测试
- 修改服务返回结构：必须更新调用方测试
- 修改路由：使用 supertest 验证 happy path + 至少一个错误分支

### 反模式（永远不要做）
- ❌ 把 better-sqlite3 调用包成 `async/await` 只为风格统一
- ❌ 在服务层 `console.log` 用户消息内容（涉及隐私）
- ❌ 在服务层硬编码用户可见文案——用户可见文案必须走 i18n 或客户端
- ❌ 在路由层做大量业务逻辑——业务应进入 services/

### 何时升级
- 修改 `phq9.ts` 路由的计分映射 → A 区（§8）
- 修改服务返回的字段命名 → B 区（§9）
- 修改认证中间件 → §14

---

## 11. 分区四：前端状态层（C 区 · frontend）

### 范围
- `frontend/src/stores/`（Pinia stores）
- `frontend/src/composables/`
- `frontend/src/api/` 中的请求函数（不含 client.ts 的拦截器，属 §14）

### 主导风险
C（状态/逻辑层）。改动局限于前端，但 store 状态结构常被多处组件消费。

### 关键约束
1. **Pinia store 的 state shape 是隐性契约**：被多个组件订阅，改动需评估所有消费方
2. **不在 store 中做 API 调用之外的副作用**：路由跳转、toast 等应在视图层
3. **错误状态必须有明确字段**：`isLoading`、`error` 是约定俗成的最小集
4. **不得在 store 中保存敏感信息超过必要范围**：JWT 存储与刷新逻辑见 §14
5. **demo 模式逻辑必须显式分支**：见 §14 中关于 `DEMO_ALLOWED_ROUTES` 的约束

### 修改前提
1. `grep` 查出该 store 的所有消费组件
2. 阅读对应的 `frontend/src/api/*.ts` 与后端路由签名（§9）
3. 如果 store 涉及 chat / phq9 / crisis，先读 §8 评估是否触动临床内容

### 必备测试
- 新增 action：必须有覆盖成功路径与失败路径的单元测试
- 修改 state shape：必须更新该 store 的消费者快照测试（如有）
- 修改请求函数签名：必须确认后端 schema 已先行更新

### 反模式（永远不要做）
- ❌ 在 store action 里直接 `router.push`——应让组件订阅状态后自行跳转
- ❌ 把 `chat.ts` store 的 message 类型改成 `any`
- ❌ 在 store 中维护"上次显示过哪条 ENCOURAGEMENT"的复杂选择算法（§8 内容应保持简单）
- ❌ 在 composable 里 import 后端类型——前后端类型应通过 §9 契约对接，不直接耦合

### 何时升级
- store 直接处理临床数据展示逻辑（如 PHQ-9 评分映射）→ §8
- store 字段对应到 API 字段 → 联动 §9
- 涉及登录/退出/token 刷新 → §14

---

## 12. 分区五：组件与视图层（C/D 区 · frontend）

### 范围
- `frontend/src/components/`（**除 `crisis/`、`toolbox/` 中的临床组件**，那些属 §8）
- `frontend/src/views/`（**除 `CrisisPrep.vue` 等危机相关视图**，那些属 §8）
- `frontend/src/layouts/`
- `frontend/src/assets/`、`frontend/src/styles/`

### 主导风险
默认 D（视觉/可调）。但当组件直接渲染临床数据（如 PHQ-9 题目、ENCOURAGEMENT 文本）时升为 A。

### 关键约束
1. **组件不得硬编码用户可见的中英文字符串**：必须走 i18n
2. **组件不得绕过 store 直接调 API**：保持单向数据流
3. **可访问性基线**：保留语义化标签（button vs div）、aria 属性、focus 管理
4. **危机相关 UI 的视觉变化属 A 区**：例如调暗 `CrisisBreathingView` 背景看似 D，但实际影响急性危机用户体验，需走 §8

### 修改前提
1. 确认你修改的不是 §8 列出的临床组件
2. 如果修改的是公共组件（`Button.vue`、`Card.vue` 之类），列出所有使用方
3. 如果改样式，先确认 Tailwind 的工具类已涵盖；不要新增全局 CSS

### 必备测试
- 纯视觉/样式：建议加 visual 测试，不强制
- 涉及交互（onClick、表单）：必须有组件测试
- 涉及路由跳转：建议补 Playwright E2E 一例

### 反模式（永远不要做）
- ❌ 在 `.vue` 文件里直接写 "你今天感觉怎么样？" 这样的字符串
- ❌ 把组件的 props 类型设为 `any`
- ❌ 在普通组件里复制粘贴 §8 的危机文案
- ❌ 引入新的 UI 库来"快速做"——除非用户明确要求
- ❌ 用 `v-html` 渲染来自 store 的内容（XSS 风险）

### 何时升级
- 渲染 PHQ-9 题目或 severity → §8（A 区）
- 渲染热线号码或危机回应 → §8
- 路由表变更（涉及 `requiresAuth` 或 `DEMO_ALLOWED_ROUTES`）→ §14

---

## 13. 分区六：i18n 与文案（D 区）

### 范围
- `frontend/src/locales/zh.*`、`en.*`（或当前 i18n 实现的对应文件）

### 主导风险
默认 D。但**当 key 路径属于临床类（如 `phq9.*`、`crisis.*`、`encouragement.*`）时升为 A**。

### 关键约束
1. **zh 与 en 必须保持 key 同步**：新增 key 时两边一起加，不允许只加 zh
2. **key 命名按功能分组**，避免顶层平铺
3. **临床类文案的修改必须走 §8 的临床审查**——i18n 只是技术承载，临床敏感性不会因为是 i18n 文件就降低
4. **不得在 i18n 中放变量插值的关键词**：比如 `"emergency.line": "{number}"`——热线号码必须硬编码，见 §8 关键约束 2

### 修改前提
1. 确认 key 是否落在临床命名空间下
2. 如是临床类，按 §8 处理，要求用户授权
3. 非临床类，可直接修改，但必须 zh + en 一起改

### 必备测试
- 新增 key：建议补一个"key 完整性"测试断言 zh/en 同步
- 修改临床类 key：必须按 §8 增加回归测试

### 反模式（永远不要做）
- ❌ 只改中文文案，英文留待"以后"
- ❌ 在临床命名空间下用插值占位热线号码
- ❌ 把"零内疚"原则违背的话术加进 `encouragement.*`
- ❌ 把组件里的硬编码字符串"批量"提到 i18n 但不与原作者沟通——可能改变原作者刻意保留的语义

### 何时升级
key 落在 `phq9.*` / `crisis.*` / `encouragement.*` / `chat.*` 任一命名空间下 → §8。

---

## 14. 横切协议：认证与授权

> 这不是一个独立的"区"，而是一组贯穿 §10–§12 的硬约束。任何接触认证、授权、会话的修改，都额外遵守本节。

### 范围
- `backend/src/middlewares/auth*.ts`（具体文件名以仓库实际为准）
- `frontend/src/api/client.ts` 的请求拦截器与 401 处理
- `frontend/src/router/index.ts` 中的 `beforeEach` 守卫与 `DEMO_ALLOWED_ROUTES`
- 任何路由 meta 中的 `requiresAuth: true`
- JWT 签发、刷新、过期处理

### 主导风险
B（契约层），但实际后果接近 A——任何漏洞都直接危及用户隐私。

### 关键约束
1. **`requiresAuth: true` 的路由必须通过 JWT 验证**：不可"临时"绕过
2. **Demo 模式只能访问 `DEMO_ALLOWED_ROUTES` 中的路由**：增加路由前必须确认它不写入用户数据库
3. **不得把 JWT 长期保存在 localStorage 而无刷新策略**：现有实现以现有方式为准，不得擅改
4. **401 拦截器中的逻辑不得"静默重定向"到非登录页**：用户必须明确知道发生了登出
5. **不得在前端日志或错误上报中包含 JWT 内容**

### 修改前提
1. 在对话中明确说明"本次修改触动认证/授权逻辑"
2. 列出每一个被修改路由的 `requiresAuth` 状态变化
3. 用户书面确认（"yes, change `xxx` to public"）

### 必备测试
- 任何 `requiresAuth` 改动：必须有 supertest 验证未登录请求被拒
- 修改 `DEMO_ALLOWED_ROUTES`：必须有 router test 断言 demo 用户被重定向
- 修改 JWT 中间件：必须有针对过期/伪造 token 的单元测试

### 反模式（永远不要做）
- ❌ "为了 demo 顺畅"把某路由从 `requiresAuth: true` 改为 false
- ❌ 在 demo 模式下临时调用写库的 API "之后再删"
- ❌ 把 `DEMO_ALLOWED_ROUTES` 改为允许所有路由
- ❌ 在 401 处理里 try/catch 后吞掉错误
- ❌ 把 token 加密逻辑改成"看起来更安全"的自定义实现

---

## 15. 横切协议：测试

> 同 §14，本节是贯穿全文的强约束。每个分区都有自己的"必备测试"项，本节给出统一原则。

### 优先级
按以下顺序保证测试稳固，不要追求覆盖率数字：

1. **OfflineChat 关键词命中与热线号码出现**（A 区核心）
2. **PHQ-9 计分与 severity 边界**（A 区核心）
3. **危机路径**（关键词命中 → 路由跳转 → 文案出现）
4. **JWT 认证链路**（中间件、路由守卫、401 处理）
5. **契约层一致性**（前端 type ↔ 后端 zod ↔ DB CHECK）

其他模块的测试随项目演进自然补齐。

### 工具栈
- 后端：Vitest + supertest
- 前端单元 / 组件：Vitest + @vue/test-utils + happy-dom
- 前端 E2E：Playwright（已安装但需要补足覆盖）

### 测试本身的反模式
- ❌ 用 mock 替换被测临床规则（应跑真实规则）
- ❌ 测试里硬编码热线号码而被测代码也硬编码——但这恰恰是**对的**，热线被改了测试也得跟着失败，不要"参数化"
- ❌ 把测试改成跳过来让 CI 通过

---

# Part III — 安全网

## 16. 永远不要做的事（除非用户明确要求并理解后果）

- 不要"顺手"重命名 `CATEGORIES`、`role`、`type` 等枚举值
- 不要把同步代码改成异步只为"看起来更现代"
- 不要把 SQLite 替换为其他数据库（这是经过 ADR 决策的）
- 不要在没有迁移脚本的情况下修改既存表结构
- 不要把 zod schema 替换为手写校验
- 不要把硬编码热线号码"提取到配置"——它们必须是硬编码的，且与代码一同被审查
- 不要在 i18n 文件之外引入用户可见的中文/英文字符串
- 不要安装新的包来"简化"已有实现，除非用户明确要求
- 不要把 PHQ-9、危机文案、ENCOURAGEMENT 抽到外部 CMS / Notion / Airtable
- 不要把日志记录到第三方服务而不与用户讨论隐私边界

---

## 17. 何时你必须停下来询问人类

遇到下列任一情况，**不要继续，向用户提问**：

- 用户要求修改 §8 列出的临床内容（A 类），但未提供临床审查证明
- 用户要求降低或绕过 §14 的认证检查（包括"临时"绕过）
- 用户要求把热线电话、PHQ-9 题目、危机回应文本"简化"或"美化"
- 用户要求让 demo 模式访问受限路由
- 用户要求把日志记录到第三方服务（涉及敏感个人信息）
- 你发现现有代码中存在你认为是 bug 的东西，但它可能是有意为之的临床设计（例如延迟、特定措辞、特定排序）
- 你打算修改的文件不属于 §8–§13 任何一个分区
- 你对所属分区的判断不确定（哪怕只是 50/50）

---

## 18. 当本文件与你的判断冲突时

以本文件为准。
如果你认为本文件本身有问题，请把问题写下来给用户看，让用户决定是否修改本文件——不要自行绕过。

特别地：
- 本文件的某条规则若与某个分区协议冲突，**以分区协议为准**（更具体）
- 若与 [CLINICAL_INVARIANTS.md](./CLINICAL_INVARIANTS.md) 冲突，**以 CLINICAL_INVARIANTS.md 为准**（更权威）

---

## 19. 本文件的演进

- 本文件本身视为 **B 类改动**（契约层）：可修改，但每次修改必须在 PR 中说明动机、影响范围、是否需要更新 CLINICAL_INVARIANTS.md
- 不删除既有条款，仅可标记为"已过时"并保留
- §8–§15 的分区列表若新增分区，必须同步更新 §3 风险分级表与 §5/§6 自检清单

---

*最后更新：见 git log。每次修改本文件本身请视为 B 类改动。*
