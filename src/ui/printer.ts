import chalk from 'chalk';
import { Task, TaskStatus, TaskPriority } from '../types/task.js';

// 状态图标和颜色
const statusConfig = {
  [TaskStatus.Todo]: { icon: '⏸', color: chalk.gray, label: 'todo' },
  [TaskStatus.InProgress]: { icon: '🔄', color: chalk.blue, label: 'in-progress' },
  [TaskStatus.Done]: { icon: '✅', color: chalk.green, label: 'done' },
  [TaskStatus.Archived]: { icon: '📦', color: chalk.gray, label: 'archived' },
};

// 优先级图标和颜色
const priorityConfig = {
  [TaskPriority.Low]: { icon: '🟢', color: chalk.gray, label: 'low' },
  [TaskPriority.Medium]: { icon: '🟡', color: chalk.yellow, label: 'medium' },
  [TaskPriority.High]: { icon: '🟠', color: chalk.hex('#f97316'), label: 'high' },
  [TaskPriority.Urgent]: { icon: '🔴', color: chalk.red, label: 'urgent' },
};

// 格式化相对时间
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'just now';
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// 打印标题
export function printTitle(title: string, count?: number): void {
  const suffix = count !== undefined ? ` (${count})` : '';
  console.log();
  console.log(chalk.cyan(`╶┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╮`));
  console.log(chalk.cyan(`╎  📋 ${title}${suffix} ${' '.repeat(Math.max(0, 45 - title.length - (suffix?.length || 0)))}╎`));
  console.log(chalk.cyan(`╶┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╯`));
  console.log();
}

// 打印单个任务
export function printTask(task: Task, index: number): void {
  const status = statusConfig[task.status];
  const priority = priorityConfig[task.priority];

  console.log(chalk.gray(`  [${index}] ${'─'.repeat(48)}`));
  console.log(`  ${status.icon}  ${chalk.bold(task.title)}`);

  // 详情行
  const details = [
    `Status: ${status.color(status.label)}`,
    `Priority: ${priority.color(priority.label)}`,
  ];

  if (task.tags.length > 0) {
    details.push(`Tags: ${task.tags.map((t) => chalk.hex('#06b6d4')(`#${t}`)).join(' ')}`);
  }

  console.log(chalk.gray(`  ╎  ${details.join('  ')}`));

  // 时间
  const timeStr = formatRelativeTime(task.createdAt);
  console.log(chalk.gray(`  ╎  Created: ${timeStr}`));

  // 描述
  if (task.description) {
    const desc = task.description.length > 60
      ? task.description.slice(0, 60) + '...'
      : task.description;
    console.log(chalk.gray(`  ╎  ${chalk.dim(desc)}`));
  }

  console.log();
}

// 打印任务列表
export function printTaskList(tasks: Task[]): void {
  if (tasks.length === 0) {
    console.log();
    console.log(chalk.gray('  No tasks found.'));
    console.log();
    return;
  }

  printTitle('Tasks', tasks.length);

  for (let i = 0; i < tasks.length; i++) {
    printTask(tasks[i], i + 1);
  }
}

// 打印任务详情
export function printTaskDetail(task: Task, index: number): void {
  const status = statusConfig[task.status];
  const priority = priorityConfig[task.priority];

  console.log();
  console.log(chalk.cyan(`  ╭─────────────────────────────────────────────────────╮`));
  console.log(chalk.cyan(`  │  Task #${index}                                           │`));
  console.log(chalk.cyan(`  ╰─────────────────────────────────────────────────────╯`));
  console.log();
  console.log(`  ${status.icon}  ${chalk.bold(task.title)}`);
  console.log();

  // 属性
  console.log(chalk.gray(`  ╎  Status:   ${status.color(status.label)}`));
  console.log(chalk.gray(`  ╎  Priority: ${priority.color(priority.label)}`));

  if (task.tags.length > 0) {
    console.log(chalk.gray(`  ╎  Tags:     ${task.tags.join(', ')}`));
  }

  console.log();

  // 描述
  if (task.description) {
    console.log(chalk.gray(`  ╎  Description:`));
    console.log(chalk.gray(`  ╎  ${task.description}`));
    console.log();
  }

  // 时间信息
  console.log(chalk.gray(`  ╎  Created:  ${task.createdAt.toLocaleString()}`));
  console.log(chalk.gray(`  ╎  Updated:  ${task.updatedAt.toLocaleString()}`));

  if (task.dueDate) {
    const isOverdue = task.dueDate < new Date() && task.status !== TaskStatus.Done;
    const dueStr = isOverdue ? chalk.red(`(overdue)`) : '';
    console.log(chalk.gray(`  ╎  Due:      ${task.dueDate.toLocaleString()} ${dueStr}`));
  }

  if (task.completedAt) {
    console.log(chalk.gray(`  ╎  Completed: ${task.completedAt.toLocaleString()}`));
  }

  console.log();
}

// 打印成功消息
export function printSuccess(message: string): void {
  console.log(chalk.green(`  ✓ ${message}`));
  console.log();
}

// 打印错误消息
export function printError(message: string): void {
  console.error(chalk.red(`  ✗ ${message}`));
  console.error();
}

// 打印警告消息
export function printWarning(message: string): void {
  console.log(chalk.yellow(`  ⚠ ${message}`));
  console.log();
}

// 打印信息消息
export function printInfo(message: string): void {
  console.log(chalk.blue(`  ℹ ${message}`));
  console.log();
}

// 打印分隔线
export function printSeparator(): void {
  console.log(chalk.gray(`  ${'─'.repeat(52)}`));
}

// 打印标签列表
export function printTags(tags: string[]): void {
  if (tags.length === 0) {
    console.log();
    console.log(chalk.gray('  No tags found.'));
    console.log();
    return;
  }

  console.log();
  console.log(chalk.cyan(`  ╶┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╮`));
  console.log(chalk.cyan(`╎  🏷️  Tags (${tags.length})                                      ╎`));
  console.log(chalk.cyan(`╶┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╯`));
  console.log();

  for (const tag of tags) {
    console.log(`  ${chalk.hex('#06b6d4')(`#${tag}`)}`);
  }

  console.log();
}

// 打印统计
export function printStats(stats: { total: number; todo: number; inProgress: number; done: number }): void {
  console.log();
  console.log(chalk.cyan(`  ╶┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╮`));
  console.log(chalk.cyan(`╎  📊 Statistics                                            ╎`));
  console.log(chalk.cyan(`╶┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╯`));
  console.log();

  const maxBarLength = 30;
  const total = stats.total || 1; // 避免除零

  const todoBar = chalk.gray('█'.repeat(Math.round((stats.todo / total) * maxBarLength)));
  const progressBar = chalk.blue('█'.repeat(Math.round((stats.inProgress / total) * maxBarLength)));
  const doneBar = chalk.green('█'.repeat(Math.round((stats.done / total) * maxBarLength)));

  console.log(`  Total:      ${chalk.bold(stats.total.toString())}`);
  console.log(`  Todo:       ${chalk.gray(stats.todo.toString())} ${todoBar}`);
  console.log(`  In Progress:${chalk.blue(stats.inProgress.toString())} ${progressBar}`);
  console.log(`  Done:       ${chalk.green(stats.done.toString())} ${doneBar}`);

  console.log();
}
