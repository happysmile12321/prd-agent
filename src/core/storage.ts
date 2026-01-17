import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Task } from '../types/task.js';

// 数据目录
const DATA_DIR = process.env.PRD_AGENT_DATA || path.join(os.homedir(), '.prd-agent');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

// 确保数据目录存在
async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // 目录可能已存在，忽略错误
  }
}

// 序列化任务
function serializeTask(task: Task): Record<string, unknown> {
  return {
    ...task,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    dueDate: task.dueDate?.toISOString(),
    completedAt: task.completedAt?.toISOString(),
  };
}

// 反序列化任务
function deserializeTask(data: Record<string, unknown>): Task {
  return {
    id: data.id as string,
    title: data.title as string,
    description: data.description as string,
    status: data.status as Task['status'],
    priority: data.priority as Task['priority'],
    tags: (data.tags as string[]) || [],
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
    dueDate: data.dueDate ? new Date(data.dueDate as string) : undefined,
    completedAt: data.completedAt ? new Date(data.completedAt as string) : undefined,
  };
}

// 加载所有任务
export async function loadTasks(): Promise<Task[]> {
  await ensureDataDir();

  try {
    const data = await fs.readFile(TASKS_FILE, 'utf-8');
    if (!data.trim()) {
      return [];
    }
    const parsed = JSON.parse(data);
    return (parsed as Record<string, unknown>[]).map(deserializeTask);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// 保存所有任务
export async function saveTasks(tasks: Task[]): Promise<void> {
  await ensureDataDir();

  const data = JSON.stringify(tasks.map(serializeTask), null, 2);
  await fs.writeFile(TASKS_FILE, data, 'utf-8');
}

// 获取数据目录路径
export function getDataDir(): string {
  return DATA_DIR;
}
