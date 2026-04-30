import type {
  AppSettings,
  TemplateAnalysis,
  TemplateConfig,
  TemplateStructureNode,
  TemplateType,
  WordStyleRule
} from './types'

const templateLabels: Record<TemplateType, string> = {
  'collection-form': '采集表',
  'software-manual': '软件说明书',
  'source-code': '源代码文档'
}

export function createInitialSettings(): AppSettings {
  return {
    basic: {
      outputDirectory: '',
      copyrightOwner: '',
      address: '',
      postalCode: '',
      contactPerson: '',
      phone: '',
      email: '',
      mobile: '',
      fax: '',
      bankName: '',
      bankAccount: '',
      applicantName: ''
    },
    agent: {
      baseUrl: '',
      apiKey: '',
      model: '',
      status: 'untested'
    },
    notes: '',
    system: {
      theme: 'light',
      version: '0.1.0'
    },
    templates: []
  }
}

export function createDemoTemplateAnalysis(type: TemplateType): TemplateAnalysis {
  const label = templateLabels[type]

  return {
    summary: `Agent 已识别该普通 docx 为${label}模板，包含文档结构、动态内容区域和 Word 样式规则。`,
    structureNodes: createStructureNodes(type),
    dynamicFields: [
      {
        key: 'projectName',
        label: '项目名称',
        source: '首页系统标题',
        instruction: '写入封面、页眉和正文首次出现的软件名称位置。',
        enabled: true
      },
      {
        key: 'copyrightOwner',
        label: '著作权人',
        source: '基本信息设置',
        instruction: '写入申请主体、封面和签章区。',
        enabled: true
      },
      {
        key: 'features',
        label: '功能描述',
        source: '项目功能设计文档',
        instruction: '按模块生成可用于软著说明书的功能段落。',
        enabled: true
      },
      {
        key: 'architecture',
        label: '技术架构',
        source: '项目架构设计及技术选型文档',
        instruction: '生成架构说明、技术栈说明和部署形态描述。',
        enabled: true
      },
      {
        key: 'pageFlow',
        label: '页面流程',
        source: '项目页面流程设计文档',
        instruction: '转换成页面路径、角色操作和业务流程描述。',
        enabled: true
      },
      {
        key: 'sourceCode',
        label: '源码片段',
        source: '项目编码结果',
        instruction: '提取演示项目核心代码结构并按模板源码区排版。',
        enabled: type === 'source-code'
      },
      {
        key: 'screenshotNotes',
        label: '截图说明',
        source: '图片截取结果',
        instruction: '生成界面截图标题、说明和所在章节引用。',
        enabled: true
      },
      {
        key: 'generatedDate',
        label: '生成日期',
        source: '系统时间',
        instruction: '写入文档页脚或申请材料日期字段。',
        enabled: true
      }
    ],
    styleRules: createStyleRules()
  }
}

export function createDemoTemplate(fileName: string, type: TemplateType): TemplateConfig {
  const now = nowText()
  return {
    id: `template-${type}-${Date.now()}`,
    name: templateLabels[type],
    type,
    fileName,
    parseStatus: 'completed',
    analysis: createDemoTemplateAnalysis(type),
    lastParsedAt: now
  }
}

export function buildDocumentContent(title: string, resourceName: string): string {
  return [
    `# ${resourceName}`,
    '',
    `项目名称：${title}`,
    '',
    '## 一、文档目的',
    `本文档根据“${title}”的软著申请演示需要生成，用于说明系统功能、架构、页面流程和交付资源。`,
    '',
    '## 二、主要内容',
    '- 围绕系统标题生成业务背景和功能边界。',
    '- 使用适合软著材料的表达方式组织章节。',
    '- 保留后续接入真实 Agent 和 Word 模板生成的字段结构。'
  ].join('\n')
}

function createStructureNodes(type: TemplateType): TemplateStructureNode[] {
  const nodes: TemplateStructureNode[] = [
    {
      id: 'cover',
      name: '封面',
      purpose: '承载软件名称、著作权人、申请人和日期等基本信息。',
      enabled: true
    },
    {
      id: 'catalog',
      name: '目录',
      purpose: '识别目录层级并保留 Word 自动目录或静态目录样式。',
      enabled: true
    },
    {
      id: 'chapter',
      name: '正文章节',
      purpose: '承载功能说明、技术架构、页面流程和使用说明。',
      enabled: true
    },
    {
      id: 'table',
      name: '表格区域',
      purpose: '保留字段采集表、版本记录或模块清单的行列结构。',
      enabled: true
    },
    {
      id: 'screenshot-area',
      name: '图片或截图位置',
      purpose: '放置架构图、流程图和功能界面截图说明。',
      enabled: true
    },
    {
      id: 'signature',
      name: '签章区',
      purpose: '识别申请人、联系人、日期和盖章预留区域。',
      enabled: type === 'collection-form'
    },
    {
      id: 'source-area',
      name: '源码区',
      purpose: '承载源代码目录、核心代码片段和代码说明。',
      enabled: type === 'source-code'
    },
    {
      id: 'appendix',
      name: '附录区',
      purpose: '放置补充说明、截图索引和生成材料清单。',
      enabled: true
    }
  ]

  return nodes
}

function createStyleRules(): WordStyleRule[] {
  return [
    {
      id: 'style-title-1',
      target: '一级标题',
      fontFamily: '黑体',
      fontSize: 16,
      color: '#000000',
      bold: true,
      italic: false,
      underline: false,
      spacingBefore: 12,
      spacingAfter: 6,
      lineHeight: 1.5,
      firstLineIndent: 0,
      alignment: 'center',
      titleLevel: 1,
      numbering: '一、'
    },
    {
      id: 'style-body',
      target: '正文段落',
      fontFamily: '宋体',
      fontSize: 12,
      color: '#111111',
      bold: false,
      italic: false,
      underline: false,
      spacingBefore: 0,
      spacingAfter: 6,
      lineHeight: 1.5,
      firstLineIndent: 24,
      alignment: 'justify'
    },
    {
      id: 'style-table',
      target: '表格单元格',
      fontFamily: '宋体',
      fontSize: 10.5,
      color: '#111111',
      bold: false,
      italic: false,
      underline: false,
      spacingBefore: 0,
      spacingAfter: 0,
      lineHeight: 1.3,
      firstLineIndent: 0,
      alignment: 'left',
      tableCell: {
        border: '0.5pt solid #000000',
        background: '#ffffff',
        width: 'auto',
        alignment: 'center'
      }
    }
  ]
}

function nowText(): string {
  return new Date().toISOString()
}
