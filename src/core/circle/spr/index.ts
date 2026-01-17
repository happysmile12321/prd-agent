import { readFile } from 'fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { getDataDir } from '../../config.js';
import { callAI } from '../../ai.js';
import chalk from 'chalk';

// ===== 类型定义 =====

// 骨架节点类型
export interface SkeletonNode {
  label: string;
  children?: SkeletonNode[];
}

// 思维导图节点
export interface MindMapNode {
  id: string;
  label: string;
  emoji: string;
  type: 'center' | 'main' | 'sub';
  children?: MindMapNode[];
}

// 摘要结果
export interface SummaryResult {
  title: string;
  mindMap: MindMapNode;
  keyPoints: string[];
}

// 测试题类型
export enum QuizType {
  FillBlank = 'fill-blank',
  TrueFalse = 'true-false',
  ShortAnswer = 'short-answer',
}

// 测试题
export interface QuizQuestion {
  id: string;
  type: QuizType;
  question: string;
  answer: string;
  hints: string[];
  relatedNodePath: string;
  difficulty: number;
}

// 评估结果
export interface EvalResult {
  isCorrect: boolean;
  score: number;
  feedback: string;
}

// ===== 数据库操作 =====

// 数据库文件路径
const DB_PATH = () => resolve(getDataDir(), 'spr.db');

