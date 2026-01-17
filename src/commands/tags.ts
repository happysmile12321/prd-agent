import { getTaskManager } from '../core/task-manager.js';
import { printTags } from '../ui/printer.js';

// 列出所有标签
export async function listTags(): Promise<void> {
  const manager = getTaskManager();

  const tags = await manager.getTags();

  printTags(tags);
}
