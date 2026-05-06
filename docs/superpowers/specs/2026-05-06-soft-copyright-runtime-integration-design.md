# 软著生成工具二期运行时接入设计

日期：2026-05-06

## 背景

当前 `feature/front-prototype` 已完成 Vue 3 + Vite + TypeScript 的前端演示原型。现有能力包括首页工作台、设置页、模板解析弹窗、资源弹窗、历史记录、localStorage 持久化和完整 mock 生成流程。

当前限制也很明确：生成、模板解析、Agent 测试、资源重生成和压缩都直接依赖前端模拟逻辑。任务创建后会立即进入 `completed`，无法表达真实执行链路中的运行中、失败、重试、部分完成和环境不可用状态。

二期采用“运行时接口 + 任务状态机”的渐进式方案。目标是保留当前浏览器 mock 演示能力，同时把所有生成类动作收敛到 runtime adapter，为后续 Tauri、本地文件系统、真实 Agent、docx 解析和 zip 输出接入打稳定边界。

## 目标

- 新增统一 runtime contract，让前端不直接依赖 mock 构造器。
- 保留 `mockRuntime` 作为浏览器环境默认实现。
- 将生成流程从一次性完成改为事件驱动的任务状态推进。
- 让 Store 只负责任务状态、页面状态和持久化，不再直接决定执行细节。
- 补齐运行中、失败、失败原因、重试、压缩启用条件和用户反馈状态。
- 保持一期演示路径可用，所有现有测试继续通过。

## 非目标

- 不接真实 Agent API。
- 不做真实 docx 读取、解析或写入。
- 不接 Tauri 文件选择器、系统目录打开或本地权限。
- 不生成真实 zip 文件。
- 不重做当前视觉风格和页面信息架构。

这些能力属于后续真实桌面运行时阶段。二期只建立接口、状态模型和前端可测试闭环。

## 架构

新增 `src/runtime` 目录，负责定义运行时接口和默认 mock 实现。

前端调用链调整为：

```text
Vue Components
  -> appStore actions
  -> runtime adapter
  -> domain task/event helpers
  -> appStore persistence
  -> Vue rendering
```

`src/domain` 继续承载纯数据模型和任务状态转换函数。`src/runtime` 负责“动作如何执行”。`src/stores` 负责把 runtime 输出应用到响应式状态和 localStorage。

这种分层让后续 `tauriRuntime` 可以替换 `mockRuntime`，而无需重写页面组件。

## Runtime Contract

运行时接口命名为 `GenerationRuntime`，包含以下能力：

- `validateEnvironment(settings)`：检查当前运行环境是否满足启动条件。
- `testAgent(config)`：测试 Agent 配置并返回可用、不可用和错误信息。
- `parseTemplate(template, settings)`：解析普通 docx 模板并返回 `TemplateAnalysis`。
- `startGeneration(input, settings)`：启动生成任务，返回初始任务和事件流。
- `regenerateResource(task, resourceId, suggestion)`：重生成单个资源。
- `compressTask(task)`：生成压缩包结果。

二期中的 `mockRuntime` 不访问网络和文件系统，但必须模拟真实运行时形态：

- 每个动作返回 Promise。
- 生成过程通过事件分步推进。
- 可模拟失败节点和失败原因。
- 返回结构必须接近后续 Tauri runtime 可提供的数据。

## 任务状态模型

当前 `GenerationTask` 和 `WorkflowNode` 已有 `NodeStatus`。二期继续复用这些 union，但引入明确事件模型：

- `task-started`
- `stage-started`
- `node-started`
- `node-completed`
- `node-failed`
- `stage-completed`
- `task-completed`
- `task-failed`
- `resource-updated`
- `archive-created`

新增事件类型 `TaskEvent`，并提供纯函数：

- `createInitialGenerationTask`
- `applyTaskEvent`
- `retryFailedNode`
- `canCompressTask`

`applyTaskEvent` 是唯一负责把事件应用到任务对象的 domain 函数。组件和 runtime 不直接手写嵌套 stage/node 更新逻辑。

## Store 行为

`createAppStore` 接收可选 runtime 参数，默认使用 `mockRuntime`。

Store 行为调整：

- `testAgent()` 调用 runtime，并把状态、错误信息和测试时间写回 settings。
- `parseTemplate()` 调用 runtime，先设置 `parsing`，成功后设置 `completed`，失败后设置 `failed` 并记录错误。
- `startGeneration()` 先执行现有校验，再调用 runtime 获取事件并逐步应用。
- `regenerate()` 调用 runtime，成功后更新单资源和历史快照。
- `compressCurrentTask()` 只在 `canCompressTask(task)` 为 true 时执行。
- 所有失败都写入 store 中可渲染的错误状态，不用 `window.alert` 或静默失败。

Store 仍使用 localStorage 保存 settings、currentTask 和 history。二期不引入新的持久化后端。

## UI 行为

首页保持现有结构，但增加执行状态表达：

- 执行中节点显示 `running`。
- 失败节点显示失败原因。
- 失败节点提供重试入口。
- 生成中禁用重复开始。
- 压缩按钮在文档阶段完成前不可用。

设置页增强：

- Agent 测试显示运行中、可用、不可用和失败原因。
- 模板解析显示 `pending`、`parsing`、`completed`、`failed`。
- 导入解析 JSON 的错误以页面反馈呈现，不让 JSON 解析异常中断页面。

资源弹窗增强：

- 保存后同步当前任务和历史快照。
- 建议重生成失败时保留原资源内容。
- HTML 资源仍只允许预览，不提供代码编辑。

## 错误处理

统一错误结构命名为 `RuntimeErrorInfo`：

- `code`
- `message`
- `detail`
- `recoverable`

可恢复错误包括 Agent 不可用、模板解析失败、节点生成失败、资源重生成失败。不可恢复错误包括 runtime contract 结构异常或任务数据损坏。

用户界面只展示 `message` 和下一步操作。`detail` 作为调试信息保留在状态中，后续可接执行日志面板。

## 测试策略

新增和调整测试覆盖以下路径：

- runtime contract 的 mock 实现能返回稳定任务事件。
- `applyTaskEvent` 能按顺序推进 stage/node/task 状态。
- 节点失败后任务进入可恢复状态。
- `retryFailedNode` 能将失败节点重置为 running 或 pending。
- Store 使用 runtime 启动任务，而不是直接调用 mock data 构造器。
- Agent 测试和模板解析失败会进入可渲染状态。
- 压缩按钮只在文档阶段完成后可用。

每个任务完成后运行对应测试，最终运行：

```bash
npm run test
npm run build
```

## 验收标准

- 当前 mock 演示流程仍可从配置、解析、生成、预览、重生成、压缩到历史回放完整走通。
- 所有生成类动作都通过 runtime adapter 触发。
- 任务可以展示 running、completed、failed 和 retry 状态。
- 失败原因能在 UI 中看到，不再静默失败。
- `npm run test` 通过。
- `npm run build` 通过。
- README 明确当前是 mock runtime，并说明后续可接 Tauri runtime。
