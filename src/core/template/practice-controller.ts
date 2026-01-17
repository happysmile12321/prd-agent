/**
 * T2 练习控制器
 *
 * 负责管理 T2 级别的练习流程：
 * 1. AI 模拟场景生成
 * 2. V 字应对法（观察 + 试探）
 * 3. 3 个练习一组的计时练习
 * 4. 练习数据收集
 */

import type {
  PracticeSession,
  PracticeGroup,
  SimulatedScenario,
  ScenarioRequest,
  ProcessLog,
  PracticeResult,
  VShapeMethod,
} from '../../types/template.js';

import { PracticeLevel, ProblemComplexity } from '../../types/template.js';

export interface PracticeGroupConfig {
  /** 每组练习数量（默认 3） */
  sessionsPerGroup?: number;
  /** V 字应对法配置 */
  vShapeConfig?: VShapeMethod;
}

/**
 * T2 练习控制器
 */
export class PracticeController {
  private dbPath: string;
  private activeGroups: Map<string, PracticeGroup> = new Map();
  private groupConfigs: Map<string, PracticeGroupConfig> = new Map();
  private defaultVShapeConfig: VShapeMethod = {
    observeDuration: 3, // 3 分钟观察
    observeGuidance: '请在接下来的 3 分钟内，无压力地思考问题的客观现实。不要急于寻找解决方案，先充分理解问题的本质。',
    exploration: {
      maxAttempts: 5,
      timeout: 60, // 每次试探 60 秒
    },
  };

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * 创建新的练习组
   */
  async createPracticeGroup(
    templateId: string,
    config: PracticeGroupConfig = {}
  ): Promise<string> {
    const groupId = this.generateId();
    const now = new Date();

    const group: PracticeGroup = {
      id: groupId,
      templateId,
      startedAt: now,
      status: 'in_progress',
      sessions: [],
    };

    this.groupConfigs.set(groupId, config);
    await this.saveGroup(group);
    this.activeGroups.set(groupId, group);

    return groupId;
  }

  /**
   * 生成模拟场景（通过 AI）
   */
  async generateScenario(
    request: ScenarioRequest,
    aiService: (prompt: string) => Promise<string>
  ): Promise<SimulatedScenario> {
    const prompt = `你是一位专业的训练场景设计专家。请为以下练习模板生成一个模拟场景。

【模板 ID】: ${request.templateId}
【期望难度】: ${request.difficulty || 3}
【期望复杂度】: ${request.complexity || 'simple'}

要求：
1. 场景应贴近真实应用场景
2. 问题清晰，有明确的解决目标
3. 如果是简单问题，直接描述问题即可
4. 如果是复杂问题，需要包含多个相互关联的子问题
5. 场景应具有可操作性

请返回 JSON 格式：
{
  "title": "场景标题",
  "description": "详细场景描述",
  "complexity": "simple|complex",
  "suggestedApproach": "direct|v_shape",
  "variables": {...},
  "expectedOutcome": "预期结果描述"
}`;

    const response = await aiService(prompt);
    const scenario = JSON.parse(response);

    return {
      id: this.generateId(),
      ...scenario,
    };
  }

  /**
   * 开始新的练习会话
   */
  async startSession(
    groupId: string,
    scenario: SimulatedScenario,
    level: PracticeLevel = PracticeLevel.T2
  ): Promise<PracticeSession> {
    const group = await this.getGroup(groupId);
    if (!group) {
      throw new Error(`Group not found: ${groupId}`);
    }

    const sessionId = this.generateId();
    const now = new Date();

    // 判断问题复杂度
    const complexity = this.determineComplexity(scenario);

    const session: PracticeSession = {
      id: sessionId,
      groupId,
      templateId: group.templateId,
      level,
      problem: scenario.description,
      complexity,
      startedAt: now,
      status: complexity === ProblemComplexity.Complex ? 'observing' : 'exploring',
      processLog: [],
    };

    group.sessions.push(session);

    // 保存更新
    await this.saveGroup(group);

    return session;
  }

  /**
   * V 字应对法 - 观察阶段
   */
  async enterObservationPhase(
    sessionId: string,
    vShapeConfig?: VShapeMethod
  ): Promise<{ guidance: string; duration: number }> {
    const config = vShapeConfig || this.defaultVShapeConfig;

    // 记录进入观察阶段
    await this.addProcessLog(sessionId, {
      timestamp: new Date(),
      stage: 'observation',
      content: `进入观察阶段，持续时间: ${config.observeDuration} 分钟`,
    });

    return {
      guidance: config.observeGuidance,
      duration: config.observeDuration,
    };
  }

  /**
   * V 字应对法 - 完成观察，进入试探阶段
   */
  async completeObservation(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = 'exploring';

    await this.addProcessLog(sessionId, {
      timestamp: new Date(),
      stage: 'observation',
      content: '观察阶段完成，开始有效性试探',
    });

    await this.saveSession(session);
  }

  /**
   * 记录试探尝试
   */
  async recordExplorationAttempt(
    sessionId: string,
    attempt: string,
    effective: boolean
  ): Promise<void> {
    await this.addProcessLog(sessionId, {
      timestamp: new Date(),
      stage: 'exploration',
      content: attempt,
      effective,
    });
  }

