import type { KBSetting } from './types';

interface KBSettingDetailProps {
  setting: KBSetting | null;
  loading: boolean;
}

export default function KBSettingDetail({ setting, loading }: KBSettingDetailProps) {
  if (loading) {
    return <div className="p-6 text-sm text-[var(--color-ink-light)]">加载详情…</div>;
  }

  if (!setting) {
    return <div className="p-6 text-sm text-[var(--color-ink-light)]">选择一条设定查看详情</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-ink)]">{setting.title}</h3>
          <p className="mt-1 text-sm text-[var(--color-ink-light)]">
            {setting.category} · {setting.source === 'ai' ? 'AI' : '手动'} ·{' '}
            {setting.confirmed ? '已确认' : '待确认'}
          </p>
        </div>
      </div>

      <div className="mt-6 whitespace-pre-wrap rounded-lg border border-[var(--color-border)] bg-white p-4 text-sm leading-7 text-[var(--color-ink)]">
        {setting.content}
      </div>

      {setting.relatedEntityRefs.length > 0 ? (
        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-ink-light)]">References</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {setting.relatedEntityRefs.map((ref) => (
              <span
                key={`${ref.entityType}:${ref.entityId}`}
                className="rounded-full bg-[var(--color-parchment)] px-3 py-1 text-xs text-[var(--color-ink-light)]"
              >
                {ref.entityType}:{ref.entityId}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

