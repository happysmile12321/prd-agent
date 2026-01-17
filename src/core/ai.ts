import { getApiKey, getApiUrl } from './config.js';

// 智谱AI 消息类型
interface ChatMessage {
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

// 调用智谱AI API
export async function callAI(messages: ChatMessage[], model = 'glm-4-flash'): Promise<AIResponse> {
  const apiKey = await getApiKey();

  if (!apiKey) {
    throw new Error('API key not configured. Run: prd config set-api <your-key>');
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

// 生成任务
export async function generateTasks(prompt: string): Promise<string[]> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一个任务管理助手。用户会描述他们需要做的事情，你需要将其拆分成具体的任务。

要求：
1. 每个任务简洁明了，用一句话描述
2. 按优先级排序（重要/紧急的在前）
3. 每行一个任务，格式：- [任务描述]
4. 只返回任务列表，不要其他内容`,
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await callAI(messages);
  const tasks = response.content
    .split('\n')
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter((line) => line.length > 0);

  return tasks;
}

// 分析任务
export async function analyzeTask(title: string, description?: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一个任务分析助手。分析用户给出的任务，提供：

1. 任务评估（复杂度、预估时间）
2. 拆分建议（如何将大任务拆解）
3. 风险点提示
4. 相关建议

用简洁的中文回复，分段清晰。`,
    },
    {
      role: 'user',
      content: `任务：${title}\n${description ? `描述：${description}` : ''}`,
    },
  ];

  const response = await callAI(messages);
  return response.content;
}

// 智能补全
export async function autoComplete(partial: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是任务管理助手。根据用户输入的部分内容，智能补全任务标题或描述。

只返回补全后的完整内容，不要其他解释。`,
    },
    {
      role: 'user',
      content: `补全这个任务：${partial}`,
    },
  ];

  const response = await callAI(messages, 'glm-4-flash');
  return response.content.trim();
}

// 总结任务列表
export async function summarizeTasks(tasks: Array<{ title: string; status: string }>): Promise<string> {
  const taskList = tasks
    .map((t, i) => `${i + 1}. [${t.status}] ${t.title}`)
    .join('\n');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是任务管理助手。根据用户的任务列表，提供：

1. 整体进度评估
2. 关键建议（下一步做什么、是否有遗漏等）
3. 简洁明了，分段清晰`,
    },
    {
      role: 'user',
      content: `我的任务列表：\n${taskList}`,
    },
  ];

  const response = await callAI(messages);
  return response.content;
}
