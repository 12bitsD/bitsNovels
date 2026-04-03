import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KBLocationDetail from '../KBLocation/KBLocationDetail';
import type { KBLocation, KBLocationReferences } from '../KBLocation/types';

const createKBLocation = (overrides: Partial<KBLocation> = {}): KBLocation => ({
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

describe('KBLocationDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render location name', () => {
    const location = createKBLocation({ name: 'Shanghai' });
    render(<KBLocationDetail location={location} onClose={vi.fn()} />);
    
    expect(screen.getByText('Shanghai')).toBeInTheDocument();
  });

  it('should render location type', () => {
    const location = createKBLocation({ locationType: 'village' });
    render(<KBLocationDetail location={location} onClose={vi.fn()} />);
    
    expect(screen.getByText('类型')).toBeInTheDocument();
    expect(screen.getByText('村庄')).toBeInTheDocument();
  });

  it('should render aliases', () => {
    const location = createKBLocation({ aliases: ['Peking', 'Beijing City'] });
    render(<KBLocationDetail location={location} onClose={vi.fn()} />);
    
    expect(screen.getByText('别名')).toBeInTheDocument();
    expect(screen.getByText('Peking, Beijing City')).toBeInTheDocument();
  });

  it('should render description', () => {
    const location = createKBLocation({ description: 'A beautiful city' });
    render(<KBLocationDetail location={location} onClose={vi.fn()} />);
    
    expect(screen.getByText('A beautiful city')).toBeInTheDocument();
  });

  it('should render parent location name', () => {
    const location = createKBLocation({ parentId: 'parent1' });
    const parentLocation = createKBLocation({ id: 'parent1', name: 'China' });
    render(
      <KBLocationDetail 
        location={location} 
        parentLocation={parentLocation}
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.getByText('上级地点')).toBeInTheDocument();
    expect(screen.getByText('China')).toBeInTheDocument();
  });

  it('should render source badge for AI locations', () => {
    const location = createKBLocation({ source: 'ai' });
    render(<KBLocationDetail location={location} onClose={vi.fn()} />);
    
    expect(screen.getByText('AI识别')).toBeInTheDocument();
  });

  it('should render source badge for manual locations', () => {
    const location = createKBLocation({ source: 'manual' });
    render(<KBLocationDetail location={location} onClose={vi.fn()} />);
    
    expect(screen.getByText('手动录入')).toBeInTheDocument();
  });

  it('should render confirmed status', () => {
    const location = createKBLocation({ confirmed: true });
    render(<KBLocationDetail location={location} onClose={vi.fn()} />);
    
    expect(screen.getByText('已确认')).toBeInTheDocument();
  });

  it('should render pending confirmation status', () => {
    const location = createKBLocation({ confirmed: false, source: 'ai' });
    render(<KBLocationDetail location={location} onClose={vi.fn()} />);
    
    expect(screen.getByText('待确认')).toBeInTheDocument();
  });

  it('should render remark when present', () => {
    const location = createKBLocation({ remark: 'Important location' });
    render(<KBLocationDetail location={location} onClose={vi.fn()} />);
    
    expect(screen.getByText('备注')).toBeInTheDocument();
    expect(screen.getByText('Important location')).toBeInTheDocument();
  });

  it('should render associated characters', () => {
    const references: KBLocationReferences = {
      chapters: [],
      characters: [
        { id: 'char1', name: 'John' },
        { id: 'char2', name: 'Jane' },
      ],
    };
    const location = createKBLocation({ characterIds: ['char1', 'char2'] });
    render(
      <KBLocationDetail 
        location={location} 
        references={references}
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.getByText('关联角色')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });

  it('should render associated chapters', () => {
    const references: KBLocationReferences = {
      chapters: [
        { id: 'ch1', title: 'Chapter 1', order: 1 },
        { id: 'ch2', title: 'Chapter 2', order: 2 },
      ],
      characters: [],
    };
    const location = createKBLocation({ chapterIds: ['ch1', 'ch2'] });
    render(
      <KBLocationDetail 
        location={location} 
        references={references}
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.getByText('出现章节')).toBeInTheDocument();
    expect(screen.getByText('Chapter 1')).toBeInTheDocument();
    expect(screen.getByText('Chapter 2')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    const location = createKBLocation();
    render(<KBLocationDetail location={location} onClose={onClose} />);
    
    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('should show confirm button for unconfirmed AI locations', () => {
    const location = createKBLocation({ source: 'ai', confirmed: false });
    const onConfirm = vi.fn();
    render(
      <KBLocationDetail 
        location={location} 
        onClose={vi.fn()} 
        onConfirm={onConfirm}
      />
    );
    
    expect(screen.getByText('确认地点')).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    const location = createKBLocation({ source: 'ai', confirmed: false });
    const onConfirm = vi.fn();
    render(
      <KBLocationDetail 
        location={location} 
        onClose={vi.fn()} 
        onConfirm={onConfirm}
      />
    );
    
    fireEvent.click(screen.getByText('确认地点'));
    expect(onConfirm).toHaveBeenCalledWith(location.id);
  });

  it('should show reject button for unconfirmed AI locations', () => {
    const location = createKBLocation({ source: 'ai', confirmed: false });
    const onReject = vi.fn();
    render(
      <KBLocationDetail 
        location={location} 
        onClose={vi.fn()} 
        onReject={onReject}
      />
    );
    
    expect(screen.getByText('标记非地点')).toBeInTheDocument();
  });

  it('should call onReject when reject button is clicked', () => {
    const location = createKBLocation({ source: 'ai', confirmed: false });
    const onReject = vi.fn();
    render(
      <KBLocationDetail 
        location={location} 
        onClose={vi.fn()} 
        onReject={onReject}
      />
    );
    
    fireEvent.click(screen.getByText('标记非地点'));
    expect(onReject).toHaveBeenCalledWith(location.id);
  });

  it('should not show action buttons for confirmed locations', () => {
    const location = createKBLocation({ source: 'ai', confirmed: true });
    render(<KBLocationDetail location={location} onClose={vi.fn()} />);
    
    expect(screen.queryByText('确认地点')).not.toBeInTheDocument();
    expect(screen.queryByText('标记非地点')).not.toBeInTheDocument();
  });

  it('should not show action buttons for manual locations', () => {
    const location = createKBLocation({ source: 'manual' });
    render(<KBLocationDetail location={location} onClose={vi.fn()} />);
    
    expect(screen.queryByText('确认地点')).not.toBeInTheDocument();
    expect(screen.queryByText('标记非地点')).not.toBeInTheDocument();
  });

  it('should show edit button', () => {
    const location = createKBLocation({ source: 'manual' });
    const onEdit = vi.fn();
    render(
      <KBLocationDetail 
        location={location} 
        onClose={vi.fn()} 
        onEdit={onEdit}
      />
    );
    
    expect(screen.getByText('编辑')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', () => {
    const location = createKBLocation({ source: 'manual' });
    const onEdit = vi.fn();
    render(
      <KBLocationDetail 
        location={location} 
        onClose={vi.fn()} 
        onEdit={onEdit}
      />
    );
    
    fireEvent.click(screen.getByText('编辑'));
    expect(onEdit).toHaveBeenCalledWith(location);
  });

  it('should show delete button for manual locations', () => {
    const location = createKBLocation({ source: 'manual' });
    const onDelete = vi.fn();
    render(
      <KBLocationDetail 
        location={location} 
        onClose={vi.fn()} 
        onDelete={onDelete}
      />
    );
    
    expect(screen.getByText('删除')).toBeInTheDocument();
  });

  it('should call onDelete when delete button is clicked', () => {
    const location = createKBLocation({ source: 'manual' });
    const onDelete = vi.fn();
    render(
      <KBLocationDetail 
        location={location} 
        onClose={vi.fn()} 
        onDelete={onDelete}
      />
    );
    
    fireEvent.click(screen.getByText('删除'));
    expect(onDelete).toHaveBeenCalledWith(location.id);
  });

  it('should render creation date', () => {
    const location = createKBLocation({ createdAt: '2024-01-15T10:00:00Z' });
    render(<KBLocationDetail location={location} onClose={vi.fn()} />);
    
    expect(screen.getByText(/创建时间/)).toBeInTheDocument();
  });

  it('should render update date', () => {
    const location = createKBLocation({ updatedAt: '2024-01-20T15:30:00Z' });
    render(<KBLocationDetail location={location} onClose={vi.fn()} />);
    
    expect(screen.getByText(/更新时间/)).toBeInTheDocument();
  });

  it('should show merge button for confirmed locations', () => {
    const location = createKBLocation({ source: 'manual', confirmed: true });
    const onMerge = vi.fn();
    render(
      <KBLocationDetail 
        location={location} 
        onClose={vi.fn()} 
        onMerge={onMerge}
      />
    );
    
    expect(screen.getByText('合并')).toBeInTheDocument();
  });

  it('should call onMerge when merge button is clicked', () => {
    const location = createKBLocation({ source: 'manual', confirmed: true });
    const onMerge = vi.fn();
    render(
      <KBLocationDetail 
        location={location} 
        onClose={vi.fn()} 
        onMerge={onMerge}
      />
    );
    
    fireEvent.click(screen.getByText('合并'));
    expect(onMerge).toHaveBeenCalledWith(location.id);
  });
});
