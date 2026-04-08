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
  }),

  // Chapter Note handlers
  http.get('http://localhost:5173/api/chapters/:chapterId/note', ({ params }) => {
    const { chapterId } = params;
    if (chapterId === 'error-chapter') {
      return new HttpResponse(JSON.stringify({ detail: '备注不存在' }), { status: 404 });
    }
    return HttpResponse.json({
      id: `note-${chapterId}`,
      chapterId,
      content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"测试备注"}]}]}',
      charCount: 4,
      autoSavedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }),

  http.put('http://localhost:5173/api/chapters/:chapterId/note', async ({ params, request }) => {
    const { chapterId } = params;
    const body = await request.json() as { content?: string };
    if (chapterId === 'fail-chapter') {
      return new HttpResponse(JSON.stringify({ detail: '保存失败' }), { status: 500 });
    }
    return HttpResponse.json({
      id: `note-${chapterId}`,
      chapterId,
      content: body.content || '',
      charCount: body.content ? body.content.length : 0,
      autoSavedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }),

  // Relative path fallbacks
  http.get('/api/chapters/:chapterId/note', ({ params }) => {
    const { chapterId } = params;
    if (chapterId === 'error-chapter') {
      return new HttpResponse(JSON.stringify({ detail: '备注不存在' }), { status: 404 });
    }
    return HttpResponse.json({
      id: `note-${chapterId}`,
      chapterId,
      content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"测试备注"}]}]}',
      charCount: 4,
      autoSavedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }),

  http.put('/api/chapters/:chapterId/note', async ({ params, request }) => {
    const { chapterId } = params;
    const body = await request.json() as { content?: string };
    if (chapterId === 'fail-chapter') {
      return new HttpResponse(JSON.stringify({ detail: '保存失败' }), { status: 500 });
    }
    return HttpResponse.json({
      id: `note-${chapterId}`,
      chapterId,
      content: body.content || '',
      charCount: body.content ? body.content.length : 0,
      autoSavedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }),

  // Backup handlers
  http.get('http://localhost:5173/api/projects/:projectId/backups', () => {
    return HttpResponse.json([
      {
        version: '1.0.0',
        backupType: 'manual',
        projectId: '1',
        projectName: 'Test Project',
        exportedAt: '2024-01-15T10:30:00Z',
        counts: {
          volumes: 2,
          chapters: 10,
          knowledgeBaseEntries: 25,
          snapshots: 5,
          annotations: 12,
        },
      },
    ]);
  }),

  http.post('http://localhost:5173/api/projects/:projectId/backups', () => {
    return HttpResponse.json({
      version: '1.1.0',
      backupType: 'manual',
      projectId: '1',
      projectName: 'Test Project',
      exportedAt: new Date().toISOString(),
      counts: {
        volumes: 2,
        chapters: 12,
        knowledgeBaseEntries: 28,
        snapshots: 8,
        annotations: 15,
      },
    });
  }),

  http.post('http://localhost:5173/api/projects/:projectId/backups/restore', async ({ request }) => {
    return HttpResponse.json({
      projectName: 'Test Project',
      totalChars: 15000,
      chapterCount: 10,
      knowledgeBaseCount: 25,
      backupDate: '2024-01-15T10:30:00Z',
      fileSize: 1024000,
    });
  }),

  // Relative path fallbacks
  http.get('/api/projects/:projectId/backups', () => {
    return HttpResponse.json([
      {
        version: '1.0.0',
        backupType: 'manual',
        projectId: '1',
        projectName: 'Test Project',
        exportedAt: '2024-01-15T10:30:00Z',
        counts: {
          volumes: 2,
          chapters: 10,
          knowledgeBaseEntries: 25,
          snapshots: 5,
          annotations: 12,
        },
      },
    ]);
  }),

  http.post('/api/projects/:projectId/backups', () => {
    return HttpResponse.json({
      version: '1.1.0',
      backupType: 'manual',
      projectId: '1',
      projectName: 'Test Project',
      exportedAt: new Date().toISOString(),
      counts: {
        volumes: 2,
        chapters: 12,
        knowledgeBaseEntries: 28,
        snapshots: 8,
        annotations: 15,
      },
    });
  }),

  http.post('/api/projects/:projectId/backups/restore', async ({ request }) => {
    return HttpResponse.json({
      projectName: 'Test Project',
      totalChars: 15000,
      chapterCount: 10,
      knowledgeBaseCount: 25,
      backupDate: '2024-01-15T10:30:00Z',
      fileSize: 1024000,
    });
  }),
];
