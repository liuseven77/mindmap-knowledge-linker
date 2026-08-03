export interface AIConfig {
  apiKey: string;
  model: string;
}

const CONFIG_KEY = 'mindmap_ai_config';

export function loadConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { apiKey: '', model: 'deepseek-chat' };
}

export function saveConfig(config: AIConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export async function chat(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  config: AIConfig,
): Promise<string> {
  // 统一走 /api/chat：dev 由 Vite proxy 转发，prod 由 Vercel rewrite 转发。
  // 避免浏览器直连第三方 API 触发 CORS，同时隐藏真实 API 地址。
  const url = '/api/chat';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('API Key 无效，请检查设置');
    if (res.status === 404) throw new Error('请求地址不存在');
    throw new Error(`请求失败 (${res.status})`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('API 返回了空内容');
  return content;
}
