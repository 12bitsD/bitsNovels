import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import { EditorContent } from '@tiptap/react';
import { StatusBar } from './StatusBar';
import { useAutoSave } from '../hooks/useAutoSave';
import { calculateWordCount, calculateSelectionCount, type SaveSource } from '../utils/editorConfig';
import { client } from '../../../api/client';
import { createAITask, stopAITask, streamAITask } from '../../epic-4/api/aiClient';
import { AIDraftNode } from '../../epic-4/editor/aiDraftNode';
import type { AIDiffChange, AIResult } from '../../epic-4/types';

function stripAIDrafts(json: unknown): unknown {
  if (json === null || json === undefined) return json;
  if (Array.isArray(json)) {
    return json.map(stripAIDrafts).filter((value) => value !== null);
  }
  if (typeof json !== 'object') return json;

  const record = json as Record<string, unknown>;
  if (record.type === 'aiDraft') return null;

  const content = record.content;
  if (Array.isArray(content)) {
    const next = content.map(stripAIDrafts).filter((value) => value !== null);
    return { ...record, content: next };
  }

  return record;
}

function getTextPayloadContent(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const record = payload as Record<string, unknown>;
  const content = record.content;
  return typeof content === 'string' ? content : undefined;
}

function getDiffPayload(payload: unknown): { diff: AIDiffChange[]; revisedText?: string } | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const record = payload as Record<string, unknown>;
  const diff = record.diff;
  if (!Array.isArray(diff)) return undefined;
  const changes: AIDiffChange[] = diff
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const r = item as Record<string, unknown>;
      const type = r.type;
      const content = r.content;
      if ((type === 'insert' || type === 'delete') && typeof content === 'string') {
        return { type, content } as AIDiffChange;
      }
      return null;
    })
    .filter((v): v is AIDiffChange => Boolean(v));
  const revisedText = typeof record.revisedText === 'string' ? record.revisedText : undefined;
  return { diff: changes, revisedText };
}

export interface EditorWorkspaceProps {
  projectId: string;
  chapterId: string;
  initialContent?: string;
  initialTitle?: string;
}