  /**
   * 完成练习会话
   */
  async completeSession(
    sessionId: string,
    result: PracticeResult
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.endedAt = new Date();
    session.duration = Math.floor(
      (session.endedAt.getTime() - session.startedAt.getTime()) / 1000
    );
    session.status = result.success ? 'completed' : 'failed';
    session.result = result;

    await this.saveSession(session);

    // 检查是否完成整组练习
    await this.checkGroupCompletion(session.groupId);
  }

  /**
   * 获取练习组的实时统计
   */
  getGroupStats(groupId: string): {
    totalSessions: number;
    completedSessions: number;
    averageDuration: number;
    successRate: number;
  } {
    const group = this.activeGroups.get(groupId);
    if (!group) {
      throw new Error(`Group not found: ${groupId}`);
    }

    const completed = group.sessions.filter(s => s.status === 'completed');
    const totalDuration = group.sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    return {
      totalSessions: group.sessions.length,
      completedSessions: completed.length,
      averageDuration: group.sessions.length > 0 ? totalDuration / group.sessions.length : 0,
      successRate: group.sessions.length > 0
        ? completed.length / group.sessions.length
        : 0,
    };
  }

  /**
   * 导出练习数据（用于反思）
   */
  async exportGroupData(groupId: string): Promise<{
    group: PracticeGroup;
    stats: ReturnType<PracticeController['getGroupStats']>;
    processLogs: Array<{ sessionId: string; logs: ProcessLog[] }>;
  }> {
    const group = await this.getGroup(groupId);
    if (!group) {
      throw new Error(`Group not found: ${groupId}`);
    }

    const processLogs = group.sessions.map(session => ({
      sessionId: session.id,
      logs: session.processLog,
    }));

    return {
      group,
      stats: this.getGroupStats(groupId),
      processLogs,
    };
  }

  // ===== 私有方法 =====

  private determineComplexity(scenario: SimulatedScenario): ProblemComplexity {
    // 优先使用场景建议的复杂度
    if (scenario.complexity) {
      return scenario.complexity;
    }

    // 根据建议方法判断
    if (scenario.suggestedApproach === 'v_shape') {
      return ProblemComplexity.Complex;
    }

    // 简单判断：描述长度超过一定阈值视为复杂
    if (scenario.description.length > 500) {
      return ProblemComplexity.Complex;
    }

    return ProblemComplexity.Simple;
  }

  private async checkGroupCompletion(groupId: string): Promise<void> {
    const group = await this.getGroup(groupId);
    if (!group) return;

    // 默认每 3 个练习一组
    const sessionsPerGroup = 3;

    if (group.sessions.length >= sessionsPerGroup) {
      group.endedAt = new Date();
      group.status = 'completed';
      await this.saveGroup(group);
    }
  }

  private async addProcessLog(
    sessionId: string,
    log: ProcessLog
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.processLog.push(log);
    await this.saveSession(session);
  }

  private async getSession(sessionId: string): Promise<PracticeSession | null> {
    // 从活跃的组中查找
    for (const group of this.activeGroups.values()) {
      const session = group.sessions.find(s => s.id === sessionId);
      if (session) {
        return session;
      }
    }

    // 从数据库查找
    const betterSqlite = await import('better-sqlite3');
    const Database = betterSqlite.default;
    const db = new Database(this.dbPath);

    const row = db.prepare('SELECT * FROM practice_sessions WHERE id = ?').get(sessionId) as any;
    db.close();

    if (!row) return null;

    return {
      id: row.id,
      groupId: row.group_id,
      templateId: row.template_id,
      level: row.level,
      problem: row.problem,
      complexity: row.complexity,
      startedAt: new Date(row.started_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      duration: row.duration,
      status: row.status,
      processLog: JSON.parse(row.process_log),
      result: row.result ? JSON.parse(row.result) : undefined,
    };
  }

  private async getGroup(groupId: string): Promise<PracticeGroup | null> {
    if (this.activeGroups.has(groupId)) {
      return this.activeGroups.get(groupId)!;
    }

    const betterSqlite = await import('better-sqlite3');
    const Database = betterSqlite.default;
    const db = new Database(this.dbPath);

    const row = db.prepare('SELECT * FROM practice_groups WHERE id = ?').get(groupId) as any;
    db.close();

    if (!row) return null;

    const group: PracticeGroup = {
      id: row.id,
      templateId: row.template_id,
      startedAt: new Date(row.started_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      status: row.status,
      sessions: JSON.parse(row.sessions),
    };

    this.activeGroups.set(groupId, group);
    return group;
  }

  private async saveGroup(group: PracticeGroup): Promise<void> {
    const betterSqlite = await import('better-sqlite3');
    const Database = betterSqlite.default;
    const db = new Database(this.dbPath);

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO practice_groups
      (id, template_id, started_at, ended_at, status, sessions)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      group.id,
      group.templateId,
      group.startedAt.toISOString(),
      group.endedAt?.toISOString() || null,
      group.status,
      JSON.stringify(group.sessions)
    );

    db.close();
  }

  private async saveSession(session: PracticeSession): Promise<void> {
    // 获取所属组并更新
    const group = await this.getGroup(session.groupId);
    if (!group) return;

    const index = group.sessions.findIndex(s => s.id === session.id);
    if (index >= 0) {
      group.sessions[index] = session;
      await this.saveGroup(group);
    }
  }

  private generateId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
