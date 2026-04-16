import { useMemo, useState } from 'react';
import { Check, Edit2, Save, ShieldBan, X, XCircle } from 'lucide-react';
import type { KBCharacter, KBCharacterChapterReference, UpdateKBCharacterInput } from './types';
import { NameGeneratorModal } from '../../../epic-4/components/NameGeneratorModal';

interface KBCharacterDetailProps {
  projectId: string;
  character: KBCharacter;
  chapters?: KBCharacterChapterReference[];
  factionName?: string;
  onClose?: () => void;
  onConfirm?: (id: string) => void;
  onMarkNotCharacter?: (id: string) => void;
  onChapterSelect?: (chapterId: string) => void;
  onSave?: (id: string, input: UpdateKBCharacterInput) => void;
}

interface CharacterFormState {
  name: string;
  aliases: string;
  gender: string;
  occupation: string;
  appearance: string;
  personalityTags: string;
  factionId: string;
  remark: string;
}

function toDraft(character: KBCharacter): CharacterFormState {
  return {
    name: character.name,
    aliases: character.aliases.join(', '),
    gender: character.gender ?? '',
    occupation: character.occupation ?? '',
    appearance: character.appearance ?? '',
    personalityTags: character.personalityTags.join(', '),
    factionId: character.factionId ?? '',
    remark: character.remark ?? '',
  };
}

