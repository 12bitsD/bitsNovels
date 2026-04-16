import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import KBSettingPanel from '../KBSetting/KBSettingPanel';
import type { KBSetting } from '../KBSetting/types';
import * as useKBSettingModule from '../../hooks/useKBSetting';

vi.mock('../../hooks/useKBSetting');

const createSetting = (overrides: Partial<KBSetting> = {}): KBSetting => ({
  id: 'setting-1',
  projectId: 'project-1',
  type: 'setting',
  source: 'ai',
  confirmed: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  title: '帝国纪年体系',
  category: '历史',
  content: '奠基纪/扩张纪/裂变纪。',
  order: 0,
  relatedEntityRefs: [],
  ...overrides,
});

const mockUseKBSetting = (
  overrides: Partial<ReturnType<typeof useKBSettingModule.useKBSetting>> = {},
): ReturnType<typeof useKBSettingModule.useKBSetting> => ({
  items: [],
  loading: false,
  detailLoading: false,
  error: null,
  search: '',
  category: '',
  selectedSettingId: null,
  selectedSetting: null,
  setSearch: vi.fn(),
  setCategory: vi.fn(),
  setSelectedSettingId: vi.fn(),
  createSetting: vi.fn(),
  updateSetting: vi.fn(),
  deleteSetting: vi.fn(),
  refetch: vi.fn(),
  ...overrides,
});

describe('KBSettingPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders panel title', () => {
    vi.mocked(useKBSettingModule.useKBSetting).mockReturnValue(mockUseKBSetting());
    render(<KBSettingPanel projectId="project-1" />);
    expect(screen.getByText('世界观设定')).toBeInTheDocument();
  });

  it('renders list items and selects an item', () => {
    const setSelectedSettingId = vi.fn();
    vi.mocked(useKBSettingModule.useKBSetting).mockReturnValue(
      mockUseKBSetting({
        items: [createSetting({ id: 's1', title: 'A' }), createSetting({ id: 's2', title: 'B' })],
        setSelectedSettingId,
      }),
    );

    render(<KBSettingPanel projectId="project-1" />);

    fireEvent.click(screen.getByRole('button', { name: /A/ }));
    expect(setSelectedSettingId).toHaveBeenCalledWith('s1');
  });
});
