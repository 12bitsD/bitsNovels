import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFocusTrap } from '../../../hooks';
import { client } from '../../../api/client';
import { Icons } from '../../../components/ui/icons';
import { FormInput } from '../../../components/ui/FormInput';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { LoadingButton } from '../../../components/ui/LoadingButton';

type ProjectType = 'novel' | 'medium' | 'short';

interface CreateProjectModalProps {
  onClose: () => void;
}

export default function CreateProjectModal({ onClose }: CreateProjectModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [type, setType] = useState<ProjectType>('novel');
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [structureMode, setStructureMode] = useState('blank');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, true);

  const handleNext = () => {
    if (step === 1) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError('项目名称不能为空');
        return;
      }
      if (trimmedName.length > 50) {
        setError('项目名称不能超过 50 个字符');
        return;
      }
      setError('');
    }
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: apiError, response } = await client.POST('/api/projects', {
        body: { 
          name: name.trim(), 
          type, 
          tags,
          description: description || undefined
        }
      });
      
      if (apiError) {
        if (response.status === 409) {
          setError('已有同名项目，请修改名称');
          setStep(1); // 回退到第一步让用户修改
        } else {
          const detail =
            typeof apiError === 'object' &&
            apiError !== null &&
            'detail' in apiError &&
            typeof (apiError as { detail?: unknown }).detail === 'string'
              ? (apiError as { detail: string }).detail
              : '创建失败';
          throw new Error(detail);
        }
        return;
      }
      
      onClose();
      navigate('/dashboard'); // 简化跳转
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={modalRef} className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div 
        className="bg-white rounded-xl w-full max-w-2xl overflow-hidden font-sans text-ink transform transition-all duration-300 scale-100 opacity-100"
        style={{ boxShadow: 'var(--shadow-modal)' }}
      >
        <div className="p-6 border-b border-border/30 flex justify-between items-center bg-ivory/50">
          <h2 className="text-xl font-bold">新建项目</h2>
          <button onClick={onClose} className="text-ink-light hover:text-ink transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-parchment">
            <Icons.Close size={16} />
          </button>
        </div>

        <div className="p-8 min-h-[400px]">
          {error && <ErrorAlert error={error} onDismiss={() => setError('')} className="mb-6" />}
          
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="font-bold text-lg mb-6 text-amber flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber/10 flex items-center justify-center text-sm">1</span>
                基本信息
              </h3>
              <FormInput
                id="name"
                label="项目名称"
                value={name}
                onChange={setName}
                placeholder="最多 50 个字符"
                required
              />
              
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-ink-light mb-1.5">类型</label>
                <select 
                  id="type"
                  value={type}
                  onChange={e => setType(e.target.value as ProjectType)}
                  className="input-base cursor-pointer"
                >
                  <option value="novel">长篇小说</option>
                  <option value="medium">中篇小说</option>
                  <option value="short">短篇/散文</option>
                </select>
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-ink-light mb-1.5">题材标签 (最多 5 个)</label>
                <input
                  id="tags"
                  placeholder="逗号分隔，例如：玄幻, 悬疑"
                  value={tags.join(', ')}
                  onChange={e => setTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                  className="input-base"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-ink-light mb-1.5">简介 (可选)</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="input-base h-28 resize-none py-3"
                  placeholder="最多 500 个字符"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="font-bold text-lg mb-6 text-amber flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber/10 flex items-center justify-center text-sm">2</span>
                项目结构
              </h3>
              <div className="grid grid-cols-2 gap-5">
                <div 
                  className={`border-2 p-5 rounded-lg cursor-pointer transition-all duration-200 ${
                    structureMode === 'blank' 
                      ? 'border-amber bg-amber/5 shadow-sm' 
                      : 'border-border/50 hover:border-amber/50 hover:bg-parchment/50'
                  }`}
                  onClick={() => setStructureMode('blank')}
                >
                  <h4 className="font-bold mb-2 text-ink">空白项目</h4>
                  <p className="text-sm text-ink-light leading-relaxed">从零开始，没有任何预设卷章，适合已经有清晰大纲的创作者。</p>
                </div>
                <div 
                  className={`border-2 p-5 rounded-lg cursor-pointer transition-all duration-200 ${
                    structureMode === 'template' 
                      ? 'border-amber bg-amber/5 shadow-sm' 
                      : 'border-border/50 hover:border-amber/50 hover:bg-parchment/50'
                  }`}
                  onClick={() => setStructureMode('template')}
                >
                  <h4 className="font-bold mb-2 text-ink">从模板开始</h4>
                  <p className="text-sm text-ink-light leading-relaxed">使用经典的起承转合结构模板，包含基础的卷章框架与说明。</p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="font-bold text-lg mb-6 text-amber flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber/10 flex items-center justify-center text-sm">3</span>
                知识库初始化
              </h3>
              <div className="border-2 border-dashed border-border/70 rounded-xl p-10 text-center bg-parchment/30 hover:bg-parchment/60 transition-colors group cursor-pointer">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                  <span className="text-amber"><Icons.Folder size={32} /></span>
                </div>
                <p className="text-ink font-medium mb-2">拖拽 JSON 模板文件到此处，或点击上传</p>
                <p className="text-sm text-ink-light mb-6">支持导入角色、世界观等预设设定</p>
                <button className="btn-secondary w-auto px-6">
                  选择文件
                </button>
                <p className="text-xs text-ink-light/60 mt-4">支持 .json 格式，最大 20MB</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-border/30 bg-ivory/30 flex justify-between items-center">
          {step > 1 ? (
            <button onClick={handleBack} className="px-5 py-2 text-ink-light hover:text-ink font-medium transition-colors">
              返回上一步
            </button>
          ) : <div />}
          
          {step < 3 ? (
            <button onClick={handleNext} className="btn-primary w-auto px-8">
              下一步
            </button>
          ) : (
            <LoadingButton 
              loading={loading}
              onClick={handleSubmit}
              className="w-auto px-8 flex items-center gap-2"
            >
              跳过并创建
            </LoadingButton>
          )}
        </div>
      </div>
    </div>
  );
}
