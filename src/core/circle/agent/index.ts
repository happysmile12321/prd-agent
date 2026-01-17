import { callAI } from '../../ai.js';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { getDataDir } from '../../config.js';
import chalk from 'chalk';

// ===== 类型定义 =====

// 感知信息
export interface Perception {
  timestamp: number;
  context: string;
  environment: string;
  userIntent?: string;
  triggers: string[];
  data: Record<string, unknown>;
}

// 决策
export interface Decision {
  timestamp: number;
  action: string;
  reasoning: string;
  confidence: number;
  parameters: Record<string, unknown>;
}

// 行动结果
export interface ActionResult {
  timestamp: number;
  action: string;
  success: boolean;
  result: string;
  feedback: string;
  nextState: string;
}

// 代理状态
export interface AgentState {
  name: string;
  status: 'idle' | 'perceiving' | 'deciding' | 'acting' | 'error';
  currentPerception?: Perception;
  currentDecision?: Decision;
  lastAction?: ActionResult;
  history: {
    perceptions: Perception[];
    decisions: Decision[];
    actions: ActionResult[];
  };
}

// ===== Agent 类 =====

export class Agent {
  private state: AgentState;
  private dbPath: string;

  constructor(name = 'default-agent') {
    this.state = {
      name,
      status: 'idle',
      history: {
        perceptions: [],
        decisions: [],
        actions: [],
      },
    };
    this.dbPath = resolve(getDataDir(), `agent-${name}.json`);
    this.loadState();
  }

  // ===== 感知阶段 =====
  /**
   * 感知环境，收集信息
   * @param context 当前上下文
   * @param environment 环境信息
   * @returns 感知信息
   */
  async perceive(context: string, environment?: Record<string, unknown>): Promise<Perception> {
    this.state.status = 'perceiving';

    console.log(chalk.gray('  🔄 Perceiving environment...'));

    const envStr = environment ? JSON.stringify(environment, null, 2) : '{}';

    // 使用 AI 分析感知信息
    const systemPrompt = `你是一个智能代理的感知模块。请分析用户提供的上下文和环境信息，提取关键信息。

返回 JSON 格式：
{
  "context": "上下文摘要",
  "environment": "环境描述",
  "userIntent": "用户意图推断",
  "triggers": ["触发词列表"],
  "data": {"key": "提取的关键数据"}
}`;

    try {
      const response = await callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Context: ${context}\nEnvironment: ${envStr}` }
      ]);

      let jsonContent = response.content.trim();
      if (jsonContent.startsWith('```json')) jsonContent = jsonContent.slice(7);
      if (jsonContent.startsWith('```')) jsonContent = jsonContent.slice(3);
      if (jsonContent.endsWith('```')) jsonContent = jsonContent.slice(0, -3);
      jsonContent = jsonContent.trim();

      const perceptionData = JSON.parse(jsonContent);

      const perception: Perception = {
        timestamp: Date.now(),
        context: perceptionData.context || context,
        environment: perceptionData.environment || envStr,
        userIntent: perceptionData.userIntent,
        triggers: perceptionData.triggers || [],
        data: perceptionData.data || {},
      };

      this.state.currentPerception = perception;
      this.state.history.perceptions.push(perception);
      this.saveState();

      this.state.status = 'idle';
      return perception;
    } catch (error) {
      this.state.status = 'error';
      throw new Error(`Perception failed: ${(error as Error).message}`);
    }
  }

