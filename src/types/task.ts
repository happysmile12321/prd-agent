// 任务状态
export enum TaskStatus {
  Todo = 'todo',
  InProgress = 'in-progress',
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
}

// 创建任务选项
export interface CreateTaskOptions {
  title: string;
  description?: string;
  priority?: TaskPriority;
  tags?: string[];
  dueDate?: Date;
}

// 更新任务选项
export interface UpdateTaskOptions {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  dueDate?: Date;
}

// 过滤选项
export interface FilterOptions {
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  search?: string;
}

// 任务显示格式
export interface TaskDisplay {
  id: string;
  index: number;
  title: string;
  status: string;
  priority: string;
  tags: string[];
  createdAt: string;
  description?: string;
}
