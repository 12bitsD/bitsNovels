# Epic 5 Context - 导出、知识库传输与项目备份的数据契约

## 目标结论
- FE 与 BE 需要共享同一套任务、模板、知识库 JSON 和项目备份结构定义，否则导出、恢复和冲突处理会出现语义偏差。
- `ExportTask` 负责异步导出状态；`ExportTemplate` 负责跨项目复用配置；`ProjectBackup` 负责完整恢复；`KnowledgeBaseExportFile` 负责知识库跨项目传输。
- 备份 ZIP 必须能从清单级别被校验，因此除了业务 JSON，还要定义 manifest 和文件列表。

## 核心类型

```typescript
type KnowledgeBaseEntityType =
  | 'characters'
  | 'locations'
  | 'items'
  | 'factions'
  | 'foreshadows'
  | 'settings'

// 导出任务
interface ExportTask {
  id: string
  projectId: string
  userId: string
  format: 'docx' | 'txt' | 'pdf' | 'epub'
  scope: 'all' | 'volume' | 'chapter'
  scopeIds?: string[]    // 指定卷/章节 ID
  status: 'pending' | 'generating' | 'done' | 'failed'
  progress: number       // 0-100
  fileUrl?: string       // 完成后可下载的 URL
  expiresAt?: string     // 下载链接过期时间
  createdAt: string
}

// 导出模板（US-5.3）
interface ExportTemplate {
  id: string
  userId: string
  name: string
  format: 'docx' | 'txt' | 'pdf' | 'epub'
  options: {
    font?: string
    fontSize?: string
    lineSpacing?: number
    includeVolumeTitle?: boolean
    includeChapterNumber?: boolean
    includeNotes?: boolean
    includeAnnotations?: boolean
    epubMetadata?: {
      title: string
      author: string
      description?: string
    }
    txtEncoding?: 'utf8' | 'gbk'
    txtSeparator?: 'blank' | 'line' | 'none'
  }
  createdAt: string
  updatedAt: string
}

// 知识库导出文件（US-5.4）
interface KnowledgeBaseExportFile {
  version: string
  projectMeta: {
    projectId: string
    projectName: string
  }
  exportedAt: string
  scope: {
    mode: 'all' | 'types' | 'items'
    types?: KnowledgeBaseEntityType[]
    itemIds?: string[]
  }
  knowledgeBase: {
    characters: KBCharacter[]
    locations: KBLocation[]
    items: KBItem[]
    factions: KBFaction[]
    foreshadows: KBForeshadow[]
    settings: KBSetting[]
    relations: KBRelation[]
  }
}

// 备份包 manifest
interface ProjectBackupManifest {
  version: string
  backupType: 'manual' | 'auto'
  projectId: string
  projectName: string
  exportedAt: string
  counts: {
    volumes: number
    chapters: number
    knowledgeBaseEntries: number
    snapshots: number
    annotations: number
  }
}

// 项目备份包结构（US-5.5）
interface ProjectBackup {
  version: string
  project: Project
  volumes: Volume[]
  chapters: Chapter[]
  knowledgeBase: {
    characters: KBCharacter[]
    locations: KBLocation[]
    items: KBItem[]
    factions: KBFaction[]
    foreshadows: KBForeshadow[]
    settings: KBSetting[]
    relations: KBRelation[]
  }
  snapshots: Snapshot[]
  annotations: Annotation[]
  config: {
    writingGoals: WritingGoal
    aiConfig: AIProjectConfig
  }
  exportedAt: string
}
```

## 导出任务状态

| 状态 | 含义 | FE 行为 | BE 行为 |
| --- | --- | --- | --- |
| `pending` | 任务已创建，等待执行 | 显示排队中 | 写入任务记录，等待 worker 拉取 |
| `generating` | 正在生成文件 | 显示进度条和禁用态 | 持续更新 `progress` |
| `done` | 文件已生成可下载 | 显示下载按钮和到期时间 | 回填 `fileUrl` 与 `expiresAt` |
| `failed` | 任务失败 | 显示错误和重试按钮 | 记录失败原因并发通知 |

## 导出配置模板结构说明
- 模板只保存格式与导出选项，不保存范围。
- `font / fontSize / lineSpacing` 仅对 `docx` 和 `pdf` 有效。
- `epubMetadata` 仅对 `epub` 有效。
- `txtEncoding / txtSeparator` 仅对 `txt` 有效。
- `includeNotes / includeAnnotations` 属于跨格式的正文附加内容开关。

## 知识库 JSON schema 约束

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `version` | 是 | schema 版本，用于导入兼容判断 |
| `projectMeta.projectId` | 是 | 来源项目 ID |
| `projectMeta.projectName` | 是 | 来源项目名 |
| `exportedAt` | 是 | 导出时间 |
| `scope.mode` | 是 | `all / types / items` |
| `scope.types` | 条件必填 | `mode=types` 时必填 |
| `scope.itemIds` | 条件必填 | `mode=items` 时必填 |
| `knowledgeBase.*` | 是 | 按类型分组的完整条目数组 |
| `knowledgeBase.relations` | 是 | 关系图谱，导入时用于引用恢复 |

## 备份包结构（ZIP 内容清单）

| ZIP 路径 | 内容 | 用途 |
| --- | --- | --- |
| `manifest.json` | `ProjectBackupManifest` | 版本、类型、摘要、兼容校验 |
| `project/project.json` | `Project` | 项目基本信息 |
| `project/volumes.json` | `Volume[]` | 卷结构 |
| `project/chapters.json` | `Chapter[]` | 章节元数据 |
| `project/texts/*.txt` | 章节正文原文 | 恢复正文、排查编码问题 |
| `knowledge-base/data.json` | 知识库完整数据 | 恢复角色、地点、设定与关系 |
| `snapshots/snapshots.json` | `Snapshot[]` | 恢复历史版本 |
| `annotations/annotations.json` | `Annotation[]` | 恢复批注与备注 |
| `config/project-config.json` | 写作目标、AI 配置 | 恢复项目行为设置 |

## 边界提醒
- `US-5.1` 只消费 `ExportTask` 和 `ExportTemplate`，产物是投稿文件，不可用于完整恢复。
- `US-5.4` 只消费 `KnowledgeBaseExportFile`，产物是 JSON，可用于新项目或现有项目追加导入。
- `US-5.5` 消费 `ProjectBackupManifest + ProjectBackup`，产物是 ZIP，可用于迁移、恢复与长期存档。

## 覆盖检查
| 用户故事 | 上下文是否覆盖 | 对应契约 |
| --- | --- | --- |
| US-5.1 | 是 | `ExportTask`、导出状态、模板选项 |
| US-5.2 | 是 | `ProjectBackupManifest.backupType='auto'`、ZIP 清单 |
| US-5.3 | 是 | `ExportTemplate` |
| US-5.4 | 是 | `KnowledgeBaseExportFile`、JSON schema 约束 |
| US-5.5 | 是 | `ProjectBackupManifest`、`ProjectBackup`、ZIP 内容清单 |
