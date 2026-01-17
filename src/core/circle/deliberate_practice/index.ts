/**
 * 刻意练习模板系统
 *
 * 核心功能：
 * 1. 模板管理 - 创建、更新、删除、查询模板
 * 2. 意图识别 - 根据用户输入自动匹配模板
 * 3. T2 练习流程 - 模拟场景训练，V 字应对法
 * 4. 反思调整 - 基于 OKR 的自动反思和优化
 * 5. 工作流优化 - 自动迭代工作流
 */

import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { getDataDir } from '../../config.js';
import { callAI } from '../../ai.js';
import { TemplateEngine } from './template-engine.js';
import { IntentRecognizer, type RecognitionResult, type RecognitionOptions } from './intent-recognizer.js';
import { PracticeController, type PracticeGroupConfig } from './practice-controller.js';
import { ReflectionEngine, type ReflectionInput, type ReflectionOutput } from './reflection-engine.js';
import { WorkflowOptimizer, type OptimizationRequest, type OptimizationResult } from './workflow-optimizer.js';
import type {
  PracticeTemplate,
  TemplateStatus,
  SimulatedScenario,
  ScenarioRequest,
  Objective,
} from '../../../types/template.js';

import {
  PracticeLevel,
  ProblemComplexity,
  TemplateStatus as TemplateStatusEnum,
} from '../../../types/template.js';

// 类型导出
export type * from '../../../types/template.js';

// 值导出
export { PracticeLevel, ProblemComplexity, TemplateStatusEnum };

// 核心类导出
export { TemplateEngine, IntentRecognizer, PracticeController, ReflectionEngine, WorkflowOptimizer };
export type { RecognitionResult, RecognitionOptions, PracticeGroupConfig, ReflectionInput, ReflectionOutput, OptimizationRequest, OptimizationResult };

// 数据库文件路径
const DB_PATH = () => resolve(getDataDir(), 'practice.db');

// 初始化数据库
export async function initDB(): Promise<void> {
  const dataDir = getDataDir();

  // 确保目录存在
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const engine = new TemplateEngine(DB_PATH());
  await engine.initDB();
}

// ===== 模板管理 =====

/**
 * 创建模板
 */
export async function createTemplate(
  name: string,
  subject: string,
  chapter: string,
  level: PracticeLevel,
  objectives: Objective[],
  triggers: string[],
  traps: string[],
  workflow: string,
  techniques: string[]
): Promise<string> {
  const engine = new TemplateEngine(DB_PATH());

  const template = {
    name,
    subject,
    chapter,
    status: 'pending' as TemplateStatus,
    level,
    objectives,
    triggers: triggers.map(k => ({ keywords: [k], weight: 1 })),
    traps: traps.map(k => ({ keywords: [k], description: k, avoidance: `避免 ${k}` })),
    workflow: [{ id: 'main', name: '主流程', description: workflow, dynamic: false, content: workflow }],
    techniques: techniques.map((t, i) => ({ id: `tech_${i}`, title: t, description: t, examples: [] })),
  };

  return await engine.createTemplate(template);
}

/**
 * 列出所有模板
 */
export async function listTemplates(filters?: {
  subject?: string;
  status?: TemplateStatus;
  level?: PracticeLevel;
}): Promise<PracticeTemplate[]> {
  const engine = new TemplateEngine(DB_PATH());
  return await engine.listTemplates(filters);
}

/**
 * 获取模板详情
 */
export async function getTemplate(id: string): Promise<PracticeTemplate | null> {
  const engine = new TemplateEngine(DB_PATH());
  return await engine.getTemplate(id);
}

/**
 * 更新模板状态
 */
export async function updateTemplateStatus(
  id: string,
  status: TemplateStatus,
  reason?: string
): Promise<boolean> {
  const engine = new TemplateEngine(DB_PATH());
  return await engine.updateTemplateStatus(id, status, reason);
}

/**
 * 删除模板
 */
export async function deleteTemplate(id: string): Promise<boolean> {
  const engine = new TemplateEngine(DB_PATH());
  return await engine.deleteTemplate(id);
}

/**
 * 获取模板统计
 */
export async function getTemplateStats(id: string): Promise<{
  t1PracticeCount: number;
  t2PracticeCount: number;
  successRate: number;
  averageScore: number;
  averageDuration: number;
} | null> {
  const engine = new TemplateEngine(DB_PATH());
  return await engine.getTemplateStats(id);
}

// ===== T2 练习 =====

/**
 * 创建练习组
 */
export async function createPracticeGroup(
  templateId: string,
  config?: PracticeGroupConfig
): Promise<string> {
  const controller = new PracticeController(DB_PATH());
  return await controller.createPracticeGroup(templateId, config);
}

/**
 * 生成模拟场景
 */
