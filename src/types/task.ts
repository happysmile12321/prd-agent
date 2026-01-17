// 任务状态
export enum TaskStatus {
  Todo = 'todo',
  InProgress = 'in_progress',
  Done = 'done',
  Archived = 'archived',
}

// 任务优先级
export enum TaskPriority {
  Low = 1,
  Medium = 2,
  High = 3,
  Urgent = 4,
}

// 子任务
export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: Date;
}

// 任务实体
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  subtasks: Subtask[];
}

// 创建新任务
export const createTask = (title: string): Task => ({
  id: generateId(),
  title,
  description: '',
  status: TaskStatus.Todo,
  priority: TaskPriority.Medium,
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  subtasks: [],
});

// 生成唯一 ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
};

// 检查是否过期
export const isOverdue = (task: Task): boolean => {
  if (!task.dueDate || task.status === TaskStatus.Done) {
    return false;
  }
  return new Date() > task.dueDate;
};

// 计算完成率
export const completionRate = (task: Task): number => {
  if (task.subtasks.length === 0) {
    return task.status === TaskStatus.Done ? 100 : 0;
  }

  const completed = task.subtasks.filter((st) => st.isCompleted).length;
  return (completed / task.subtasks.length) * 100;
};
