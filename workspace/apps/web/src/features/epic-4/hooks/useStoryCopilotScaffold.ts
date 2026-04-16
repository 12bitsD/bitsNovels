import { useMemo, useState } from 'react';

import type {
  StoryCopilotDraftCard,
  StoryCopilotMode,
  StoryCopilotScaffoldState,
  StoryCopilotSession,
} from '../types';

const SESSION_FIXTURES: StoryCopilotSession[] = [
  {
    id: 'copilot-worldbuild-1',
    projectId: 'demo-project',
    mode: 'worldbuild',
    title: '帝国年代与地理设定',
    status: 'active',
    createdAt: '2026-04-16T09:00:00.000Z',
    updatedAt: '2026-04-16T09:40:00.000Z',
  },
  {
    id: 'copilot-plot-1',
    projectId: 'demo-project',
    mode: 'plot_derive_lite',
    title: '主线冲突升级推演',
    status: 'completed',
    createdAt: '2026-04-16T08:10:00.000Z',
    updatedAt: '2026-04-16T08:48:00.000Z',
  },
  {
    id: 'copilot-diagnose-1',
    projectId: 'demo-project',
    mode: 'story_diagnose',
    title: '当前章节写作建议',
    status: 'active',
    createdAt: '2026-04-16T07:10:00.000Z',
    updatedAt: '2026-04-16T07:22:00.000Z',
  },
];

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

  const sessions = useMemo(
    () =>
      SESSION_FIXTURES.filter((session) => session.projectId === 'demo-project').map((session) => ({
        ...session,
        projectId,
      })),
    [projectId],
  );

  const state = MODE_STATE[activeMode];
  const activeSessions = sessions.filter((session) => session.mode === activeMode);

  return {
    isOpen,
    activeMode,
    state,
    sessions: activeSessions,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((current) => !current),
    setActiveMode,
  };
}

export type { StoryCopilotDraftCard };
