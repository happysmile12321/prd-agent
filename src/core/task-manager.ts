import { Task, TaskStatus, TaskPriority, CreateTaskOptions, UpdateTaskOptions, FilterOptions } from '../types/task.js';
import { loadTasks, saveTasks } from './storage.js';

// 任务管理器
export class TaskManager {
  private tasks: Task[] = [];
  private loaded = false;

  // 确保已加载
  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      this.tasks = await loadTasks();
      this.loaded = true;
    }
  }

  // 重新加载
  async reload(): Promise<void> {
    this.tasks = await loadTasks();
    this.loaded = true;
  }

  // 保存
  async save(): Promise<void> {
    await saveTasks(this.tasks);
  }

  // 生成唯一 ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // 创建任务
  async create(options: CreateTaskOptions): Promise<Task> {
    await this.ensureLoaded();

    const now = new Date();
    const task: Task = {
      id: this.generateId(),
      title: options.title,
      description: options.description || '',
      status: TaskStatus.Todo,
      priority: options.priority || TaskPriority.Medium,
      tags: options.tags || [],
      createdAt: now,
      updatedAt: now,
      dueDate: options.dueDate,
    };

    this.tasks.push(task);
    await this.save();

    return task;
  }

  // 根据 ID 获取任务
  async getById(id: string): Promise<Task | null> {
    await this.ensureLoaded();
    return this.tasks.find((t) => t.id === id) || null;
  }

  // 根据索引获取任务（1-based）
  async getByIndex(index: number): Promise<Task | null> {
    await this.ensureLoaded();

    // 不包含已归档的任务
    const activeTasks = this.tasks.filter((t) => t.status !== TaskStatus.Archived);

    if (index < 1 || index > activeTasks.length) {
      return null;
    }

    return activeTasks[index - 1];
  }

  // 获取所有任务
  async getAll(options?: FilterOptions): Promise<Task[]> {
    await this.ensureLoaded();

    let filtered = this.tasks.filter((t) => t.status !== TaskStatus.Archived);

    if (options) {
      if (options.status) {
        filtered = filtered.filter((t) => t.status === options.status);
      }
      if (options.priority) {
        filtered = filtered.filter((t) => t.priority === options.priority);
      }
      if (options.tags && options.tags.length > 0) {
        filtered = filtered.filter((t) =>
          options.tags!.some((tag) => t.tags.includes(tag))
        );
      }
      if (options.search) {
        const query = options.search.toLowerCase();
        filtered = filtered.filter((t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
        );
      }
    }

    return filtered;
  }

  // 更新任务
  async update(id: string, options: UpdateTaskOptions): Promise<Task | null> {
    await this.ensureLoaded();

    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      return null;
    }

    if (options.title !== undefined) {
      task.title = options.title;
    }
    if (options.description !== undefined) {
      task.description = options.description;
    }
    if (options.status !== undefined) {
      task.status = options.status;
      if (options.status === TaskStatus.Done && !task.completedAt) {
        task.completedAt = new Date();
      }
    }
    if (options.priority !== undefined) {
      task.priority = options.priority;
    }
    if (options.tags !== undefined) {
      task.tags = options.tags;
    }
    if (options.dueDate !== undefined) {
      task.dueDate = options.dueDate;
    }

    task.updatedAt = new Date();
    await this.save();

    return task;
  }

  // 删除任务
  async delete(id: string): Promise<boolean> {
    await this.ensureLoaded();

    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      return false;
    }

    this.tasks.splice(index, 1);
    await this.save();

    return true;
  }

  // 标记完成
  async toggleComplete(id: string): Promise<Task | null> {
    await this.ensureLoaded();

    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      return null;
    }

    if (task.status === TaskStatus.Done) {
      task.status = TaskStatus.Todo;
      task.completedAt = undefined;
    } else {
      task.status = TaskStatus.Done;
      task.completedAt = new Date();
    }

    task.updatedAt = new Date();
    await this.save();

    return task;
  }

  // 获取所有标签
  async getTags(): Promise<string[]> {
    await this.ensureLoaded();

    const tagSet = new Set<string>();
    for (const task of this.tasks) {
      for (const tag of task.tags) {
        tagSet.add(tag);
      }
    }

    return Array.from(tagSet).sort();
  }

  // 获取统计
  async getStats(): Promise<{
    total: number;
    todo: number;
    inProgress: number;
    done: number;
  }> {
    await this.ensureLoaded();

    const activeTasks = this.tasks.filter((t) => t.status !== TaskStatus.Archived);

    return {
      total: activeTasks.length,
      todo: activeTasks.filter((t) => t.status === TaskStatus.Todo).length,
      inProgress: activeTasks.filter((t) => t.status === TaskStatus.InProgress).length,
      done: activeTasks.filter((t) => t.status === TaskStatus.Done).length,
    };
  }
}

// 单例实例
let instance: TaskManager | null = null;

export function getTaskManager(): TaskManager {
  if (!instance) {
    instance = new TaskManager();
  }
  return instance;
}