export async function generateScenario(
  templateId: string,
  difficulty: number = 3,
  complexity?: ProblemComplexity
): Promise<SimulatedScenario> {
  const controller = new PracticeController(DB_PATH());
  const request: ScenarioRequest = {
    templateId,
    difficulty: difficulty as 1 | 2 | 3 | 4 | 5,
    complexity,
  };

  return await controller.generateScenario(request, async (prompt) => {
    const response = await callAI([{ role: 'user', content: prompt }]);
    return response.content;
  });
}

/**
 * 开始练习会话
 */
export async function startPracticeSession(
  groupId: string,
  scenarioDescription: string,
  level: PracticeLevel = PracticeLevel.T2
): Promise<string> {
  const controller = new PracticeController(DB_PATH());

  const scenario: SimulatedScenario = {
    id: 'temp',
    title: '练习场景',
    description: scenarioDescription,
    complexity: ProblemComplexity.Simple,
  };

  const session = await controller.startSession(groupId, scenario, level);
  return session.id;
}

/**
 * 完成练习会话
 */
export async function completePracticeSession(
  sessionId: string,
  success: boolean,
  score: number,
  feedback: string
): Promise<void> {
  const controller = new PracticeController(DB_PATH());

  await controller.completeSession(sessionId, {
    success,
    score,
    feedback,
    effectiveness: {
      responseSpeed: score,
      quality: score,
      resourceUsage: score,
    },
  });
}

/**
 * 获取练习组统计
 */
export async function getPracticeGroupStats(groupId: string): Promise<{
  totalSessions: number;
  completedSessions: number;
  averageDuration: number;
  successRate: number;
}> {
  const controller = new PracticeController(DB_PATH());
  return controller.getGroupStats(groupId);
}

// ===== 反思与优化 =====

/**
 * 生成反思
 */
export async function generateReflection(
  groupId: string,
  humanFeedback?: string
): Promise<{
  reflection: { id: string; focusContradiction: string; status: string };
  workflowChanges: any[];
  objectiveAdjustments: any[];
}> {
  const reflectionEngine = new ReflectionEngine(DB_PATH());
  const practiceController = new PracticeController(DB_PATH());

  const groupData = await practiceController.exportGroupData(groupId);

  return await reflectionEngine.generateReflection(
    { groupData, humanFeedback },
    async (prompt) => {
      const response = await callAI([{ role: 'user', content: prompt }]);
      return response.content;
    }
  );
}

/**
 * 意图识别（通过用户输入匹配模板）
 */
export async function recognizeIntent(
  userInput: string
): Promise<{
  template?: PracticeTemplate;
  score: number;
  triggeredTraps?: string[];
}> {
  const engine = new TemplateEngine(DB_PATH());
  const recognizer = new IntentRecognizer();

  const templates = await engine.listTemplates();
  const result = await recognizer.recognizeWithAI(
    userInput,
    templates,
    async (prompt) => {
      const response = await callAI([{ role: 'user', content: prompt }]);
      return response.content;
    }
  );

  if (!result) {
    return { score: 0 };
  }

  return {
    template: result.template,
    score: result.score,
    triggeredTraps: result.triggeredTraps?.map(t => t.description),
  };
}

/**
 * 刻意练习系统入口
 * 整合所有模块
 */
export class DeliberatePracticeSystem {
  public templateEngine: TemplateEngine;
  public intentRecognizer: IntentRecognizer;
  public practiceController: PracticeController;
  public reflectionEngine: ReflectionEngine;
  public workflowOptimizer: WorkflowOptimizer;

  constructor(dataDir: string) {
    const dbPath = `${dataDir}/practice.db`;

    this.templateEngine = new TemplateEngine(dbPath);
    this.intentRecognizer = new IntentRecognizer();
    this.practiceController = new PracticeController(dbPath);
    this.reflectionEngine = new ReflectionEngine(dbPath);
    this.workflowOptimizer = new WorkflowOptimizer(dbPath);
  }

  /**
   * 初始化系统
   */
  async init(): Promise<void> {
    await this.templateEngine.initDB();
  }

  /**
   * 创建完整的练习流程
   */
  async createPracticeFlow(
    userInput: string,
    aiService: (prompt: string) => Promise<string>
  ): Promise<{
    template?: PracticeTemplate;
    groupId?: string;
    error?: string;
  }> {
    // 1. 意图识别
    const templates = await this.templateEngine.listTemplates();
    const recognition = await this.intentRecognizer.recognizeWithAI(userInput, templates, aiService);

    if (!recognition) {
      return { error: '未找到匹配的模板' };
    }

    // 2. 检查陷阱
    if (recognition.triggeredTraps && recognition.triggeredTraps.length > 0) {
      return {
        error: `触发意图识别陷阱: ${recognition.triggeredTraps.map(t => t.description).join(', ')}`,
      };
    }

    // 3. 创建练习组
    const groupId = await this.practiceController.createPracticeGroup(recognition.template.id);

    return {
      template: recognition.template,
      groupId,
    };
  }
}
