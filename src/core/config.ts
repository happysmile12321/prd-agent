import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { existsSync } from 'fs';

const CONFIG_DIR = process.env.PRD_AGENT_DATA || path.join(os.homedir(), '.prd-agent');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface Config {
  zhipuApiKey?: string;
  zhipuApiUrl?: string;
}

// 加载配置
export async function loadConfig(): Promise<Config> {
  try {
    if (existsSync(CONFIG_FILE)) {
      const data = await fs.readFile(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    // 配置文件不存在或读取失败
  }
  return {};
}

// 保存配置
export async function saveConfig(config: Config): Promise<void> {
  // 确保目录存在
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// 设置 API Key
export async function setApiKey(key: string): Promise<void> {
  const config = await loadConfig();
  config.zhipuApiKey = key;
  await saveConfig(config);
}

// 获取 API Key
export async function getApiKey(): Promise<string | undefined> {
  // 优先从环境变量读取
  if (process.env.ZHIPU_API_KEY) {
    return process.env.ZHIPU_API_KEY;
  }

  // 其次从配置文件读取
  const config = await loadConfig();
  return config.zhipuApiKey;
}

// 获取 API URL
export function getApiUrl(): string {
  return process.env.ZHIPU_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
}
