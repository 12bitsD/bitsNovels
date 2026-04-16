import { Check, RotateCcw } from 'lucide-react';

import { Card, CardContent } from '../../../components/ui/Card';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import { useAIProjectConfig } from '../hooks/useAIProjectConfig';
import type { AIConfigSource, AIProjectConfigFields, AIProjectConfigKey } from '../types';

const SOURCE_LABELS: Record<AIConfigSource, string> = {
  project: '项目设置',
  global: '全局偏好',
  system: '系统默认',
};

const SOURCE_CLASSES: Record<AIConfigSource, string> = {
  project: 'border-[var(--color-amber)]/35 bg-[var(--color-amber-light)]/70 text-[var(--color-amber)]',
  global: 'border-info/20 bg-info/10 text-info',
  system: 'border-border bg-surface-panel-muted/60 text-[var(--color-text-secondary)]',
};

interface SourceBadgeProps {
  source: AIConfigSource;
}

function SourceBadge({ source }: SourceBadgeProps) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${SOURCE_CLASSES[source]}`}>
      {SOURCE_LABELS[source]}
    </span>
  );
}

interface FieldShellProps {
  fieldKey: AIProjectConfigKey;
  label: string;
  helperText: string;
  fields: AIProjectConfigFields;
  onReset: (key: AIProjectConfigKey) => void;
  children: React.ReactNode;
}

function FieldShell({ fieldKey, label, helperText, fields, onReset, children }: FieldShellProps) {
  const field = fields[fieldKey];
  const canReset = field.source === 'project' && field.fallbackSource !== undefined;

  return (
    <div className="rounded-lg border border-border bg-surface-panel p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <label htmlFor={fieldKey} className="block text-sm font-medium text-[var(--color-text-primary)]">
            {label}
          </label>
          <p className="text-xs text-[var(--color-text-secondary)]">{helperText}</p>
        </div>
        <div className="flex items-center gap-2">
          <SourceBadge source={field.source} />
          {canReset && (
            <button
              type="button"
              onClick={() => onReset(fieldKey)}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-amber)]/35 hover:bg-[var(--color-amber-light)]/45 hover:text-[var(--color-text-primary)]"
              aria-label={`重置${label}为跟随全局`}
            >
              <RotateCcw size={12} />
              重置为跟随全局
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

interface AIConfigTabProps {
  projectId: string;
}

export function AIConfigTab({ projectId }: AIConfigTabProps) {
  const {
    loading,
    saving,
    error,
    toast,
    fields,
    isDirty,
    updateField,
    resetField,
    save,
    clearError,
  } = useAIProjectConfig(projectId);

  if (loading) {
    return (
      <div className="space-y-4" data-testid="ai-config-loading">
        <div className="h-5 w-40 rounded bg-white/60" />
        <div className="h-20 rounded-lg bg-white/60" />
        <div className="h-20 rounded-lg bg-white/60" />
        <div className="h-20 rounded-lg bg-white/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <ErrorAlert error={error} onDismiss={clearError} />}

      {toast && (
        <div className="flex items-start gap-2 rounded-md border border-success/20 bg-success/10 p-3 text-sm text-success">
          <Check size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">{toast.title}</p>
            {toast.description && <p className="mt-1">{toast.description}</p>}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">AI 配置</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          当前页仅作用于本项目，未设置时将继承全局偏好或系统默认。
        </p>
      </div>

      <Card className="border-border bg-white">
        <CardContent className="space-y-4 pt-6">
          <FieldShell
            fieldKey="model"
            label="模型选择"
            helperText="用于续写、润色、建议与 Parser 的项目级默认模型。"
            fields={fields}
            onReset={resetField}
          >
            <select
              id="model"
              value={fields.model.value}
              onChange={(event) => updateField('model', event.target.value)}
              className="input-base cursor-pointer"
            >
              <option value="mimo-v2-pro">MiMo v2 Pro</option>
              <option value="kimi2.5">Kimi 2.5</option>
              <option value="gpt-4.1-mini">GPT-4.1 mini</option>
              <option value="doubao-pro-32k">Doubao Pro 32K</option>
            </select>
          </FieldShell>

          <FieldShell
            fieldKey="temperature"
            label="Temperature"
            helperText="控制创意发散程度，建议范围 0.1 ~ 1.0。"
            fields={fields}
            onReset={resetField}
          >
            <input
              id="temperature"
              type="number"
              min={0.1}
              max={1}
              step={0.05}
              value={fields.temperature.value}
              onChange={(event) => updateField('temperature', Number(event.target.value))}
              className="input-base w-40"
            />
          </FieldShell>

          <FieldShell
            fieldKey="maxLength"
            label="单次生成最大长度"
            helperText="用于控制续写、对话生成等任务的默认输出上限。"
            fields={fields}
            onReset={resetField}
          >
            <input
              id="maxLength"
              type="number"
              min={100}
              max={5000}
              step={100}
              value={fields.maxLength.value}
              onChange={(event) => updateField('maxLength', Number(event.target.value))}
              className="input-base w-48"
            />
          </FieldShell>

          <FieldShell
            fieldKey="parseDepth"
            label="解析深度"
            helperText="影响 Parser 对章节上下文与知识条目的解析力度。"
            fields={fields}
            onReset={resetField}
          >
            <select
              id="parseDepth"
              value={fields.parseDepth.value}
              onChange={(event) => updateField('parseDepth', event.target.value as AIProjectConfigFields['parseDepth']['value'])}
              className="input-base w-48 cursor-pointer"
            >
              <option value="fast">快速</option>
              <option value="standard">标准</option>
              <option value="deep">深入</option>
            </select>
          </FieldShell>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-[var(--color-text-secondary)]">保存成功只影响后续任务，不会回写当前进行中的面板。</p>
        <LoadingButton
          loading={saving}
          loadingText="保存中..."
          onClick={() => {
            void save();
          }}
          className="w-auto px-6"
          disabled={!isDirty}
        >
          保存 AI 配置
        </LoadingButton>
      </div>
    </div>
  );
}

export default AIConfigTab;