export function EditorWorkspace({ projectId, chapterId, initialContent = '', initialTitle = '' }: EditorWorkspaceProps) {
  const [title, setTitle] = useState(initialTitle);
  const [wordCount, setWordCount] = useState(0);
  const [selectionCount, setSelectionCount] = useState(0);
  const [continueOpen, setContinueOpen] = useState(false);
  const [continueLength, setContinueLength] = useState<100 | 300 | 500>(300);
  const [aiDraftId, setAiDraftId] = useState<string | null>(null);
  const [aiDraftStatus, setAiDraftStatus] = useState<'idle' | 'generating' | 'done' | 'stopped' | 'failed'>('idle');
  const [aiDraftText, setAiDraftText] = useState('');
  const aiAbortRef = useRef<AbortController | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffTaskId, setDiffTaskId] = useState<string | null>(null);
  const [diffTitle, setDiffTitle] = useState<string>('AI Diff');
  const [diffChanges, setDiffChanges] = useState<AIDiffChange[]>([]);
  const [diffRevisedText, setDiffRevisedText] = useState<string>('');
  const diffSelectionRef = useRef<{ from: number; to: number; original: string } | null>(null);
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [dialogueCharacterName, setDialogueCharacterName] = useState('角色');
  const [dialogueScene, setDialogueScene] = useState('');
  const isGeneratingDraft = aiDraftId !== null && aiDraftStatus === 'generating';

  const handleSave = useCallback(async (content: string, source: SaveSource) => {
    // Never persist temporary AI draft blocks into chapter content.
    let safeContent = content;
    try {
      const parsed = JSON.parse(content);
      safeContent = JSON.stringify(stripAIDrafts(parsed));
    } catch {
      safeContent = content;
    }

    const { error } = await client.PATCH(`/api/projects/${projectId}/chapters/${chapterId}`, {
      body: {
        content: safeContent,
        title,
        saveSource: source,
      },
    });

    if (error) {
      throw new Error('Save failed');
    }
  }, [projectId, chapterId, title]);

  const { saveStatus, lastSavedAt, saveNow } = useAutoSave({
    content: initialContent,
    onSave: handleSave,
    debounceMs: 3000,
    maxRetries: 3,
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      CharacterCount,
      AIDraftNode,
    ],
    content: initialContent,
    onCreate: ({ editor }) => {
      const json = editor.getJSON();
      const content = JSON.stringify(stripAIDrafts(json));
      setWordCount(calculateWordCount(content));
      setSelectionCount(calculateSelectionCount(editor));
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const content = JSON.stringify(stripAIDrafts(json));
      setWordCount(calculateWordCount(content));
    },
    onSelectionUpdate: ({ editor }) => {
      setSelectionCount(calculateSelectionCount(editor));
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-6',
      },
    },
  });

  const findDraftPos = useCallback<(draftId: string) => { pos: number; nodeSize: number } | null>(
    (draftId: string) => {
      if (!editor) return null;
      let found: { pos: number; nodeSize: number } | null = null;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'aiDraft' && node.attrs?.draftId === draftId) {
          found = { pos, nodeSize: node.nodeSize };
          return false;
        }
        return true;
      });
      return found;
    },
    [editor],
  );

  const upsertDraftText = useCallback(
    (draftId: string, nextText: string, status: string) => {
      if (!editor) return;
      editor.commands.command(({ tr, state }) => {
        const loc = findDraftPos(draftId);
        if (!loc) return false;
        const type = state.schema.nodes.aiDraft;
        if (!type) return false;
        const textNode = nextText ? state.schema.text(nextText) : null;
        const node = type.create({ draftId, status }, textNode ? [textNode] : []);
        tr.replaceWith(loc.pos, loc.pos + loc.nodeSize, node);
        return true;
      });
    },
    [editor, findDraftPos],
  );

  const discardDraft = useCallback(() => {
    if (!editor || !aiDraftId) return;
    editor.commands.command(({ tr }) => {
      const loc = findDraftPos(aiDraftId);
      if (!loc) return false;
      tr.delete(loc.pos, loc.pos + loc.nodeSize);
      return true;
    });
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
    setAiDraftId(null);
    setAiDraftText('');
    setAiDraftStatus('idle');
  }, [aiDraftId, editor, findDraftPos]);

  const acceptDraft = useCallback(() => {
    if (!editor || !aiDraftId) return;
    const text = aiDraftText;
    editor.commands.command(({ tr, state }) => {
      const loc = findDraftPos(aiDraftId);
      if (!loc) return false;
      const paragraph = state.schema.nodes.paragraph;
      if (!paragraph) return false;
      const node = paragraph.create({}, text ? [state.schema.text(text)] : []);
      tr.replaceWith(loc.pos, loc.pos + loc.nodeSize, node);
      return true;
    });
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
    setAiDraftId(null);
    setAiDraftText('');
    setAiDraftStatus('idle');
  }, [aiDraftId, aiDraftText, editor, findDraftPos]);

  const stopContinue = useCallback(async () => {
    if (!aiDraftId || aiDraftStatus !== 'generating') return;
    try {
      await stopAITask(aiDraftId);
    } catch {
      // Ignore stop failures; aborting stream still freezes UI.
    }
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
    setAiDraftStatus('stopped');
    upsertDraftText(aiDraftId, aiDraftText, 'stopped');
  }, [aiDraftId, aiDraftStatus, aiDraftText, upsertDraftText]);

  const startContinue = useCallback(async () => {
    if (!editor) return;
    if (isGeneratingDraft) return;
    setContinueOpen(false);
    try {
      setAiDraftStatus('generating');
      setAiDraftText('');

      const created = await createAITask({
        projectId,
        chapterId,
        type: 'continue',
        cursorOffset: editor.state.selection.to,
        parameters: { maxLength: continueLength },
      });

      const draftId = created.taskId;
      setAiDraftId(draftId);
      editor.commands.insertContent({
        type: 'aiDraft',
        attrs: { draftId, status: 'generating' },
        content: [],
      });

      const abort = new AbortController();
      aiAbortRef.current = abort;
      let acc = '';

      await streamAITask(
        draftId,
        (event) => {
          if (event.type === 'task.delta') {
            acc += event.content;
            setAiDraftText(acc);
            upsertDraftText(draftId, acc, 'generating');
          }
          if (event.type === 'task.completed') {
            const content =
              event.result.payloadType === 'text'
                ? (getTextPayloadContent(event.result.payload) ?? acc)
                : acc;
            acc = content;
            setAiDraftStatus('done');
            setAiDraftText(content);
            upsertDraftText(draftId, content, 'done');
          }
          if (event.type === 'task.stopped') {
            setAiDraftStatus('stopped');
            if (event.result.payloadType === 'text') {
              const content = getTextPayloadContent(event.result.payload) ?? acc;
              setAiDraftText(content);
              upsertDraftText(draftId, content, 'stopped');
            }
          }
          if (event.type === 'task.failed') {
            setAiDraftStatus('failed');
            upsertDraftText(draftId, acc, 'failed');
          }
        },
        abort.signal,
      );
    } catch {
      setAiDraftStatus('failed');
      aiAbortRef.current = null;
      if (aiDraftId) {
        upsertDraftText(aiDraftId, aiDraftText, 'failed');
      }
    }
  }, [aiDraftId, aiDraftText, chapterId, continueLength, editor, isGeneratingDraft, projectId, upsertDraftText]);

  const startDiffTask = useCallback(
    async (taskType: 'polish' | 'expand' | 'summarize') => {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      if (from === to) return;
      const original = editor.state.doc.textBetween(from, to, '\n');
      diffSelectionRef.current = { from, to, original };
      setDiffTitle(taskType === 'polish' ? 'AI 润色' : taskType === 'expand' ? 'AI 扩写' : 'AI 缩写');
      setDiffOpen(true);
      setDiffChanges([]);
      setDiffRevisedText('');
      setDiffTaskId(null);

      const created = await createAITask({
        projectId,
        chapterId,
        type: taskType,
        selectionText: original,
        cursorOffset: from,
        parameters:
          taskType === 'expand'
            ? { multiplier: 1.6 }
            : taskType === 'summarize'
              ? { ratio: 0.6 }
              : {},
      });
      setDiffTaskId(created.taskId);

      await streamAITask(created.taskId, (event) => {
        if (event.type === 'task.completed' || event.type === 'task.stopped') {
          const result: AIResult = event.result;
          if (result.payloadType === 'diff') {
            const parsed = getDiffPayload(result.payload);
            setDiffChanges(parsed?.diff ?? []);
            setDiffRevisedText(parsed?.revisedText ?? '');
          }
        }
      });
    },
    [chapterId, editor, projectId],
  );

  const applyDiffReplaceSelection = useCallback(() => {
    if (!editor) return;
    const sel = diffSelectionRef.current;
    if (!sel) return;
    if (!diffRevisedText) return;
    editor.commands.insertContentAt({ from: sel.from, to: sel.to }, diffRevisedText);
    setDiffOpen(false);
    setDiffTaskId(null);
    setDiffChanges([]);
    setDiffRevisedText('');
  }, [diffRevisedText, editor]);

  const startDialogue = useCallback(async () => {
    if (!editor) return;
    if (isGeneratingDraft) return;
    setDialogueOpen(false);
    try {
      setAiDraftStatus('generating');
      setAiDraftText('');

      const created = await createAITask({
        projectId,
        chapterId,
        type: 'dialogue',
        cursorOffset: editor.state.selection.to,
        parameters: { characterName: dialogueCharacterName, scene: dialogueScene, maxLength: 300 },
      });

      const draftId = created.taskId;
      setAiDraftId(draftId);
      editor.commands.insertContent({
        type: 'aiDraft',
        attrs: { draftId, status: 'generating' },
        content: [],
      });

      const abort = new AbortController();
      aiAbortRef.current = abort;
      let acc = '';

      await streamAITask(
        draftId,
        (event) => {
          if (event.type === 'task.delta') {
            acc += event.content;
            setAiDraftText(acc);
            upsertDraftText(draftId, acc, 'generating');
          }
          if (event.type === 'task.completed') {
            const content =
              event.result.payloadType === 'text'
                ? (getTextPayloadContent(event.result.payload) ?? acc)
                : acc;
            acc = content;
            setAiDraftStatus('done');
            setAiDraftText(content);
            upsertDraftText(draftId, content, 'done');
          }
          if (event.type === 'task.stopped') {
            setAiDraftStatus('stopped');
            if (event.result.payloadType === 'text') {
              const content = getTextPayloadContent(event.result.payload) ?? acc;
              setAiDraftText(content);
              upsertDraftText(draftId, content, 'stopped');
            }
          }
          if (event.type === 'task.failed') {
            setAiDraftStatus('failed');
            upsertDraftText(draftId, acc, 'failed');
          }
        },
        abort.signal,
      );
    } catch {
      setAiDraftStatus('failed');
      aiAbortRef.current = null;
      if (aiDraftId) {
        upsertDraftText(aiDraftId, aiDraftText, 'failed');
      }
    }
  }, [
    aiDraftId,
    aiDraftText,
    chapterId,
    dialogueCharacterName,
    dialogueScene,
    editor,
    isGeneratingDraft,
    projectId,
    upsertDraftText,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveNow();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'j') {
        event.preventDefault();
        setContinueOpen(true);
      }
      if (event.key === 'Escape') {
        void stopContinue();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveNow, stopContinue]);

  if (!editor) {
    return (
      <div className="max-w-[800px] mx-auto p-4">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="h-[400px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="mb-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="章节标题"
          className="w-full text-2xl font-bold bg-transparent border-0 border-b-2 border-transparent focus:border-amber-500 focus:outline-none px-0 py-2 text-ink dark:text-gray-100 placeholder-gray-400"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4 py-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            AI: <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Ctrl/Cmd+J</kbd> 续写，
            <kbd className="ml-1 px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Esc</kbd> 停止
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1 rounded bg-amber-500/90 hover:bg-amber-500 text-white text-sm disabled:opacity-50"
              onClick={() => setContinueOpen(true)}
              disabled={isGeneratingDraft}
            >
              AI 续写
            </button>
            <button
              type="button"
              className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm text-ink dark:text-gray-100 disabled:opacity-50"
              onClick={() => setDialogueOpen(true)}
              disabled={isGeneratingDraft}
            >
              AI 对话
            </button>
            <button
              type="button"
              className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm text-ink dark:text-gray-100 disabled:opacity-50"
              onClick={() => void startDiffTask('polish')}
              disabled={selectionCount === 0 || isGeneratingDraft}
            >
              AI 润色
            </button>
            <button
              type="button"
              className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm text-ink dark:text-gray-100 disabled:opacity-50"
              onClick={() => void startDiffTask('expand')}
              disabled={selectionCount === 0 || isGeneratingDraft}
            >
              AI 扩写
            </button>
            <button
              type="button"
              className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm text-ink dark:text-gray-100 disabled:opacity-50"
              onClick={() => void startDiffTask('summarize')}
              disabled={selectionCount === 0 || isGeneratingDraft}
            >
              AI 缩写
            </button>
            {isGeneratingDraft ? (
              <button
                type="button"
                className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm text-ink dark:text-gray-100"
                onClick={() => void stopContinue()}
              >
                停止
              </button>
            ) : null}
          </div>
        </div>
        <EditorContent editor={editor} className="min-h-[400px]" />
        <StatusBar
          wordCount={wordCount}
          selectionCount={selectionCount}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
        />
      </div>

      {aiDraftId && aiDraftStatus !== 'generating' ? (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-600/90 text-white text-sm"
            onClick={acceptDraft}
          >
            采纳
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm text-ink dark:text-gray-100"
            onClick={discardDraft}
          >
            放弃
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm text-ink dark:text-gray-100"
            onClick={() => {
              discardDraft();
              setContinueOpen(true);
            }}
          >
            重生成
          </button>
        </div>
      ) : null}

      {continueOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[360px] rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xl">
            <div className="mb-3 text-sm font-medium text-ink dark:text-gray-100">AI 续写长度</div>
            <div className="mb-4 space-y-2 text-sm text-ink dark:text-gray-100">
              <label className="flex items-center gap-2">
                <input type="radio" checked={continueLength === 100} onChange={() => setContinueLength(100)} />
                <span>短（100）</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={continueLength === 300} onChange={() => setContinueLength(300)} />
                <span>中（300）</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={continueLength === 500} onChange={() => setContinueLength(500)} />
                <span>长（500）</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm text-ink dark:text-gray-100"
                onClick={() => setContinueOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded bg-amber-500/90 hover:bg-amber-500 text-white text-sm disabled:opacity-50"
                disabled={isGeneratingDraft}
                onClick={() => void startContinue()}
              >
                开始
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {dialogueOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[420px] rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xl">
            <div className="mb-3 text-sm font-medium text-ink dark:text-gray-100">AI 对话</div>
            <div className="space-y-3 text-sm text-ink dark:text-gray-100">
              <label className="block">
                <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">角色名</div>
                <input
                  value={dialogueCharacterName}
                  onChange={(e) => setDialogueCharacterName(e.target.value)}
                  className="w-full rounded border border-gray-200 dark:border-gray-800 bg-transparent px-2 py-1"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">场景（&lt;=200）</div>
                <textarea
                  value={dialogueScene}
                  onChange={(e) => setDialogueScene(e.target.value.slice(0, 200))}
                  className="w-full rounded border border-gray-200 dark:border-gray-800 bg-transparent px-2 py-1"
                  rows={3}
                />
              </label>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm text-ink dark:text-gray-100"
                onClick={() => setDialogueOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded bg-amber-500/90 hover:bg-amber-500 text-white text-sm disabled:opacity-50"
                disabled={isGeneratingDraft}
                onClick={() => void startDialogue()}
              >
                开始
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {diffOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[720px] max-w-[92vw] rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium text-ink dark:text-gray-100">{diffTitle}</div>
              <button
                type="button"
                className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-xs text-ink dark:text-gray-100"
                onClick={() => setDiffOpen(false)}
              >
                关闭
              </button>
            </div>
            <div className="rounded border border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-950/40 p-3 min-h-[160px]">
              {diffTaskId && diffChanges.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">生成中...</div>
              ) : (
                <div className="text-sm leading-6">
                  {diffChanges.map((c, idx) => (
                    <span
                      key={idx}
                      className={
                        c.type === 'insert'
                          ? 'bg-emerald-200/40 text-emerald-900 dark:text-emerald-200 rounded px-0.5'
                          : 'bg-rose-200/40 text-rose-900 dark:text-rose-200 line-through rounded px-0.5'
                      }
                    >
                      {c.content}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm text-ink dark:text-gray-100 disabled:opacity-50"
                onClick={() => setDiffOpen(false)}
              >
                放弃
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-600/90 text-white text-sm disabled:opacity-50"
                disabled={!diffRevisedText}
                onClick={applyDiffReplaceSelection}
              >
                采纳
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>快捷键: <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Ctrl+S</kbd> 保存</p>
        <p>Markdown 支持: **加粗** *斜体* ## 标题</p>
      </div>
    </div>
  );
}
