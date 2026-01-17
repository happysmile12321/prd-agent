/**
 * 意图识别器
 *
 * 负责根据用户输入识别应该使用哪个模板
 */

import type {
  PracticeTemplate,
  Trigger,
  Trap,
} from '../../types/template.js';

export interface RecognitionResult {
  /** 匹配的模板 */
  template: PracticeTemplate;
  /** 匹配分数 */
  score: number;
  /** 匹配的触发器 */
  matchedTriggers: Trigger[];
  /** 触发的陷阱（如果有的话） */
  triggeredTraps?: Trap[];
}

export interface RecognitionOptions {
  /** 最低匹配分数 */
  minScore?: number;
  /** 是否启用陷阱检测 */
  enableTrapDetection?: boolean;
}

/**
 * 意图识别器
 */
export class IntentRecognizer {
  /**
   * 识别应该使用哪个模板
   */
  async recognize(
    input: string,
    templates: PracticeTemplate[],
    options: RecognitionOptions = {}
  ): Promise<RecognitionResult | null> {
    const { minScore = 0.3, enableTrapDetection = true } = options;

    // 计算每个模板的匹配分数
    const results: Array<{ template: PracticeTemplate; score: number; matchedTriggers: Trigger[] }> = [];

    for (const template of templates) {
      const { score, matchedTriggers } = this.calculateMatchScore(input, template);

      if (score >= minScore) {
        results.push({ template, score, matchedTriggers });
      }
    }

    // 按分数排序
    results.sort((a, b) => b.score - a.score);

    if (results.length === 0) {
      return null;
    }

    const bestMatch = results[0];

    // 检查陷阱
    let triggeredTraps: Trap[] | undefined;
    if (enableTrapDetection) {
      triggeredTraps = this.checkTraps(input, bestMatch.template.traps);

      // 如果触发陷阱，返回低置信度结果
      if (triggeredTraps.length > 0) {
        return {
          ...bestMatch,
          triggeredTraps,
        };
      }
    }

    return {
      template: bestMatch.template,
      score: bestMatch.score,
      matchedTriggers: bestMatch.matchedTriggers,
    };
  }

  /**
   * 计算输入与模板的匹配分数
   */
  private calculateMatchScore(
    input: string,
    template: PracticeTemplate
  ): { score: number; matchedTriggers: Trigger[] } {
    const normalizedInput = input.toLowerCase().trim();
    let totalScore = 0;
    let totalWeight = 0;
    const matchedTriggers: Trigger[] = [];

    for (const trigger of template.triggers) {
      let triggerScore = 0;

      // 关键词匹配
      for (const keyword of trigger.keywords) {
        if (normalizedInput.includes(keyword.toLowerCase())) {
          triggerScore = 1;
          break;
        }
      }

      // 正则模式匹配
      if (triggerScore === 0 && trigger.patterns) {
        for (const pattern of trigger.patterns) {
          try {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(normalizedInput)) {
              triggerScore = 1;
              break;
            }
          } catch {
            // 忽略无效正则
          }
        }
      }

      if (triggerScore > 0) {
        matchedTriggers.push(trigger);
        totalScore += triggerScore * trigger.weight;
      }

      totalWeight += trigger.weight;
    }

    return {
      score: totalWeight > 0 ? totalScore / totalWeight : 0,
      matchedTriggers,
    };
  }

  /**
   * 检查是否触发陷阱
   */
  private checkTraps(input: string, traps: Trap[]): Trap[] {
    const normalizedInput = input.toLowerCase().trim();
    const triggered: Trap[] = [];

    for (const trap of traps) {
      for (const keyword of trap.keywords) {
        if (normalizedInput.includes(keyword.toLowerCase())) {
          triggered.push(trap);
          break;
        }
      }
    }

    return triggered;
  }

  /**
   * 使用 AI 增强意图识别
   * 当基于规则的识别不确定时，调用 AI 进行语义理解
   */
  async recognizeWithAI(
    input: string,
    templates: PracticeTemplate[],
    aiService: (prompt: string) => Promise<string>
  ): Promise<RecognitionResult | null> {
    // 先进行规则匹配
    const ruleBasedResult = await this.recognize(input, templates, {
      minScore: 0.5,
      enableTrapDetection: false,
    });

    // 如果规则匹配置信度高，直接返回
    if (ruleBasedResult && ruleBasedResult.score >= 0.7) {
      return ruleBasedResult;
    }

    // 使用 AI 进行语义匹配
    const templateSummaries = templates.map(t => ({
      id: t.id,
      name: t.name,
      subject: t.subject,
      description: t.techniques.map(tech => tech.description).join('; '),
    }));

    const prompt = `请分析以下用户输入，匹配最合适的练习模板。

【用户输入】：
${input}

【可用模板】：
${templateSummaries.map(t => `- ${t.id}: ${t.name} (${t.subject}): ${t.description}`).join('\n')}

请返回 JSON 格式：
{
  "templateId": "最匹配的模板ID",
  "confidence": 0.0-1.0,
  "reason": "匹配理由"
}`;

    try {
      const response = await aiService(prompt);
      const aiResult = JSON.parse(response);

      if (aiResult.confidence < 0.3) {
        return null;
      }

      const matchedTemplate = templates.find(t => t.id === aiResult.templateId);
      if (!matchedTemplate) {
        return null;
      }

      return {
        template: matchedTemplate,
        score: aiResult.confidence,
        matchedTriggers: [], // AI 匹配时没有具体的触发器
      };
    } catch {
      // AI 调用失败，回退到规则匹配
      return ruleBasedResult;
    }
  }
}
