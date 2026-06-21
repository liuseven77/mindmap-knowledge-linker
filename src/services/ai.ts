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
  // In dev: go through Vite proxy. In prod: direct to DeepSeek API.
  const url = import.meta.env.DEV
    ? '/api/chat'
    : 'https://api.deepseek.com/v1/chat/completions';

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