function normalizeCommaSeparated(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function KBCharacterDetail({
  projectId,
  character,
  chapters = [],
  factionName,
  onClose,
  onConfirm,
  onMarkNotCharacter,
  onChapterSelect,
  onSave,
}: KBCharacterDetailProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CharacterFormState>(() => toDraft(character));
  const [showNameGen, setShowNameGen] = useState(false);

  const chapterList = useMemo(
    () =>
      character.chapterIds.map((chapterId) => {
        const matched = chapters.find((item) => item.id === chapterId);
        return matched ?? { id: chapterId, title: chapterId, order: 0 };
      }),
    [character.chapterIds, chapters],
  );

  const showPendingActions = character.source === 'ai' && !character.confirmed;

  const updateDraft = (key: keyof CharacterFormState, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSave = () => {
    onSave?.(character.id, {
      name: draft.name.trim(),
      aliases: normalizeCommaSeparated(draft.aliases),
      gender: draft.gender.trim() || undefined,
      occupation: draft.occupation.trim() || undefined,
      appearance: draft.appearance.trim() || undefined,
      personalityTags: normalizeCommaSeparated(draft.personalityTags),
      factionId: draft.factionId.trim() || undefined,
      remark: draft.remark.trim() || undefined,
    });
    setEditing(false);
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">{character.name}</h2>
            {showPendingActions && (
              <span className="rounded px-1.5 py-0.5 text-xs font-medium text-[var(--color-amber)] bg-[var(--color-parchment)]">
                AI识别-待确认
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[var(--color-ink-light)]">完整角色资料与识别上下文</p>
        </div>
        <div className="flex items-center gap-2">
          {onSave && !editing && (
            <button
              type="button"
              aria-label={`编辑角色 ${character.name}`}
              onClick={() => {
                setDraft(toDraft(character));
                setEditing(true);
              }}
              className="rounded-md border border-[var(--color-border)] bg-white p-2 text-[var(--color-ink-light)] transition-colors hover:bg-[var(--color-parchment)]"
            >
              <Edit2 size={16} />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              aria-label="关闭"
              onClick={onClose}
              className="rounded-md border border-[var(--color-border)] bg-white p-2 text-[var(--color-ink-light)] transition-colors hover:bg-[var(--color-parchment)]"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4 text-sm">
        {editing ? (
          <div className="space-y-4">
            <label className="block">
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="block text-xs font-medium text-[var(--color-ink-light)]">角色姓名</span>
                <button
                  type="button"
                  onClick={() => setShowNameGen(true)}
                  className="rounded-md border border-[var(--color-border)] bg-white px-2 py-1 text-xs text-[var(--color-ink-light)] transition-colors hover:bg-[var(--color-parchment)]"
                >
                  AI 起名
                </button>
              </div>
              <input value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/20" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--color-ink-light)]">别名</span>
              <input value={draft.aliases} onChange={(event) => updateDraft('aliases', event.target.value)} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/20" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--color-ink-light)]">性别</span>
              <input value={draft.gender} onChange={(event) => updateDraft('gender', event.target.value)} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/20" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--color-ink-light)]">身份/职业</span>
              <input value={draft.occupation} onChange={(event) => updateDraft('occupation', event.target.value)} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/20" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--color-ink-light)]">外貌摘要</span>
              <textarea value={draft.appearance} onChange={(event) => updateDraft('appearance', event.target.value)} className="min-h-20 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/20" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--color-ink-light)]">性格标签</span>
              <input value={draft.personalityTags} onChange={(event) => updateDraft('personalityTags', event.target.value)} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/20" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--color-ink-light)]">所属势力</span>
              <input value={draft.factionId} onChange={(event) => updateDraft('factionId', event.target.value)} className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/20" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--color-ink-light)]">备注</span>
              <textarea value={draft.remark} onChange={(event) => updateDraft('remark', event.target.value)} className="min-h-24 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/20" />
            </label>
          </div>
        ) : (
          <>
            <section className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-parchment)]/40 p-4">
              <div>
                <p className="text-xs font-medium text-[var(--color-ink-light)]">主名</p>
                <p className="mt-1 text-[var(--color-ink-light)]">见顶部角色标题</p>
              </div>
              {character.aliases.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[var(--color-ink-light)]">别名</p>
                  <p className="mt-1 text-[var(--color-ink)]">{character.aliases.join('、')}</p>
                </div>
              )}
              {character.gender && (
                <div>
                  <p className="text-xs font-medium text-[var(--color-ink-light)]">性别</p>
                  <p className="mt-1 text-[var(--color-ink)]">{character.gender}</p>
                </div>
              )}
              {character.occupation && (
                <div>
                  <p className="text-xs font-medium text-[var(--color-ink-light)]">身份/职业</p>
                  <p className="mt-1 text-[var(--color-ink)]">{character.occupation}</p>
                </div>
              )}
              {character.appearance && (
                <div>
                  <p className="text-xs font-medium text-[var(--color-ink-light)]">外貌摘要</p>
                  <p className="mt-1 whitespace-pre-wrap text-[var(--color-ink)]">{character.appearance}</p>
                </div>
              )}
              {character.personalityTags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[var(--color-ink-light)]">性格标签</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {character.personalityTags.map((tag) => (
                      <span key={tag} className="rounded-full bg-white px-2 py-1 text-xs text-[var(--color-ink)] border border-[var(--color-border)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {factionName && (
                <div>
                  <p className="text-xs font-medium text-[var(--color-ink-light)]">所属势力</p>
                  <p className="mt-1 text-[var(--color-ink)]">{factionName}</p>
                </div>
              )}
              {character.remark && (
                <div>
                  <p className="text-xs font-medium text-[var(--color-ink-light)]">备注</p>
                  <p className="mt-1 whitespace-pre-wrap text-[var(--color-ink)]">{character.remark}</p>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-[var(--color-border)] bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--color-ink-light)]">出场章节</p>
                  <p className="mt-1 text-[var(--color-ink)]">共 {character.chapterIds.length} 章</p>
                </div>
                <p className="text-xs text-[var(--color-ink-light)]">首次：{character.firstAppearanceChapterId ?? '—'} · 最近：{character.lastAppearanceChapterId ?? '—'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {chapterList.map((chapter) => (
                  <button
                    key={chapter.id}
                    type="button"
                    aria-label={`跳转到章节 ${chapter.title}`}
                    onClick={() => onChapterSelect?.(chapter.id)}
                    className="rounded-md border border-[var(--color-border)] bg-[var(--color-parchment)] px-3 py-1.5 text-sm text-[var(--color-ink)] transition-colors hover:border-[var(--color-amber)]/50"
                  >
                    {chapter.title}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      <div className="space-y-2 border-t border-[var(--color-border)] p-4">
        {editing ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={`保存角色 ${character.name}`}
              onClick={handleSave}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[var(--color-amber)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <Save size={16} />
              保存
            </button>
            <button
              type="button"
              aria-label={`取消编辑角色 ${character.name}`}
              onClick={() => {
                setDraft(toDraft(character));
                setEditing(false);
              }}
              className="flex items-center justify-center rounded-md border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-light)] transition-colors hover:bg-[var(--color-parchment)]"
            >
              <XCircle size={16} />
            </button>
          </div>
        ) : (
          showPendingActions && (
            <div className="grid gap-2 sm:grid-cols-2">
              {onConfirm && (
                <button
                  type="button"
                  aria-label={`确认角色 ${character.name}`}
                  onClick={() => onConfirm(character.id)}
                  className="flex items-center justify-center gap-2 rounded-md bg-[var(--color-amber)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  <Check size={16} />
                  确认角色
                </button>
              )}
              {onMarkNotCharacter && (
                <button
                  type="button"
                  aria-label={`标记 ${character.name} 为非角色`}
                  onClick={() => onMarkNotCharacter(character.id)}
                  className="flex items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-ink-light)] transition-colors hover:bg-[var(--color-parchment)]"
                >
                  <ShieldBan size={16} />
                  标记非角色
                </button>
              )}
            </div>
          )
        )}
      </div>

      <NameGeneratorModal
        isOpen={showNameGen}
        onClose={() => setShowNameGen(false)}
        projectId={projectId}
        nameType="character"
        onFill={(name) => {
          updateDraft('name', name);
          setShowNameGen(false);
        }}
      />
    </div>
  );
}
