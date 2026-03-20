# specs/EPIC · 需求拆分索引

> 本目录将 USER_STORIES 按 Epic 拆分为 FE（前端）和 BE（后端）。
> FE Agent 读 `N/FE.md`，BE Agent 读 `N/BE.md`，两者共同依赖 `N/context.md`。
> 每行对应一个 US，标注可测试性：`[T]` = 可自动化测试，`[M]` = 需手动验证。

## 路由速查

| Epic | FE Agent 读 | BE Agent 读 | 共享 context |
|---|---|---|---|
| Epic 1 | `EPIC1/FE.md` | `EPIC1/BE.md` | `EPIC1/context.md` |
| Epic 2 | `EPIC2/FE.md` | `EPIC2/BE.md` | `EPIC2/context.md` |
| Epic 3 | `EPIC3/FE.md` | `EPIC3/BE.md` | `EPIC3/context.md` |
| Epic 4 | `EPIC4/FE.md` | `EPIC4/BE.md` | `EPIC4/context.md` |
| Epic 5 | `EPIC5/FE.md` | `EPIC5/BE.md` | `EPIC5/context.md` |
| Epic 6 | `EPIC6/FE.md` | `EPIC6/BE.md` | `EPIC6/context.md` |

## US 依赖顺序（每个 Epic 内部）

### Epic 1（项目管理）
```
US-1.1 登录注册  ──→ US-1.2 项目列表  ──→ US-1.3 新建项目
                                    ├── US-1.4 项目设置
                                    ├── US-1.5 卷章目录
                                    ├── US-1.6 写作目标
                                    ├── US-1.7 回收站
                                    ├── US-1.8 归档
                                    └── US-1.9 导入作品
```

### Epic 2（知识库与 Parser）
```
US-2.1 Parser 触发
├── US-2.2 角色识别
├── US-2.3 地点识别
├── US-2.4 道具识别
├── US-2.5 势力识别
├── US-2.6 伏笔追踪
├── US-2.7 关系图谱
├── US-2.8 一致性检查
├── US-2.9 知识库搜索
├── US-2.10 世界观设定
└── US-2.11 知识库手动编辑
```

### Epic 3（写作工作台）
```
US-3.1 编辑器核心（底层依赖）
├── US-3.2 章节管理
├── US-3.3 写作统计
├── US-3.4 专注模式
├── US-3.5 编辑器主题
├── US-3.6 版本快照
├── US-3.7 内容批注
├── US-3.8 章节备注
├── US-3.9 写作计时器
└── US-3.10 查找替换
```

### Epic 4（AI 辅助写作）
```
US-4.1 AI 续写（最核心）
├── US-4.2 AI 润色
├── US-4.3 AI 扩写/缩写
├── US-4.4 AI 对话生成
├── US-4.5 AI 章节大纲建议
├── US-4.6 AI 名字生成器
├── US-4.7 AI 写作建议
└── US-4.8 项目 AI 配置
```

### Epic 5（导出与备份）
```
US-5.1 导出作品（核心）
├── US-5.2 自动备份
├── US-5.3 导出模板
├── US-5.4 知识库导入导出
└── US-5.5 项目备份恢复
```

### Epic 6（系统与设置）
```
US-6.1 用户资料管理
├── US-6.2 界面偏好设置
├── US-6.3 快捷键配置
├── US-6.4 通知配置
├── US-6.5 存储管理
└── US-6.6 通知中心
```

## 跨 Epic 共享结构

| 结构 | 定义位置 | 使用方 |
|---|---|---|
| 用户对象 | `EPIC1/context.md` | 全局 |
| 项目对象 | `EPIC1/context.md` | EPIC1,2,3,4,5 |
| 卷/章节对象 | `EPIC3/context.md` | EPIC1,2,3,4,5 |
| 知识库实体 | `EPIC2/context.md` | EPIC2,4 |
| AI 任务 | `EPIC4/context.md` | EPIC2,4 |

## TDD 开发顺序建议

每个 Epic 按上述 US 顺序逐一实现，每实现一个 US：
1. 先写测试（FE/BE 各自写自己的测试）
2. 再写实现
3. 两个 Agent 在 context.md 上协调，确保数据结构一致
