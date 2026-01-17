import inquirer from 'inquirer';
import { getTaskManager } from '../core/task-manager.js';
import { TaskPriority } from '../types/task.js';
import { printSuccess, printError } from '../ui/printer.js';

// 添加任务
export async function add(args: {
  title?: string;
  description?: string;
  priority?: string;
  tags?: string;
}): Promise<void> {
  const manager = getTaskManager();

  let title = args.title;

  // 如果没有标题，提示用户输入
  if (!title) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Task title:',
        validate: (input: string) => input.trim().length > 0 || 'Title is required',
      },
    ]);
    title = answers.title;
  }

  // 解析优先级
  let priority: TaskPriority | undefined;
  if (args.priority) {
    const priorityMap: Record<string, TaskPriority> = {
      low: TaskPriority.Low,
      medium: TaskPriority.Medium,
      high: TaskPriority.High,
      urgent: TaskPriority.Urgent,
    };
    priority = priorityMap[args.priority.toLowerCase()];
  }

  // 解析标签
  const tags = args.tags ? args.tags.split(',').map((t) => t.trim()) : [];

  // 如果没有描述，询问是否添加
  let description = args.description;
  if (!description && !args.title) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Description (optional):',
      },
    ]);
    description = answers.description || undefined;
  }

  // 创建任务
  const task = await manager.create({
    title,
    description,
    priority,
    tags,
  });

  printSuccess(`Task created: [${task.id.slice(0, 8)}] ${task.title}`);
}
