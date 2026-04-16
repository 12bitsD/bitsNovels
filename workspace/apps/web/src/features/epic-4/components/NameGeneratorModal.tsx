import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Modal } from '../../../components/ui/Modal';
import type { AIResult, AINamesPayload } from '../types';
import { createAITask, streamAITask, type AITaskStreamEvent } from '../api/aiClient';

type NameGenType = 'character' | 'location' | 'item';

interface NameGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  nameType?: NameGenType;
  onFill?: (name: string) => void;
}

function isNamesResult(result: AIResult): result is AIResult & { payload: AINamesPayload } {
  return (
    result.payloadType === 'names' &&
    typeof result.payload === 'object' &&
    result.payload !== null &&
    Array.isArray((result.payload as AINamesPayload).names)
  );
}

export function NameGeneratorModal({
  isOpen,
  onClose,
  projectId,
  nameType = 'character',
  onFill,
}: NameGeneratorModalProps) {
  const [gender, setGender] = useState('不限');
  const [style, setStyle] = useState('古风');
  const [requirements, setRequirements] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle');
  const [error, setError] = useState('');
  const [names, setNames] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const canFill = Boolean(onFill);

  const reset = useCallback(() => {
    setStatus('idle');
    setError('');
    setNames([]);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    reset();
    onClose();
  }, [onClose, reset]);

  const generate = useCallback(async () => {
    if (!projectId) {
      setError('缺少 projectId');
      setStatus('failed');
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setStatus('loading');
    setError('');
    setNames([]);

    try {
      const task = await createAITask({
        projectId,
        type: 'name_gen',
        parameters: {
          nameType,
          style,
          gender: nameType === 'character' ? gender : undefined,
          requirements: requirements.trim() || undefined,
        },
      });

      await streamAITask(
        task.taskId,
        (event: AITaskStreamEvent) => {
          if (event.type === 'task.completed') {
            const result = event.result;
            if (!isNamesResult(result)) {
              setError('返回结果格式不正确');
              setStatus('failed');
              return;
            }
            setNames(result.payload.names);
            setStatus('done');
          }
          if (event.type === 'task.failed') {
            setError(event.error || '生成失败');
            setStatus('failed');
          }
        },
        abortRef.current.signal,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
      setStatus('failed');
    }
  }, [gender, nameType, projectId, requirements, style]);

  const title = useMemo(() => {
    const label = nameType === 'character' ? '人名' : nameType === 'location' ? '地名' : '道具名';
    return `AI 起名 · ${label}`;
  }, [nameType]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-border bg-white px-4 py-2 text-sm text-ink hover:bg-black/5"
          >
            关闭
          </button>
          <button
            type="button"
            onClick={() => void generate()}
            className="rounded-md border border-border bg-amber/20 px-4 py-2 text-sm text-ink hover:bg-amber/30 disabled:opacity-60"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? '生成中…' : names.length > 0 ? '重新生成' : '生成 10 个候选'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-light">类型</span>
            <select
              value={nameType}
              onChange={() => {
                // keep controlled by parent; users open with correct type
              }}
              disabled
              className="w-full rounded-md border border-border bg-black/5 px-3 py-2 text-sm text-ink"
            >
              <option value="character">人名</option>
              <option value="location">地名</option>
              <option value="item">道具名</option>
            </select>
          </label>

          {nameType === 'character' ? (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-light">性别</span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-amber"
              >
                <option value="不限">不限</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-light">风格/文化背景</span>
            <input
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-amber"
              placeholder="例如：古风、玄幻、赛博、日式…"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-light">附加要求（可选）</span>
            <input
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-amber"
              placeholder="例如：两字/带“砚”/不要谐音…"
            />
          </label>
        </div>

        {error ? (
          <div className="rounded-md border border-border bg-black/5 p-3 text-sm text-ink-light">{error}</div>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs font-medium text-ink-light">候选（固定 10 个）</p>
          {status === 'idle' ? (
            <div className="rounded-md border border-border bg-black/5 p-3 text-sm text-ink-light">
              点击“生成 10 个候选”开始。
            </div>
          ) : null}
          {status === 'loading' ? (
            <div className="rounded-md border border-border bg-black/5 p-3 text-sm text-ink-light">生成中…</div>
          ) : null}
          {status === 'done' ? (
            <div className="space-y-2">
              {names.map((name) => (
                <div key={name} className="flex items-center justify-between rounded-md border border-border bg-white px-3 py-2">
                  <span className="text-sm text-ink">{name}</span>
                  <div className="flex items-center gap-2">
                    {canFill ? (
                      <button
                        type="button"
                        onClick={() => onFill?.(name)}
                        className="rounded-md border border-border bg-amber/20 px-2 py-1 text-xs text-ink hover:bg-amber/30"
                      >
                        填入
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard?.writeText(name)}
                      className="rounded-md border border-border bg-white px-2 py-1 text-xs text-ink-light hover:bg-black/5"
                    >
                      复制
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