// 初始化数据库
export async function initDB(): Promise<void> {
  const dbPath = DB_PATH();
  const dir = resolve(getDataDir());

  // 确保目录存在
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // 创建数据库表
  const betterSqlite = await import('better-sqlite3');
  const Database = betterSqlite.default;
  const db = new Database(dbPath);

  // 创建必要的表结构
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      original_content TEXT,
      skeleton TEXT,
      output TEXT,
      metadata TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      type TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT,
      hints TEXT,
      related_node_path TEXT,
      difficulty INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quiz_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER,
      user_answer TEXT,
      is_correct BOOLEAN,
      score INTEGER,
      feedback TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (quiz_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL,
      content TEXT,
      original_content TEXT,
      corrected_content TEXT,
      category TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.close();
}

// ===== 工具函数 =====

// 读取文件内容
async function readFileContent(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Failed to read file: ${filePath}`);
  }
}

// 获取数据库连接
async function getDB() {
  const betterSqlite = await import('better-sqlite3');
  const Database = betterSqlite.default;
  return new Database(DB_PATH());
}

// 保存任务到数据库
async function saveTask(
  type: string,
  filePath: string,
  content: string,
  skeleton?: SkeletonNode,
  output = '',
  metadata?: Record<string, unknown>
): Promise<number> {
  const db = await getDB();

  const stmt = db.prepare(`
    INSERT INTO tasks (type, file_path, original_content, skeleton, output, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    type,
    filePath,
    content,
    skeleton ? JSON.stringify(skeleton) : null,
    output,
    metadata ? JSON.stringify(metadata) : null
  );

  db.close();
  return result.lastInsertRowid as number;
}

// 保存测试题
async function saveQuizQuestions(quizQuestions: QuizQuestion[], taskId: number): Promise<void> {
  const db = await getDB();
  const insertStmt = db.prepare(`
    INSERT INTO quiz_questions (task_id, type, question, answer, hints, related_node_path, difficulty)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((questions: QuizQuestion[]) => {
    for (const q of questions) {
      insertStmt.run(
        taskId,
        q.type,
        q.question,
        q.answer,
        JSON.stringify(q.hints || []),
        q.relatedNodePath,
        q.difficulty
      );
    }
  });

  insertMany(quizQuestions);
  db.close();
}

// 保存笔记
async function saveNote(
  content: string,
  originalContent: string,
  category: string
): Promise<number> {
  const db = await getDB();

  const result = db.prepare(`
    INSERT INTO notes (file_path, content, original_content, category)
    VALUES (?, ?, ?, ?)
  `).run(content, originalContent, category);

  db.close();
  return result.lastInsertRowid as number;
}

// 获取任务
async function getTasks(): Promise<any[]> {
  const db = await getDB();
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
  db.close();
  return tasks as any[];
}

// 获取单个任务
async function getTask(id: number): Promise<any> {
  const db = await getDB();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  db.close();
  return task;
}

// 保存测试结果
async function saveQuizResult(result: EvalResult, quizId: number, userAnswer: string): Promise<void> {
  const db = await getDB();

  db.prepare(`
    INSERT INTO quiz_results (quiz_id, user_answer, is_correct, score, feedback)
    VALUES (?, ?, ?, ?, ?)
  `).run(quizId, userAnswer, result.isCorrect ? 1 : 0, result.score, result.feedback);

  db.close();
}

// 获取任务相关的所有测试题
async function getQuizQuestions(taskId: number): Promise<QuizQuestion[]> {
  const db = await getDB();

  const rows = db.prepare(`
    SELECT * FROM quiz_questions WHERE task_id = ?
  `).all(taskId) as any[];

  db.close();

  return rows.map((row) => ({
    id: String(row.id),
    type: row.type as QuizType,
    question: row.question,
    answer: row.answer,
    hints: JSON.parse(row.hints || '[]'),
    relatedNodePath: row.related_node_path,
    difficulty: row.difficulty,
  }));
}

// 获取单个测试题
async function getQuizQuestion(quizId: number): Promise<QuizQuestion | null> {
  const db = await getDB();
  const row = db.prepare('SELECT * FROM quiz_questions WHERE id = ?').get(quizId) as any;
  db.close();

  if (!row) return null;

  return {
    id: String(row.id),
    type: row.type as QuizType,
    question: row.question,
    answer: row.answer,
    hints: JSON.parse(row.hints || '[]'),
    relatedNodePath: row.related_node_path,
    difficulty: row.difficulty,
  };
}

// ===== 核心功能 =====

// 1. 分析 Markdown 文件，提取 SPR 骨架
export async function analyzeMarkdown(filePath: string): Promise<number> {
  const content = await readFileContent(filePath);

  console.log(`  📖 正在分析: ${filePath}`);

  const systemPrompt = `你是一位精通"结构化渐进提取 (SPR)"的认知科学家。请分析以下Markdown内容，转化为【认知训练骨架】。

核心目标：帮助用户通过"良性困难"来主动回忆内容，而不是被动阅读摘要。

【处理原则】：
1. **层级严谨**：严格遵守 Part -> Chapter -> Slot 的层级结构。
2. **信息遮蔽 (关键)**：在最底层的 "children" (Slot) 中，**绝对禁止**直接输出结论、定义或解释。
3. **抽象化标签**：将具体内容转化为"元认知标签"。
4. **分类标记**：
   - 如果是定义、名词，type 标记为 "slot_concept"
   - 如果是运行原理、因果关系，type 标记为 "slot_logic"
   - 如果是具体的学习方法、建议，type 标记为 "slot_action"

请以JSON格式返回：
{
  "label": "顶层标题",
  "children": [
    {
      "label": "子标题",
      "children": [
        {"label": "叶子节点"}
      ]
    }
  ]
}

只返回骨架结构的JSON，不要包含任何解释或答案！`;

  try {
    const response = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content }
    ]);

    // 提取 JSON（移除可能的 markdown 代码块标记）
    let jsonContent = response.content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.slice(7);
    }
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    const skeleton = JSON.parse(jsonContent) as SkeletonNode;

    // 保存到数据库
    const taskId = await saveTask('analyze', filePath, content, skeleton);
    printSuccess(`分析完成！任务 ID: ${taskId}`);
    return taskId;
  } catch (error) {
    throw new Error(`解析AI响应失败: ${(error as Error).message}`);
  }
}

// 2. 处理笔记（批处理）
export async function processNotes(filePaths: string[]): Promise<number> {
  const dbPath = DB_PATH();

  // 检查数据库
  if (!existsSync(dbPath)) {
    await initDB();
  }

  // 批处理每个文件
  const results = await Promise.allSettled(
    filePaths.map((filePath) => processNote(filePath))
  );

  const successCount = results.filter((r) => r.status === 'fulfilled').length;
  printSuccess(`处理完成: ${successCount}/${filePaths.length}`);
  return successCount;
}

// 处理单个笔记
async function processNote(filePath: string): Promise<{ taskId: number; correctedContent: string; category: string }> {
  const content = await readFileContent(filePath);

  const response = await callAI([
    {
      role: 'system',
      content: `你是一个学习助手。请分析用户提供的笔记内容，提供：
1. 修正后的版本（格式、语法错误、逻辑漏洞）
2. 内容分类

要求：
- 保持原文核心信息
- 修正格式错误和逻辑漏洞
- 分类标签：技术/设计/产品/商业等

返回格式（JSON）：
{
  "correctedContent": "修正后的内容",
  "category": "分类标签"
}`,
    },
    {
      role: 'user',
      content: content,
    },
  ]);

  const result = JSON.parse(response.content);

  const noteId = await saveNote(result.correctedContent, content, result.category);
  return { taskId: noteId, correctedContent: result.correctedContent, category: result.category };
}

// ===== 第三阶段：功能模块 =====

// 生成思维导图
export async function generateSummary(taskId: number): Promise<SummaryResult> {
  const task = await getTask(taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const content = task.original_content || '';
  const prompt = `
你是一位擅长知识提炼和可视化的专家。请分析存储在数据库中的任务内容，生成结构化的摘要思维导图。

【任务信息】：
  ID: ${taskId}
  文件: ${task.file_path}

【任务内容】：
  ${content.slice(0, 1000)}

请按以下 JSON schema 返回：
{
  "title": "标题",
  "mindMap": {
    "id": "root",
    "label": "中心主题",
    "emoji": "🎯",
    "type": "center",
    "children": [...]
  },
  "keyPoints": ["要点1", "要点2", ...]
}

只返回JSON，不要其他内容。`;

  const response = await callAI([
    { role: 'user', content: prompt }
  ]);

  let jsonContent = response.content.trim();
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.slice(7);
  }
  if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.slice(3);
  }
  if (jsonContent.endsWith('```')) {
    jsonContent = jsonContent.slice(0, -3);
  }
  jsonContent = jsonContent.trim();

  const result = JSON.parse(jsonContent) as SummaryResult;

  // 保存结果
  await saveTask('summary', task.file_path, '', undefined, JSON.stringify(result));
  return result;
}

// 获取骨架节点路径（用于生成测试题）
function getPaths(node: SkeletonNode, prefix = ''): string[] {
  const paths: string[] = [];
  const currentPath = prefix ? `${prefix} > ${node.label}` : node.label;

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      paths.push(...getPaths(child, currentPath));
    }
  } else {
    paths.push(currentPath);
  }

  return paths;
}

