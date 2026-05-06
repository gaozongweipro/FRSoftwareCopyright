# 软著生成工具真实桌面运行时最小接入设计

日期：2026-05-06

## 背景

当前 `feature/front-prototype` 已完成前端原型和二期运行时接入。所有生成类动作已经通过 `GenerationRuntime` 触发，默认实现为 `mockRuntime`，并且 Store、Dashboard、Settings 已能展示运行中、失败、重试和压缩状态。

当前仍然缺少真实桌面运行时的入口。浏览器演示可以完整跑通，但应用还不能区分“浏览器 mock 环境”和“桌面 Tauri 环境”，也不能对用户配置的产出资源目录做真实环境校验。后续真实 Agent、docx 解析、文件落盘和 zip 输出都需要先有一个稳定的桌面 runtime 边界。

本阶段采用“最小桌面运行时接入”方案：只建立运行时选择、桌面能力探测和目录校验闭环，不提前实现真实 Agent、docx 或 zip。

## 目标

- 增加运行时模式识别，让应用能区分 `mock` 和 `tauri`。
- 新增 `tauriRuntime` 最小实现，复用现有 `GenerationRuntime` 接口。
- 在 Tauri 环境下优先使用桌面 runtime，在浏览器环境下继续使用 `mockRuntime`。
- 增加产出资源目录校验能力，至少能表达未配置、不可访问、不可写和当前环境不支持真实校验。
- 在设置页或工作台展示当前运行模式和环境异常。
- 保持现有 mock 演示路径完整可用。
- 所有新增逻辑可通过单元测试或可注入依赖测试覆盖。

## 非目标

- 不接真实 Agent API。
- 不解析真实 docx 文件。
- 不生成真实 zip 文件。
- 不做完整文件选择器。
- 不做系统目录打开能力。
- 不接后端数据库或新的持久化层。
- 不重做页面结构和视觉风格。

这些能力属于后续真实桌面能力阶段。本阶段只建立可替换、可检测、可反馈的 runtime 基础。

## 架构

新增运行时选择层，保持组件仍然只依赖 Store：

```text
Vue Components
  -> appStore actions
  -> selected runtime
     -> mockRuntime 或 tauriRuntime
  -> domain task/event helpers
  -> appStore persistence
  -> Vue rendering
```

新增 `src/runtime/runtimeFactory.ts` 负责选择默认 runtime。选择规则为：

- 能检测到 Tauri API 时使用 `tauriRuntime`。
- 否则使用 `mockRuntime`。
- 测试中可继续通过 `createAppStore(runtime)` 注入指定 runtime。

`tauriRuntime` 初期不直接承担所有真实生成能力。它只对环境校验使用桌面能力，其余生成动作仍可委托给 `mockRuntime`，并在返回结果中保留运行模式信息。这样可以让用户在桌面壳中先看到真实环境状态，同时不破坏现有演示流程。

## Runtime 元数据

新增运行时元数据结构：

```ts
export type RuntimeMode = 'mock' | 'tauri'

export interface RuntimeEnvironmentStatus {
  mode: RuntimeMode
  label: string
  available: boolean
  checkedAt: string
  issues: RuntimeErrorInfo[]
}
```

`GenerationRuntime` 增加必需的环境状态能力：

- `getEnvironmentStatus(settings)`：返回当前运行模式、可用状态和环境问题。

保留已有 `validateEnvironment(settings)`，但它只返回阻塞启动的错误数组。`getEnvironmentStatus` 用于页面展示和诊断，`validateEnvironment` 用于生成前校验。

## Tauri 能力边界

新增 `TauriDesktopBridge` 作为薄适配层，避免 `tauriRuntime` 直接散落访问全局对象：

```ts
export interface TauriDesktopBridge {
  isAvailable(): boolean
  checkDirectory(path: string): Promise<DirectoryCheckResult>
}
```

目录校验结果：

```ts
export interface DirectoryCheckResult {
  exists: boolean
  writable: boolean
  message?: string
}
```

默认桥接实现先做保守检测：

- 若当前没有 Tauri API，`isAvailable()` 返回 `false`。
- 若 Tauri API 存在但项目尚未定义后端命令，`checkDirectory()` 返回可恢复错误，提示“桌面目录校验命令尚未接入”。

后续接 Rust/Tauri 命令时，只替换 bridge 实现，不改 Store 和组件。

## Store 行为

`createAppStore` 默认从 `createDefaultRuntime()` 获取 runtime，而不是直接创建 `mockRuntime`。

新增运行时状态：

```ts
const runtimeStatus = ref<RuntimeEnvironmentStatus | null>(null)
```

新增 Store action：

- `refreshRuntimeStatus()`：调用 runtime 获取当前运行模式和环境问题。

行为规则：

- 应用初始化后可以主动刷新一次运行时状态。
- 设置页修改产出资源目录后，保存设置时可刷新运行时状态。
- `startGeneration()` 在现有校验后继续调用 `runtime.validateEnvironment(settings)`，把返回错误合并到 `operation.lastError` 或 `validationIssues` 的可见反馈中。
- 浏览器环境下缺少真实目录校验不阻塞 mock 演示。
- Tauri 环境下目录不存在或不可写应阻塞真实生成，并给出明确错误。

## UI 行为

不改变页面主结构，只增加轻量状态反馈。

设置页新增运行时状态区域：

- 显示当前模式：`浏览器模拟运行时` 或 `桌面运行时`。
- 显示最近检测时间。
- 若存在环境问题，显示错误消息。
- 提供“重新检测”按钮。

首页生成前错误仍走现有校验提示和执行异常提示，不新增弹窗。

视觉要求：

- 使用克制的边框和小字号状态文本。
- 不增加大面积卡片嵌套。
- 内容过长时换行，不压缩主工作台布局。

## 错误处理

新增错误码建议：

- `runtime-tauri-unavailable`：当前环境未检测到 Tauri API。
- `runtime-directory-empty`：未配置产出资源目录。
- `runtime-directory-unavailable`：产出资源目录不可访问。
- `runtime-directory-readonly`：产出资源目录不可写。
- `runtime-directory-command-missing`：桌面目录校验命令尚未接入。

错误统一使用已有 `RuntimeErrorInfo`：

- `message` 面向用户展示。
- `detail` 保留调试信息。
- `recoverable` 对以上错误均为 `true`。

## 测试策略

新增和调整测试覆盖以下路径：

- `createDefaultRuntime` 在无 Tauri API 时返回 mock runtime。
- `tauriRuntime` 在 bridge 不可用时返回桌面不可用状态。
- `tauriRuntime.validateEnvironment` 对空产出目录返回明确错误。
- `tauriRuntime.validateEnvironment` 对不可写目录返回阻塞错误。
- Store 能刷新并保存 runtime 状态。
- 设置页能展示运行模式、错误和重新检测按钮。
- 浏览器 mock 演示路径继续通过现有测试。

最终运行：

```bash
npm run test
npm run build
```

## 验收标准

- 浏览器环境默认仍使用 `mockRuntime`，现有演示流程不回退。
- 应用存在清晰的 runtime factory，可替换为 Tauri runtime。
- `tauriRuntime` 有最小实现和测试覆盖。
- Store 能记录并刷新运行时状态。
- 设置页能显示当前运行模式和环境异常。
- 目录未配置、不可访问、不可写都有可见错误。
- `npm run test` 通过。
- `npm run build` 通过。
- README 说明当前最小桌面 runtime 边界和后续接入点。
