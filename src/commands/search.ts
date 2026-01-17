import { getTaskManager } from '../core/task-manager.js';
import { printTaskList } from '../ui/printer.js';

// 搜索任务
export async function search(query: string): Promise<void> {
  const manager = getTaskManager();

  const tasks = await manager.getAll({ search: query });

  if (tasks.length === 0) {
    console.log();
    console.log(`  No tasks found matching "${query}".`);
    console.log();
    return;
  }

  printTaskList(tasks);
}
