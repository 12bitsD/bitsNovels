import { Sparkles, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import type {
  StoryCopilotCard,
  StoryCopilotCardActionType,
  StoryCopilotEvent,
  StoryCopilotMode,
  StoryCopilotScaffoldState,
  StoryCopilotSession,
} from '../types';
import { client, extractApiErrorMessage } from '../../../api/client';

const MODE_LABELS: Record<StoryCopilotMode, string> = {
  worldbuild: '想设定',
  plot_derive_lite: '推剧情',
  story_diagnose: '看建议',
};

interface StoryCopilotPanelProps {
  projectId: string;
  chapterId?: string;
  isOpen: boolean;
  onClose: () => void;
  activeMode: StoryCopilotMode;
  onModeChange: (mode: StoryCopilotMode) => void;
  state: StoryCopilotScaffoldState;
  sessions: StoryCopilotSession[];
  sessionsLoading?: boolean;
  sessionsError?: string;
  reloadSessions?: () => Promise<void>;
}

export function StoryCopilotPanel({
  projectId,
  chapterId,
  isOpen,
  onClose,
  activeMode,
  onModeChange,
  state,
  sessions,
  sessionsLoading = false,
  sessionsError = '',
  reloadSessions,
}: StoryCopilotPanelProps) {
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [events, setEvents] = useState<StoryCopilotEvent[]>([]);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayError, setReplayError] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [sending, setSending] = useState(false);

  const cardsById = useMemo(() => {
    const cards = new Map<string, StoryCopilotCard>();
    for (const event of events) {
      if (event.type === 'card' && event.card) {
        cards.set(event.card.id, event.card);
      }
      if (event.type === 'card_action' && event.cardAction) {
        const existing = cards.get(event.cardAction.cardId);
        if (!existing) {
          continue;
        }
        const nextStatus =
          event.cardAction.action === 'adopt'
            ? 'adopted'
            : event.cardAction.action === 'dismiss'
              ? 'dismissed'
              : existing.status;
        cards.set(event.cardAction.cardId, { ...existing, status: nextStatus });
      }
    }
    return cards;
  }, [events]);

  const fetchReplay = useCallback(
    async (sessionId: string) => {
      if (!sessionId) {
        setEvents([]);
        return;
      }
      setReplayLoading(true);
      setReplayError('');
      const { data, error } = await client.GET(`/api/copilot/sessions/${sessionId}`);
      if (error || !data) {
        setReplayError(extractApiErrorMessage(error, '加载会话失败'));
        setEvents([]);
        setReplayLoading(false);
        return;
      }
      const payload = data as { events?: StoryCopilotEvent[] };
      setEvents(payload.events ?? []);
      setReplayLoading(false);
    },
    [setEvents],
  );

  const selectSession = useCallback(
    async (sessionId: string) => {
      setActiveSessionId(sessionId);
      await fetchReplay(sessionId);
    },
    [fetchReplay],
  );

  const createSession = useCallback(
    async () => {
      if (!projectId) {
        return '';
      }
      const { data, error } = await client.POST(`/api/projects/${projectId}/copilot/sessions`, {
        body: {
          mode: activeMode,
          title: state.headline,
        },
      });
      if (error || !data) {
        setReplayError(extractApiErrorMessage(error, '创建会话失败'));
        return '';
      }
      const session = (data as { session: StoryCopilotSession }).session;
      await reloadSessions?.();
      setActiveSessionId(session.id);
      await fetchReplay(session.id);
      return session.id;
    },
    [activeMode, fetchReplay, projectId, reloadSessions, state.headline],
  );

  const sendMessage = useCallback(async () => {
    const content = messageDraft.trim();
    if (!content || sending) {
      return;
    }
    setSending(true);
    setReplayError('');

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await createSession();
    }
    if (!sessionId) {
      setSending(false);
      return;
    }

    const { data, error } = await client.POST(`/api/copilot/sessions/${sessionId}/turn`, {
      body: { content, chapterId: chapterId || undefined },
    });
    if (error || !data) {
      setReplayError(extractApiErrorMessage(error, '发送失败'));
      setSending(false);
      return;
    }

    const appended = (data as { events: StoryCopilotEvent[] }).events ?? [];
    setEvents((current) => [...current, ...appended]);
    setMessageDraft('');
    setSending(false);
  }, [activeSessionId, chapterId, createSession, messageDraft, sending]);

  const applyCardAction = useCallback(
    async (cardId: string, action: StoryCopilotCardActionType) => {
      if (!activeSessionId) {
        return;
      }
      setReplayError('');
      const { data, error } = await client.POST(
        `/api/copilot/sessions/${activeSessionId}/cards/${cardId}/actions`,
        { body: { action } },
      );
      if (error || !data) {
        setReplayError(extractApiErrorMessage(error, '操作失败'));
        return;
      }
      const payload = data as { event?: StoryCopilotEvent; card?: StoryCopilotCard };
      if (payload.event) {
        setEvents((current) => [...current, payload.event as StoryCopilotEvent]);
      }
      if (payload.card) {
        // Ensure UI reflects latest card status even if replay stream is stale.
        const updated = payload.card as StoryCopilotCard;
        setEvents((current) =>
          current.map((evt) =>
            evt.type === 'card' && evt.card?.id === updated.id ? { ...evt, card: updated } : evt,
          ),
        );
      }
    },
    [activeSessionId],
  );

  const submitFeedback = useCallback(
    async (suggestionId: string, action: 'helpful' | 'not_helpful') => {
      if (!activeSessionId) {
        return;
      }
      setReplayError('');
      const { error } = await client.POST(`/api/copilot/sessions/${activeSessionId}/feedback`, {
        body: { suggestionId, action },
      });
      if (error) {
        setReplayError(extractApiErrorMessage(error, '反馈失败'));
      }
    },
    [activeSessionId],
  );

  if (!isOpen) {
    return null;
  }

  const activeSessions = sessions.filter((session) => session.mode === activeMode);
  const resolvedSessionId = activeSessionId || activeSessions[0]?.id || '';
  const selectedSession = activeSessions.find((session) => session.id === resolvedSessionId);

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-[420px] max-w-full flex-col border-l border-border bg-surface-panel shadow-2xl">
      <div className="flex items-start justify-between border-b border-border px-5 py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[var(--color-amber)]">
            <Sparkles size={16} />
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">Story Copilot</p>
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">统一 AI 创作入口</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">围绕会话、草稿卡片与建议面板搭建 Epic 4 交互骨架。</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-panel-muted)] hover:text-[var(--color-text-primary)]"
          aria-label="关闭 Story Copilot"
        >
          <X size={18} />
        </button>
      </div>

      <div className="border-b border-border px-5 py-3" role="tablist" aria-label="Story Copilot 模式">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(MODE_LABELS) as StoryCopilotMode[]).map((mode) => {
            const isActive = mode === activeMode;
            return (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onModeChange(mode)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-[var(--color-amber)]/45 bg-[var(--color-amber-light)]/70 text-[var(--color-text-primary)]'
                    : 'border-border bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-panel-muted)]'
                }`}
              >
                {MODE_LABELS[mode]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <section className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">Recent Sessions</p>
            <h3 className="mt-1 font-semibold text-[var(--color-text-primary)]">最近会话</h3>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {sessionsLoading ? '加载中…' : sessionsError ? sessionsError : `共 ${activeSessions.length} 条`}
            </p>
            <button
              type="button"
              onClick={() => void createSession()}
              className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-panel-muted)]"
            >
              新建会话
            </button>
          </div>
          <div className="space-y-2">
            {activeSessions.map((session) => {
              const isActive = session.id === resolvedSessionId;
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => {
                    void selectSession(session.id);
                  }}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    isActive
                      ? 'border-[var(--color-amber)]/45 bg-[var(--color-amber-light)]/60'
                      : 'border-border bg-surface-panel-muted/55 hover:bg-[var(--color-surface-panel-muted)]'
                  }`}
                >
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    {session.title || '未命名会话'}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {MODE_LABELS[session.mode]} · {session.status === 'completed' ? '已完成' : '进行中'}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">Conversation</p>
            <h3 className="mt-1 font-semibold text-[var(--color-text-primary)]">
              {selectedSession ? selectedSession.title || state.headline : state.headline}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{state.description}</p>
          </div>

          {replayError ? (
            <div className="rounded-lg border border-border bg-white p-3 text-sm text-[var(--color-text-secondary)]">
              {replayError}
            </div>
          ) : null}

          <div className="space-y-3">
            {replayLoading ? (
              <div className="rounded-lg border border-border bg-white p-3 text-sm text-[var(--color-text-secondary)]">
                加载会话中…
              </div>
            ) : null}

            {events
              .filter((event) => event.type !== 'card_action')
              .map((event) => {
                if (event.type === 'message' && event.message) {
                  const isUser = event.message.role === 'user';
                  return (
                    <div
                      key={event.id}
                      className={`rounded-xl border p-3 ${
                        isUser
                          ? 'border-[var(--color-amber)]/25 bg-[var(--color-amber-light)]/50'
                          : 'border-border bg-white'
                      }`}
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                        {isUser ? 'You' : event.message.role}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-text-primary)]">{event.message.content}</p>
                    </div>
                  );
                }

                if (event.type === 'card' && event.card) {
                  const card = cardsById.get(event.card.id) ?? event.card;
                  const dimension =
                    typeof card.payload?.dimension === 'string' ? (card.payload.dimension as string) : '';
                  const paragraphIndex =
                    typeof card.payload?.paragraphIndex === 'number'
                      ? (card.payload.paragraphIndex as number)
                      : null;
                  return (
                    <article key={event.id} className="rounded-xl border border-border bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-medium text-[var(--color-text-primary)]">{card.title}</h4>
                        <span className="rounded-full bg-[var(--color-surface-panel-muted)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
                          {card.status === 'pending'
                            ? '待确认'
                            : card.status === 'adopted'
                              ? '已采用'
                              : '已跳过'}
                        </span>
                      </div>
                      {dimension ? (
                        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">维度：{dimension}</p>
                      ) : null}
                      <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{card.summary}</p>
                      {activeMode === 'story_diagnose' ? (
                        <div className="mt-4 flex items-center gap-2">
                          {paragraphIndex !== null ? (
                            <button
                              type="button"
                              onClick={() => {
                                window.dispatchEvent(
                                  new CustomEvent('copilot:jumpToParagraph', {
                                    detail: { paragraphIndex },
                                  }),
                                );
                              }}
                              className="rounded-md border border-border bg-transparent px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-panel-muted)]"
                            >
                              定位段落
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void submitFeedback(card.id, 'helpful')}
                            className="rounded-md border border-[var(--color-amber)]/30 bg-[var(--color-amber-light)]/40 px-3 py-1.5 text-sm text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-amber)]/50"
                          >
                            有帮助
                          </button>
                          <button
                            type="button"
                            onClick={() => void submitFeedback(card.id, 'not_helpful')}
                            className="rounded-md border border-border bg-transparent px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-panel-muted)]"
                          >
                            没帮助
                          </button>
                        </div>
                      ) : card.status === 'pending' ? (
                        <div className="mt-4 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void applyCardAction(card.id, 'adopt')}
                            className="rounded-md border border-[var(--color-amber)]/30 bg-[var(--color-amber-light)]/60 px-3 py-1.5 text-sm text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-amber)]/50"
                          >
                            采用
                          </button>
                          <button
                            type="button"
                            onClick={() => void applyCardAction(card.id, 'dismiss')}
                            className="rounded-md border border-border bg-transparent px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-panel-muted)]"
                          >
                            跳过
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                }

                return null;
              })}
          </div>

          <div className="rounded-xl border border-border bg-white p-3">
            <textarea
              value={messageDraft}
              onChange={(event) => setMessageDraft(event.target.value)}
              placeholder="输入你的问题或指令…"
              className="h-20 w-full resize-none rounded-md border border-border bg-transparent p-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-amber)]/50"
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-[var(--color-text-secondary)]">
                {activeSessionId ? '会话已就绪' : '将自动创建会话'}
              </p>
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={sending || !messageDraft.trim()}
                className="rounded-md border border-border bg-[var(--color-amber-light)]/70 px-3 py-1.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-amber-light)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? '发送中…' : '发送'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}

export default StoryCopilotPanel;
