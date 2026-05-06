# FRSoftwareCopyright

软著生成工具前端演示原型。首版使用 Vue 3 + Vite + TypeScript 实现，不接真实 Agent，不写真实本地文件，使用模拟数据演示从标题输入、配置校验、模板解析、资源生成到历史回放的完整流程。

## Commands

- `npm install`
- `npm run dev`
- `npm run test`
- `npm run build`

## Runtime

当前版本默认使用 `mockRuntime`，所有 Agent 测试、模板解析、生成、资源重生成和压缩动作都经过 `src/runtime` 的运行时接口。

`mockRuntime` 不访问网络和本地文件系统，只用于浏览器演示和前端状态验证。后续接入 Tauri、本地文件系统、真实 Agent、docx 解析和 zip 输出时，应新增 runtime 实现并复用现有 Store 和组件调用边界。
