/**
 * 刻意练习模板系统 - 类型定义
 *
 * 核心概念：
 * 1. 输入：主动学习阶段学习到的知识碎片，系统化整理为练习骨架
 * 2. 输出：模板（用于刻意练习）
 *
 * 模板状态流转：
 * - 待压测 -> 已精通
 * - 待压测 -> 回炉重造 -> 待压测
 * - 回炉重造 -> 已精通
 */

// ===== 模板状态 =====

/**
 * 模板掌握状态
 */
export enum TemplateStatus {
  /** 待压测 - 模板已创建，等待实际场景验证 */
  Pending = 'pending',
  /** 已精通 - 经过真实场景验证，掌握程度高 */
  Mastered = 'mastered',
  /** 回炉重造 - 发现问题，需要重新设计 */
  Rework = 'rework',
}

/**
 * 练习级别
 */
export enum PracticeLevel {
  /**
   * T1 - 真实场景练习
   * - 对应真实场景
   * - 质量要求高
   * - 练习次数少（每次都是宝贵的实战机会）
   */
  T1 = 'T1',

  /**
   * T2 - 模拟场景练习
   * - 对应模拟场景
   * - 快速训练专业 agent
   * - 找到有效性逻辑
   * - 自下而上构建流程
   */
  T2 = 'T2',
}

/**
 * 问题复杂度分类
 */
export enum ProblemComplexity {
  /** 简单问题 - 可以直接处理 */
  Simple = 'simple',
  /** 复杂问题 - 需要 V 字应对法 */
  Complex = 'complex',
}

// ===== 核心数据结构 =====

/**
 * 意图识别触发器
 */
export interface Trigger {
  /** 意图识别关键词/正则 */
  keywords: string[];
  /** 意图识别正则表达式 */
  patterns?: string[];
  /** 触发权重 */
  weight: number;
}

/**
 * 意图识别陷阱
 * 用于防止误触发
 */
export interface Trap {
  /** 陷阱关键词 */
  keywords: string[];
  /** 陷阱描述 */
  description: string;
  /** 如何避免 */
  avoidance: string;
}

/**
 * 工作流步骤
 */
export interface WorkflowStep {
  /** 步骤 ID */
  id: string;
  /** 步骤名称 */
  name: string;
  /** 步骤描述 */
  description: string;
  /** 是否动态迭代（需要根据反馈自动调整） */
  dynamic: boolean;
  /** 步骤内容（可以是字符串、函数引用、或子工作流） */
  content: string | WorkflowStep[];
  /** 执行条件（可选） */
  condition?: string;
  /** 迭代次数统计 */
  iterationCount?: number;
  /** 上次迭代时间 */
  lastIterationAt?: Date;
}

/**
 * 模板技巧/上下文
 */
export interface Technique {
  /** 技巧 ID */
  id: string;
  /** 技巧标题 */
  title: string;
  /** 技巧描述 */
  description: string;
  /** 示例 */
  examples: string[];
  /** 相关注意事项 */
  notes?: string[];
}

/**
 * 练习目标（OKR 格式）
 */
export interface Objective {
  /** 目标 ID */
  id: string;
  /** 目标描述 */
  title: string;
  /** 关键结果 */
  keyResults: KeyResult[];
}

/**
 * 关键结果
 */
export interface KeyResult {
  /** KR ID */
  id: string;
  /** KR 描述 */
  description: string;
  /** 目标值 */
  target: number;
  /** 当前值 */
  current: number;
  /** 单位 */
  unit: string;
  /** 是否完成 */
  completed: boolean;
}

// ===== 模板主体 =====

/**
 * 刻意练习模板
 */
