import { useState, useRef } from 'react';
import {
  Download,
  Upload,
  FileJson,
  AlertTriangle,
  Check,
  X,
  User,
  MapPin,
  Box,
  Users,
  Link,
} from 'lucide-react';
import { client } from '../../../api/client';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { LoadingButton } from '../../../components/ui/LoadingButton';

type KBEntityType = 'characters' | 'locations' | 'items' | 'factions' | 'foreshadows';
type ExportScopeMode = 'all' | 'types' | 'items';
type ConflictStrategy = 'skip' | 'overwrite' | 'keep_both';

interface KBEntry {
  id: string;
  name: string;
  type: KBEntityType;
}

interface KBConflict {
  entry: KBEntry;
  existingEntryId: string;
  strategy: ConflictStrategy;
}

interface KBTransferPanelProps {
  projectId: string;
}

const TYPE_LABELS: Record<KBEntityType, string> = {
  characters: '人物',
  locations: '地点',
  items: '道具',
  factions: '势力',
  foreshadows: '伏笔',
};

const TYPE_ICONS: Record<KBEntityType, typeof User> = {
  characters: User,
  locations: MapPin,
  items: Box,
  factions: Users,
  foreshadows: Link,
};

export function KBTransferPanel({ projectId }: KBTransferPanelProps) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScopeMode>('all');
  const [selectedTypes, setSelectedTypes] = useState<KBEntityType[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportResult, setExportResult] = useState<{ exportId: string; projectId: string; scope: unknown; createdAt: string } | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [conflicts, setConflicts] = useState<KBConflict[]>([]);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    overwritten: number;
    renamed: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    setExportResult(null);

    try {
      const result = await client.POST(`/api/projects/${projectId}/kb/export`, {
        body: {
          scope: {
            mode: exportScope,
            types: exportScope === 'types' ? selectedTypes : undefined,
          },
        },
      });

      if (result.error) {
        const msg = (result.error as { detail?: string }).detail || '导出失败';
        setExportError(msg);
        return;
      }

      const data = result.data as { exportId: string; projectId: string; scope: unknown; createdAt: string };
      setExportResult(data);
    } catch {
      setExportError('导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadExport = () => {
    if (exportResult) {
      window.open(`/api/projects/${projectId}/kb/export/${exportResult.exportId}/download`, '_blank');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        setImportError('请选择 JSON 格式的文件');
        return;
      }
      setImportFile(file);
      setImportError('');
      setConflicts([]);
      setImportResult(null);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleImport = async () => {
    if (!importFile) {
      setImportError('请选择要导入的文件');
      return;
    }

    setImporting(true);
    setImportError('');

    try {
      const fileContent = await readFileAsText(importFile);
      const jsonData = JSON.parse(fileContent);

      const result = await client.POST(`/api/projects/${projectId}/kb/import`, {
        body: {
          strategy: 'skip',
          data: jsonData,
        },
      });

      if (result.error) {
        const err = result.error as { detail?: string; conflicts?: KBConflict[] };
        if (err.conflicts && err.conflicts.length > 0) {
          setConflicts(err.conflicts.map((c) => ({ ...c, strategy: 'skip' })));
        } else {
          setImportError(err.detail || '导入失败');
        }
        return;
      }

      const data = result.data as { imported: number; skipped: number; overwritten: number; renamed: number };
      setImportResult(data);
    } catch {
      setImportError('文件格式错误或导入失败');
    } finally {
      setImporting(false);
    }
  };

  const executeImportWithConflicts = async () => {
    if (!importFile) return;

    setImporting(true);
    setImportError('');

    try {
      const fileContent = await readFileAsText(importFile);
      const jsonData = JSON.parse(fileContent);

      const strategies: Record<string, ConflictStrategy> = {};
      conflicts.forEach((c) => {
        strategies[c.entry.id] = c.strategy;
      });

      const result = await client.POST(`/api/projects/${projectId}/kb/import`, {
        body: {
          strategy: 'skip',
          data: jsonData,
        },
      });

      if (result.error) {
        const msg = (result.error as { detail?: string }).detail || '导入失败';
        setImportError(msg);
        return;
      }

      const data = result.data as { imported: number; skipped: number; overwritten: number; renamed: number };
      setImportResult(data);
      setConflicts([]);
    } catch {
      setImportError('导入失败');
    } finally {
      setImporting(false);
    }
  };

  const updateConflictStrategy = (entryId: string, strategy: ConflictStrategy) => {
    setConflicts((prev) =>
      prev.map((c) => (c.entry.id === entryId ? { ...c, strategy } : c))
    );
  };

  const toggleType = (type: KBEntityType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const resetImport = () => {
    setImportFile(null);
    setImportError('');
    setConflicts([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-ink">知识库导入/导出</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => {
            setShowExportModal(true);
            setExportResult(null);
            setExportError('');
          }}
          className="p-6 bg-parchment/50 rounded-lg border-2 border-dashed border-border hover:border-amber/50 transition-colors text-center"
        >
          <Download size={32} className="mx-auto text-amber mb-2" />
          <p className="font-medium text-ink">导出知识库</p>
          <p className="text-xs text-ink-light mt-1">导出为 JSON 格式</p>
        </button>

        <button
          onClick={() => {
            resetImport();
            setShowImportModal(true);
          }}
          className="p-6 bg-parchment/50 rounded-lg border-2 border-dashed border-border hover:border-amber/50 transition-colors text-center"
        >
          <Upload size={32} className="mx-auto text-amber mb-2" />
          <p className="font-medium text-ink">导入知识库</p>
          <p className="text-xs text-ink-light mt-1">从 JSON 文件导入</p>
        </button>
      </div>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => !exporting && setShowExportModal(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-modal max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <h3 className="text-lg font-bold text-ink">导出知识库</h3>
              <button
                onClick={() => setShowExportModal(false)}
                disabled={exporting}
                className="p-1.5 text-ink-light hover:text-ink rounded transition-colors disabled:opacity-50"
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {exportError && <ErrorAlert error={exportError} onDismiss={() => setExportError('')} />}

              {exportResult ? (
                <div className="bg-success/10 border border-success/20 rounded-lg p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
                    <Check size={24} className="text-success" />
                  </div>
                  <p className="font-bold text-success">导出完成</p>
                  <p className="text-sm text-ink-light mt-1">知识库导出成功</p>
                  <button
                    onClick={handleDownloadExport}
                    className="btn-primary mt-4 flex items-center gap-2 mx-auto"
                  >
                    <Download size={16} />
                    下载 JSON 文件
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">导出范围</label>
                    <div className="space-y-2">
                      {[
                        { key: 'all', label: '全部导出', desc: '导出所有知识库条目' },
                        { key: 'types', label: '按类型选择', desc: '选择特定类型导出' },
                      ].map((option) => (
                        <label
                          key={option.key}
                          className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            exportScope === option.key
                              ? 'border-amber bg-amber/5'
                              : 'border-border/50 hover:border-amber/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="exportScope"
                            value={option.key}
                            checked={exportScope === option.key}
                            onChange={(e) => setExportScope(e.target.value as ExportScopeMode)}
                            className="mt-1"
                          />
                          <div>
                            <p className="font-medium text-ink">{option.label}</p>
                            <p className="text-xs text-ink-light">{option.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {exportScope === 'types' && (
                    <div>
                      <label className="block text-sm font-medium text-ink mb-2">选择类型</label>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(TYPE_LABELS) as KBEntityType[]).map((type) => {
                          const Icon = TYPE_ICONS[type];
                          return (
                            <button
                              key={type}
                              onClick={() => toggleType(type)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                                selectedTypes.includes(type)
                                  ? 'border-amber bg-amber/5'
                                  : 'border-border/50 hover:border-amber/30'
                              }`}
                            >
                              <Icon size={16} />
                              <span className="text-sm">{TYPE_LABELS[type]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {!exportResult && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/30">
                <button
                  onClick={() => setShowExportModal(false)}
                  disabled={exporting}
                  className="px-4 py-2 text-sm font-medium text-ink-light hover:text-ink transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <LoadingButton
                  loading={exporting}
                  loadingText="导出中..."
                  onClick={handleExport}
                  disabled={exportScope === 'types' && selectedTypes.length === 0}
                >
                  <span className="flex items-center gap-2">
                    <Download size={16} />
                    确认导出
                  </span>
                </LoadingButton>
              </div>
            )}
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => !importing && setShowImportModal(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-modal max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <h3 className="text-lg font-bold text-ink">导入知识库</h3>
              <button
                onClick={() => setShowImportModal(false)}
                disabled={importing}
                className="p-1.5 text-ink-light hover:text-ink rounded transition-colors disabled:opacity-50"
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {importError && <ErrorAlert error={importError} onDismiss={() => setImportError('')} />}

              {!importResult && conflicts.length === 0 && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="w-full p-8 border-2 border-dashed border-border rounded-lg hover:border-amber/50 transition-colors text-center disabled:opacity-50"
                  >
                    <FileJson size={40} className="mx-auto text-ink-light/50 mb-3" />
                    {importFile ? (
                      <>
                        <p className="font-medium text-ink">{importFile.name}</p>
                        <p className="text-sm text-ink-light mt-1">点击更换文件</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-ink">选择 JSON 文件</p>
                        <p className="text-sm text-ink-light mt-1">支持拖拽上传</p>
                      </>
                    )}
                  </button>
                </>
              )}

              {conflicts.length > 0 && !importResult && (
                <div className="space-y-4">
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="text-warning flex-shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="font-medium text-warning">检测到冲突</p>
                        <p className="text-sm text-ink-light mt-1">
                          以下条目与现有知识库中的条目冲突，请选择处理方式。
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {conflicts.map((conflict) => {
                      const Icon = TYPE_ICONS[conflict.entry.type];
                      return (
                        <div key={conflict.entry.id} className="p-3 bg-parchment/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon size={16} className="text-ink-light" />
                            <span className="font-medium text-ink">{conflict.entry.name}</span>
                            <span className="text-xs text-ink-light">({TYPE_LABELS[conflict.entry.type]})</span>
                          </div>
                          <div className="flex gap-2">
                            {([
                              { key: 'skip', label: '跳过' },
                              { key: 'overwrite', label: '覆盖' },
                              { key: 'keep_both', label: '保留两者' },
                            ] as { key: ConflictStrategy; label: string }[]).map((option) => (
                              <button
                                key={option.key}
                                onClick={() => updateConflictStrategy(conflict.entry.id, option.key)}
                                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                                  conflict.strategy === option.key
                                    ? 'bg-amber text-white'
                                    : 'bg-white hover:bg-amber/10'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {importResult && (
                <div className="bg-success/10 border border-success/20 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                      <Check size={24} className="text-success" />
                    </div>
                    <div>
                      <p className="font-bold text-success text-lg">导入完成</p>
                      <p className="text-sm text-ink-light">知识库导入成功</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-success">{importResult.renamed}</p>
                      <p className="text-xs text-ink-light">重命名条目</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-amber">{importResult.overwritten}</p>
                      <p className="text-xs text-ink-light">覆盖条目</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-ink-light">{importResult.skipped}</p>
                      <p className="text-xs text-ink-light">跳过条目</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-ink">{importResult.imported}</p>
                      <p className="text-xs text-ink-light">总计导入</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/30">
              {importResult ? (
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    resetImport();
                  }}
                  className="btn-primary"
                >
                  完成
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowImportModal(false)}
                    disabled={importing}
                    className="px-4 py-2 text-sm font-medium text-ink-light hover:text-ink transition-colors disabled:opacity-50"
                  >
                    取消
                  </button>
                  {conflicts.length > 0 ? (
                    <LoadingButton
                      loading={importing}
                      loadingText="导入中..."
                      onClick={executeImportWithConflicts}
                    >
                      <span className="flex items-center gap-2">
                        <Upload size={16} />
                        确认导入
                      </span>
                    </LoadingButton>
                  ) : (
                    <LoadingButton
                      loading={importing}
                      loadingText="导入中..."
                      onClick={handleImport}
                      disabled={!importFile}
                    >
                      <span className="flex items-center gap-2">
                        <Upload size={16} />
                        开始导入
                      </span>
                    </LoadingButton>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KBTransferPanel;
