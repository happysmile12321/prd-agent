import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const DATA_DIR = process.env.PRD_AGENT_DATA || path.join(os.homedir(), '.prd-agent');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

export interface Config {
  zhipuApiKey?: string;
  zhipuApiUrl?: string;
  history?: string[];
  prompts?: Record<string, string>;
}

// 加载配置
export async function loadConfig(): Promise<Config> {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// 保存配置
export async function saveConfig(config: Config): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// 设置 API Key
export async function setApiKey(key: string): Promise<void> {
  const config = await loadConfig();
  config.zhipuApiKey = key;
  await saveConfig(config);
}

// 获取 API Key
export async function getApiKey(): Promise<string | undefined> {
  if (process.env.ZHIPU_API_KEY) {
    return process.env.ZHIPU_API_KEY;
  }
  const config = await loadConfig();
  return config.zhipuApiKey;
}

// 获取 API URL
export function getApiUrl(): string {
  return process.env.ZHIPU_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
}

// 保存提示词
export async function savePrompt(name: string, content: string): Promise<void> {
  const config = await loadConfig();
  if (!config.prompts) {
    config.prompts = {};
  }
  config.prompts[name] = content;
  await saveConfig(config);
}

// 获取提示词
export async function getPrompt(name: string): Promise<string | undefined> {
  const config = await loadConfig();
  return config.prompts?.[name];
}

// 列出提示词
export async function listPrompts(): Promise<string[]> {
  const config = await loadConfig();
  return Object.keys(config.prompts || {});
}

// 获取数据目录
export function getDataDir(): string {
  return DATA_DIR;
}
