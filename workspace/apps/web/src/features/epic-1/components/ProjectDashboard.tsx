import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { client } from '../../../api/client';

type Project = {
  id: string;
  name: string;
  tags: string[];
  cover_color: string;
  total_chars: number;
  chapter_count: number;
  updated_at: string;
};

export default function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  useEffect(() => {
    client.GET('/api/projects').then(({ data }) => {
      if (data) setProjects(data);
      setLoading(false);
    });
  }, []);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div data-testid="loading-skeleton" className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
        <div className="h-10 bg-white/50 w-48 mb-10 rounded-md"></div>
        <div className="flex justify-between mb-8">
          <div className="h-10 bg-white/50 w-64 rounded-md"></div>
          <div className="h-10 bg-white/50 w-24 rounded-md"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-white/40 border border-white/60 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen bg-parchment flex flex-col items-center justify-center p-4 font-sans text-ink">
        <div className="text-center max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-24 h-24 bg-amber/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl text-amber opacity-80">✍️</span>
          </div>
          <h2 className="text-2xl font-bold mb-3">开始您的第一部作品</h2>
          <p className="text-ink-light mb-8 leading-relaxed">在这里记录灵感，构建您的世界。一切伟大的史诗，都始于一个空白的页面。</p>
          <Link
            to="/projects/new"
            className="btn-primary inline-block w-auto px-8 py-3 shadow-md hover:shadow-lg"
          >
            + 新建项目
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] p-8 font-sans text-[#2C2416]">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">我的项目</h1>
          <Link
            to="/projects/new"
            className="btn-primary w-auto px-6 shadow-sm hover:shadow-md"
          >
            + 新建项目
          </Link>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索项目..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-base w-64 pl-10 bg-white"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light opacity-50">🔍</span>
          </div>
          <div className="flex gap-2 bg-white/50 p-1 rounded-md border border-border/50">
            <button 
              aria-label="卡片视图"
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-sm transition-all duration-200 ${viewMode === 'card' ? 'bg-white shadow-sm text-amber' : 'text-ink-light hover:bg-white/50'}`}
            >
              ▣
            </button>
            <button 
              aria-label="列表视图"
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-sm transition-all duration-200 ${viewMode === 'list' ? 'bg-white shadow-sm text-amber' : 'text-ink-light hover:bg-white/50'}`}
            >
              ☰
            </button>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-20 text-ink-light bg-white/40 rounded-lg border border-border/50 border-dashed">
            未找到匹配项目
          </div>
        ) : viewMode === 'card' ? (
          <div data-testid="card-view-container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => (
              <div 
                key={project.id} 
                className="card-base card-hover p-6 relative overflow-hidden group cursor-pointer"
              >
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2"
                  style={{ backgroundColor: project.cover_color }}
                />
                <h3 className="text-xl font-bold mb-3 truncate pl-2">{project.name}</h3>
                <div className="flex gap-2 mb-6 pl-2">
                  {project.tags.map(tag => (
                    <span key={tag} className="bg-parchment text-ink-light text-xs px-2.5 py-1 rounded-sm border border-border/30">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-ink-light space-y-1.5 pl-2">
                  <p className="flex justify-between items-center">
                    <span>字数</span>
                    <span className="font-mono text-ink">{project.total_chars.toLocaleString()}</span>
                  </p>
                  <p className="flex justify-between items-center">
                    <span>章节</span>
                    <span className="font-mono text-ink">{project.chapter_count}</span>
                  </p>
                  <p className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-parchment">
                    <span>最后编辑</span>
                    <span>{new Date(project.updated_at).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div data-testid="list-view-container" className="card-base overflow-hidden">
            {filteredProjects.map((project, index) => (
              <div 
                key={project.id} 
                className={`flex items-center p-4 hover:bg-ivory cursor-pointer transition-colors ${
                  index !== filteredProjects.length - 1 ? 'border-b border-parchment' : ''
                }`}
              >
                <div className="w-3 h-3 rounded-full mr-4 shadow-sm" style={{ backgroundColor: project.cover_color }} />
                <div className="flex-1 font-bold">{project.name}</div>
                <div className="w-32 text-sm text-ink-light font-mono">{project.total_chars.toLocaleString()} 字</div>
                <div className="w-32 text-sm text-ink-light font-mono">{project.chapter_count} 章</div>
                <div className="w-32 text-sm text-ink-light text-right">{new Date(project.updated_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