// 生成测试题
export async function generateQuizQuestions(
  skeletonId?: number,
  count = 5
): Promise<QuizQuestion[]> {
  // 从指定的骨架生成测试题
  let skeleton: SkeletonNode | null = null;

  if (skeletonId) {
    const skeletonData = await getTask(skeletonId);
    if (skeletonData?.skeleton) {
      skeleton = JSON.parse(skeletonData.skeleton);
    }
  }

  const systemPrompt = `你是一位精通"生成式提取"学习法的教育专家。请基于学习材料中的认知训练骨架，生成${count}道深度理解测试题。

【题型要求】：
1. 填空题(fill-blank)：测试关键概念的记忆，用____表示填空处
2. 判断题(true-false)：测试常见误解，问题以"对还是错："开头
3. 简答题(short-answer)：测试概念关系和应用能力

【出题原则 - 极其重要】：
- 🎯 测试"为什么"而非"是什么"
- 🔗 关注概念之间的关系和因果
- 💡 避免死记硬背型题目
- 🧠 优先考察深层理解和应用
- ❌ 禁止出过于简单的定义题

【骨架节点路径】：
${skeleton ? getPaths(skeleton).slice(0, 10).join('\n') : '无骨架，直接用内容'}

请以 JSON 数组格式返回测试题：
[
  {
    "id": "唯一ID",
    "type": "fill-blank",
    "question": "题目内容",
    "answer": "标准答案",
    "hints": ["提示1", "提示2"],
    "relatedNodePath": "相关节点路径",
    "difficulty": 3
  }
]`;

  const response = await callAI([
    { role: 'system', content: systemPrompt }
  ]);

  let jsonContent = response.content.trim();
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.slice(7);
  }
  if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.slice(3);
  }
  if (jsonContent.endsWith('```')) {
    jsonContent = jsonContent.slice(0, -3);
  }
  jsonContent = jsonContent.trim();

  return JSON.parse(jsonContent) as QuizQuestion[];
}

