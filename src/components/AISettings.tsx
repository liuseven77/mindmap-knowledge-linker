import { useState } from 'react';
import { X, Save } from 'lucide-react';
import type { AIConfig } from '../services/ai';

interface Props {
  config: AIConfig;
  onSave: (c: AIConfig) => void;
  onClose: () => void;
}

export function AISettings({ config, onSave, onClose }: Props) {
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [model, setModel] = useState(config.model);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-purple-500 to-violet-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">AI 配置</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={24} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-2">API Key</label>
            <input type="password" value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-3 rounded-xl border-2 border-purple-200
                       focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 text-gray-800" />
            <p className="text-xs text-gray-400 mt-1">DeepSeek、通义千问、智谱等的 API Key 均支持</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-2">模型名</label>
            <input type="text" value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="deepseek-chat"
              className="w-full px-4 py-3 rounded-xl border-2 border-purple-200
                       focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 text-gray-800" />
            <p className="text-xs text-gray-400 mt-1">默认 deepseek-chat，也可填 qwen-turbo 等其他模型</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">取消</button>
            <button onClick={() => onSave({ apiKey, model })}
              className="flex-1 px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium shadow-md flex items-center justify-center gap-2">
              <Save size={18} />保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
