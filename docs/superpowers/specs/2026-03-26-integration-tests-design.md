# 集成测试设计：前端测试对接真实后端

**日期**：2026-03-26
**范围**：Epic 1（US-1.1~1.3）前端测试从 MSW mock 切换到真实 FastAPI 后端

---

## 目标

用真实 FastAPI 后端替代 MSW，让前端 vitest 测试验证前后端契约是否真正对齐，消除 mock 格式与真实响应不一致的风险。

---

## 架构

```
vitest globalSetup
  └─ spawn uvicorn (TESTING=true, port 8000)
  └─ 等待 GET /api/health 返回 200

每个测试文件
  └─ beforeEach: POST /api/test/reset  ← 清空后端内存状态
  └─ 测试逻辑（直接 fetch 真实后端）

vitest globalTeardown
  └─ kill uvicorn 进程
```

jsdom 的 `url` 设为 `http://localhost:8000`，使 `fetch('/api/...')` 正确解析到后端。

---

## 各模块改动

### 1. 后端：新增 `/api/test/reset`

- 仅当环境变量 `TESTING=true` 时注册此路由，生产环境不暴露
- `POST /api/test/reset` 将 `app.state` 重置为初始状态：
  - `auth_users = {}`
  - `email_index = {}`
  - `sessions = {}`
  - `verify_tokens = {}`
  - `verify_token_first_seen = set()`
  - `reset_tokens = {}`
  - `fake_db.projects = []`
  - `archived_project_ids = set()`
  - 所有计数器归零
- 返回 `{"ok": true}`

### 2. 前端：globalSetup

新建 `apps/web/src/test/globalSetup.ts`：

- 以 `TESTING=true` 环境变量 spawn `uvicorn server.main:app --host 127.0.0.1 --port 8000`
- 轮询 `GET http://localhost:8000/api/health` 直到返回 200（超时 10s 报错）
- teardown 时发送 SIGTERM kill 进程
- 在 `vite.config.ts` 的 `test.globalSetup` 中引用此文件

### 3. 前端：测试环境配置

`vite.config.ts` 修改：
```ts
test: {
  environment: 'jsdom',
  environmentOptions: {
    jsdom: { url: 'http://localhost:8000' }
  },
  globalSetup: ['./src/test/globalSetup.ts'],
  setupFiles: ['./src/test/setup.ts'],
  ...
}
```

`setup.ts` 修改：
- 移除 MSW `server.listen / resetHandlers / close`
- 改为 `beforeEach` 调 `fetch('http://localhost:8000/api/test/reset', { method: 'POST' })`
- 保留 `localStorage` mock（`client.ts` 读取 token 时依赖）

### 4. 前端：删除 MSW handlers

- 删除 `src/mocks/handlers.ts`
- 删除 `src/mocks/projectHandlers.ts`
- `src/mocks/browser.ts` 和 `src/mocks/server.ts` 视需保留（dev 模式可选 mock），但从测试路径中完全移除

### 5. 前端：测试文件改动

各测试文件统一改动：

- 移除 `import { server } from '../../../mocks/server'` 及所有 `server.use(...)` 调用
- 断言对齐真实后端响应格式：
  - 登录：检查 `token`、`user.id`、`user.email`、`emailVerified`
  - 注册：检查 `user.id`、`verificationSent: true`
- 需要登录态的测试（`ProjectDashboard`、`CreateProjectModal`）：
  - `beforeEach` 中先调注册+登录接口，将 `token` 写入 `localStorage` mock
- 注册测试使用随机邮箱（如 `test-${Date.now()}@example.com`）防止同一文件内重名

---

## 不在本次范围内

- E2E 测试（Playwright/Cypress）
- 后端测试改动（保持 TestClient 隔离测试不变）
- MSW browser.ts 的最终取舍（保留供 dev 模式可选）

---

## 成功标准

- `npm run test:web` 无需手动启动后端，自动完成全部 28 个前端测试
- 所有测试通过，覆盖率维持 ≥ 80%
- 后端 `main.py` 覆盖率不下降（reset 端点有自己的测试）
