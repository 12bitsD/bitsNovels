import { useReducer, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { client } from '../../../api/client';
import { FormInput } from '../../../components/ui/FormInput';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import { Card, CardContent } from '../../../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/Tabs';
import { Modal } from '../../../components/ui/Modal';
import AIConfigTab from '../../epic-4/components/AIConfigTab';
import type { ProjectType } from '@bitsnovels/api-types';

type TabId = 'basic' | 'goals' | 'ai' | 'backup';

interface ProjectSettings {
  project: {
    id: string;
    name: string;
    type: ProjectType;
    tags?: string[];
    description?: string | null;
  };
  stats: {
    volumeCount: number;
    chapterCount: number;
    totalChars: number;
    kbEntryCount: number;
  };
}

type ProjectSettingsState = {
  activeTab: TabId;
  loading: boolean;
  saving: boolean;
  showDeleteModal: boolean;
  showArchiveModal: boolean;
  deleteConfirmName: string;
  error: string;
  success: string;
  name: string;
  type: ProjectType;
  tags: string[];
  description: string;
  dailyGoal: number;
  totalGoal: number;
  stats: {
    volumeCount: number;
    chapterCount: number;
    totalChars: number;
    kbEntryCount: number;
  };
};

const initialState: ProjectSettingsState = {
  activeTab: 'basic',
  loading: true,
  saving: false,
  showDeleteModal: false,
  showArchiveModal: false,
  deleteConfirmName: '',
  error: '',
  success: '',
  name: '',
  type: 'novel',
  tags: [],
  description: '',
  dailyGoal: 2000,
  totalGoal: 100000,
  stats: {
    volumeCount: 0,
    chapterCount: 0,
    totalChars: 0,
    kbEntryCount: 0,
  }
};

function reducer(state: ProjectSettingsState, action: Partial<ProjectSettingsState>): ProjectSettingsState {
  return { ...state, ...action };
}

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    activeTab, loading, saving, showDeleteModal, showArchiveModal,
    deleteConfirmName, error, success, name, type, tags, description,
    dailyGoal, totalGoal, stats
  } = state;

  useEffect(() => {
    if (!projectId) return;
    const loadSettings = async () => {
      const [{ data, error: settingsError }, { data: goalsData }] = await Promise.all([
        client.GET(`/api/projects/${projectId}/settings`),
        client.GET(`/api/projects/${projectId}/goals`),
      ]);

      if (settingsError || !data) {
        dispatch({ error: '加载项目设置失败', loading: false });
        return;
      }

      const settings = data as ProjectSettings;
      const goals = goalsData as {
        dailyWordTarget?: number | null;
        totalWordTarget?: number | null;
      } | null;

      dispatch({
        name: settings.project.name,
        type: settings.project.type as ProjectType,
        tags: settings.project.tags || [],
        description: settings.project.description || '',
        dailyGoal: goals?.dailyWordTarget ?? 2000,
        totalGoal: goals?.totalWordTarget ?? 100000,
        stats: {
          volumeCount: settings.stats.volumeCount || 0,
          chapterCount: settings.stats.chapterCount || 0,
          totalChars: settings.stats.totalChars || 0,
          kbEntryCount: settings.stats.kbEntryCount || 0,
        },
        loading: false,
      });
    };

    void loadSettings();
  }, [projectId]);

  // 分离防抖验证逻辑
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      const trimmedName = name.trim();
      if (!trimmedName && !loading) {
        dispatch({ error: '项目名称不能为空' });
      } else if (trimmedName.length > 50) {
        dispatch({ error: '项目名称不能超过 50 个字符' });
      } else if (error === '项目名称不能为空' || error === '项目名称不能超过 50 个字符') {
        dispatch({ error: '' });
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, loading]); // Exclude error to avoid infinite loops

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      dispatch({ error: '项目名称不能为空' });
      return;
    }
    if (trimmedName.length > 50) {
      dispatch({ error: '项目名称不能超过 50 个字符' });
      return;
    }

    dispatch({ saving: true, error: '', success: '' });

    const { error: apiError } = await client.PATCH(`/api/projects/${projectId}`, {
      body: {
        name: trimmedName,
        type,
        tags,
        description: description || undefined,
      }
    });

    if (apiError) {
      const detail =
        typeof apiError === 'object' &&
        apiError !== null &&
        'error' in apiError &&
        typeof (apiError as { error?: { message?: unknown } }).error?.message === 'string'
          ? (apiError as { error: { message: string } }).error.message
          : typeof apiError === 'object' &&
              apiError !== null &&
              'detail' in apiError &&
              typeof (apiError as { detail?: unknown }).detail === 'string'
            ? (apiError as { detail: string }).detail
          : '更新失败';
      dispatch({ error: detail, saving: false });
    } else {
      dispatch({ success: '项目信息已更新', saving: false });
      setTimeout(() => dispatch({ success: '' }), 3000);
    }
  };

  const handleArchive = async () => {
    dispatch({ showArchiveModal: false, error: '' });
    const { error: apiError } = await client.POST(`/api/projects/${projectId}/archive`);
    if (apiError) {
      dispatch({ error: '归档失败' });
    } else {
      navigate('/dashboard');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmName !== name) return;
    dispatch({ error: '' });
    const { error: apiError } = await client.DELETE(`/api/projects/${projectId}`, {
      body: { confirmationName: deleteConfirmName },
    });
    if (apiError) {
      dispatch({ error: '删除失败' });
    } else {
      localStorage.removeItem(`project-${projectId}`);
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div data-testid="loading-skeleton" className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
        <div className="h-8 bg-white/50 w-32 mb-8 rounded-md"></div>
        <div className="space-y-4">
          <div className="h-10 bg-white/50 w-full rounded-md"></div>
          <div className="h-10 bg-white/50 w-3/4 rounded-md"></div>
          <div className="h-24 bg-white/50 w-full rounded-md"></div>
        </div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'basic', label: '基本信息' },
    { id: 'goals', label: '写作目标' },
    { id: 'ai', label: 'AI 配置' },
    { id: 'backup', label: '备份与恢复' },
  ];

  return (
    <div className="min-h-screen bg-parchment p-8 font-sans text-ink">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
          项目设置
        </h1>

        {error && <ErrorAlert error={error} onDismiss={() => dispatch({ error: '' })} className="mb-6" />}
        {success && (
          <div className="bg-success/10 text-success p-3 rounded-md text-sm border border-success/20 mb-6 flex items-center gap-2">
            <Check size={16} />
            {success}
          </div>
        )}

        <Card className="mb-8 overflow-hidden">
          <Tabs defaultValue={activeTab}>
            <TabsList className="px-6 pt-2 bg-parchment/30">
              {tabs.map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="px-6 py-4"
                >
                  <div onClick={() => dispatch({ activeTab: tab.id })}>{tab.label}</div>
                </TabsTrigger>
              ))}
            </TabsList>

            <CardContent className="pt-6">
              <TabsContent value="basic">
                <div className="space-y-6">
                <FormInput
                  id="name"
                  label="项目名称"
                  value={name}
                  onChange={v => dispatch({ name: v })}
                  placeholder="最多 50 个字符"
                  required
                />

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-ink-light mb-1.5">
                    类型
                  </label>
                  <select
                    id="type"
                    value={type}
                    onChange={e => dispatch({ type: e.target.value as ProjectType })}
                    className="input-base cursor-pointer"
                  >
                    <option value="novel">长篇小说</option>
                    <option value="medium">中篇小说</option>
                    <option value="short">短篇/散文</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-ink-light mb-1.5">
                    题材标签 (最多 5 个)
                  </label>
                  <input
                    id="tags"
                    placeholder="逗号分隔，例如：玄幻, 悬疑"
                    value={tags.join(', ')}
                    onChange={e => dispatch({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                    className="input-base"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-ink-light mb-1.5">
                    简介 (可选)
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={e => dispatch({ description: e.target.value })}
                    className="input-base h-28 resize-none py-3"
                    placeholder="最多 500 个字符"
                  />
                </div>

                <LoadingButton loading={saving} onClick={handleSave} className="w-auto px-8">
                  保存更改
                </LoadingButton>

                <div className="border-t border-border/30 pt-6 mt-6">
                  <h3 className="text-sm font-medium text-ink-light mb-4">项目统计</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-parchment/50 rounded-md p-3">
                      <p className="text-xs text-ink-light">卷数</p>
                      <p className="text-lg font-mono font-bold text-ink">{stats.volumeCount}</p>
                    </div>
                    <div className="bg-parchment/50 rounded-md p-3">
                      <p className="text-xs text-ink-light">章数</p>
                      <p className="text-lg font-mono font-bold text-ink">{stats.chapterCount}</p>
                    </div>
                    <div className="bg-parchment/50 rounded-md p-3">
                      <p className="text-xs text-ink-light">总字数</p>
                      <p className="text-lg font-mono font-bold text-ink">{stats.totalChars.toLocaleString()}</p>
                    </div>
                    <div className="bg-parchment/50 rounded-md p-3">
                      <p className="text-xs text-ink-light">知识库条目</p>
                      <p className="text-lg font-mono font-bold text-ink">{stats.kbEntryCount}</p>
                    </div>
                  </div>
                </div>
                </div>
              </TabsContent>

              <TabsContent value="goals">
                <div className="space-y-6">
                <h3 className="font-bold text-lg">每日写作目标</h3>
                <p className="text-sm text-ink-light">设定每日写作字数目标，帮助你保持写作习惯。</p>
                <div>
                  <label htmlFor="daily-goal" className="block text-sm font-medium text-ink-light mb-1.5">
                    每日目标字数
                  </label>
                  <input
                    id="daily-goal"
                    type="number"
                    value={dailyGoal}
                    onChange={e => dispatch({ dailyGoal: Number(e.target.value) })}
                    className="input-base w-48"
                    min={0}
                    max={100000}
                  />
                </div>

                <h3 className="font-bold text-lg pt-4">总字数目标</h3>
                <p className="text-sm text-ink-light">设定项目总字数目标，跟踪写作进度。</p>
                <div>
                  <label htmlFor="total-goal" className="block text-sm font-medium text-ink-light mb-1.5">
                    总字数目标
                  </label>
                  <input
                    id="total-goal"
                    type="number"
                    value={totalGoal}
                    onChange={e => dispatch({ totalGoal: Number(e.target.value) })}
                    className="input-base w-48"
                    min={0}
                    max={10000000}
                  />
                </div>
                </div>
              </TabsContent>

              <TabsContent value="ai">
                <AIConfigTab projectId={projectId ?? ''} />
              </TabsContent>

              <TabsContent value="backup">
                <div className="space-y-6">
                <h3 className="font-bold text-lg">导出项目</h3>
                <p className="text-sm text-ink-light">导出项目数据以进行备份。</p>
                <div className="flex gap-4">
                  <button className="btn-secondary w-auto px-6">
                    导出项目
                  </button>
                  <button className="btn-secondary w-auto px-6">
                    导入数据
                  </button>
                </div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <Card className="border-error/20 bg-error/5 p-6">
          <h3 className="font-bold text-lg text-error mb-4">危险操作区</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">归档项目</p>
                <p className="text-sm text-ink-light">归档后项目将进入只读模式</p>
              </div>
              <button
                onClick={() => dispatch({ showArchiveModal: true })}
                className="btn-secondary w-auto px-6 border-warning text-warning hover:bg-warning/10"
              >
                归档项目
              </button>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-error/20">
              <div>
                <p className="font-medium">删除项目</p>
                <p className="text-sm text-ink-light">永久删除项目及其所有内容</p>
              </div>
              <button
                onClick={() => dispatch({ showDeleteModal: true })}
                className="btn-secondary w-auto px-6 border-error text-error hover:bg-error/10"
              >
                删除项目
              </button>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={showArchiveModal}
        onClose={() => dispatch({ showArchiveModal: false })}
        title="确认归档"
        footer={
          <>
            <button
              onClick={() => dispatch({ showArchiveModal: false })}
              className="px-4 py-2 text-ink-light hover:text-ink transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleArchive}
              className="btn-primary w-auto px-6"
            >
              确认归档
            </button>
          </>
        }
      >
        <p className="text-ink-light">
          确定要归档项目「{name}」吗？归档后项目将进入只读模式。
        </p>
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => dispatch({ showDeleteModal: false, deleteConfirmName: '' })}
        title="删除项目"
        footer={
          <>
            <button
              onClick={() => dispatch({ showDeleteModal: false, deleteConfirmName: '' })}
              className="px-4 py-2 text-ink-light hover:text-ink transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteConfirmName !== name}
              className={`btn-primary w-auto px-6 ${
                deleteConfirmName !== name ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              确认删除
            </button>
          </>
        }
      >
        <p className="text-ink-light mb-4">
          输入项目名称以确认删除：
        </p>
        <input
          type="text"
          placeholder="输入项目名称确认"
          value={deleteConfirmName}
          onChange={e => dispatch({ deleteConfirmName: e.target.value })}
          className="input-base mb-2"
          aria-label="项目名称确认"
        />
      </Modal>
    </div>
  );
}
