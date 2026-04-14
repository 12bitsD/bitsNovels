import { http, HttpResponse } from 'msw';

const projectItems = [
  {
    id: '1',
    name: 'The Great Novel',
    type: 'novel',
    tags: ['玄幻', '悬疑'],
    status: 'active',
    coverColor: '#8B6914',
    totalChars: 15000,
    chapterCount: 10,
    updatedAt: '2023-10-01T12:00:00Z',
  },
  {
    id: '2',
    name: 'Short Story',
    type: 'short',
    tags: ['言情'],
    status: 'active',
    coverColor: '#4A7C59',
    totalChars: 5000,
    chapterCount: 3,
    updatedAt: '2023-09-15T12:00:00Z',
  },
];

const mockProjectSettings = {
  project: {
    ...projectItems[0],
    description: 'A great novel',
    createdAt: '2023-10-01T12:00:00Z',
  },
  stats: {
    volumeCount: 2,
    chapterCount: 10,
    totalChars: 15000,
    kbEntryCount: 25,
  },
  tabs: [
    { id: 'basic', label: '基本信息' },
    { id: 'goals', label: '写作目标' },
    { id: 'ai', label: 'AI 配置' },
    { id: 'backup', label: '备份与恢复' },
  ],
};

const pagedProjects = {
  items: projectItems,
  data: projectItems,
  total: projectItems.length,
  page: 1,
  limit: 20,
};

const conflictResponse = new HttpResponse(
  JSON.stringify({ error: { code: 'PROJECT_NAME_DUPLICATED', message: '已有同名项目，请修改名称', details: {} } }),
  { status: 409 },
);

const updateFailureResponse = new HttpResponse(
  JSON.stringify({ error: { code: 'PROJECT_UPDATE_FAILED', message: '更新失败', details: {} } }),
  { status: 500 },
);

export const projectHandlers = [
  http.get('http://localhost:5173/api/projects/:projectId/settings', () => {
    return HttpResponse.json(mockProjectSettings);
  }),
  http.patch('http://localhost:5173/api/projects/:projectId', async ({ request }) => {
    const body = await request.json() as { name?: string };
    if (body.name === 'Fail Project') {
      return updateFailureResponse;
    }
    return HttpResponse.json({
      ok: true,
      project: { ...mockProjectSettings.project, ...body },
    });
  }),
  http.delete('http://localhost:5173/api/projects/:projectId', async ({ request }) => {
    const body = await request.json() as { confirmationName?: string };
    if (body.confirmationName !== mockProjectSettings.project.name) {
      return new HttpResponse(
        JSON.stringify({ error: { code: 'PROJECT_NAME_CONFIRMATION_MISMATCH', message: 'Project confirmation name mismatch', details: {} } }),
        { status: 400 },
      );
    }
    return HttpResponse.json({ ok: true });
  }),
  http.get('http://localhost:5173/api/projects', () => {
    return HttpResponse.json(pagedProjects);
  }),
  http.post('http://localhost:5173/api/projects', async ({ request }) => {
    const body = await request.json() as { name?: string };
    if (body.name === 'Conflict Project') {
      return conflictResponse;
    }
    return HttpResponse.json(
      {
        projectId: '3',
        defaultVolumeId: 'volume-1',
        firstChapterId: 'chapter-1',
        importedEntryCount: 0,
      },
      { status: 201 },
    );
  }),

  http.get('/api/projects', () => {
    return HttpResponse.json(pagedProjects);
  }),
  http.post('/api/projects', async ({ request }) => {
    const body = await request.json() as { name?: string };
    if (body.name === 'Conflict Project') {
      return conflictResponse;
    }
    return HttpResponse.json(
      {
        projectId: '3',
        defaultVolumeId: 'volume-1',
        firstChapterId: 'chapter-1',
        importedEntryCount: 0,
      },
      { status: 201 },
    );
  }),

  http.get('http://localhost:5173/api/projects/:projectId/goals', () => {
    return HttpResponse.json({
      dailyWordTarget: 3000,
      totalWordTarget: 500000,
      deadline: '2026-12-31',
    });
  }),
  http.put('http://localhost:5173/api/projects/:projectId/goals', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body);
  }),
  http.delete('http://localhost:5173/api/projects/:projectId/goals', () => {
    return HttpResponse.json({ message: 'Goals cleared' });
  }),

  http.get('http://localhost:5173/api/projects/:projectId/writing-stats', () => {
    const trend30d = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        writtenChars: Math.floor(Math.random() * 4000) + 500,
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
      estimatedCompletionDate: '2027-06-15',
    });
  }),
  http.post('http://localhost:5173/api/projects/:projectId/archive', () => {
    return HttpResponse.json({ status: 'archived', archivedAt: new Date().toISOString() });
  }),
  http.post('http://localhost:5173/api/projects/:projectId/unarchive', () => {
    return HttpResponse.json({ status: 'active' });
  }),

  http.get('/api/projects/:projectId/goals', () => {
    return HttpResponse.json({
      dailyWordTarget: 3000,
      totalWordTarget: 500000,
      deadline: '2026-12-31',
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
        writtenChars: Math.floor(Math.random() * 4000) + 500,
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
      estimatedCompletionDate: '2027-06-15',
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
      return updateFailureResponse;
    }
    return HttpResponse.json({
      ok: true,
      project: { ...mockProjectSettings.project, ...body },
    });
  }),
  http.delete('/api/projects/:projectId', async ({ request }) => {
    const body = await request.json() as { confirmationName?: string };
    if (body.confirmationName !== mockProjectSettings.project.name) {
      return new HttpResponse(
        JSON.stringify({ error: { code: 'PROJECT_NAME_CONFIRMATION_MISMATCH', message: 'Project confirmation name mismatch', details: {} } }),
        { status: 400 },
      );
    }
    return HttpResponse.json({ ok: true });
  }),
];
