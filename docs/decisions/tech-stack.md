# 技术选型决策记录

> Sprint 0 完成。所有决策已锁定，不再变更（除非开新 ADR）。

---

## 最终技术栈

| 层级 | 决策 | 决策理由 |
|------|------|---------|
| 前端框架 | React + TypeScript | 生态最大，AI coding 工具支持最好 |
| 编辑器 | TipTap 核心 + @tiptap/extension-markdown | ProseMirror 底层成熟；Markdown 实时渲染（类 Typora）；Diff/批注自研 |
| CSS | Tailwind CSS | AI 生成效率最高 |
| 前后端类型同步 | openapi-typescript | FastAPI 自动生成 openapi.json → 前端构建时生成 TS 类型 |
| 后端运行时 | Python 3.11+ + FastAPI | AI 生态一等公民；OpenAPI 自动生成；asyncio 原生 |
| 任务队列 | ARQ + Redis | asyncio 原生，轻量；支持优先级 / 重试 / 并发上限 |
| 数据库 | PostgreSQL 15+ + pgvector | 主库 + 向量检索同栈，V1 数据量无需独立向量服务 |
| AI 服务 | OpenAI / Claude（可配置） | 通过项目级 AI 配置路由，官方 Python SDK |
| 文件存储 | S3 兼容（MinIO/OSS） | 导出文件 + 备份，7 天签名链接 |
| 认证 | JWT + OAuth（Google/GitHub） | python-jose + authlib |

## 核心依赖清单

### 后端（当前以 `pyproject.toml` 管理依赖）
```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
pydantic>=2.7.0
pydantic-settings>=2.2.0
sqlalchemy>=2.0.0
alembic>=1.13.0
asyncpg>=0.29.0
pgvector>=0.3.0
arq>=0.25.0
redis>=5.0.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
authlib>=1.3.0
httpx>=0.27.0
openai>=1.30.0
anthropic>=0.26.0
python-docx>=1.1.0
weasyprint>=62.0
markdown>=3.6
boto3>=1.34.0
python-multipart>=0.0.9
```

### 前端核心包
```
react, react-dom, typescript
@tiptap/react, @tiptap/starter-kit, @tiptap/extension-markdown
tailwindcss
openapi-typescript（构建时类型生成）
diff-match-patch（Diff 视图，自研批注）
```

## V1 Scope 边界

- ❌ 跨项目全局搜索
- ❌ 多人协作 / 权限管理
- ❌ 移动端（仅桌面 1280px+）
- ❌ EPUB 导出（支持 DOCX / TXT / PDF / Markdown）

## 调研依据

- 编辑器选型：8 维度 TipTap vs Slate 对比（Sprint 0）
- 后端选型：Node.js vs Python vs Bun 全维度对比，Python 加权 4.55 分（Sprint 0）
- 决策日期：2026-03-23
