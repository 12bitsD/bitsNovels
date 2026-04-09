import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Settings, ChevronLeft, Sidebar, BookOpen, Download, Archive } from 'lucide-react';

import NotificationBell from '../../features/epic-6/components/NotificationBell';
import { EditorWorkspace } from '../../features/epic-3/components/EditorWorkspace';
import { ChapterPanel } from '../../features/epic-3/components/ChapterPanel/ChapterPanel';
import KBCharacterPanel from '../../features/epic-2/components/KBCharacter/KBCharacterPanel';
import { ExportPanel } from '../../features/epic-5/components/ExportPanel';
import { BackupRestorePanel } from '../../features/epic-5/components/BackupRestorePanel';

export function WorkbenchShell() {
  const { projectId, chapterId } = useParams<{ projectId: string; chapterId?: string }>();
  const navigate = useNavigate();

  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // For modals
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);

  if (!projectId) {
    return <div>Missing Project ID</div>;
  }

  const handleChapterSelect = (newChapterId: string) => {
    navigate(`/projects/${projectId}/workspace/${newChapterId}`);
  };

  const railToggleClasses = (isOpen: boolean) =>
    [
      'rounded-lg border px-2.5 py-2 transition-all duration-150',
      isOpen
        ? 'border-[var(--color-amber)]/40 bg-[var(--color-amber-light)]/80 text-[var(--color-amber)] shadow-sm'
        : 'border-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-panel)]',
    ].join(' ');

  const utilityButtonClasses =
    'inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-panel)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] shadow-sm transition-all duration-150 hover:border-[var(--color-amber)]/40 hover:bg-[var(--color-amber-light)]/35 active:translate-y-px';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-app text-[var(--color-text-primary)]">
      {/* Top Bar */}
      <header className="z-10 flex h-16 flex-none items-center justify-between border-b border-border-strong bg-surface-header px-4 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Link
            to={`/dashboard`}
            className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-panel)] hover:text-[var(--color-text-primary)]"
            title="返回项目列表"
          >
            <ChevronLeft size={20} />
          </Link>
          <div className="flex items-center gap-2 border-l border-border pl-4">
            <button
              onClick={() => setLeftPanelOpen(!leftPanelOpen)}
              className={railToggleClasses(leftPanelOpen)}
              title="切换章节面板"
            >
              <Sidebar size={18} />
            </button>
          </div>
          <div className="ml-2">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">Workbench</p>
            <h1 className="text-lg font-semibold">创作工作台</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Epic 5: Export / Backup entries */}
          <button
            onClick={() => setShowExportModal(true)}
            className={`${utilityButtonClasses} hidden sm:inline-flex`}
            title="导出项目"
          >
            <Download size={18} />
            <span>导出项目</span>
          </button>
          <button
            onClick={() => setShowBackupModal(true)}
            className={`${utilityButtonClasses} hidden lg:inline-flex`}
            title="备份/恢复"
          >
            <Archive size={18} />
            <span>备份归档</span>
          </button>

          <div className="hidden items-center gap-2 rounded-xl border border-border bg-surface-panel-muted/60 px-3 py-1.5 md:flex">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">Alerts</p>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">通知中心</p>
            </div>
            <NotificationBell />
          </div>

          <Link
            to={`/projects/${projectId}/settings`}
            className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-panel)] hover:text-[var(--color-text-primary)]"
            title="项目设置"
          >
            <Settings size={18} />
          </Link>

          <div className="ml-1 border-l border-border pl-3">
            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className={railToggleClasses(rightPanelOpen)}
              title="切换知识库面板"
            >
              <BookOpen size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Chapter Panel */}
        {leftPanelOpen && (
          <aside
            aria-label="章节目录"
            className="w-64 flex-none overflow-y-auto border-r border-border bg-surface-sidebar"
          >
            <ChapterPanel
              projectId={projectId}
              activeChapterId={chapterId || null}
              onChapterSelect={handleChapterSelect}
            />
          </aside>
        )}

        {/* Middle Panel: Editor */}
        <main className="flex-1 overflow-y-auto bg-surface-editor">
          {chapterId ? (
            <div className="py-6 px-4 md:px-8">
              <EditorWorkspace
                projectId={projectId}
                chapterId={chapterId}
                initialTitle="章节标题"
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-[var(--color-text-secondary)]">
              请在左侧选择或创建一个章节以开始写作
            </div>
          )}
        </main>

        {/* Right Panel: Knowledge Base */}
        {rightPanelOpen && (
          <aside
            aria-label="知识库面板"
            className="w-[clamp(32rem,38vw,48rem)] flex-none overflow-y-auto border-l border-border bg-surface-panel"
          >
            <div className="border-b border-border px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">Knowledge Base</p>
              <h2 className="font-semibold">知识库</h2>
            </div>
            <div className="p-5">
              <KBCharacterPanel projectId={projectId} />
            </div>
          </aside>
        )}
      </div>

      {/* Modals for Export and Backup */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-surface-panel shadow-xl">
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute right-4 top-4 rounded p-1 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-panel-muted)] hover:text-[var(--color-text-primary)]"
            >
              关闭
            </button>
            <div className="p-6">
              <ExportPanel projectId={projectId} projectName="当前项目" />
            </div>
          </div>
        </div>
      )}

      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-surface-panel shadow-xl">
            <button
              onClick={() => setShowBackupModal(false)}
              className="absolute right-4 top-4 z-10 rounded p-1 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-panel-muted)] hover:text-[var(--color-text-primary)]"
            >
              关闭
            </button>
            <div className="p-6">
              <BackupRestorePanel projectId={projectId} projectName="当前项目" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkbenchShell;
