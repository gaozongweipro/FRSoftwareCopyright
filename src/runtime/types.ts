import type {
  AgentConfig,
  AppSettings,
  GenerationTask,
  RuntimeErrorInfo,
  SystemType,
  TaskEvent,
  TemplateAnalysis,
  TemplateConfig
} from '../domain/types'

export interface GenerationInput {
  title: string
  systemType: SystemType
}

export interface AgentTestResult {
  status: AgentConfig['status']
  testedAt: string
  error?: RuntimeErrorInfo
}

export interface TemplateParseResult {
  analysis: TemplateAnalysis
  parsedAt: string
  error?: RuntimeErrorInfo
}

export interface GenerationStartResult {
  task: GenerationTask
  events: TaskEvent[]
}

export interface RuntimeResourceResult {
  events: TaskEvent[]
  error?: RuntimeErrorInfo
}

export interface RuntimeArchiveResult {
  events: TaskEvent[]
  error?: RuntimeErrorInfo
}

export interface GenerationRuntime {
  validateEnvironment(settings: AppSettings): Promise<RuntimeErrorInfo[]>
  testAgent(config: AgentConfig): Promise<AgentTestResult>
  parseTemplate(template: TemplateConfig, settings: AppSettings): Promise<TemplateParseResult>
  startGeneration(input: GenerationInput, settings: AppSettings): Promise<GenerationStartResult>
  regenerateResource(
    task: GenerationTask,
    resourceId: string,
    suggestion?: string
  ): Promise<RuntimeResourceResult>
  compressTask(task: GenerationTask): Promise<RuntimeArchiveResult>
}
