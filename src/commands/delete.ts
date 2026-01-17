import inquirer from 'inquirer';
import { getTaskManager } from '../core/task-manager.js';
import { printSuccess, printError } from '../ui/printer.js';

// 删除任务
export async function deleteCmd(idOrIndex: string, args: { force?: boolean }): Promise<void> {
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

  // 确认删除
  if (!args.force) {
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Delete task "${task.title}"?`,
        default: false,
      },
    ]);

    if (!answers.confirm) {
      console.log('  Cancelled.');
      return;
    }
  }

  // 删除任务
  const success = await manager.delete(task.id);

  if (success) {
    printSuccess(`Task deleted: ${task.title}`);
  } else {
    printError('Failed to delete task');
  }
}
