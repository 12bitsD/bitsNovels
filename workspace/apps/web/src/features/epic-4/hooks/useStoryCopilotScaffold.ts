import { useCallback, useState } from 'react';

import type {
  StoryCopilotDraftCard,
  StoryCopilotMode,
  StoryCopilotScaffoldState,
  StoryCopilotSession,
} from '../types';
import { client, extractApiErrorMessage } from '../../../api/client';

const MODE_STATE: Record<StoryCopilotMode, StoryCopilotScaffoldState> = {
  worldbuild: {
    headline: '设定草稿卡片',
    description: '围绕世界观、制度与文化生成可确认写入的草稿。',
    cards: [
      {
        id: 'worldbuild-card-1',
        title: '帝国首都的行政层级',
        summary: '补齐都城、属地与骑士团之间的治理关系。',
        actionLabel: '确认写入',
      },
      {
        id: 'worldbuild-card-2',
        title: '禁术法典的起源',
        summary: '补齐禁术被封存的时间线与代价规则。',
        actionLabel: '继续追问',
      },
    ],
  },
  plot_derive_lite: {
    headline: '推演结果卡片',
    description: '展示影响项、冲突提示与可采用的分支方案。',
    cards: [
      {
        id: 'plot-card-1',
        title: '影响项：盟约开始失衡',
        summary: '主角提前暴露身份会触发两条支线冲突并影响盟友立场。',
        actionLabel: '采用到章节备注',
      },
      {
        id: 'plot-card-2',
        title: '分支：先保密再布局',
        summary: '保留悬念，下一章铺垫敌对势力介入。',
        actionLabel: '采纳分支',
      },
    ],
  },
  story_diagnose: {
    headline: '分维度建议',
    description: '按节奏、人物、描写、情节分组展示可跳转建议。',
    cards: [
      {
        id: 'diagnose-card-1',
        title: '节奏：开场信息量偏密',
        summary: '建议拆分设定说明，保留角色决策驱动段落。',
        actionLabel: '跳转定位',
      },
      {
        id: 'diagnose-card-2',
        title: '人物：配角动机还不够清晰',
        summary: '增加一句与旧恩怨相关的动作描写，强化人物张力。',
        actionLabel: '标记有帮助',
      },
    ],
  },
};

export function useStoryCopilotScaffold(projectId: string) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<StoryCopilotMode>('worldbuild');
  const [sessions, setSessions] = useState<StoryCopilotSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState('');

  const loadSessionsForMode = useCallback(async (mode: StoryCopilotMode) => {
    if (!projectId) {
      setSessions([]);
      return;
    }

    setSessionsLoading(true);
    setSessionsError('');

    const qs = new URLSearchParams({
      mode,
      limit: '10',
    });

    const { data, error } = await client.GET(
      `/api/projects/${projectId}/copilot/sessions?${qs.toString()}`,
    );

    if (error || !data) {
      setSessionsError(extractApiErrorMessage(error, '加载 Copilot 会话失败'));
      setSessions([]);
      setSessionsLoading(false);
      return;
    }

    setSessions((data as { sessions: StoryCopilotSession[] }).sessions);
    setSessionsLoading(false);
  }, [projectId]);

  const loadSessions = useCallback(async () => {
    await loadSessionsForMode(activeMode);
  }, [activeMode, loadSessionsForMode]);

  const open = useCallback(() => {
    setIsOpen(true);
    void loadSessionsForMode(activeMode);
  }, [activeMode, loadSessionsForMode]);

  const changeMode = useCallback(
    (mode: StoryCopilotMode) => {
      setActiveMode(mode);
      if (isOpen) {
        void loadSessionsForMode(mode);
      }
    },
    [isOpen, loadSessionsForMode],
  );

  const toggle = useCallback(() => {
    setIsOpen((current) => {
      const next = !current;
      if (next) {
        void loadSessionsForMode(activeMode);
      }
      return next;
    });
  }, [activeMode, loadSessionsForMode]);

  const state = MODE_STATE[activeMode];

  return {
    isOpen,
    activeMode,
    state,
    sessions,
    sessionsLoading,
    sessionsError,
    reloadSessions: loadSessions,
    open,
    close: () => setIsOpen(false),
    toggle,
    setActiveMode: changeMode,
  };
}

export type { StoryCopilotDraftCard };
