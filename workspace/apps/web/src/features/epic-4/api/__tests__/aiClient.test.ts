import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAITask, streamAITask } from '../aiClient';

describe('aiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('createAITask sends payload and returns json', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ taskId: 't1', task: { id: 't1' } }), { status: 200 }),
    );

    const result = await createAITask({ projectId: 'p1', type: 'continue', parameters: { maxLength: 100 } });
    expect(result.taskId).toBe('t1');
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('streamAITask parses SSE data lines', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"task.started","taskId":"t1"}\n\n'));
        controller.enqueue(encoder.encode('data: {"type":"task.delta","taskId":"t1","content":"Hi"}\n\n'));
        controller.enqueue(encoder.encode('data: {"type":"task.completed","taskId":"t1","result":{"taskId":"t1","type":"continue","status":"done","payloadType":"text","payload":{"content":"Hi"},"createdAt":""}}\n\n'));
        controller.close();
      },
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    );

    const events: Array<{ type: string }> = [];
    await streamAITask('t1', (event) => events.push(event as { type: string }));
    expect(events.map((e) => e.type)).toEqual(['task.started', 'task.delta', 'task.completed']);
  });
});

