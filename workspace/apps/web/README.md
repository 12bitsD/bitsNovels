# bitsNovels Web

## 目录职责

- `src/main.tsx`：前端入口
- `src/App.tsx`：当前平台壳页面
- `src/App.test.tsx`：前端冒烟测试
- `src/test/setup.ts`：测试初始化
- `vite.config.ts`：Vite、Vitest、Tailwind 配置

## 常用命令

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
```

## 说明

- 前端真实业务开发从 `specs/epic-N/fe.md` 开始
- API 类型通过根目录 `npm run generate:api-types` 生成
- 工作区整体结构见 `docs/ENGINEERING_WORKSPACE.md`
