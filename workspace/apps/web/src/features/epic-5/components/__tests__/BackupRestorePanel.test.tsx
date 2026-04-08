import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { BackupRestorePanel } from '../BackupRestorePanel';
import { server } from '../../../../mocks/server';
import { http, HttpResponse } from 'msw';

const mockBackups = [
  {
    id: 'backup-1',
    version: '1.0.0',
    backupType: 'manual',
    projectId: '1',
    projectName: 'Test Project',
    exportedAt: '2024-01-15T10:30:00Z',
    counts: {
      volumes: 2,
      chapters: 10,
      knowledgeBaseEntries: 25,
      snapshots: 5,
      annotations: 12,
    },
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'backup-2',
    version: '1.1.0',
    backupType: 'auto',
    projectId: '1',
    projectName: 'Test Project',
    exportedAt: '2024-01-20T08:00:00Z',
    counts: {
      volumes: 2,
      chapters: 12,
      knowledgeBaseEntries: 28,
      snapshots: 8,
      annotations: 15,
    },
    createdAt: '2024-01-20T08:00:00Z',
  },
];

describe('BackupRestorePanel', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/projects/:projectId/backups', () => {
        return HttpResponse.json({ items: mockBackups });
      }),
      http.post('/api/projects/:projectId/backups/auto/trigger', () => {
        return HttpResponse.json({ backupId: 'backup-3', manifest: { version: '1.2.0', backupType: 'manual' } });
      })
    );
  });

  it('should display loading state initially', () => {
    render(<BackupRestorePanel projectId="1" projectName="Test Project" />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('should display backup list after loading', async () => {
    render(<BackupRestorePanel projectId="1" projectName="Test Project" />);

    await waitFor(() => {
      expect(screen.getByText('手动备份')).toBeInTheDocument();
      expect(screen.getByText('自动备份')).toBeInTheDocument();
    });

    expect(screen.getByText(/v1.0.0/)).toBeInTheDocument();
    expect(screen.getByText(/v1.1.0/)).toBeInTheDocument();
  });

  it('should display empty state when no backups exist', async () => {
    server.use(
      http.get('/api/projects/:projectId/backups', () => {
        return HttpResponse.json({ items: [] });
      })
    );

    render(<BackupRestorePanel projectId="1" projectName="Test Project" />);

    await waitFor(() => {
      expect(screen.getByText('暂无备份记录')).toBeInTheDocument();
    });
  });

  it('should show archived notice when project is archived', async () => {
    render(<BackupRestorePanel projectId="1" projectName="Test Project" isArchived={true} />);

    await waitFor(() => {
      expect(screen.getByText('自动备份已暂停')).toBeInTheDocument();
    });
  });

  it('should disable backup button when archived', async () => {
    render(<BackupRestorePanel projectId="1" projectName="Test Project" isArchived={true} />);

    await waitFor(() => {
      const backupButton = screen.getByRole('button', { name: /立即备份/i });
      expect(backupButton).toBeDisabled();
    });
  });
});
