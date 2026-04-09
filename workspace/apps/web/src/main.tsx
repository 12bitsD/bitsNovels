import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './api/client'
import './index.css'
import App from './App.tsx'

async function enableMocking() {
  // 当需要启用 Mock 时，可以设置环境变量 VITE_ENABLE_MOCK=true
  // 目前真实 API 已就绪，默认关闭 Mock
  if (process.env.NODE_ENV !== 'development' || import.meta.env.VITE_ENABLE_MOCK !== 'true') {
    return
  }
  const { worker } = await import('./mocks/browser')
  return worker.start({
    onUnhandledRequest: 'bypass',
  })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  )
})

