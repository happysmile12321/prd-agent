/**
 * 反思引擎
 *
 * 基于 OKR 方式进行反思调整：
 * 1. 聚焦有效矛盾
 * 2. 自动进行有效性验证
 * 3. 生成工作流修改建议
 * 4. 上报人工审核
 */

import type {
  PracticeGroup,
  Reflection,
  Objective,
  ObjectiveAdjustment,
  ValidationResult,
  WorkflowChange,
  WorkflowStep,
  PracticeSession,
} from '../../../types/template.js';

export interface ReflectionInput {
  /** 练习组数据 */
  groupData: Awaited<ReturnType<typeof import('./practice-controller.js').PracticeController.prototype.exportGroupData>>;
  /** 人工反馈（可选） */
  humanFeedback?: string;
}

export interface ReflectionOutput {
  /** 反思记录 */
  reflection: Reflection;
  /** 建议的工作流修改 */
  workflowChanges: WorkflowChange[];
  /** 建议的目标调整 */
  objectiveAdjustments: ObjectiveAdjustment[];
}

/**
 * 反思引擎
 */
export class ReflectionEngine {
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * 生成反思（基于 AI）
   */
  async generateReflection(
    input: ReflectionInput,
    aiService: (prompt: string) => Promise<string>
  ): Promise<ReflectionOutput> {
    const { groupData, humanFeedback } = input;

    // 构建反思提示词
    const prompt = this.buildReflectionPrompt(groupData, humanFeedback);

    const response = await aiService(prompt);
    const aiReflection = JSON.parse(response);

    // 创建反思记录
    const reflection: Reflection = {
      id: this.generateId(),
      groupId: groupData.group.id,
      createdAt: new Date(),
      focusContradiction: aiReflection.focusContradiction,
      objectiveAdjustments: aiReflection.objectiveAdjustments || [],
      validationResults: aiReflection.validationResults || [],
      workflowSuggestions: aiReflection.workflowSuggestions || [],
      status: 'pending',
    };

    // 保存反思记录
    await this.saveReflection(reflection);

    return {
      reflection,
      workflowChanges: aiReflection.workflowSuggestions || [],
      objectiveAdjustments: aiReflection.objectiveAdjustments || [],
    };
  }

  /**
   * 自动进行有效性验证
   */
  async validateEffectiveness(
    reflection: Reflection,
    workflow: WorkflowStep[],
    aiService: (prompt: string) => Promise<string>
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const suggestion of reflection.workflowSuggestions) {
      const result = await this.validateSingleChange(suggestion, workflow, aiService);
      results.push(result);
    }

    // 更新反思记录中的验证结果
    reflection.validationResults = results;
    await this.updateReflection(reflection);

