import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KBLocationCard from '../KBLocation/KBLocationCard';
import type { KBLocation } from '../KBLocation/types';

const createKBLocation = (overrides: Partial<KBLocation> = {}): KBLocation => ({ type: "location",
  id: '1',
  projectId: 'project1',
  source: 'ai',
  confirmed: false,
  name: 'Beijing',
  aliases: ['Peking'],
  locationType: 'city',
  characterIds: ['char1'],
  chapterIds: ['ch1'],
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

describe('KBLocationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render location name', () => {
    const location = createKBLocation({ name: 'Shanghai' });
    render(<KBLocationCard location={location} onClick={vi.fn()} />);
    
    expect(screen.getByText('Shanghai')).toBeInTheDocument();
  });

  it('should render AI识别-待确认 badge for unconfirmed AI locations', () => {
    const location = createKBLocation({ source: 'ai', confirmed: false });
    render(<KBLocationCard location={location} onClick={vi.fn()} />);
    
    expect(screen.getByText('AI识别-待确认')).toBeInTheDocument();
  });

  it('should render 新发现 badge for newly created locations', () => {
    const recentDate = new Date().toISOString();
    const location = createKBLocation({ 
      source: 'ai', 
      confirmed: false, 
      createdAt: recentDate,
      updatedAt: recentDate,
    });
    render(<KBLocationCard location={location} onClick={vi.fn()} />);
    
    expect(screen.getByText('新发现')).toBeInTheDocument();
  });

  it('should not render 新发现 badge for older locations', () => {
    const oldDate = '2024-01-01T10:00:00Z';
    const location = createKBLocation({ 
      source: 'ai', 
      confirmed: false, 
      createdAt: oldDate,
      updatedAt: oldDate,
    });
    render(<KBLocationCard location={location} onClick={vi.fn()} />);
    
    expect(screen.queryByText('新发现')).not.toBeInTheDocument();
  });

  it('should render location type label', () => {
    const location = createKBLocation({ locationType: 'village' });
    render(<KBLocationCard location={location} onClick={vi.fn()} />);
    
    expect(screen.getByText('村庄')).toBeInTheDocument();
  });

  it('should render parent location name when parentId exists', () => {
    const location = createKBLocation({ parentId: 'parent1' });
    const locations = [createKBLocation({ id: 'parent1', name: 'China' })];
    render(<KBLocationCard location={location} parentLocations={locations} onClick={vi.fn()} />);
    
    expect(screen.getByText('上级: China')).toBeInTheDocument();
  });

  it('should render character count', () => {
    const location = createKBLocation({ characterIds: ['char1', 'char2', 'char3'] });
    render(<KBLocationCard location={location} onClick={vi.fn()} />);
    
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render chapter count', () => {
    const location = createKBLocation({ chapterIds: ['ch1', 'ch2'] });
    render(<KBLocationCard location={location} onClick={vi.fn()} />);
    
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should call onClick when card is clicked', () => {
    const location = createKBLocation();
    const onClick = vi.fn();
    render(<KBLocationCard location={location} onClick={onClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith(location);
  });

  it('should render aliases when provided', () => {
    const location = createKBLocation({ aliases: ['Peking', 'Beijing City'] });
    render(<KBLocationCard location={location} onClick={vi.fn()} />);
    
    expect(screen.getByText('别名: Peking, Beijing City')).toBeInTheDocument();
  });

  it('should not render aliases section when empty', () => {
    const location = createKBLocation({ aliases: [] });
    render(<KBLocationCard location={location} onClick={vi.fn()} />);
    
    expect(screen.queryByText(/别名:/)).not.toBeInTheDocument();
  });

  it('should show confirm and reject buttons for unconfirmed AI locations', () => {
    const location = createKBLocation({ source: 'ai', confirmed: false });
    const onConfirm = vi.fn();
    const onReject = vi.fn();
    render(
      <KBLocationCard 
        location={location} 
        onClick={vi.fn()} 
        onConfirm={onConfirm}
        onReject={onReject}
      />
    );
    
    expect(screen.getByText('确认')).toBeInTheDocument();
    expect(screen.getByText('标记非地点')).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    const location = createKBLocation({ source: 'ai', confirmed: false });
    const onConfirm = vi.fn();
    const onReject = vi.fn();
    render(
      <KBLocationCard 
        location={location} 
        onClick={vi.fn()} 
        onConfirm={onConfirm}
        onReject={onReject}
      />
    );
    
    fireEvent.click(screen.getByText('确认'));
    expect(onConfirm).toHaveBeenCalledWith(location.id);
  });

  it('should call onReject when reject button is clicked', () => {
    const location = createKBLocation({ source: 'ai', confirmed: false });
    const onConfirm = vi.fn();
    const onReject = vi.fn();
    render(
      <KBLocationCard 
        location={location} 
        onClick={vi.fn()} 
        onConfirm={onConfirm}
        onReject={onReject}
      />
    );
    
    fireEvent.click(screen.getByText('标记非地点'));
    expect(onReject).toHaveBeenCalledWith(location.id);
  });

  it('should not show action buttons for confirmed locations', () => {
    const location = createKBLocation({ source: 'ai', confirmed: true });
    render(<KBLocationCard location={location} onClick={vi.fn()} />);
    
    expect(screen.queryByText('确认')).not.toBeInTheDocument();
    expect(screen.queryByText('标记非地点')).not.toBeInTheDocument();
  });

  it('should not show action buttons for manual locations', () => {
    const location = createKBLocation({ source: 'manual', confirmed: true });
    render(<KBLocationCard location={location} onClick={vi.fn()} />);
    
    expect(screen.queryByText('确认')).not.toBeInTheDocument();
    expect(screen.queryByText('标记非地点')).not.toBeInTheDocument();
  });

  it('should render confirmed badge for confirmed locations', () => {
    const location = createKBLocation({ source: 'ai', confirmed: true });
    render(<KBLocationCard location={location} onClick={vi.fn()} />);
    
    expect(screen.queryByText('AI识别-待确认')).not.toBeInTheDocument();
  });
});
