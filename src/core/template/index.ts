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

import { TemplateEngine } from './template-engine.js';
import { IntentRecognizer, type RecognitionResult, type RecognitionOptions } from './intent-recognizer.js';
import { PracticeController, type PracticeGroupConfig } from './practice-controller.js';
import { ReflectionEngine, type ReflectionInput, type ReflectionOutput } from './reflection-engine.js';
import { WorkflowOptimizer, type OptimizationRequest, type OptimizationResult } from './workflow-optimizer.js';

// 类型导出
export * from '../../types/template.js';

// 核心类导出
export { TemplateEngine, IntentRecognizer, PracticeController, ReflectionEngine, WorkflowOptimizer };
export type { RecognitionResult, RecognitionOptions, PracticeGroupConfig, ReflectionInput, ReflectionOutput, OptimizationRequest, OptimizationResult };

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
    template?: import('../../types/template.js').PracticeTemplate;
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
