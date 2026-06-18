import { useState, useRef, useEffect } from 'react';
import { BookOpen, BookPlus, Clock, Plus, Trash2, Download, Upload, FolderSync } from 'lucide-react';
import type { Notebook } from '../types';
import { storage } from '../storage';
import { pickExportFolder, isAutoExportEnabled, disableAutoExport } from '../autoExport';

interface HomeScreenProps {
  onCreate: (name: string) => void;
  onOpen: (id: string) => void;
}

export function HomeScreen({ onCreate, onOpen }: HomeScreenProps) {
  const [name, setName] = useState('');
  const [notebooks, setNotebooks] = useState<Notebook[]>(() => storage.load());
  const [autoExport, setAutoExport] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    isAutoExportEnabled().then(setAutoExport);
  }, []);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName('');
    setNotebooks(storage.load());
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notebooks.filter(n => n.id !== id);
    storage.save
  };

  const handleExportAll = () => {
    const data = JSON.stringify(storage.load(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindmap-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const file = importRef.current?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result as string) as Notebook[];
        if (!Array.isArray(imported)) throw new Error('Invalid format');
        const existing = storage.load();
        // Merge: overwrite notebooks with same id, add new ones
        const merged = [...existing];
        for (const nb of imported) {
          const idx = merged.findIndex(m => m.id === nb.id);
          if (idx >= 0) merged[idx] = nb;
          else merged.push(nb);
        }
        storage.save(merged);
        setNotebooks(merged);
      } catch { alert('导入失败：文件格式不正确'); }
    };
    reader.readAsText(file);
    if (importRef.current) importRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl
                        bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl shadow-amber-200 mb-6">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-amber-900 mb-2">我的知识链接</h1>
          <p className="text-amber-600">创建知识链接本，梳理你的知识体系</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-amber-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
            <BookPlus size={20} />创建新链接本
          </h2>
          <div className="flex gap-3">
            <input type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="输入链接本名称..."
              className="flex-1 px-4 py-3 rounded-xl border-2 border-amber-200
                         focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100
                         text-amber-900 placeholder-amber-400 transition-all"
            />
            <button onClick={handleCreate}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500
                         hover:from-amber-600 hover:to-orange-600 text-white rounded-xl
                         font-medium shadow-lg shadow-amber-200 transition-all flex items-center gap-2">
              <Plus size={18} />创建
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
            <Clock size={20} />历史链接本
          </h2>
          {notebooks.length === 0 ? (
            <div className="text-center py-12 bg-white/60 rounded-2xl border border-dashed border-amber-200">
              <p className="text-amber-500">还没有链接本，创建一个开始吧</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notebooks
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map(nb => (
                  <button key={nb.id} onClick={() => onOpen(nb.id)}
                    className="w-full bg-white rounded-2xl shadow-md border border-amber-100
                               hover:shadow-lg hover:border-amber-300 transition-all p-5
                               flex items-center justify-between group text-left"
                  >
                    <div>
                      <h3 className="font-semibold text-amber-900">{nb.name}</h3>
                      <p className="text-sm text-amber-500 mt-1">
                        {nb.nodes.length} 个节点 · {nb.connections.length} 条连线
                        · {new Date(nb.updatedAt).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    <span
                      onClick={(e) => handleDelete(nb.id, e)}
                      className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50
                                 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Data management */}
        <div className="mt-8 pt-6 border-t border-amber-200">
          <h2 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
            <Download size={20} />数据管理
          </h2>
          <div className="flex gap-3 mb-3">
            <button onClick={handleExportAll}
              className="flex-1 px-4 py-3 bg-white hover:bg-amber-50 text-amber-700 rounded-xl
                         border-2 border-amber-200 hover:border-amber-300 font-medium
                         transition-all flex items-center justify-center gap-2">
              <Download size={18} />导出全部数据
            </button>
            <button onClick={() => importRef.current?.click()}
              className="flex-1 px-4 py-3 bg-white hover:bg-amber-50 text-amber-700 rounded-xl
                         border-2 border-amber-200 hover:border-amber-300 font-medium
                         transition-all flex items-center justify-center gap-2">
              <Upload size={18} />导入数据
            </button>
            <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          </div>
          <div className="flex gap-3">
            {autoExport ? (
              <button
                onClick={() => { disableAutoExport(); setAutoExport(false); }}
                className="flex-1 px-4 py-3 bg-green-50 hover:bg-red-50 text-green-700 hover:text-red-600 rounded-xl
                           border-2 border-green-200 hover:border-red-200 font-medium
                           transition-all flex items-center justify-center gap-2">
                <FolderSync size={18} />自动备份已开启 — 点击关闭
              </button>
            ) : (
              <button
                onClick={async () => {
                  const ok = await pickExportFolder();
                  if (ok) setAutoExport(true);
                  else if (!window.showDirectoryPicker) alert('当前浏览器不支持自动备份，请使用 Chrome 或 Edge');
                }}
                className="flex-1 px-4 py-3 bg-white hover:bg-green-50 text-amber-700 hover:text-green-700 rounded-xl
                           border-2 border-amber-200 hover:border-green-300 font-medium
                           transition-all flex items-center justify-center gap-2">
                <FolderSync size={18} />开启自动备份
              </button>
            )}
          </div>
          <p className="text-xs text-amber-400 mt-2 text-center">
            自动备份：每次数据变更自动导出 JSON 到本地文件夹（需要 Chrome/Edge 浏览器）
          </p>
        </div>
      </div>
    </div>
  );
}