// 评估用户答案
export async function evaluateAnswer(quizId: number, userAnswer: string): Promise<EvalResult> {
  const quiz = await getQuizQuestion(quizId);
  if (!quiz) {
    throw new Error(`Quiz not found: ${quizId}`);
  }

  const prompt = `评估用户的答案是否正确。

【题目】：${quiz.question}
【标准答案】：${quiz.answer}
【用户答案】：${userAnswer}

请以JSON格式返回：
{
  "isCorrect": true,
  "score": 85,
  "feedback": "简短反馈(不超过30字)"
}`;

  const response = await callAI([
    { role: 'user', content: prompt }
  ]);

  let jsonContent = response.content.trim();
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.slice(7);
  }
  if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.slice(3);
  }
  if (jsonContent.endsWith('```')) {
    jsonContent = jsonContent.slice(0, -3);
  }
  jsonContent = jsonContent.trim();

  const result = JSON.parse(jsonContent) as EvalResult;

  // 保存结果
  await saveQuizResult(result, quizId, userAnswer);
  return result;
}

// ===== 数据库查询 =====

// 获取所有任务
export async function getAllTasks(): Promise<any[]> {
  return getTasks();
}

// 获取笔记
export async function getNotes(): Promise<any[]> {
  const db = await getDB();
  const notes = db.prepare('SELECT * FROM notes ORDER BY created_at DESC').all();
  db.close();
  return notes as any[];
}

// 获取测试结果
export async function getQuizResults(quizId?: number): Promise<any[]> {
  const db = await getDB();

  let query = `
    SELECT qr.*, qq.question as question_text
    FROM quiz_results qr
    LEFT JOIN quiz_questions qq ON qr.quiz_id = qq.id
  `;

  if (quizId) {
    query += ' WHERE qr.quiz_id = ?';
  }

  query += ' ORDER BY qr.created_at DESC';

  const stmt = db.prepare(query);
  const results = quizId ? stmt.all(quizId) : stmt.all();
  db.close();

  return results as any[];
}

// ===== 输出工具 =====

function printSuccess(message: string): void {
  console.log(chalk.green('✓'), message);
}

function printError(message: string): void {
  console.error(chalk.red('✗'), message);
}

function printInfo(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

// 输出思维导图到文件
export function outputMindMap(mindMap: MindMapNode, outputPath: string): void {
  const lines: string[] = [];
  printNode(mindMap, '', lines, 0);
  writeFileSync(outputPath, lines.join('\n'));
  printSuccess(`MindMap saved to ${outputPath}`);
}

function printNode(node: MindMapNode, prefix: string, lines: string[], depth: number): void {
  const prefix2 = prefix ? `${prefix} └─ ` : '';
  if (depth > 0) {
    lines.push(prefix + getEmojiAndStyle(node.type) + ' ' + node.label);
  } else {
    lines.push(getEmojiAndStyle(node.type) + ' ' + node.label);
  }

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      printNode(child, prefix2, lines, depth + 1);
    }
  }
}

function getEmojiAndStyle(type: string): string {
  switch (type) {
    case 'center':
      return chalk.green.bold('●');
    case 'main':
      return chalk.blue('📋');
    case 'sub':
      return chalk.cyan('📌');
    default:
      return chalk.gray('•');
  }
}
