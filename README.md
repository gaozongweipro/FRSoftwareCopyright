# FRSoftwareCopyright

软著生成工具前端演示原型。当前版本使用 Vue 3 + Vite + TypeScript 实现，重点验证从项目标题输入、配置校验、模板解析、资源生成、资源预览、重生成、压缩状态到历史回放的完整前端闭环。

项目仍处在前端原型和最小桌面运行时接入阶段。真实 Agent、真实 docx 解析、真实文件落盘和 zip 输出尚未接入。

## Commands

- `npm install`
- `npm run dev`
- `npm run test`
- `npm run build`

## Current Status

- 已完成首页工作台、设置页、模板解析弹窗、资源弹窗、历史记录。
- 已完成 localStorage 持久化。
- 已完成 `GenerationRuntime` 运行时接口。
- 已完成 `mockRuntime`，浏览器环境可完整演示生成流程。
- 已完成最小 `tauriRuntime`，用于桌面运行时模式识别和产出资源目录环境校验。
- 已完成设置页“运行环境”状态展示和重新检测入口。

## Runtime

当前版本通过 `createDefaultRuntime()` 自动选择运行时：浏览器环境使用 `mockRuntime`，检测到桌面能力后可切换到最小 `tauriRuntime`。所有 Agent 测试、模板解析、生成、资源重生成和压缩动作都经过 `src/runtime` 的运行时接口。

`mockRuntime` 不访问网络和本地文件系统，只用于浏览器演示和前端状态验证。`tauriRuntime` 当前只负责运行模式识别和产出资源目录环境校验；Agent、docx 解析、真实文件落盘和 zip 输出仍保留为后续接入点。

### Runtime Files

- `src/runtime/types.ts`：运行时接口、运行模式、环境状态和目录校验类型。
- `src/runtime/mockRuntime.ts`：浏览器模拟运行时。
- `src/runtime/tauriBridge.ts`：桌面能力薄适配层。
- `src/runtime/tauriRuntime.ts`：最小桌面运行时。
- `src/runtime/runtimeFactory.ts`：默认运行时选择入口。
- `src/stores/appStore.ts`：负责调用 runtime、应用任务事件、保存状态。

### Runtime Modes

- 浏览器模拟运行时：默认模式，不访问网络和本地文件系统。
- 桌面运行时：检测到 Tauri 桌面能力后启用，目前只做环境状态和产出目录校验。

## Known Limits

- Agent 测试仍是模拟连接。
- 模板解析仍使用模拟结构数据，不读取真实 docx。
- 生成资源仍是模拟内容。
- 压缩包路径是状态模拟，不生成真实 zip 文件。
- 默认 Tauri bridge 尚未绑定 Rust 命令，真实目录检查需要后续接入桌面后端能力。

## Next Steps

1. 接入 Tauri 后端目录校验命令。
2. 接入真实 Agent 配置测试。
3. 接入真实 docx 模板解析。
4. 将生成资源落盘到产出目录。
5. 生成真实交付 zip 包。
