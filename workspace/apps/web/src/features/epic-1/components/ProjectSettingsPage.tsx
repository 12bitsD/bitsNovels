import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckIcon } from 'lucide-react';
import { client } from '../../../api/client';
import { FormInput } from '../../../components/ui/FormInput';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { LoadingButton } from '../../../components/ui/LoadingButton';

type ProjectType = 'novel' | 'medium' | 'short';

type TabId = 'basic' | 'goals' | 'ai' | 'backup';

interface ProjectSettings {
  id: string;
  name: string;
  type: ProjectType;
  tags: string[];
  description: string;
  status: string;
  cover_color: string;
  total_chars: number;
  volume_count: number;
  chapter_count: number;
  knowledge_base_count: number;
  created_at: string;
  updated_at: string;
  daily_goal?: number;
  total_goal?: number;
  ai_style?: string;
}

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [type, setType] = useState<ProjectType>('novel');
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [totalGoal, setTotalGoal] = useState(100000);
  const [aiStyle, setAiStyle] = useState('balanced');

  const [stats, setStats] = useState({
    volume_count: 0,
    chapter_count: 0,
    total_chars: 0,
    knowledge_base_count: 0,
  });

  useEffect(() => {
    if (!projectId) return;
    client.GET(`/api/projects/${projectId}/settings`).then(({ data, error: apiError }) => {
      if (apiError) {
        setError('加载项目设置失败');
        setLoading(false);
        return;
      }
      if (data) {
        const settings = data as ProjectSettings;
        setName(settings.name);
        setType(settings.type as ProjectType);
        setTags(settings.tags || []);
        setDescription(settings.description || '');
        setDailyGoal(settings.daily_goal || 2000);
        setTotalGoal(settings.total_goal || 100000);
        setAiStyle(settings.ai_style || 'balanced');
        setStats({
          volume_count: settings.volume_count || 0,
          chapter_count: settings.chapter_count || 0,
          total_chars: settings.total_chars || 0,
          knowledge_base_count: settings.knowledge_base_count || 0,
        });
      }
      setLoading(false);
    });
  }, [projectId]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('项目名称不能为空');
      return;
    }
    if (trimmedName.length > 50) {
      setError('项目名称不能超过 50 个字符');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

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
        'detail' in apiError &&
        typeof (apiError as { detail?: unknown }).detail === 'string'
          ? (apiError as { detail: string }).detail
          : '更新失败';
      setError(detail);
    } else {
      setSuccess('项目信息已更新');
      setTimeout(() => setSuccess(''), 3000);
    }
    setSaving(false);
  };

  const handleArchive = async () => {
    setShowArchiveModal(false);
    setError('');
    const { error: apiError } = await client.POST(`/api/projects/${projectId}/archive`);
    if (apiError) {
      setError('归档失败');
    } else {
      navigate('/dashboard');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmName !== name) return;
    setError('');
    const { error: apiError } = await client.DELETE(`/api/projects/${projectId}`);
    if (apiError) {
      setError('删除失败');
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

        {error && <ErrorAlert error={error} onDismiss={() => setError('')} className="mb-6" />}
        {success && (
          <div className="bg-success/10 text-success p-3 rounded-md text-sm border border-success/20 mb-6 flex items-center gap-2">
            <CheckIcon size={16} />
            {success}
          </div>
        )}

        <div className="card-base overflow-hidden mb-8">
          <div className="border-b border-border/30">
            <nav className="flex" role="tablist">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-amber bg-amber/5'
                      : 'text-ink-light hover:text-ink hover:bg-parchment/50'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <FormInput
                  id="name"
                  label="项目名称"
                  value={name}
                  onChange={setName}
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
                    onChange={e => setType(e.target.value as ProjectType)}
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
                    onChange={e => setTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
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
                    onChange={e => setDescription(e.target.value)}
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
                      <p className="text-lg font-mono font-bold text-ink">{stats.volume_count}</p>
                    </div>
                    <div className="bg-parchment/50 rounded-md p-3">
                      <p className="text-xs text-ink-light">章数</p>
                      <p className="text-lg font-mono font-bold text-ink">{stats.chapter_count}</p>
                    </div>
                    <div className="bg-parchment/50 rounded-md p-3">
                      <p className="text-xs text-ink-light">总字数</p>
                      <p className="text-lg font-mono font-bold text-ink">{stats.total_chars.toLocaleString()}</p>
                    </div>
                    <div className="bg-parchment/50 rounded-md p-3">
                      <p className="text-xs text-ink-light">知识库条目</p>
                      <p className="text-lg font-mono font-bold text-ink">{stats.knowledge_base_count}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'goals' && (
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
                    onChange={e => setDailyGoal(Number(e.target.value))}
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
                    onChange={e => setTotalGoal(Number(e.target.value))}
                    className="input-base w-48"
                    min={0}
                    max={10000000}
                  />
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6">
                <h3 className="font-bold text-lg">AI 配置</h3>
                <p className="text-sm text-ink-light">配置 AI 写作助手的风格和偏好。</p>
                <div>
                  <label htmlFor="ai-style" className="block text-sm font-medium text-ink-light mb-1.5">
                    续写风格
                  </label>
                  <select
                    id="ai-style"
                    value={aiStyle}
                    onChange={e => setAiStyle(e.target.value)}
                    className="input-base cursor-pointer"
                  >
                    <option value="concise">简洁</option>
                    <option value="balanced">平衡</option>
                    <option value="flowery">华丽</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'backup' && (
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
            )}
          </div>
        </div>

        <div className="card-base border-error/20 bg-error/5 p-6">
          <h3 className="font-bold text-lg text-error mb-4">危险操作区</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">归档项目</p>
                <p className="text-sm text-ink-light">归档后项目将进入只读模式</p>
              </div>
              <button
                onClick={() => setShowArchiveModal(true)}
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
                onClick={() => setShowDeleteModal(true)}
                className="btn-secondary w-auto px-6 border-error text-error hover:bg-error/10"
              >
                删除项目
              </button>
            </div>
          </div>
        </div>
      </div>

      {showArchiveModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-modal">
            <h3 className="text-lg font-bold mb-4">确认归档</h3>
            <p className="text-ink-light mb-6">
              确定要归档项目「{name}」吗？归档后项目将进入只读模式。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowArchiveModal(false)}
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
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-modal">
            <h3 className="text-lg font-bold mb-4">删除项目</h3>
            <p className="text-ink-light mb-4">
              输入项目名称以确认删除：
            </p>
            <input
              type="text"
              placeholder="输入项目名称确认"
              value={deleteConfirmName}
              onChange={e => setDeleteConfirmName(e.target.value)}
              className="input-base mb-6"
              aria-label="项目名称确认"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmName('');
                }}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}