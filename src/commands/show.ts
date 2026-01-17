import { getTaskManager } from '../core/task-manager.js';
import { printTaskDetail, printError } from '../ui/printer.js';

// 显示任务详情
export async function show(idOrIndex: string): Promise<void> {
  const manager = getTaskManager();
  const allTasks = await manager.getAll();

  let task;
  let index: number;

  // 尝试按索引查找
  const indexNum = parseInt(idOrIndex, 10);
  if (!isNaN(indexNum)) {
    task = await manager.getByIndex(indexNum);
    index = indexNum;
  } else {
    // 按 ID 查找
    task = await manager.getById(idOrIndex);
    index = allTasks.findIndex((t) => t.id === idOrIndex) + 1;
  }

  if (!task) {
    printError(`Task not found: ${idOrIndex}`);
    return;
  }

  printTaskDetail(task, index);
}
