import { useState, useEffect, useRef } from 'react';
import { CheckCircle2Icon, Trash2Icon, CalendarIcon } from 'lucide-react';
import { client } from '../../../api/client';
import { FormInput } from '../../../components/ui/FormInput';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { WritingTrendChart } from './WritingTrendChart';
import { GoalProgressRing } from './GoalProgressRing';

interface WritingGoal {
  dailyWordTarget?: number;
  totalWordTarget?: number;
  deadline?: string;
}

interface DailyWritingPoint {
  date: string;
  writtenChars: number;
}

interface WritingStats {
  todayWrittenChars: number;
  todayTarget?: number;
  todayProgressPercent?: number;
  totalWrittenChars: number;
  totalTarget?: number;
  totalProgressPercent?: number;
  trend30d: DailyWritingPoint[];
  estimatedCompletionDate?: string;
}

interface WritingGoalPanelProps {
  projectId: string;
}

const DAILY_MIN = 100;
const DAILY_MAX = 50000;
const TOTAL_MIN = 1000;
const TOTAL_MAX = 5000000;

export function WritingGoalPanel({ projectId }: WritingGoalPanelProps) {
  const [dailyTarget, setDailyTarget] = useState('');
  const [totalTarget, setTotalTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<WritingStats | null>(null);
  const [goals, setGoals] = useState<WritingGoal | null>(null);
  const [dailyGoalMet, setDailyGoalMet] = useState(false);
  const prevDailyMetRef = useRef(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (stats?.todayTarget && stats?.todayWrittenChars >= stats.todayTarget) {
      if (!prevDailyMetRef.current) {
        setDailyGoalMet(true);
        setTimeout(() => setDailyGoalMet(false), 2500);
      }
    }
    prevDailyMetRef.current = (stats?.todayWrittenChars ?? 0) >= (stats?.todayTarget ?? 0);
  }, [stats?.todayWrittenChars, stats?.todayTarget]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [goalsRes, statsRes] = await Promise.all([
        client.GET(`/api/projects/${projectId}/goals`),
        client.GET(`/api/projects/${projectId}/writing-stats?range=30d`)
      ]);

      if (goalsRes.data) {
        const g = goalsRes.data as WritingGoal;
        setGoals(g);
        setDailyTarget(g.dailyWordTarget?.toString() ?? '');
        setTotalTarget(g.totalWordTarget?.toString() ?? '');
        setDeadline(g.deadline ?? '');
      }

      if (statsRes.data) {
        setStats(statsRes.data as WritingStats);
      }
    } catch {
      setError('加载数据失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const validate = (): string | null => {
    if (dailyTarget) {
      const val = parseInt(dailyTarget, 10);
      if (isNaN(val) || val < DAILY_MIN || val > DAILY_MAX) {
        return `每日字数需在 ${DAILY_MIN.toLocaleString()}~${DAILY_MAX.toLocaleString()} 之间`;
      }
    }
    if (totalTarget) {
      const val = parseInt(totalTarget, 10);
      if (isNaN(val) || val < TOTAL_MIN || val > TOTAL_MAX) {
        return `总字数需在 ${TOTAL_MIN.toLocaleString()}~${TOTAL_MAX.toLocaleString()} 之间`;
      }
    }
    if (deadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadlineDate = new Date(deadline);
      if (deadlineDate <= today) {
        return '截止日期必须晚于今天';
      }
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body: WritingGoal = {};
      if (dailyTarget) body.dailyWordTarget = parseInt(dailyTarget, 10);
      if (totalTarget) body.totalWordTarget = parseInt(totalTarget, 10);
      if (deadline) body.deadline = deadline;

      const res = await client.PUT(`/api/projects/${projectId}/goals`, { body });
      if (res.error) {
        setError((res.error as { detail?: string }).detail ?? '保存失败');
      } else {
        setGoals(body);
        await loadData();
      }
    } catch {
      setError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    setError(null);
    try {
      const res = await client.DELETE(`/api/projects/${projectId}/goals`);
      if (res.error) {
        setError((res.error as { detail?: string }).detail ?? '清除失败');
      } else {
        setDailyTarget('');
        setTotalTarget('');
        setDeadline('');
        setGoals(null);
      }
    } catch {
      setError('清除失败，请重试');
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-ink-light">加载中...</div>
      </div>
    );
  }

  const todayProgress = stats?.todayTarget
    ? Math.min((stats.todayWrittenChars / stats.todayTarget) * 100, 100)
    : 0;

  return (
    <div className="space-y-6">
      {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          id="dailyTarget"
          label="每日字数目标"
          type="text"
          value={dailyTarget}
          onChange={setDailyTarget}
          placeholder={`${DAILY_MIN}~${DAILY_MAX}`}
          hint={`范围: ${DAILY_MIN.toLocaleString()}~${DAILY_MAX.toLocaleString()} 字`}
        />
        <FormInput
          id="totalTarget"
          label="总字数目标"
          type="text"
          value={totalTarget}
          onChange={setTotalTarget}
          placeholder={`${TOTAL_MIN}~${TOTAL_MAX}`}
          hint={`范围: ${TOTAL_MIN.toLocaleString()}~${TOTAL_MAX.toLocaleString()} 字`}
        />
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label htmlFor="deadline" className="block text-sm font-medium text-ink-light mb-1.5">
            截止日期
          </label>
          <div className="relative">
            <input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input-base pr-10"
              min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
            />
            <CalendarIcon
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-light pointer-events-none"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <LoadingButton
          onClick={handleSave}
          loading={saving}
          loadingText="保存中..."
          className="flex-1"
        >
          保存目标
        </LoadingButton>
        {goals && (dailyTarget || totalTarget || deadline) && (
          <LoadingButton
            variant="secondary"
            onClick={handleClear}
            loading={clearing}
            loadingText="清除中..."
            className="flex-none"
          >
            <Trash2Icon size={16} className="mr-1 inline" />
            清除
          </LoadingButton>
        )}
      </div>

      {stats && (
        <>
          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-medium text-ink mb-4">今日进度</h3>
            <div className="relative h-3 bg-border/40 rounded-full overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                  dailyGoalMet ? 'bg-success' : 'bg-amber'
                }`}
                style={{ width: `${todayProgress}%` }}
              />
              {dailyGoalMet && (
                <div className="absolute inset-0 flex items-center justify-center animate-[fadeIn_0.3s_ease-out]">
                  <CheckCircle2Icon size={14} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex justify-between mt-2 text-xs text-ink-light">
              <span>{stats.todayWrittenChars.toLocaleString()} 字</span>
              <span>
                {stats.todayTarget ? `${stats.todayTarget.toLocaleString()} 字目标` : '未设置目标'}
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-medium text-ink mb-4">30天写作趋势</h3>
            <WritingTrendChart data={stats.trend30d} />
          </div>

          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-ink">总进度</h3>
              {stats.estimatedCompletionDate && (
                <span className="text-xs text-ink-light">
                  预计完成: {new Date(stats.estimatedCompletionDate).toLocaleDateString('zh-CN')}
                </span>
              )}
            </div>
            <div className="flex justify-center">
              <GoalProgressRing
                current={stats.totalWrittenChars}
                target={stats.totalTarget ?? 0}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