  // ===== 决策阶段 =====
  /**
   * 基于感知信息做出决策
   * @param perception 感知信息（可选，使用当前感知）
   * @returns 决策
   */
  async decide(perception?: Perception): Promise<Decision> {
    this.state.status = 'deciding';

    const p = perception || this.state.currentPerception;
    if (!p) {
      throw new Error('No perception available. Run perceive() first.');
    }

    console.log(chalk.gray('  🤔 Making decision...'));

    const systemPrompt = `你是一个智能代理的决策模块。基于感知信息，决定下一步行动。

可用行动类型：
- respond: 回应用户
- query: 查询更多信息
- delegate: 委托给其他模块
- wait: 等待用户输入
- execute: 执行特定任务

返回 JSON 格式：
{
  "action": "行动类型",
  "reasoning": "决策理由",
  "confidence": 0.85,
  "parameters": {"param1": "value1"}
}`;

    try {
      const response = await callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(p) }
      ]);

      let jsonContent = response.content.trim();
      if (jsonContent.startsWith('```json')) jsonContent = jsonContent.slice(7);
      if (jsonContent.startsWith('```')) jsonContent = jsonContent.slice(3);
      if (jsonContent.endsWith('```')) jsonContent = jsonContent.slice(0, -3);
      jsonContent = jsonContent.trim();

      const decisionData = JSON.parse(jsonContent);

      const decision: Decision = {
        timestamp: Date.now(),
        action: decisionData.action,
        reasoning: decisionData.reasoning,
        confidence: decisionData.confidence || 0.5,
        parameters: decisionData.parameters || {},
      };

      this.state.currentDecision = decision;
      this.state.history.decisions.push(decision);
      this.saveState();

      this.state.status = 'idle';
      return decision;
    } catch (error) {
      this.state.status = 'error';
      throw new Error(`Decision failed: ${(error as Error).message}`);
    }
  }

  // ===== 行动阶段 =====
  /**
   * 执行行动
   * @param decision 决策（可选，使用当前决策）
   * @returns 行动结果
   */
  async act(decision?: Decision): Promise<ActionResult> {
    this.state.status = 'acting';

    const d = decision || this.state.currentDecision;
    if (!d) {
      throw new Error('No decision available. Run decide() first.');
    }

    console.log(chalk.gray(`  ⚡ Executing: ${d.action}...`));

    try {
      let result = '';
      let success = true;
      let feedback = '';
      let nextState = 'idle';

      // 根据行动类型执行
      switch (d.action) {
        case 'respond':
          result = `Response: ${d.parameters.message || 'No message'}`;
          feedback = 'Response sent';
          break;

        case 'query':
          result = `Query: ${d.parameters.query || 'No query'}`;
          feedback = 'Query executed';
          nextState = 'awaiting_input';
          break;

        case 'delegate':
          result = `Delegated to: ${d.parameters.module || 'unknown'}`;
          feedback = 'Delegation complete';
          break;

        case 'wait':
          result = 'Waiting for user input';
          feedback = 'Waiting state';
          nextState = 'awaiting_input';
          break;

        case 'execute':
          result = `Executed: ${JSON.stringify(d.parameters)}`;
          feedback = 'Execution complete';
          break;

        default:
          result = `Unknown action: ${d.action}`;
          success = false;
          feedback = 'Unknown action';
      }

      const actionResult: ActionResult = {
        timestamp: Date.now(),
        action: d.action,
        success,
        result,
        feedback,
        nextState,
      };

      this.state.lastAction = actionResult;
      this.state.history.actions.push(actionResult);
      this.saveState();

      this.state.status = nextState as any || 'idle';
      return actionResult;
    } catch (error) {
      this.state.status = 'error';
      throw new Error(`Action failed: ${(error as Error).message}`);
    }
  }

  // ===== 完整循环 =====
  /**
   * 执行完整的感知-决策-行动循环
   * @param context 上下文
   * @param environment 环境信息
   * @returns 行动结果
   */
  async run(context: string, environment?: Record<string, unknown>): Promise<ActionResult> {
    const perception = await this.perceive(context, environment);
    const decision = await this.decide(perception);
    const result = await this.act(decision);
    return result;
  }

  // ===== 状态管理 =====
  getState(): AgentState {
    return { ...this.state };
  }

  setStatus(status: AgentState['status']): void {
    this.state.status = status;
    this.saveState();
  }

  reset(): void {
    this.state.status = 'idle';
    this.state.currentPerception = undefined;
    this.state.currentDecision = undefined;
    this.state.lastAction = undefined;
    this.state.history = {
      perceptions: [],
      decisions: [],
      actions: [],
    };
    this.saveState();
  }

  // ===== 持久化 =====
  private saveState(): void {
    try {
      const dir = resolve(getDataDir());
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.dbPath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('Failed to save agent state:', error);
    }
  }

  private loadState(): void {
    try {
      if (existsSync(this.dbPath)) {
        const data = readFileSync(this.dbPath, 'utf-8');
        this.state = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load agent state:', error);
    }
  }

  // ===== 历史查询 =====
  getHistory(limit = 10) {
    return {
      perceptions: this.state.history.perceptions.slice(-limit),
      decisions: this.state.history.decisions.slice(-limit),
      actions: this.state.history.actions.slice(-limit),
    };
  }

  formatHistory(): string {
    const lines: string[] = [];
    lines.push(chalk.cyan(`\n  Agent: ${this.state.name} | Status: ${this.state.status}\n`));

    if (this.state.currentPerception) {
      lines.push(chalk.gray('  Current Perception:'));
      lines.push(`    Context: ${this.state.currentPerception.context}`);
      lines.push(`    Intent: ${this.state.currentPerception.userIntent || 'N/A'}`);
      lines.push('');
    }

    if (this.state.currentDecision) {
      lines.push(chalk.gray('  Current Decision:'));
      lines.push(`    Action: ${chalk.yellow(this.state.currentDecision.action)}`);
      lines.push(`    Reasoning: ${this.state.currentDecision.reasoning}`);
      lines.push(`    Confidence: ${(this.state.currentDecision.confidence * 100).toFixed(0)}%`);
      lines.push('');
    }

    if (this.state.lastAction) {
      const status = this.state.lastAction.success ? chalk.green('✓') : chalk.red('✗');
      lines.push(chalk.gray('  Last Action:'));
      lines.push(`    ${status} ${this.state.lastAction.action}`);
      lines.push(`    Result: ${this.state.lastAction.result}`);
      lines.push('');
    }

    const history = this.getHistory(5);
    if (history.perceptions.length > 0) {
      lines.push(chalk.gray('  Recent History:'));
      history.perceptions.forEach((p, i) => {
        lines.push(`    [${i + 1}] Perceive: ${p.context.slice(0, 30)}...`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }
}

// ===== 单例管理 =====
const agents = new Map<string, Agent>();

export function getAgent(name = 'default'): Agent {
  if (!agents.has(name)) {
    agents.set(name, new Agent(name));
  }
  return agents.get(name)!;
}

export function listAgents(): string[] {
  return Array.from(agents.keys());
}

export function createAgent(name: string): Agent {
  if (agents.has(name)) {
    throw new Error(`Agent '${name}' already exists`);
  }
  const agent = new Agent(name);
  agents.set(name, agent);
  return agent;
}
