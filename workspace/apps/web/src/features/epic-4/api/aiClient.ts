import { extractApiErrorMessage } from '../../../api/client';
import type { AIResult, AITaskType } from '../types';

export type CreateAITaskRequest = {
  projectId: string;
  type: AITaskType;
  chapterId?: string | null;
  selectionText?: string | null;
  cursorOffset?: number | null;
  parameters?: Record<string, unknown>;
};

export type CreateAITaskResponse = {
  taskId: string;
  task: {
    id: string;
    projectId: string;
    type: AITaskType;
    status: string;
    chapterId?: string | null;
    configSnapshot: Record<string, unknown>;
    contextBlocks: Array<{
      source: string;
      priority: number;
      estimatedTokens: number;
      required: boolean;
      included: boolean;
      preview: string;
    }>;
    createdAt: string;
    updatedAt: string;
  };
};

export type AITaskStreamEvent =
  | { type: 'task.started'; taskId: string }
  | { type: 'task.delta'; taskId: string; content: string }
  | { type: 'task.completed'; taskId: string; result: AIResult }
  | { type: 'task.stopped'; taskId: string; result: AIResult }
  | { type: 'task.failed'; taskId: string; error: string };

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function createAITask(payload: CreateAITaskRequest): Promise<CreateAITaskResponse> {
  const response = await fetch('/api/ai/tasks', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      ...payload,
      parameters: payload.parameters ?? {},
    }),
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(extractApiErrorMessage(json, '创建 AI 任务失败'));
  }

  return json as CreateAITaskResponse;
}

export async function stopAITask(taskId: string): Promise<{ task: unknown; result: AIResult }> {
  const response = await fetch(`/api/ai/tasks/${taskId}/stop`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(extractApiErrorMessage(json, '停止 AI 任务失败'));
  }

  return json as { task: unknown; result: AIResult };
}

export async function streamAITask(
  taskId: string,
  onEvent: (event: AITaskStreamEvent) => void,
  signal?: AbortSignal,
) {
  const response = await fetch(`/api/ai/tasks/${taskId}/stream`, {
    method: 'GET',
    headers: authHeaders(),
    signal,
  });

  if (!response.ok || !response.body) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    throw new Error(extractApiErrorMessage(payload, '订阅 AI 流失败'));
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trimEnd();
      buffer = buffer.slice(newlineIndex + 1);
      newlineIndex = buffer.indexOf('\n');

      if (!line.startsWith('data: ')) continue;
      const rawJson = line.slice('data: '.length);
      if (!rawJson) continue;

      try {
        onEvent(JSON.parse(rawJson) as AITaskStreamEvent);
      } catch {
        // Ignore malformed chunks.
      }
    }
  }
}

