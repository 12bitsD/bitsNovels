import { http, HttpResponse } from 'msw';
import { projectHandlers } from './projectHandlers';

export const handlers = [
  ...projectHandlers,
  http.post('http://localhost:5173/api/auth/register', () => {
    return HttpResponse.json({ message: '注册成功' });
  }),
  http.post('http://localhost:5173/api/auth/login', () => {
    return HttpResponse.json({
      token: 'mock-token',
      userId: 'mock-user',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      rememberMe: false
    });
  }),
  http.post('http://localhost:5173/api/auth/forgot-password', () => {
    return HttpResponse.json({ message: '邮件已发送' });
  }),
  http.post('http://localhost:5173/api/auth/reset-password', () => {
    return HttpResponse.json({ message: '密码已重置' });
  }),
  http.post('http://localhost:5173/api/auth/verify-email', () => {
    return HttpResponse.json({ message: '验证成功' });
  }),
  http.post('http://localhost:5173/api/auth/resend-verification', () => {
    return HttpResponse.json({ message: '重发成功' });
  }),
  // Catch relative paths just in case
  http.post('/api/auth/register', () => {
    return HttpResponse.json({ message: '注册成功' });
  }),
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      token: 'mock-token',
      userId: 'mock-user',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      rememberMe: false
    });
  }),
  http.post('/api/auth/forgot-password', () => {
    return HttpResponse.json({ message: '邮件已发送' });
  }),
  http.post('/api/auth/reset-password', () => {
    return HttpResponse.json({ message: '密码已重置' });
  }),
  http.post('/api/auth/verify-email', () => {
    return HttpResponse.json({ message: '验证成功' });
  }),
  http.post('/api/auth/resend-verification', () => {
    return HttpResponse.json({ message: '重发成功' });
  })
];
