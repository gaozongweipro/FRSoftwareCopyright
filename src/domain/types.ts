export type PageId = 'dashboard' | 'settings' | 'history'

export type SystemType = 'web'

export type TemplateType = 'collection-form' | 'software-manual' | 'source-code'

export type ParseStatus = 'pending' | 'parsing' | 'completed' | 'failed'

export type ResourceType = 'document' | 'html-demo' | 'image-note' | 'template-document'

export type NodeStatus = 'pending' | 'running' | 'completed' | 'needs-attention' | 'failed'

export type AgentStatus = 'untested' | 'available' | 'unavailable'

export interface BasicSettings {
  outputDirectory: string
  copyrightOwner: string
  address: string
  postalCode: string
  contactPerson: string
  phone: string
  email: string
  mobile: string
  fax: string
  bankName: string
  bankAccount: string
  applicantName: string
}

export interface AgentConfig {
  baseUrl: string
  apiKey: string
  model: string
  status: AgentStatus
  testedAt?: string
}

export interface SystemSettings {
  theme: 'light' | 'dark' | 'system'
  version: string
}

export interface AppSettings {
  basic: BasicSettings
  agent: AgentConfig
  notes: string
  system: SystemSettings
  templates: TemplateConfig[]
}

export interface TemplateConfig {
  id: string
  name: string
  type: TemplateType
  fileName: string
  parseStatus: ParseStatus
  analysis: TemplateAnalysis
  lastParsedAt?: string
}

export interface TemplateAnalysis {
  summary: string
  structureNodes: TemplateStructureNode[]
  dynamicFields: DynamicContentField[]
  styleRules: WordStyleRule[]
}

export interface TemplateStructureNode {
  id: string
  name: string
  purpose: string
  enabled: boolean
}

export interface DynamicContentField {
  key: string
  label: string
  source: string
  instruction: string
  enabled: boolean
}

export interface WordStyleRule {
  id: string
  target: string
  fontFamily: string
  fontSize: number
  color: string
  bold: boolean
  italic: boolean
  underline: boolean
  spacingBefore: number
  spacingAfter: number
  lineHeight: number
  firstLineIndent: number
  alignment: 'left' | 'right' | 'center' | 'justify'
  titleLevel?: number
  numbering?: string
  tableCell?: {
    border: string
    background: string
    width: string
    alignment: 'left' | 'right' | 'center' | 'justify'
  }
}

export interface ResourceSuggestion {
  text: string
  createdAt: string
}

export interface ResourceArtifact {
  id: string
  type: ResourceType
  name: string
  content: string
  previewLabel?: string
  generatedAt: string
  regenerateCount: number
  suggestions: ResourceSuggestion[]
  templateId?: string
}

export interface WorkflowNode {
  id: string
  name: string
  status: NodeStatus
  resource: ResourceArtifact
}

export interface WorkflowStage {
  id: 'analysis' | 'code' | 'image' | 'document'
  name: string
  status: NodeStatus
  nodes: WorkflowNode[]
}

export interface TaskStats {
  durationSeconds: number
  resourceCount: number
  templateCount: number
  regenerateCount: number
  latestCompletedAt: string
}

export interface GenerationTask {
  id: string
  title: string
  systemType: SystemType
  status: NodeStatus
  stages: WorkflowStage[]
  projectUrl: string
  documentDirectory: string
  zipPath?: string
  startedAt: string
  completedAt?: string
  stats: TaskStats
}

export interface ValidationIssue {
  code: 'missing-title' | 'missing-output-directory' | 'missing-template' | 'agent-unavailable'
  label: string
  message: string
  targetPage: PageId
}

export interface HistoryRecord {
  id: string
  title: string
  systemType: SystemType
  status: NodeStatus
  generatedAt: string
  templateCount: number
  resourceCount: number
  durationSeconds: number
  task: GenerationTask
}
