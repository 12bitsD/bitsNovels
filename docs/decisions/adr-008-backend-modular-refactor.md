# ADR-008: 后端主模块解耦与共享基础设施收敛

**日期**: 2026-04-09  
**状态**: 已批准  
**决策人**: Backend Refactor Session

---

## 背景

在本次后端深度 Code Review 中，发现以下结构性问题已经明显提升后续增量开发成本：

- `workspace/server/main.py` 同时承担应用装配、Pydantic 模型、认证端点、项目 CRUD、工具函数与状态初始化，文件规模达到 838 行
- `_require_project` 在 11 个 route 文件中复制粘贴，且存在读写行为不一致
- `_AppProxy` / `_main_module` 在 11 个 service 文件中重复
- `_iso_z` / 字符统计逻辑在多个模块重复实现
- 认证链路存在固定 token 硬编码
- `app.state.volumes` 与 `app.state.fake_db.volumes` 并存，造成导出/备份/恢复与大纲模块状态分裂
- `parser_service.py` 中实体识别与 KB 写入逻辑耦合在同一函数内

这些问题虽然未立即破坏功能，但会持续放大以下成本：

- 新功能接入必须修改中心化文件
- 重构难以分步推进
- 重复逻辑易产生静默分叉
- 依赖关系不透明，新人理解成本高

---

## 决策

### 1. 入口文件只保留装配职责

`workspace/server/main.py` 仅保留：

- app 创建与 lifespan
- 全局状态重置入口
- 少量跨模块共享工具函数
- router 装配

以下内容迁出：

- 认证端点 → `workspace/server/routes/auth.py`
- 项目 CRUD → `workspace/server/routes/projects.py`
- 请求模型 → `workspace/server/models/request_models.py`

### 2. 共享 route 依赖集中到 `_deps.py`

将跨 route 重复的项目鉴权逻辑统一收敛到：

- `require_project()`：只读访问
- `require_writable_project()`：写操作访问，统一归档只读检查

避免每个 route 自己复制 `_require_project`。

### 3. 共享 service 基础设施集中到 `_base.py`

所有 service 统一从 `workspace/server/services/_base.py` 获取：

- `app`
- `_main_module`
- `_iso_z`

不再在每个 service 中重复声明循环导入规避样板。

### 4. 纯工具函数进入 `utils/`

跨模块复用且不依赖状态的逻辑统一放入 `workspace/server/utils/`：

- `time_utils.py`
- `text_utils.py`

避免 route/service 私有复制。

### 5. 状态容器统一以 `fake_db` 为主入口

卷/章节数据统一通过：

- `app.state.fake_db.volumes`
- `app.state.fake_db.chapters`

禁止继续引入并行的 `app.state.volumes` / `app.state.chapters` 裸存储。

### 6. Parser 识别与落库显式分层

在 `parser_service.py` 中引入：

- `DetectionResult`
- `detect_entities(content)`

规则识别只负责产出纯数据结构，落库函数只负责状态写入与副作用执行。

---

## 影响

### 正向影响

- `main.py` 体积显著下降，入口文件更稳定
- 重复代码消失，后续变更只需改一个位置
- route / service / utils / model 的边界更清晰
- parser 可先测试识别结果，再测试写库过程
- 导出/备份/恢复与大纲模块使用统一数据源

### 代价

- 短期内新增了更多文件，模块数量上升
- 为兼容现有依赖，`main.py` 仍保留少量共享 helper
- route/service 仍存在少量延迟导入，后续仍可继续清理

---

## 不采纳方案

### 方案 A：保持现状，仅做风格修正

不采纳原因：

- 无法解决中心化耦合与重复实现问题
- 后续每次新增功能仍会继续膨胀 `main.py`

### 方案 B：一次性引入完整 DI 容器与仓储层

不采纳原因：

- 当前项目仍基于内存态 `app.state`，直接引入完整仓储/依赖注入体系改动过大
- 会让本次重构超出“保持系统持续可运行”的范围

本次采用更稳妥的渐进式模块化方案。

---

## 后续行动

- 继续把 `main.py` 中残余共享 helper 下沉到 `core/` 或 `utils/`
- 继续减少 route 函数体内的延迟导入
- 为 `DetectionResult` 补充更细粒度的单元测试
- 为 `kb_foreshadow_service.py` 增补覆盖，解决当前低覆盖区域

---

## 变更记录

| 日期 | 变更内容 | 决策人 |
|------|---------|--------|
| 2026-04-09 | 初始文档，记录后端模块化重构与状态统一决策 | Backend Refactor Session |
