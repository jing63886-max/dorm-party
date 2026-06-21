import { PromptTemplate } from '../ai.interfaces';

/**
 * 事件生成 Prompt 模板
 * 用于 AI 根据游戏状态和玩家行为生成剧情事件
 */

/** 事件生成提示词模板 */
export const EVENT_PROMPT: PromptTemplate = {
  name: 'event_prompt',
  description: '事件生成提示词，根据当前游戏状态和玩家行为生成剧情事件',
  template: `# 任务
根据当前游戏状态和玩家行为，生成一个有趣的剧情事件。

# 当前游戏状态
- 游戏主题：{{theme}}
- 当前回合：{{currentRound}} / {{totalRounds}}
- 游戏阶段：{{phase}}

# 角色信息
{{charactersInfo}}

# 历史记忆
{{memoryContext}}

# 玩家行为分析
{{playerActions}}

# 事件类型选择
根据当前情况选择最合适的事件类型：
- **plot（剧情推进）**：推动主线剧情发展
- **conflict（冲突事件）**：引发角色间的矛盾
- **cooperation（合作事件）**：需要玩家合作解决
- **vote_trigger（投票触发）**：引发投票环节
- **skill_trigger（技能触发）**：触发角色技能使用

选择原则：
- 前期多使用 plot 和 cooperation，建立角色关系
- 中期增加 conflict，制造紧张感
- 后期使用 vote_trigger，推向高潮
- skill_trigger 在关键时刻使用

# 选项设计规则
- 提供2-4个选项
- 每个选项有明显不同的后果
- 选项之间不要有明显的"正确答案"
- 选项文本要生动有趣
- 每个选项附带效果描述

# 状态变更规则
- 选择可以影响分数（-10 到 +15）
- 选择可以影响角色好感度
- 选择可能触发后续事件
- 投票结果可能导致角色淘汰或特殊事件

# 输出格式
请严格按照以下JSON格式输出：
{
  "eventId": "evt_{{currentRound}}_{{timestamp}}",
  "title": "事件标题（10字以内）",
  "description": "事件描述（100字以内，生动有趣，包含场景描写）",
  "type": "plot 或 conflict 或 cooperation 或 vote_trigger 或 skill_trigger",
  "options": [
    {
      "index": 0,
      "text": "选项A的描述",
      "effect": "选择后的效果描述",
      "scoreChange": 10,
      "targetRoleId": "受影响的角色ID（可选）"
    },
    {
      "index": 1,
      "text": "选项B的描述",
      "effect": "选择后的效果描述",
      "scoreChange": 5
    }
  ],
  "relatedPlayers": ["关联角色ID列表（可选）"],
  "weight": 1,
  "tags": ["事件标签，如：社交、冲突、秘密"]
}`,
  variables: [
    'theme',
    'currentRound',
    'totalRounds',
    'phase',
    'charactersInfo',
    'memoryContext',
    'playerActions',
    'timestamp',
  ],
};

/** 获取填充后的事件生成提示词 */
export function getEventPrompt(variables: {
  theme: string;
  currentRound: number;
  totalRounds: number;
  phase: string;
  charactersInfo: string;
  memoryContext: string;
  playerActions: string;
}): string {
  let prompt = EVENT_PROMPT.template;
  prompt = prompt.replace('{{theme}}', variables.theme);
  prompt = prompt.replace('{{currentRound}}', String(variables.currentRound));
  prompt = prompt.replace('{{totalRounds}}', String(variables.totalRounds));
  prompt = prompt.replace('{{phase}}', variables.phase);
  prompt = prompt.replace('{{charactersInfo}}', variables.charactersInfo);
  prompt = prompt.replace('{{memoryContext}}', variables.memoryContext);
  prompt = prompt.replace('{{playerActions}}', variables.playerActions);
  prompt = prompt.replace('{{timestamp}}', String(Date.now()));
  return prompt;
}
