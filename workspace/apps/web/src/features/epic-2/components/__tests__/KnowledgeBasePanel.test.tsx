import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import KnowledgeBasePanel from '../KnowledgeBasePanel';

vi.mock('../KBCharacter/KBCharacterPanel', () => ({
  default: () => <div data-testid="kb-character">character</div>,
}));
vi.mock('../KBLocation/KBLocationPanel', () => ({
  default: () => <div data-testid="kb-location">location</div>,
}));
vi.mock('../KBItem/KBItemPanel', () => ({
  default: () => <div data-testid="kb-item">item</div>,
}));
vi.mock('../KBFaction/KBFactionPanel', () => ({
  default: () => <div data-testid="kb-faction">faction</div>,
}));
vi.mock('../KBForeshadow/KBForeshadowPanel', () => ({
  default: () => <div data-testid="kb-foreshadow">foreshadow</div>,
}));
vi.mock('../KBSetting/KBSettingPanel', () => ({
  default: () => <div data-testid="kb-setting">setting</div>,
}));

describe('KnowledgeBasePanel', () => {
  it('switches tabs including setting tab', () => {
    render(<KnowledgeBasePanel projectId="project-1" />);

    expect(screen.getByTestId('kb-character')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '设定' }));
    expect(screen.getByTestId('kb-setting')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '地点' }));
    expect(screen.getByTestId('kb-location')).toBeInTheDocument();
  });
});