export interface PracticeTemplate {
  /** 模板 ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 科目 */
  subject: string;
  /** 章节 */
  chapter: string;
  /** 模板状态 */
  status: TemplateStatus;
  /** 练习级别 */
  level: PracticeLevel;
  /** 目标（OKR 格式） */
  objectives: Objective[];
  /** 触发器 */
  triggers: Trigger[];
  /** 意图识别陷阱 */
  traps: Trap[];
  /** 工作流 */
  workflow: WorkflowStep[];
  /** 技巧/上下文 */
  techniques: Technique[];
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

// ===== T2 练习相关 =====

/**
 * V 字应对法配置
 */
export interface VShapeMethod {
  /** 观察阶段时长（分钟） */
  observeDuration: number;
  /** 观察阶段指导语 */
  observeGuidance: string;
  /** 试探阶段配置 */
  exploration: {
    /** 最大试探次数 */
    maxAttempts: number;
    /** 每次试探的超时时间（秒） */
    timeout: number;
  };
}

/**
 * 练习组（3个练习为一组）
 */
export interface PracticeGroup {
  /** 练习组 ID */
  id: string;
  /** 模板 ID */
  templateId: string;
  /** 开始时间 */
  startedAt: Date;
  /** 结束时间 */
  endedAt?: Date;
  /** 练习记录 */
  sessions: PracticeSession[];
  /** 组状态 */
  status: 'in_progress' | 'completed' | 'paused';
}

/**
 * 练习会话
 */
export interface PracticeSession {
  /** 会话 ID */
  id: string;
  /** 练习组 ID */
  groupId: string;
  /** 模板 ID */
  templateId: string;
  /** 练习级别 */
  level: PracticeLevel;
  /** 问题/场景描述 */
  problem: string;
  /** 问题复杂度 */
  complexity: ProblemComplexity;
  /** 开始时间 */
  startedAt: Date;
  /** 结束时间 */
  endedAt?: Date;
  /** 耗时（秒） */
  duration?: number;
  /** 会话状态 */
  status: 'pending' | 'observing' | 'exploring' | 'completed' | 'failed';
  /** 处理过程记录 */
  processLog: ProcessLog[];
  /** 结果 */
  result?: PracticeResult;
}

/**
 * 处理过程日志
 */
export interface ProcessLog {
  /** 时间戳 */
  timestamp: Date;
  /** 阶段 */
  stage: 'observation' | 'exploration' | 'execution';
  /** 内容 */
  content: string;
  /** 是否有效 */
  effective?: boolean;
}

/**
 * 练习结果
 */
export interface PracticeResult {
  /** 是否成功 */
  success: boolean;
  /** 得分 */
  score: number;
  /** 反馈 */
  feedback: string;
  /** 有效性指标 */
  effectiveness: {
    /** 响应速度 */
    responseSpeed: number;
    /** 解决质量 */
    quality: number;
    /** 资源消耗 */
    resourceUsage: number;
  };
}

// ===== 反思调整相关 =====

/**
 * 反思记录（OKR 格式）
 */
export interface Reflection {
  /** 反思 ID */
  id: string;
  /** 练习组 ID */
  groupId: string;
  /** 反思时间 */
  createdAt: Date;
  /** 聚焦的有效矛盾 */
  focusContradiction: string;
  /** 目标调整 */
  objectiveAdjustments: ObjectiveAdjustment[];
  /** 有效性验证结果 */
  validationResults: ValidationResult[];
  /** 工作流修改建议 */
  workflowSuggestions: WorkflowChange[];
  /** 状态 */
  status: 'pending' | 'approved' | 'rejected' | 'applied';
}

/**
 * 目标调整
 */
export interface ObjectiveAdjustment {
  /** 目标 ID */
  objectiveId: string;
  /** 调整类型 */
  adjustmentType: 'add' | 'modify' | 'remove' | 'refine';
  /** 调整内容 */
  content: string;
  /** 理由 */
  reason: string;
}

/**
 * 有效性验证结果
 */
export interface ValidationResult {
  /** 验证项 */
  item: string;
  /** 验证方法 */
  method: string;
  /** 验证结果 */
  result: 'passed' | 'failed' | 'inconclusive';
  /** 证据 */
  evidence: string;
}

/**
 * 工作流修改
 */
export interface WorkflowChange {
  /** 步骤 ID */
  stepId?: string;
  /** 修改类型 */
  changeType: 'add' | 'modify' | 'remove' | 'reorder';
  /** 修改内容 */
  content: string;
  /** 优先级 */
  priority: 'high' | 'medium' | 'low';
}

// ===== 场景模拟相关 =====

/**
 * AI 模拟场景
 */
export interface SimulatedScenario {
  /** 场景 ID */
  id: string;
  /** 场景标题 */
  title: string;
  /** 场景描述 */
  description: string;
  /** 问题复杂度 */
  complexity: ProblemComplexity;
  /** 建议的应对方法 */
  suggestedApproach?: 'direct' | 'v_shape';
  /** 场景变量（用于生成不同变体） */
  variables?: Record<string, unknown>;
  /** 预期结果 */
  expectedOutcome?: string;
}

/**
 * 场景生成请求
 */
export interface ScenarioRequest {
  /** 模板 ID */
  templateId: string;
  /** 难度级别 */
  difficulty?: 1 | 2 | 3 | 4 | 5;
  /** 期望的复杂度 */
  complexity?: ProblemComplexity;
  /** 排除的场景 ID（避免重复） */
  excludeScenarioIds?: string[];
}

// ===== 统计相关 =====

/**
 * 模板统计
 */
export interface TemplateStats {
  /** 模板 ID */
  templateId: string;
  /** T1 练习次数 */
  t1PracticeCount: number;
  /** T2 练习次数 */
  t2PracticeCount: number;
  /** 成功率 */
  successRate: number;
  /** 平均得分 */
  averageScore: number;
  /** 平均耗时（秒） */
  averageDuration: number;
  /** 回炉重造次数 */
  reworkCount: number;
  /** 上次练习时间 */
  lastPracticedAt?: Date;
}

// ===== 工作流迭代相关 =====

/**
 * 工作流迭代记录
 */
export interface WorkflowIteration {
  /** 迭代 ID */
  id: string;
  /** 模板 ID */
  templateId: string;
  /** 步骤 ID */
  stepId: string;
  /** 迭代前内容 */
  before: string;
  /** 迭代后内容 */
  after: string;
  /** 迭代原因 */
  reason: string;
  /** 有效性验证 */
  validation?: ValidationResult;
  /** 迭代时间 */
  iteratedAt: Date;
}
