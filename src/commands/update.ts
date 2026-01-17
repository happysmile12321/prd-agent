import { getTaskManager } from '../core/task-manager.js';
import { TaskStatus, TaskPriority } from '../types/task.js';
import { printSuccess, printError } from '../ui/printer.js';

// 更新任务
export async function update(
  idOrIndex: string,
  args: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    tags?: string;
  }
): Promise<void> {
  const manager = getTaskManager();

  // 查找任务
  let task;
  const indexNum = parseInt(idOrIndex, 10);
  if (!isNaN(indexNum)) {
    task = await manager.getByIndex(indexNum);
  } else {
    task = await manager.getById(idOrIndex);
  }

  if (!task) {
    printError(`Task not found: ${idOrIndex}`);
    return;
  }

  // 构建更新选项
  const options: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    tags?: string[];
  } = {};

  if (args.title) {
    options.title = args.title;
  }

  if (args.description !== undefined) {
    options.description = args.description;
  }

  if (args.status) {
    const statusMap: Record<string, TaskStatus> = {
      todo: TaskStatus.Todo,
      'in-progress': TaskStatus.InProgress,
      progress: TaskStatus.InProgress,
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

  if (args.tags) {
    options.tags = args.tags.split(',').map((t) => t.trim());
  }

  // 更新任务
  const updated = await manager.update(task.id, options);

  if (updated) {
    printSuccess(`Task updated: [${updated.id.slice(0, 8)}] ${updated.title}`);
  } else {
    printError('Failed to update task');
  }
}
