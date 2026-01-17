import { getTaskManager } from '../core/task-manager.js';
import { TaskStatus, TaskPriority } from '../types/task.js';
import { printTaskList, printStats } from '../ui/printer.js';

// 列出任务
export async function list(args: {
  status?: string;
  priority?: string;
  tag?: string;
  all?: boolean;
}): Promise<void> {
  const manager = getTaskManager();

  // 构建过滤选项
  const options: {
    status?: TaskStatus;
    priority?: TaskPriority;
    tags?: string[];
  } = {};

  if (args.status) {
    const statusMap: Record<string, TaskStatus> = {
      todo: TaskStatus.Todo,
      'in-progress': TaskStatus.InProgress,
      progress: TaskStatus.InProgress,
      doing: TaskStatus.InProgress,
      done: TaskStatus.Done,
      completed: TaskStatus.Done,
    };
    options.status = statusMap[args.status.toLowerCase()];
  }

  if (args.priority) {
    const priorityMap: Record<string, TaskPriority> = {
      low: TaskPriority.Low,
      medium: TaskPriority.Medium,
      high: TaskPriority.High,
      urgent: TaskPriority.Urgent,
    };
    options.priority = priorityMap[args.priority.toLowerCase()];
  }

  if (args.tag) {
    options.tags = [args.tag];
  }

  // 获取任务
  const tasks = await manager.getAll(options);

  // 显示任务列表
  printTaskList(tasks);

  // 显示统计
  const stats = await manager.getStats();
  printStats(stats);
}
