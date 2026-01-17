import { getTaskManager } from '../core/task-manager.js';
import { printSuccess, printError } from '../ui/printer.js';

// 完成/取消完成任务
export async function complete(idOrIndex: string): Promise<void> {
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

  // 切换完成状态
  const updated = await manager.toggleComplete(task.id);

  if (updated) {
    if (updated.status === 'done') {
      printSuccess(`Task completed: ${updated.title}`);
    } else {
      printSuccess(`Task uncompleted: ${updated.title}`);
    }
  } else {
    printError('Failed to update task');
  }
}
