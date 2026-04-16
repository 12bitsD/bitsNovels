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
      user: { id: 'mock-user', email: 'mock@example.com' },
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      emailVerified: true
    });
  }),
  http.get('http://localhost:5173/api/auth/me', () => {
    return HttpResponse.json({
      user: { id: 'mock-user', email: 'mock@example.com' },
      isVerified: true,
      is_verified: true
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
      user: { id: 'mock-user', email: 'mock@example.com' },
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      emailVerified: true
    });
  }),
  http.get('/api/auth/me', () => {
    return HttpResponse.json({
      user: { id: 'mock-user', email: 'mock@example.com' },
      isVerified: true,
      is_verified: true
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

  // Story Copilot (Epic 4) minimal handlers
  http.get('http://localhost:5173/api/projects/:projectId/copilot/sessions', () => {
    return HttpResponse.json({ sessions: [] });
  }),
  http.post('http://localhost:5173/api/projects/:projectId/copilot/sessions', () => {
    return HttpResponse.json(
      {
        session: {
          id: 'copilot-session-mock',
          projectId: '1',
          mode: 'worldbuild',
          title: 'Mock Session',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  }),
  http.get('http://localhost:5173/api/copilot/sessions/:sessionId', () => {
    return HttpResponse.json({
      session: {
        id: 'copilot-session-mock',
        projectId: '1',
        mode: 'worldbuild',
        title: 'Mock Session',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      events: [],
    });
  }),
  http.post('http://localhost:5173/api/copilot/sessions/:sessionId/messages', async ({ request }) => {
    const body = (await request.json()) as { role?: string; content?: string };
    return HttpResponse.json(
      {
        message: { id: 'copilot-message-mock', role: body.role ?? 'user', content: body.content ?? '' },
        event: {
          id: 'copilot-event-mock',
          type: 'message',
          createdAt: new Date().toISOString(),
          message: { id: 'copilot-message-mock', role: body.role ?? 'user', content: body.content ?? '' },
        },
      },
      { status: 201 },
    );
  }),
  http.post('http://localhost:5173/api/copilot/sessions/:sessionId/cards/:cardId/actions', async ({ params, request }) => {
    const { cardId } = params;
    const body = (await request.json()) as { action?: string };
    const status = body.action === 'adopt' ? 'adopted' : body.action === 'dismiss' ? 'dismissed' : 'pending';
    return HttpResponse.json({
      card: { id: cardId, kind: 'draft', title: 'Mock Card', summary: 'Mock', status },
      event: {
        id: 'copilot-event-action-mock',
        type: 'card_action',
        createdAt: new Date().toISOString(),
        cardAction: { id: 'copilot-action-mock', cardId, action: body.action ?? 'adopt' },
      },
    });
  }),

  // Relative path fallbacks
  http.get('/api/projects/:projectId/copilot/sessions', () => {
    return HttpResponse.json({ sessions: [] });
  }),
  http.post('/api/projects/:projectId/copilot/sessions', () => {
    return HttpResponse.json(
      {
        session: {
          id: 'copilot-session-mock',
          projectId: '1',
          mode: 'worldbuild',
          title: 'Mock Session',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  }),
  http.get('/api/copilot/sessions/:sessionId', () => {
    return HttpResponse.json({
      session: {
        id: 'copilot-session-mock',
        projectId: '1',
        mode: 'worldbuild',
        title: 'Mock Session',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      events: [],
    });
  }),
  http.post('/api/copilot/sessions/:sessionId/messages', async ({ request }) => {
    const body = (await request.json()) as { role?: string; content?: string };
    return HttpResponse.json(
      {
        message: { id: 'copilot-message-mock', role: body.role ?? 'user', content: body.content ?? '' },
        event: {
          id: 'copilot-event-mock',
          type: 'message',
          createdAt: new Date().toISOString(),
          message: { id: 'copilot-message-mock', role: body.role ?? 'user', content: body.content ?? '' },
        },
      },
      { status: 201 },
    );
  }),
  http.post('/api/copilot/sessions/:sessionId/turn', async ({ request }) => {
    const body = (await request.json()) as { content?: string };
    const now = new Date().toISOString();
    return HttpResponse.json({
      events: [
        {
          id: 'copilot-event-user-mock',
          type: 'message',
          createdAt: now,
          message: { id: 'copilot-message-user-mock', role: 'user', content: body.content ?? '' },
        },
        {
          id: 'copilot-event-assistant-mock',
          type: 'message',
          createdAt: now,
          message: { id: 'copilot-message-assistant-mock', role: 'assistant', content: 'Mock reply' },
        },
      ],
    });
  }),
  http.post('/api/copilot/sessions/:sessionId/feedback', async ({ request }) => {
    const body = (await request.json()) as {
      suggestionId?: string;
      action?: string;
      comment?: string;
    };
    return HttpResponse.json({
      feedback: {
        id: 'copilot-feedback-mock',
        suggestionId: body.suggestionId ?? '',
        action: body.action ?? 'helpful',
        comment: body.comment ?? null,
        createdAt: new Date().toISOString(),
      },
    });
  }),
  http.post('/api/copilot/sessions/:sessionId/cards/:cardId/actions', async ({ params, request }) => {
    const { cardId } = params;
    const body = (await request.json()) as { action?: string };
    const status = body.action === 'adopt' ? 'adopted' : body.action === 'dismiss' ? 'dismissed' : 'pending';
    return HttpResponse.json({
      card: { id: cardId, kind: 'draft', title: 'Mock Card', summary: 'Mock', status },
      event: {
        id: 'copilot-event-action-mock',
        type: 'card_action',
        createdAt: new Date().toISOString(),
        cardAction: { id: 'copilot-action-mock', cardId, action: body.action ?? 'adopt' },
      },
    });
  }),

  // KB Settings (Epic 2 / US-2.10) minimal handlers
  http.get('http://localhost:5173/api/projects/:projectId/kb/settings', () => {
    return HttpResponse.json({ items: [], total: 0 });
  }),
  http.get('http://localhost:5173/api/projects/:projectId/kb/settings/:id', ({ params }) => {
    const { id, projectId } = params;
    return HttpResponse.json({
      setting: {
        id,
        projectId,
        type: 'setting',
        source: 'ai',
        confirmed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: 'Mock Setting',
        category: '历史',
        content: 'Mock',
        order: 0,
        relatedEntityRefs: [],
      },
    });
  }),
  http.get('/api/projects/:projectId/kb/settings', () => {
    return HttpResponse.json({ items: [], total: 0 });
  }),
  http.get('/api/projects/:projectId/kb/settings/:id', ({ params }) => {
    const { id, projectId } = params;
    return HttpResponse.json({
      setting: {
        id,
        projectId,
        type: 'setting',
        source: 'ai',
        confirmed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: 'Mock Setting',
        category: '历史',
        content: 'Mock',
        order: 0,
        relatedEntityRefs: [],
      },
    });
  }),

  // Chapter Note handlers
  http.get('http://localhost:5173/api/projects/:projectId/chapters/:chapterId/note', ({ params }) => {
    const { chapterId } = params;
    if (chapterId === 'error-chapter') {
      return new HttpResponse(JSON.stringify({ detail: '备注不存在' }), { status: 404 });
    }
    return HttpResponse.json({
      note: {
        id: `note-${chapterId}`,
        chapterId,
        content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"测试备注"}]}]}',
        charCount: 4,
        autoSavedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
  }),

  http.patch('http://localhost:5173/api/projects/:projectId/chapters/:chapterId/note', async ({ params, request }) => {
    const { chapterId } = params;
    const body = await request.json() as { content?: string };
    if (chapterId === 'fail-chapter') {
      return new HttpResponse(JSON.stringify({ detail: '保存失败' }), { status: 500 });
    }
    return HttpResponse.json({
      note: {
        id: `note-${chapterId}`,
        chapterId,
        content: body.content || '',
        charCount: body.content ? body.content.length : 0,
        autoSavedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
  }),

  // Relative path fallbacks
  http.get('/api/projects/:projectId/chapters/:chapterId/note', ({ params }) => {
    const { chapterId } = params;
    if (chapterId === 'error-chapter') {
      return new HttpResponse(JSON.stringify({ detail: '备注不存在' }), { status: 404 });
    }
    return HttpResponse.json({
      note: {
        id: `note-${chapterId}`,
        chapterId,
        content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"测试备注"}]}]}',
        charCount: 4,
        autoSavedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
  }),

  http.patch('/api/projects/:projectId/chapters/:chapterId/note', async ({ params, request }) => {
    const { chapterId } = params;
    const body = await request.json() as { content?: string };
    if (chapterId === 'fail-chapter') {
      return new HttpResponse(JSON.stringify({ detail: '保存失败' }), { status: 500 });
    }
    return HttpResponse.json({
      note: {
        id: `note-${chapterId}`,
        chapterId,
        content: body.content || '',
        charCount: body.content ? body.content.length : 0,
        autoSavedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
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

  http.post('http://localhost:5173/api/projects/:projectId/backups/restore', async () => {
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

  http.post('/api/projects/:projectId/backups/restore', async () => {
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
