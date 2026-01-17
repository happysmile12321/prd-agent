/**
 * 模板引擎 - 核心类
 *
 * 负责模板的 CRUD 操作和基本管理功能
 */

import type {
  PracticeTemplate,
  PracticeLevel,
  WorkflowStep,
  Technique,
  TemplateStats,
} from '../../../types/template.js';

import { TemplateStatus } from '../../../types/template.js';

export class TemplateEngine {
  private templates: Map<string, PracticeTemplate> = new Map();
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * 初始化数据库表
   */
  async initDB(): Promise<void> {
    const betterSqlite = await import('better-sqlite3');
    const Database = betterSqlite.default;
    const db = new Database(this.dbPath);

    db.exec(`
      -- 模板表
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        chapter TEXT NOT NULL,
        status TEXT NOT NULL,
        level TEXT NOT NULL,
        objectives TEXT NOT NULL,
        triggers TEXT NOT NULL,
        traps TEXT NOT NULL,
        workflow TEXT NOT NULL,
        techniques TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        metadata TEXT
      );

      -- 练习组表
      CREATE TABLE IF NOT EXISTS practice_groups (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        status TEXT NOT NULL,
        sessions TEXT NOT NULL,
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
      );

      -- 练习会话表
      CREATE TABLE IF NOT EXISTS practice_sessions (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        template_id TEXT NOT NULL,
        level TEXT NOT NULL,
        problem TEXT NOT NULL,
        complexity TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration INTEGER,
        status TEXT NOT NULL,
        process_log TEXT NOT NULL,
        result TEXT,
        FOREIGN KEY (group_id) REFERENCES practice_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
      );

      -- 反思记录表
      CREATE TABLE IF NOT EXISTS reflections (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        focus_contradiction TEXT NOT NULL,
        objective_adjustments TEXT NOT NULL,
        validation_results TEXT NOT NULL,
        workflow_suggestions TEXT NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES practice_groups(id) ON DELETE CASCADE
      );

      -- 场景模拟表
      CREATE TABLE IF NOT EXISTS simulated_scenarios (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        complexity TEXT NOT NULL,
        suggested_approach TEXT,
        variables TEXT,
        expected_outcome TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
      );

      -- 工作流迭代记录表
      CREATE TABLE IF NOT EXISTS workflow_iterations (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL,
        step_id TEXT NOT NULL,
        before TEXT NOT NULL,
        after TEXT NOT NULL,
        reason TEXT NOT NULL,
        validation TEXT,
        iterated_at TEXT NOT NULL,
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
      );

      -- 创建索引
      CREATE INDEX IF NOT EXISTS idx_templates_subject ON templates(subject);
      CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);
      CREATE INDEX IF NOT EXISTS idx_templates_level ON templates(level);
      CREATE INDEX IF NOT EXISTS idx_practice_groups_template ON practice_groups(template_id);
      CREATE INDEX IF NOT EXISTS idx_practice_sessions_group ON practice_sessions(group_id);
      CREATE INDEX IF NOT EXISTS idx_reflections_group ON reflections(group_id);
    `);

    db.close();
  }

  /**
   * 创建新模板
   */
  async createTemplate(template: Omit<PracticeTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const newTemplate: PracticeTemplate = {
      ...template,
      id,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };

    const betterSqlite = await import('better-sqlite3');
    const Database = betterSqlite.default;
    const db = new Database(this.dbPath);

    const stmt = db.prepare(`
      INSERT INTO templates (
        id, name, subject, chapter, status, level,
        objectives, triggers, traps, workflow, techniques,
        created_at, updated_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      newTemplate.id,
      newTemplate.name,
      newTemplate.subject,
      newTemplate.chapter,
      newTemplate.status,
      newTemplate.level,
      JSON.stringify(newTemplate.objectives),
      JSON.stringify(newTemplate.triggers),
      JSON.stringify(newTemplate.traps),
      JSON.stringify(newTemplate.workflow),
      JSON.stringify(newTemplate.techniques),
      now,
      now,
      newTemplate.metadata ? JSON.stringify(newTemplate.metadata) : null
    );

    db.close();
    this.templates.set(id, newTemplate);

    return id;
  }

  /**
   * 获取模板
   */
  async getTemplate(id: string): Promise<PracticeTemplate | null> {
    // 先从缓存查找
    if (this.templates.has(id)) {
      return this.templates.get(id)!;
    }

    const betterSqlite = await import('better-sqlite3');
    const Database = betterSqlite.default;
    const db = new Database(this.dbPath);

    const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as any;

    db.close();

    if (!row) return null;

    const template: PracticeTemplate = {
      id: row.id,
      name: row.name,
      subject: row.subject,
      chapter: row.chapter,
      status: row.status as TemplateStatus,
      level: row.level as PracticeLevel,
      objectives: JSON.parse(row.objectives),
      triggers: JSON.parse(row.triggers),
      traps: JSON.parse(row.traps),
      workflow: JSON.parse(row.workflow),
      techniques: JSON.parse(row.techniques),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };

    this.templates.set(id, template);
    return template;
  }

  /**
   * 更新模板
   */
  async updateTemplate(id: string, updates: Partial<Omit<PracticeTemplate, 'id' | 'createdAt'>>): Promise<boolean> {
    const existing = await this.getTemplate(id);
    if (!existing) return false;

    const updated: PracticeTemplate = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    const betterSqlite = await import('better-sqlite3');
    const Database = betterSqlite.default;
    const db = new Database(this.dbPath);

    const stmt = db.prepare(`
      UPDATE templates SET
        name = ?, subject = ?, chapter = ?, status = ?, level = ?,
        objectives = ?, triggers = ?, traps = ?, workflow = ?, techniques = ?,
        updated_at = ?, metadata = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.name,
      updated.subject,
      updated.chapter,
      updated.status,
      updated.level,
      JSON.stringify(updated.objectives),
      JSON.stringify(updated.triggers),
      JSON.stringify(updated.traps),
      JSON.stringify(updated.workflow),
      JSON.stringify(updated.techniques),
      updated.updatedAt.toISOString(),
      updated.metadata ? JSON.stringify(updated.metadata) : null,
      id
    );

    db.close();
    this.templates.set(id, updated);

    return true;
  }

