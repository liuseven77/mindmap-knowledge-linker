import { useState, useEffect, useRef } from 'react';
import {
  X, Send, Settings, Lightbulb, FileText, GitCompare, BrainCircuit
} from 'lucide-react';
import type { Node, Connection } from '../types';
import { chat, loadConfig, saveConfig, AIConfig } from '../services/ai';
import { AISettings } from './AISettings';

interface Props {
  nodes: Node[];
  connections: Connection[];
  selectedNodes: Set<string>;
  getNodeName: (id: string) => string;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function renderMarkdown(text: string): string {
  // **bold** → <strong>
  let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // \n → <br>
  html = html.replace(/\n/g, '<br>');
  return html;
}

export function AIPanel({ nodes, connections, selectedNodes, getNodeName, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<AIConfig>(loadConfig);
  const [showSettings, setShowSettings] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const addAiMessage = (text: string) =>
    setMessages(prev => [...prev, { role: 'assistant', content: text }]);

  const send = async (msgs: Message[]) => {
    if (!config.apiKey || !config.model) {
      setShowSettings(true);
      return;
    }
    setIsLoading(true);
    try {
      const systemMsg = { role: 'system' as const, content: '你是一个知识图谱助手。用简洁的中文回答，直接给出结论，不要废话。' };
      const reply = await chat([systemMsg, ...msgs.map(m => ({ role: m.role, content: m.content }))], config);
      addAiMessage(reply);
    } catch (err: any) {
      addAiMessage(`错误：${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    const selectedArray = Array.from(selectedNodes);
    let prompt = '';

    if (action === 'explore' && selectedArray.length === 1) {
      const node = nodes.find(n => n.id === selectedArray[0])!;
      const allNames = nodes.filter(n => n.id !== node.id).map(n => n.name).join('、');
      prompt = `节点"${node.name}"的内容是：${node.content || '（无内容）'}\n\n画布上其他节点：${allNames}\n\n请分析"${node.name}"可能与哪些其他节点有关联，为什么。只列出确实有可能相关的节点，并简单说明理由。`;
    } else if (action === 'polish' && selectedArray.length === 1) {
      const node = nodes.find(n => n.id === selectedArray[0])!;
      prompt = `请润色以下内容：修正错别字，优化表达使其更清晰流畅。保留原意和风格，不要大幅改写。\n\n"${node.content || ''}"`;
    } else if (action === 'check' && selectedArray.length === 2) {
      const [a, b] = selectedArray;
      const nodeA = nodes.find(n => n.id === a)!;
      const nodeB = nodes.find(n => n.id === b)!;
      const conn = connections.find(
        c => (c.fromId === a && c.toId === b) || (c.fromId === b && c.toId === a)
      );
      if (!conn) return;
      prompt = `节点"${nodeA.name}"：${nodeA.content || '（无内容）'}\n节点"${nodeB.name}"：${nodeB.content || '（无内容）'}\n连线描述："${conn.content || '（无）'}"\n\n请检查这条连线描述是否准确反映了两者关系，有没有遗漏或错误。`;
    } else return;

    const newMsgs = [...messages, { role: 'user' as const, content: prompt }];
    setMessages(newMsgs);
    send(newMsgs);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    const newMsgs = [...messages, { role: 'user' as const, content: text }];
    setMessages(newMsgs);
    setInput('');
    send(newMsgs);
  };

  const selectedArray = Array.from(selectedNodes);
  const canExplore = selectedArray.length === 1;
  const canPolish = selectedArray.length === 1 && nodes.find(n => n.id === selectedArray[0])?.content;
  const canCheck = selectedArray.length === 2 && connections.some(
    c => (c.fromId === selectedArray[0] && c.toId === selectedArray[1]) ||
         (c.fromId === selectedArray[1] && c.toId === selectedArray[0])
  );

  return (
    <>
      <div className="fixed right-4 top-24 z-50 w-[340px] max-h-[70vh]
                    bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-200
                    overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-violet-600 px-4 py-3 flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <BrainCircuit size={18} />AI 助手
          </h3>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="AI 设置">
              <Settings size={18} />
            </button>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="px-3 py-2 flex items-center gap-2 shrink-0 border-b border-gray-100">
          <button
            onClick={() => handleQuickAction('explore')} disabled={!canExplore}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
              canExplore
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                : 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed'
            }`}
            title={!canExplore ? '请选中一个节点' : ''}>
            <Lightbulb size={13} />探索关联
          </button>
          <button
            onClick={() => handleQuickAction('polish')} disabled={!canPolish}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
              canPolish
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                : 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed'
            }`}
            title={!canPolish ? '请选中一个有内容的节点' : ''}>
            <FileText size={13} />润色内容
          </button>
          <button
            onClick={() => handleQuickAction('check')} disabled={!canCheck}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
              canCheck
                ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                : 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed'
            }`}
            title={!canCheck ? '请选中两个已连线的节点' : ''}>
            <GitCompare size={13} />检查关系
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[120px]">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <BrainCircuit size={32} className="mx-auto text-purple-300 mb-2" />
              <p className="text-sm text-purple-400">AI 助手就绪</p>
              <p className="text-xs text-gray-400 mt-1">
                使用快捷按钮或自由输入来获得帮助
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`rounded-xl px-3 py-2 max-w-[95%] ${m.role === 'user'
              ? 'bg-purple-50 border border-purple-100 ml-auto'
              : 'bg-gray-50 border border-gray-100'
            }`}>
              <p className="text-xs font-medium mb-1 text-gray-400">
                {m.role === 'user' ? '你' : 'AI'}
              </p>
              <div
                className="text-sm text-gray-800 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
              />
            </div>
          ))}
          {isLoading && (
            <div className="bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
              <p className="text-xs font-medium mb-1 text-gray-400">AI</p>
              <p className="text-sm text-gray-500 animate-pulse">思考中...</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-100 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="输入问题..."
              rows={2}
              className="flex-1 px-3 py-2 rounded-xl border-2 border-purple-200
                       focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100
                       text-gray-800 placeholder-gray-400 text-sm resize-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white
                       disabled:bg-gray-200 disabled:text-gray-400 transition-all shrink-0">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {showSettings && (
        <AISettings
          config={config}
          onSave={(c) => { setConfig(c); saveConfig(c); setShowSettings(false); }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}
