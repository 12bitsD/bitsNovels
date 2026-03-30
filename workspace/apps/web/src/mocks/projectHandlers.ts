import { http, HttpResponse } from 'msw';

const mockProjectSettings = {
  id: '1',
  name: 'The Great Novel',
  type: 'novel',
  tags: ['玄幻', '悬疑'],
  description: 'A great novel',
  status: 'active',
  cover_color: '#8B6914',
  total_chars: 15000,
  volume_count: 2,
  chapter_count: 10,
  knowledge_base_count: 25,
  created_at: '2023-10-01T12:00:00Z',
  updated_at: '2023-10-15T12:00:00Z',
  daily_goal: 2000,
  total_goal: 100000,
  ai_style: 'balanced',
};

export const projectHandlers = [
  http.get('http://localhost:5173/api/projects/:projectId/settings', () => {
    return HttpResponse.json(mockProjectSettings);
  }),
  http.patch('http://localhost:5173/api/projects/:projectId', async ({ request }) => {
    const body = await request.json() as { name?: string };
    if (body.name === 'Fail Project') {
      return new HttpResponse(JSON.stringify({ detail: '更新失败' }), { status: 500 });
    }
    return HttpResponse.json({ ...mockProjectSettings, ...body });
  }),
  http.delete('http://localhost:5173/api/projects/:projectId', () => {
    return new HttpResponse(null, { status: 204 });
  }),
  http.get('http://localhost:5173/api/projects', () => {
    return HttpResponse.json([
      {
        id: '1',
        name: 'The Great Novel',
        type: 'novel',
        tags: ['玄幻', '悬疑'],
        status: 'active',
        cover_color: '#8B6914',
        total_chars: 15000,
        volume_count: 2,
        chapter_count: 10,
        updated_at: '2023-10-01T12:00:00Z',
      },
      {
        id: '2',
        name: 'Short Story',
        type: 'short',
        tags: ['言情'],
        status: 'active',
        cover_color: '#4A7C59',
        total_chars: 5000,
        volume_count: 1,
        chapter_count: 3,
        updated_at: '2023-09-15T12:00:00Z',
      }
    ]);
  }),

  http.post('http://localhost:5173/api/projects', async ({ request }) => {
    const body = await request.json() as { name?: string } & Record<string, unknown>;
    if (body.name === 'Conflict Project') {
      return new HttpResponse(JSON.stringify({ detail: '已有同名项目，请修改名称' }), { status: 409 });
    }
    return HttpResponse.json({
      id: '3',
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { status: 201 });
  }),
  
  // relative fallback
  http.get('/api/projects', () => {
    return HttpResponse.json([
      {
        id: '1',
        name: 'The Great Novel',
        type: 'novel',
        tags: ['玄幻', '悬疑'],
        status: 'active',
        cover_color: '#8B6914',
        total_chars: 15000,
        volume_count: 2,
        chapter_count: 10,
        updated_at: '2023-10-01T12:00:00Z',
      },
      {
        id: '2',
        name: 'Short Story',
        type: 'short',
        tags: ['言情'],
        status: 'active',
        cover_color: '#4A7C59',
        total_chars: 5000,
        volume_count: 1,
        chapter_count: 3,
        updated_at: '2023-09-15T12:00:00Z',
      },
    ]);
  }),

  http.post('/api/projects', async ({ request }) => {
    const body = await request.json() as { name?: string } & Record<string, unknown>;
    if (body.name === 'Conflict Project') {
      return new HttpResponse(JSON.stringify({ detail: '已有同名项目，请修改名称' }), { status: 409 });
    }
    return HttpResponse.json({
      id: '3',
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { status: 201 });
  }),

  // Goals handlers
  http.get('http://localhost:5173/api/projects/:projectId/goals', () => {
    return HttpResponse.json({
      dailyWordTarget: 3000,
      totalWordTarget: 500000,
      deadline: '2026-12-31'
    });
  }),

  http.put('http://localhost:5173/api/projects/:projectId/goals', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body);
  }),

  http.delete('http://localhost:5173/api/projects/:projectId/goals', () => {
    return HttpResponse.json({ message: 'Goals cleared' });
  }),

  // Writing stats handlers
  http.get('http://localhost:5173/api/projects/:projectId/writing-stats', () => {
    const trend30d = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        writtenChars: Math.floor(Math.random() * 4000) + 500
      };
    });
    return HttpResponse.json({
      todayWrittenChars: 2150,
      todayTarget: 3000,
      todayProgressPercent: 71.67,
      totalWrittenChars: 125000,
      totalTarget: 500000,
      totalProgressPercent: 25,
      trend30d,
      estimatedCompletionDate: '2027-06-15'
    });
  }),

  // Archive handlers
  http.post('http://localhost:5173/api/projects/:projectId/archive', () => {
    return HttpResponse.json({ status: 'archived', archivedAt: new Date().toISOString() });
  }),

  http.post('http://localhost:5173/api/projects/:projectId/unarchive', () => {
    return HttpResponse.json({ status: 'active' });
  }),

  // Relative path fallbacks
  http.get('/api/projects/:projectId/goals', () => {
    return HttpResponse.json({
      dailyWordTarget: 3000,
      totalWordTarget: 500000,
      deadline: '2026-12-31'
    });
  }),

  http.put('/api/projects/:projectId/goals', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body);
  }),

  http.delete('/api/projects/:projectId/goals', () => {
    return HttpResponse.json({ message: 'Goals cleared' });
  }),

  http.get('/api/projects/:projectId/writing-stats', () => {
    const trend30d = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        writtenChars: Math.floor(Math.random() * 4000) + 500
      };
    });
    return HttpResponse.json({
      todayWrittenChars: 2150,
      todayTarget: 3000,
      todayProgressPercent: 71.67,
      totalWrittenChars: 125000,
      totalTarget: 500000,
      totalProgressPercent: 25,
      trend30d,
      estimatedCompletionDate: '2027-06-15'
    });
  }),

  http.post('/api/projects/:projectId/archive', () => {
    return HttpResponse.json({ status: 'archived', archivedAt: new Date().toISOString() });
  }),

  http.post('/api/projects/:projectId/unarchive', () => {
    return HttpResponse.json({ status: 'active' });
  }),

  http.get('/api/projects/:projectId/settings', () => {
    return HttpResponse.json(mockProjectSettings);
  }),
  http.patch('/api/projects/:projectId', async ({ request }) => {
    const body = await request.json() as { name?: string };
    if (body.name === 'Fail Project') {
      return new HttpResponse(JSON.stringify({ detail: '更新失败' }), { status: 500 });
    }
    return HttpResponse.json({ ...mockProjectSettings, ...body });
  }),
  http.delete('/api/projects/:projectId', () => {
    return new HttpResponse(null, { status: 204 });
  })
];