  /**
   * 删除模板
   */
  async deleteTemplate(id: string): Promise<boolean> {
    const betterSqlite = await import('better-sqlite3');
    const Database = betterSqlite.default;
    const db = new Database(this.dbPath);

    const stmt = db.prepare('DELETE FROM templates WHERE id = ?');
    const result = stmt.run(id);

    db.close();
    this.templates.delete(id);

    return result.changes > 0;
  }

  /**
   * 列出模板
   */
  async listTemplates(filters?: {
    subject?: string;
    status?: TemplateStatus;
    level?: PracticeLevel;
  }): Promise<PracticeTemplate[]> {
    const betterSqlite = await import('better-sqlite3');
    const Database = betterSqlite.default;
    const db = new Database(this.dbPath);

    let query = 'SELECT * FROM templates WHERE 1=1';
    const params: any[] = [];

    if (filters?.subject) {
      query += ' AND subject = ?';
      params.push(filters.subject);
    }
    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.level) {
      query += ' AND level = ?';
      params.push(filters.level);
    }

    query += ' ORDER BY updated_at DESC';

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as any[];

    db.close();

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      subject: row.subject,
      chapter: row.chapter,
      status: row.status as TemplateStatus,
      level: row.level as PracticeLevel,
      objectives: JSON.parse(row.objectives),
      triggers: JSON.parse(row.triggers),
      traps: JSON.parse(row.traps),
      workflow: JSON.parse(row.workflow),
      techniques: JSON.parse(row.techniques),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  /**
   * 更新模板状态
   */
  async updateTemplateStatus(id: string, status: TemplateStatus, reason?: string): Promise<boolean> {
    const template = await this.getTemplate(id);
    if (!template) return false;

    // 如果状态变为回炉重造，记录原因
    if (status === TemplateStatus.Rework && reason) {
      // 可以创建一个反思记录或日志
      console.log(`Template ${id} marked for rework: ${reason}`);
    }

    return this.updateTemplate(id, { status });
  }

  /**
   * 获取模板统计
   */
  async getTemplateStats(id: string): Promise<TemplateStats | null> {
    const betterSqlite = await import('better-sqlite3');
    const Database = betterSqlite.default;
    const db = new Database(this.dbPath);

    const stats = db.prepare(`
      SELECT
        COUNT(CASE WHEN level = 'T1' THEN 1 END) as t1_count,
        COUNT(CASE WHEN level = 'T2' THEN 1 END) as t2_count,
        AVG(CASE WHEN json_extract(result, '$.success') = 1 THEN 1.0 ELSE 0.0 END) as success_rate,
        AVG(json_extract(result, '$.score')) as avg_score,
        AVG(duration) as avg_duration,
        MAX(started_at) as last_practiced
      FROM practice_sessions
      WHERE template_id = ?
    `).get(id) as any;

    db.close();

    if (!stats) return null;

    return {
      templateId: id,
      t1PracticeCount: stats.t1_count || 0,
      t2PracticeCount: stats.t2_count || 0,
      successRate: stats.success_rate || 0,
      averageScore: stats.avg_score || 0,
      averageDuration: stats.avg_duration || 0,
      reworkCount: 0, // 可以从模板历史记录中计算
      lastPracticedAt: stats.last_practiced ? new Date(stats.last_practiced) : undefined,
    };
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
