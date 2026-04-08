import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackupRestorePanel } from '../BackupRestorePanel';
import { server } from '../../../../mocks/server';
import { http, HttpResponse } from 'msw';

const mockBackups = [
  {
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
  },
  {
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
  },
];

describe('BackupRestorePanel', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/projects/:projectId/backups', () => {
        return HttpResponse.json(mockBackups);
      }),
      http.post('/api/projects/:projectId/backups', () => {
        return HttpResponse.json({ version: '1.2.0', backupType: 'manual' });
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
        return HttpResponse.json([]);
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

  it('should disable create backup button when archived', async () => {
    render(<BackupRestorePanel projectId="1" projectName="Test Project" isArchived={true} />);

    const backupButton = screen.getByRole('button', { name: /手动备份/i });
    expect(backupButton).toBeDisabled();
  });

  it('should open restore modal when upload button is clicked', async () => {
    render(<BackupRestorePanel projectId="1" projectName="Test Project" />);

    await waitFor(() => {
      expect(screen.getByText('手动备份')).toBeInTheDocument();
    });

    const uploadButton = screen.getByRole('button', { name: /上传备份文件/i });
    fireEvent.click(uploadButton);

    expect(screen.getByText('从备份恢复')).toBeInTheDocument();
    expect(screen.getByText('选择备份文件')).toBeInTheDocument();
  });

  it('should display create_new and overwrite mode options in modal', async () => {
    render(<BackupRestorePanel projectId="1" projectName="Test Project" />);

    await waitFor(() => {
      expect(screen.getByText('手动备份')).toBeInTheDocument();
    });

    const uploadButton = screen.getByRole('button', { name: /上传备份文件/i });
    fireEvent.click(uploadButton);

    expect(screen.getByText('创建为新项目')).toBeInTheDocument();
    expect(screen.getByText('覆盖当前项目')).toBeInTheDocument();
  });

  it('should show overwrite confirmation when overwrite mode is selected', async () => {
    server.use(
      http.post('/api/projects/:projectId/backups/restore', async ({ request }) => {
        const formData = await request.formData();
        if (formData.get('preview') === 'true') {
          return HttpResponse.json({
            projectName: 'Test Project',
            totalChars: 15000,
            chapterCount: 10,
            knowledgeBaseCount: 25,
            backupDate: '2024-01-15T10:30:00Z',
            fileSize: 1024000,
          });
        }
        return HttpResponse.json({ success: true });
      })
    );

    render(<BackupRestorePanel projectId="1" projectName="Test Project" />);

    await waitFor(() => {
      expect(screen.getByText('手动备份')).toBeInTheDocument();
    });

    const uploadButton = screen.getByRole('button', { name: /上传备份文件/i });
    fireEvent.click(uploadButton);

    const overwriteOption = screen.getByText('覆盖当前项目');
    fireEvent.click(overwriteOption);

    expect(screen.getByText('危险操作')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('输入项目名称确认')).toBeInTheDocument();
  });

  it('should disable confirm button until project name is typed for overwrite mode', async () => {
    render(<BackupRestorePanel projectId="1" projectName="Test Project" />);

    await waitFor(() => {
      expect(screen.getByText('手动备份')).toBeInTheDocument();
    });

    const uploadButton = screen.getByRole('button', { name: /上传备份文件/i });
    fireEvent.click(uploadButton);

    const overwriteOption = screen.getByText('覆盖当前项目');
    fireEvent.click(overwriteOption);

    const confirmButton = screen.getByRole('button', { name: /确认恢复/i });
    expect(confirmButton).toBeDisabled();

    const nameInput = screen.getByPlaceholderText('输入项目名称确认');
    fireEvent.change(nameInput, { target: { value: 'Wrong Name' } });

    expect(confirmButton).toBeDisabled();

    fireEvent.change(nameInput, { target: { value: 'Test Project' } });

    expect(confirmButton).not.toBeDisabled();
  });

  it('should close modal when cancel is clicked', async () => {
    render(<BackupRestorePanel projectId="1" projectName="Test Project" />);

    await waitFor(() => {
      expect(screen.getByText('手动备份')).toBeInTheDocument();
    });

    const uploadButton = screen.getByRole('button', { name: /上传备份文件/i });
    fireEvent.click(uploadButton);

    expect(screen.getByText('从备份恢复')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /取消/i });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('从备份恢复')).not.toBeInTheDocument();
    });
  });

  it('should display error when fetch backups fails', async () => {
    server.use(
      http.get('/api/projects/:projectId/backups', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    render(<BackupRestorePanel projectId="1" projectName="Test Project" />);

    await waitFor(() => {
      expect(screen.getByText('获取备份列表失败')).toBeInTheDocument();
    });
  });
});