import { useState } from 'react';
import { X } from 'lucide-react';
import type { Node, Connection } from '../types';

interface EditNodeModalProps {
  node: Node;
  onSave: (node: Node) => void;
  onClose: () => void;
}

export function EditNodeModal({ node, onSave, onClose }: EditNodeModalProps) {
  const [name, setName] = useState(node.name);
  const [content, setContent] = useState(node.content);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">编辑节点</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={24} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-amber-700 mb-2">节点名称</label>
            <input type="text" value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-amber-200
                       focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 text-amber-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-amber-700 mb-2">节点内容</label>
            <textarea value={content}
              onChange={e => setContent(e.target.value)}
              rows={4} placeholder="输入节点的详细内容，如定义、要点、来源等。Ctrl+Z 可撤销输入。"
              className="w-full px-4 py-3 rounded-xl border-2 border-amber-200
                       focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100
                       text-amber-900 placeholder-amber-300 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">取消</button>
            <button onClick={() => { onSave({ ...node, name, content }); onClose(); }}
              className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium shadow-md">保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Duplicate Name Modal ──────────────────────────────────

interface DuplicateModalProps {
  name: string;
  onForceAdd: () => void;
  onClose: () => void;
}

export function DuplicateModal({ name, onForceAdd, onClose }: DuplicateModalProps) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">节点名称重复</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-amber-800">
            已存在名为 <span className="font-bold">"{name}"</span> 的节点，是否仍要创建？
          </p>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">取消</button>
            <button onClick={onForceAdd}
              className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium shadow-md">仍要创建</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Connection Modal ─────────────────────────────────

interface EditConnectionModalProps {
  connection: Connection;
  fromName: string;
  toName: string;
  onSave: (c: Connection) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function EditConnectionModal({ connection, fromName, toName, onSave, onDelete, onClose }: EditConnectionModalProps) {
  const [content, setContent] = useState(connection.content);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-green-400 to-emerald-500 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">编辑联系</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={24} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-center gap-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
            <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-amber-200">
              <span className="font-medium text-amber-800">{fromName}</span>
            </div>
            <span className="text-green-500 font-bold">↔</span>
            <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-amber-200">
              <span className="font-medium text-amber-800">{toName}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-green-700 mb-2">联系内容</label>
            <textarea value={content}
              onChange={e => setContent(e.target.value)}
              rows={4} placeholder="描述这两个节点之间的关系，如因果关系、相似性、前提条件等。Ctrl+Z 可撤销输入。"
              className="w-full px-4 py-3 rounded-xl border-2 border-green-200
                       focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100
                       text-gray-800 placeholder-green-300 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { onDelete(connection.id); onClose(); }}
              className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium flex items-center gap-2">
              <X size={18} />删除
            </button>
            <button onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">取消</button>
            <button onClick={() => { onSave({ ...connection, content }); onClose(); }}
              className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium shadow-md">保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}
