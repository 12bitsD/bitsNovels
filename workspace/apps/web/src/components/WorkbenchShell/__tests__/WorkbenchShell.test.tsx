import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WorkbenchShell } from '../WorkbenchShell';

// Mock components
vi.mock('../../../features/epic-6/components/NotificationBell', () => ({
  default: () => <div data-testid="notification-bell" />
}));

vi.mock('../../../features/epic-3/components/EditorWorkspace', () => ({
  EditorWorkspace: () => <div data-testid="editor-workspace" />
}));

vi.mock('../../../features/epic-3/components/ChapterPanel/ChapterPanel', () => ({
  ChapterPanel: () => <div data-testid="chapter-panel" />
}));

vi.mock('../../../features/epic-2/components/KnowledgeBasePanel', () => ({
  default: () => <div data-testid="knowledge-base-panel" />
}));

vi.mock('../../../features/epic-5/components/ExportPanel', () => ({
  ExportPanel: () => <div data-testid="export-panel" />
}));

vi.mock('../../../features/epic-5/components/BackupRestorePanel', () => ({
  BackupRestorePanel: () => <div data-testid="backup-restore-panel" />
}));

describe('WorkbenchShell', () => {
  const renderWithRouter = (initialRoute = '/projects/1/workspace') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/projects/:projectId/workspace" element={<WorkbenchShell />} />
          <Route path="/projects/:projectId/workspace/:chapterId" element={<WorkbenchShell />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders without crashing when projectId is provided', () => {
    renderWithRouter();
    expect(screen.getByText('创作工作台')).toBeInTheDocument();
  });

  it('uses semantic token surfaces and a wider right rail for the knowledge base panel', () => {
    const { container } = renderWithRouter('/projects/1/workspace/chapter-1');

    const shellHeader = container.querySelector('header');
    const leftRail = container.querySelector('aside[aria-label="章节目录"]');
    const rightRail = container.querySelector('aside[aria-label="知识库面板"]');

    expect(shellHeader).toHaveClass('bg-surface-header', 'border-border-strong');
    expect(leftRail).toHaveClass('bg-surface-sidebar');
    expect(rightRail).toHaveClass('bg-surface-panel', 'w-[clamp(32rem,38vw,48rem)]');
  });

  it('renders EditorWorkspace when chapterId is provided', () => {
    renderWithRouter('/projects/1/workspace/chapter-1');
    expect(screen.getByTestId('editor-workspace')).toBeInTheDocument();
  });

  it('shows placeholder when no chapter is selected', () => {
    renderWithRouter('/projects/1/workspace');
    expect(screen.getByText('请在左侧选择或创建一个章节以开始写作')).toBeInTheDocument();
  });

  it('toggles left panel', () => {
    renderWithRouter();
    const toggleBtn = screen.getByTitle('切换章节面板');
    expect(screen.getByTestId('chapter-panel')).toBeInTheDocument();
    
    fireEvent.click(toggleBtn);
    expect(screen.queryByTestId('chapter-panel')).not.toBeInTheDocument();
    
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('chapter-panel')).toBeInTheDocument();
  });

  it('toggles right panel', () => {
    renderWithRouter();
    const toggleBtn = screen.getByTitle('切换知识库面板');
    expect(screen.getByTestId('knowledge-base-panel')).toBeInTheDocument();
    
    fireEvent.click(toggleBtn);
    expect(screen.queryByTestId('knowledge-base-panel')).not.toBeInTheDocument();
    
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('knowledge-base-panel')).toBeInTheDocument();
  });

  it('opens and closes export modal', () => {
    renderWithRouter();
    const exportBtn = screen.getByRole('button', { name: /导出项目/ });
    
    fireEvent.click(exportBtn);
    expect(screen.getByTestId('export-panel')).toBeInTheDocument();
    
    const closeBtns = screen.getAllByText('关闭');
    fireEvent.click(closeBtns[0]);
    expect(screen.queryByTestId('export-panel')).not.toBeInTheDocument();
  });

  it('opens and closes backup modal', () => {
    renderWithRouter();
    const backupBtn = screen.getByTitle('备份/恢复');
    
    fireEvent.click(backupBtn);
    expect(screen.getByTestId('backup-restore-panel')).toBeInTheDocument();
    
    const closeBtns = screen.getAllByText('关闭');
    fireEvent.click(closeBtns[0]);
    expect(screen.queryByTestId('backup-restore-panel')).not.toBeInTheDocument();
  });

  it('exposes export and notification entries with visible labels', () => {
    renderWithRouter();

    expect(screen.getByText('导出项目')).toBeInTheDocument();
    expect(screen.getByText('通知中心')).toBeInTheDocument();
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
  });

  it('opens Epic 4 story copilot scaffold from the workbench header', () => {
    renderWithRouter('/projects/1/workspace/chapter-1');

    fireEvent.click(screen.getByRole('button', { name: /Story Copilot/ }));

    expect(screen.getByText('统一 AI 创作入口')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '想设定' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '推剧情' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '看建议' })).toBeInTheDocument();
  });
});