    return results;
  }

  /**
   * 人工审核并应用修改
   */
  async approveAndApply(
    reflectionId: string,
    approvedChanges: WorkflowChange[],
    aiService: (prompt: string) => Promise<string>
  ): Promise<void> {
    const reflection = await this.getReflection(reflectionId);
    if (!reflection) {
      throw new Error(`Reflection not found: ${reflectionId}`);
    }

    // 应用批准的修改
    for (const change of approvedChanges) {
      await this.applyWorkflowChange(reflection.groupId, change, aiService);
    }

    reflection.status = 'applied';
    await this.updateReflection(reflection);
  }

  /**
   * 拒绝反思建议
   */
  async reject(reflectionId: string, reason: string): Promise<void> {
    const reflection = await this.getReflection(reflectionId);
    if (!reflection) {
      throw new Error(`Reflection not found: ${reflectionId}`);
    }

    reflection.status = 'rejected';
    await this.updateReflection(reflection);
  }

  /**
   * 生成 OKR 目标调整建议
   */
  async generateObjectiveAdjustments(
    sessions: PracticeSession[],
    currentObjectives: Objective[],
    aiService: (prompt: string) => Promise<string>
  ): Promise<ObjectiveAdjustment[]> {
    const prompt = `你是一位 OKR 目标管理专家。请基于以下练习数据，分析目标完成情况，提出目标调整建议。

【当前目标】：
${JSON.stringify(currentObjectives, null, 2)}

【练习数据】：
${sessions.map(s => `- 问题: ${s.problem.substring(0, 100)}...
  状态: ${s.status}
  结果: ${s.result ? JSON.stringify(s.result) : '无'}`).join('\n')}

请分析并返回 JSON 格式的目标调整建议：
{
  "objectiveAdjustments": [
    {
      "objectiveId": "目标ID或new",
      "adjustmentType": "add|modify|remove|refine",
      "content": "调整内容描述",
      "reason": "调整理由"
    }
  ]
}`;

    try {
      const response = await aiService(prompt);
      const result = JSON.parse(response);
      return result.objectiveAdjustments || [];
    } catch {
      return [];
    }
  }

  // ===== 私有方法 =====

  /**
   * 构建反思提示词
   */
  private buildReflectionPrompt(
    groupData: ReflectionInput['groupData'],
    humanFeedback?: string
  ): string {
    const { group, stats, processLogs } = groupData;

    return `你是一位专业的学习反思专家。请基于以下练习组数据，进行深入反思分析。

【练习组信息】：
- 练习组 ID: ${group.id}
- 模板 ID: ${group.templateId}
- 练习数量: ${stats.totalSessions}
- 成功数量: ${stats.completedSessions}
- 成功率: ${(stats.successRate * 100).toFixed(1)}%
- 平均耗时: ${stats.averageDuration.toFixed(1)} 秒

【练习过程记录】：
${processLogs.map(log => {
  const relevantLogs = log.logs.filter(l => l.stage !== 'observation');
  return `会话 ${log.sessionId}:
${relevantLogs.map(l => `[${l.stage}] ${l.content}${l.effective !== undefined ? ` (有效: ${l.effective})` : ''}`).join('\n')}`;
}).join('\n\n')}

${humanFeedback ? `【人工反馈】：\n${humanFeedback}\n` : ''}

请进行反思分析，返回 JSON 格式：
{
  "focusContradiction": "识别出的最需要解决的有效矛盾（聚焦核心问题）",
  "objectiveAdjustments": [
    {
      "objectiveId": "目标ID",
      "adjustmentType": "add|modify|remove|refine",
      "content": "调整内容",
      "reason": "调整理由"
    }
  ],
  "workflowSuggestions": [
    {
      "stepId": "步骤ID或空（新增步骤）",
      "changeType": "add|modify|remove|reorder",
      "content": "修改内容描述",
      "priority": "high|medium|low"
    }
  ],
  "validationPlan": [
    {
      "item": "验证项",
      "method": "验证方法",
      "expectedOutcome": "预期结果"
    }
  ]
}

注意：
1. focusContradiction 应该是练习过程中发现的最核心、最需要解决的矛盾
2. objectiveAdjustments 应该基于 OKR 思想，聚焦关键结果
3. workflowSuggestions 应该具体可操作
4. 优先级判断应基于对练习效果的影响程度`;
  }

  /**
   * 验证单个工作流修改
   */
  private async validateSingleChange(
    change: WorkflowChange,
    workflow: WorkflowStep[],
    aiService: (prompt: string) => Promise<string>
  ): Promise<ValidationResult> {
    const prompt = `你是一位工作流优化专家。请验证以下工作流修改建议的有效性。

【当前工作流】：
${JSON.stringify(workflow, null, 2)}

【修改建议】：
${JSON.stringify(change, null, 2)}

请评估这个修改建议，返回 JSON 格式：
{
  "item": "${change.changeType} 修改",
  "method": "验证方法描述",
  "result": "passed|failed|inconclusive",
  "evidence": "支持该结论的证据"
}`;

    try {
      const response = await aiService(prompt);
      return JSON.parse(response);
    } catch {
      return {
        item: change.changeType,
        method: 'AI 验证失败',
        result: 'inconclusive',
        evidence: '无法完成验证',
      };
    }
  }

  /**
   * 应用工作流修改
   */
  private async applyWorkflowChange(
    groupId: string,
    change: WorkflowChange,
    aiService: (prompt: string) => Promise<string>
  ): Promise<void> {
    // 这里需要获取模板并更新工作流
    // 实际实现需要访问 TemplateEngine
    console.log(`Applying workflow change for group ${groupId}:`, change);
  }

  private async saveReflection(reflection: Reflection): Promise<void> {
    const betterSqlite = await import('better-sqlite3');
    const Database = betterSqlite.default;
    const db = new Database(this.dbPath);

    const stmt = db.prepare(`
      INSERT INTO reflections (
        id, group_id, created_at, focus_contradiction,
        objective_adjustments, validation_results, workflow_suggestions, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      reflection.id,
      reflection.groupId,
      reflection.createdAt.toISOString(),
      reflection.focusContradiction,
      JSON.stringify(reflection.objectiveAdjustments),
      JSON.stringify(reflection.validationResults),
      JSON.stringify(reflection.workflowSuggestions),
      reflection.status
    );

    db.close();
  }

  private async updateReflection(reflection: Reflection): Promise<void> {
    const betterSqlite = await import('better-sqlite3');
    const Database = betterSqlite.default;
    const db = new Database(this.dbPath);

    const stmt = db.prepare(`
      UPDATE reflections SET
        focus_contradiction = ?,
        objective_adjustments = ?,
        validation_results = ?,
        workflow_suggestions = ?,
        status = ?
      WHERE id = ?
    `);

    stmt.run(
      reflection.focusContradiction,
      JSON.stringify(reflection.objectiveAdjustments),
      JSON.stringify(reflection.validationResults),
      JSON.stringify(reflection.workflowSuggestions),
      reflection.status,
      reflection.id
    );

    db.close();
  }

  private async getReflection(id: string): Promise<Reflection | null> {
    const betterSqlite = await import('better-sqlite3');
    const Database = betterSqlite.default;
    const db = new Database(this.dbPath);

    const row = db.prepare('SELECT * FROM reflections WHERE id = ?').get(id) as any;
    db.close();

    if (!row) return null;

    return {
      id: row.id,
      groupId: row.group_id,
      createdAt: new Date(row.created_at),
      focusContradiction: row.focus_contradiction,
      objectiveAdjustments: JSON.parse(row.objective_adjustments),
      validationResults: JSON.parse(row.validation_results),
      workflowSuggestions: JSON.parse(row.workflow_suggestions),
      status: row.status,
    };
  }

  private generateId(): string {
    return `refl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
