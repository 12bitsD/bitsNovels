import { http, HttpResponse } from 'msw';

export const projectHandlers = [
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
  })
];
