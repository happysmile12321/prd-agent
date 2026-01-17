/**
 * 工作流优化器
 *
 * 负责工作流的自动迭代和优化：
 * 1. 基于反思结果自动更新工作流
 * 2. 跟踪迭代历史
 * 3. 验证迭代效果
 */

import type {
  WorkflowStep,
  WorkflowIteration,
  ValidationResult,
  PracticeTemplate,
} from '../../types/template.js';

export interface OptimizationRequest {
  /** 模板 ID */
  templateId: string;
  /** 当前工作流 */
  currentWorkflow: WorkflowStep[];
  /** 反思生成的修改建议 */
  suggestedChanges: Array<{
    stepId?: string;
    changeType: 'add' | 'modify' | 'remove' | 'reorder';
    content: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface OptimizationResult {
  /** 优化后的工作流 */
  optimizedWorkflow: WorkflowStep[];
  /** 应用的修改 */
  appliedChanges: WorkflowIteration[];
  /** 跳过的修改（及原因） */
  skippedChanges: Array<{ change: string; reason: string }>;
}

/**
 * 工作流优化器
 */
export class WorkflowOptimizer {
  private dbPath: string;
  private maxIterationsPerStep = 10; // 防止过度迭代

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * 优化工作流
   */
  async optimize(
    request: OptimizationRequest,
    aiService?: (prompt: string) => Promise<string>
  ): Promise<OptimizationResult> {
    const { currentWorkflow, suggestedChanges, templateId } = request;

    let optimizedWorkflow = [...currentWorkflow];
    const appliedChanges: WorkflowIteration[] = [];
    const skippedChanges: Array<{ change: string; reason: string }> = [];

    // 按优先级排序处理建议
    const sortedChanges = [...suggestedChanges].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (const change of sortedChanges) {
      try {
        const result = await this.applyChange(
          optimizedWorkflow,
          change,
          templateId,
          aiService
        );

        if (result.applied) {
          optimizedWorkflow = result.workflow;
          appliedChanges.push(result.iteration!);
        } else {
          skippedChanges.push({
            change: `${change.changeType}: ${change.content}`,
            reason: result.reason || '未知原因',
          });
        }
      } catch (error) {
        skippedChanges.push({
          change: `${change.changeType}: ${change.content}`,
          reason: `应用失败: ${error instanceof Error ? error.message : '未知错误'}`,
        });
      }
    }

    return {
      optimizedWorkflow,
      appliedChanges,
      skippedChanges,
    };
  }

  /**
   * 获取步骤的迭代历史
   */
  async getIterationHistory(stepId: string): Promise<WorkflowIteration[]> {
    const betterSqlite = await import('better-sqlite3');
    const Database = betterSqlite.default;
    const db = new Database(this.dbPath);

    const rows = db.prepare(`
      SELECT * FROM workflow_iterations
      WHERE step_id = ?
      ORDER BY iterated_at DESC
    `).all(stepId) as any[];

    db.close();

    return rows.map(row => ({
      id: row.id,
      templateId: row.template_id,
      stepId: row.step_id,
      before: row.before,
      after: row.after,
      reason: row.reason,
      validation: row.validation ? JSON.parse(row.validation) : undefined,
      iteratedAt: new Date(row.iterated_at),
    }));
  }

  /**
   * 验证迭代效果
   */
  async validateIteration(
    iterationId: string,
    effectivenessMetrics: {
      successRate: number;
      averageScore: number;
      averageDuration: number;
    },
    aiService: (prompt: string) => Promise<string>
  ): Promise<ValidationResult> {
    const betterSqlite = await import('better-sqlite3');
    const Database = betterSqlite.default;
    const db = new Database(this.dbPath);

    const iteration = db.prepare('SELECT * FROM workflow_iterations WHERE id = ?').get(iterationId) as any;
    db.close();

    if (!iteration) {
      throw new Error(`Iteration not found: ${iterationId}`);
    }

    // 使用 AI 验证迭代效果
    const prompt = `你是一位工作流效果评估专家。请评估以下工作流迭代的实际效果。

【迭代信息】：
- 步骤 ID: ${iteration.step_id}
- 迭代原因: ${iteration.reason}
- 迭代前: ${iteration.before}
- 迭代后: ${iteration.after}

【效果指标】：
- 成功率: ${(effectivenessMetrics.successRate * 100).toFixed(1)}%
- 平均得分: ${effectivenessMetrics.averageScore.toFixed(1)}
- 平均耗时: ${effectivenessMetrics.averageDuration.toFixed(1)} 秒

请返回 JSON 格式的验证结果：
{
  "item": "迭代效果验证",
  "method": "验证方法",
  "result": "passed|failed|inconclusive",
  "evidence": "支持该结论的证据"
}`;

    try {
      const response = await aiService(prompt);
      const result = JSON.parse(response);

      // 更新迭代记录中的验证结果
      const db2 = new Database(this.dbPath);
      db2.prepare('UPDATE workflow_iterations SET validation = ? WHERE id = ?')
        .run(JSON.stringify(result), iterationId);
      db2.close();

      return result;
    } catch {
      return {
        item: '迭代效果验证',
        method: 'AI 验证失败',
        result: 'inconclusive',
        evidence: '无法完成验证',
      };
    }
  }

  /**
   * 检查是否需要回炉重造
   */
  async needsRework(
    templateId: string,
    recentIterations: WorkflowIteration[]
  ): Promise<{ needsRework: boolean; reason?: string }> {
    // 检查最近失败的迭代次数
    const recentFailedIterations = recentIterations.filter(
      i => i.validation?.result === 'failed'
    );

    // 如果同一个步骤连续失败 3 次，建议回炉重造
    const stepFailures = new Map<string, number>();
    for (const iteration of recentFailedIterations) {
      const count = stepFailures.get(iteration.stepId) || 0;
      stepFailures.set(iteration.stepId, count + 1);
    }

    for (const [stepId, count] of stepFailures.entries()) {
      if (count >= 3) {
        return {
          needsRework: true,
          reason: `步骤 ${stepId} 连续 ${count} 次迭代验证失败，建议重新设计`,
        };
      }
    }

    // 检查是否有步骤迭代次数过多
    const stepIterationCounts = new Map<string, number>();
    for (const iteration of recentIterations) {
      const count = stepIterationCounts.get(iteration.stepId) || 0;
      stepIterationCounts.set(iteration.stepId, count + 1);
    }

    for (const [stepId, count] of stepIterationCounts.entries()) {
      if (count >= this.maxIterationsPerStep) {
        return {
          needsRework: true,
          reason: `步骤 ${stepId} 迭代次数过多 (${count} 次)，表明基础设计可能有问题`,
        };
      }
    }

    return { needsRework: false };
  }

  // ===== 私有方法 =====

  private async applyChange(
    workflow: WorkflowStep[],
    change: OptimizationRequest['suggestedChanges'][0],
    templateId: string,
    aiService?: (prompt: string) => Promise<string>
  ): Promise<{
    applied: boolean;
    workflow: WorkflowStep[];
    iteration?: WorkflowIteration;
    reason?: string;
  }> {
    let result: WorkflowStep[];
    let beforeContent: string;
    let afterContent: string;

    try {
      switch (change.changeType) {
        case 'add': {
          // 添加新步骤
          const newStep = await this.createNewStep(change.content, aiService);
          result = [...workflow, newStep];
          beforeContent = JSON.stringify(workflow);
          afterContent = JSON.stringify(result);
          break;
        }

        case 'remove': {
          if (!change.stepId) {
            return { applied: false, workflow, reason: '缺少 stepId' };
          }
          result = workflow.filter(s => s.id !== change.stepId);
          beforeContent = JSON.stringify(workflow);
          afterContent = JSON.stringify(result);
          break;
        }

        case 'modify': {
          if (!change.stepId) {
            return { applied: false, workflow, reason: '缺少 stepId' };
          }
          const stepIndex = workflow.findIndex(s => s.id === change.stepId);
          if (stepIndex === -1) {
            return { applied: false, workflow, reason: '找不到指定步骤' };
          }

          const modifiedStep = await this.modifyStep(
            workflow[stepIndex],
            change.content,
            aiService
          );
          result = [...workflow];
          result[stepIndex] = modifiedStep;
          beforeContent = JSON.stringify(workflow[stepIndex]);
          afterContent = JSON.stringify(modifiedStep);
          break;
        }

        case 'reorder': {
          // 解析重排序指令
          const orderMatch = change.content.match(/move\s+(\w+)\s+to\s+(\d+)/i);
          if (!orderMatch) {
            return { applied: false, workflow, reason: '无效的重排序指令' };
          }
          const stepId = orderMatch[1];
          const newIndex = parseInt(orderMatch[2], 10);

          const stepIndex = workflow.findIndex(s => s.id === stepId);
          if (stepIndex === -1) {
            return { applied: false, workflow, reason: '找不到指定步骤' };
          }

          result = [...workflow];
          const [step] = result.splice(stepIndex, 1);
          result.splice(newIndex, 0, step);
          beforeContent = `${stepId} at ${stepIndex}`;
          afterContent = `${stepId} at ${newIndex}`;
          break;
        }

        default:
          return { applied: false, workflow, reason: '未知的修改类型' };
      }

      // 记录迭代
      const iteration: WorkflowIteration = {
        id: this.generateId(),
        templateId,
        stepId: change.stepId || this.generateId(),
        before: beforeContent,
        after: afterContent,
        reason: `自动优化: ${change.content}`,
        iteratedAt: new Date(),
      };

      await this.saveIteration(iteration);

      return { applied: true, workflow: result, iteration };
    } catch (error) {
      return {
        applied: false,
        workflow,
        reason: `应用失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  private async createNewStep(
    description: string,
    aiService?: (prompt: string) => Promise<string>
  ): Promise<WorkflowStep> {
    if (!aiService) {
      // 创建简单的步骤
      return {
        id: this.generateId(),
        name: description.substring(0, 50),
        description,
        dynamic: false,
        content: description,
      };
    }

    const prompt = `请根据以下描述创建一个工作流步骤：

【描述】：${description}

返回 JSON 格式：
{
  "id": "步骤ID（简短标识）",
  "name": "步骤名称",
  "description": "详细描述",
  "dynamic": false,
  "content": "具体内容"
}`;

    try {
      const response = await aiService(prompt);
      const step = JSON.parse(response);
      return {
        id: step.id || this.generateId(),
        name: step.name,
        description: step.description,
        dynamic: step.dynamic || false,
        content: step.content || step.description,
        iterationCount: 0,
      };
    } catch {
      return {
        id: this.generateId(),
        name: description.substring(0, 50),
        description,
        dynamic: false,
        content: description,
      };
    }
  }

  private async modifyStep(
    step: WorkflowStep,
    modification: string,
    aiService?: (prompt: string) => Promise<string>
  ): Promise<WorkflowStep> {
    if (!aiService) {
      return {
        ...step,
        description: modification,
        content: typeof step.content === 'string' ? modification : step.content,
        iterationCount: (step.iterationCount || 0) + 1,
        lastIterationAt: new Date(),
      };
    }

    const prompt = `请修改以下工作流步骤：

【当前步骤】：
${JSON.stringify(step, null, 2)}

【修改要求】：${modification}

返回 JSON 格式的修改后步骤（保持相同结构）。`;

    try {
      const response = await aiService(prompt);
      const modified = JSON.parse(response);
      return {
        ...step,
        ...modified,
        iterationCount: (step.iterationCount || 0) + 1,
        lastIterationAt: new Date(),
      };
    } catch {
      return {
        ...step,
        description: modification,
        content: typeof step.content === 'string' ? modification : step.content,
        iterationCount: (step.iterationCount || 0) + 1,
        lastIterationAt: new Date(),
      };
    }
  }

  private async saveIteration(iteration: WorkflowIteration): Promise<void> {
    const betterSqlite = await import('better-sqlite3');
    const Database = betterSqlite.default;
    const db = new Database(this.dbPath);

    const stmt = db.prepare(`
      INSERT INTO workflow_iterations (
        id, template_id, step_id, before, after, reason, validation, iterated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      iteration.id,
      iteration.templateId,
      iteration.stepId,
      iteration.before,
      iteration.after,
      iteration.reason,
      iteration.validation ? JSON.stringify(iteration.validation) : null,
      iteration.iteratedAt.toISOString()
    );

    db.close();
  }

  private generateId(): string {
    return `iter_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
