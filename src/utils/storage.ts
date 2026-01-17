import fs from 'fs';
import path from 'path';
import os from 'os';
import { Task } from '../types/task';

// 数据目录
const getDataDir = (): string => {
  const envDir = process.env.PRD_AGENT_DATA;
  if (envDir) {
    return envDir;
  }
  return path.join(os.homedir(), '.prd-agent');
};

// 任务文件路径
const getTasksPath = (): string => {
  return path.join(getDataDir(), 'tasks.json');
};

// 确保数据目录存在
const ensureDataDir = (): void => {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 加载任务
export const loadTasks = (): Task[] => {
  ensureDataDir();
  const tasksPath = getTasksPath();

  if (!fs.existsSync(tasksPath)) {
    return [];
  }

  try {
    const data = fs.readFileSync(tasksPath, 'utf-8');
    const tasks = JSON.parse(data);
    // 转换日期字符串为 Date 对象
    return tasks.map((t: any) => ({
      ...t,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
      dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
      completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
    }));
  } catch (error) {
    console.error('Failed to load tasks:', error);
    return [];
  }
};

// 保存任务
export const saveTasks = (tasks: Task[]): void => {
  ensureDataDir();
  const tasksPath = getTasksPath();

  try {
    fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save tasks:', error);
    throw error;
  }
};
