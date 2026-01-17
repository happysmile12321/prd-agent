import { getApiKey, getApiUrl, saveConfig } from './config.js';

// 聊天消息
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// AI 响应
export interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 聊天历史
let chatHistory: ChatMessage[] = [];

// 调用智谱AI API
export async function callAI(messages: ChatMessage[], model = 'glm-4-flash'): Promise<AIResponse> {
  const apiKey = await getApiKey();

  if (!apiKey) {
    throw new Error('API key not configured. Run: set-api <your-key>');
  }

  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  return {
    content,
    usage: data.usage,
  };
}

// 清空聊天历史
export function clearHistory(): void {
  chatHistory = [];
}

// 获取聊天历史
export function getHistory(): ChatMessage[] {
  return chatHistory;
}

// 添加到历史
export function addToHistory(message: ChatMessage): void {
  chatHistory.push(message);
  // 限制历史长度
  if (chatHistory.length > 50) {
    chatHistory = chatHistory.slice(-20);
  }
}

// 对话模式 - 持续对话
export async function chat(userMessage: string, systemPrompt?: string): Promise<string> {
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  // 添加历史消息
  messages.push(...chatHistory);

  // 添加当前用户消息
  messages.push({ role: 'user', content: userMessage });

  const response = await callAI(messages);

  // 保存到历史
  addToHistory({ role: 'user', content: userMessage });
  addToHistory({ role: 'assistant', content: response.content });

  return response.content;
}

// 一次性提问（不保存历史）
export async function ask(userMessage: string, systemPrompt?: string): Promise<string> {
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({ role: 'user', content: userMessage });

  const response = await callAI(messages);
  return response.content;
}

// 代码生成
export async function generateCode(prompt: string, language?: string): Promise<string> {
  const systemPrompt = language
    ? `你是一个${language}编程专家。根据用户需求生成代码。只返回代码，不要其他说明。`
    : `你是一个编程专家。根据用户需求生成代码，只返回代码，不要其他说明。`;

  return ask(prompt, systemPrompt);
}

// 代码审查
export async function reviewCode(code: string, language?: string): Promise<string> {
  const systemPrompt = language
    ? `你是一个${language}代码审查专家。分析用户提交的代码，指出问题、给出改进建议。`
    : `你是一个代码审查专家。分析用户提交的代码，指出问题、给出改进建议。`;

  return ask(code, systemPrompt);
}

// 代码解释
export async function explainCode(code: string): Promise<string> {
  return ask(code, '你是一个代码解释助手。请详细解释这段代码的功能、逻辑和实现方式。');
}

// 文本总结
export async function summarizeText(text: string): Promise<string> {
  return ask(text, '你是一个文本总结助手。请用简洁明了的语言总结以下内容的主要观点。');
}

// 文本润色
export async function polishText(text: string): Promise<string> {
  return ask(text, '你是一个文本润色助手。请优化以下文本，使其更加通顺、专业、易读。只返回润色后的文本。');
}

// 翻译
export async function translateText(text: string, targetLanguage = 'English'): Promise<string> {
  return ask(
    text,
    `你是一个专业翻译。将以下文本翻译成${targetLanguage}，保持原文的格式和结构。只返回翻译结果。`
  );
}
