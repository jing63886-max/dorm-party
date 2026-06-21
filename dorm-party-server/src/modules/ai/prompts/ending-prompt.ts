import { PromptTemplate } from '../ai.interfaces';

/**
 * 结局生成 Prompt 模板
 * 用于 AI 根据游戏全过程生成结局和花絮
 */

/** 结局生成提示词模板 */
export const ENDING_PROMPT: PromptTemplate = {
  name: 'ending_prompt',
  description: '结局生成提示词，根据游戏全过程生成精彩的结局、角色结局和花絮',
  template: `# 任务
根据游戏全过程，生成一个精彩的结局。

# 游戏总结
- 游戏主题：{{theme}}
- 总回合数：{{totalRounds}}
- 游戏时长：{{duration}}分钟

# 角色信息
{{charactersInfo}}

# 玩家得分
{{scoresInfo}}

# 游戏过程摘要
{{gameSummary}}

# 投票结果记录
{{voteResults}}

# 关键事件回顾
{{keyEvents}}

# 结局生成规则

## 整体结局
- 根据玩家的选择和投票结果决定结局走向
- 结局要出人意料但逻辑合理
- 结局文本200-300字，生动有趣
- 结局类型：
  - **happy（温馨结局）**：大家和解，友谊升华
  - **sad（悲伤结局）**：有人离开，遗憾收场
  - **surprise（惊喜结局）**：意想不到的真相揭晓
  - **chaos（混乱结局）**：全员混乱，笑料百出
  - **bittersweet（苦乐参半）**：有遗憾也有温暖

## 角色结局
- 为每个角色生成个人结局（50-80字）
- 结局要与角色的秘密和目标呼应
- 根据角色分数给出评分（1-100）
- 添加1-2个标签描述结局特征

## 评分规则
- 分数计算基于：选择一致性、社交活跃度、目标完成度
- 最高分100分，最低分0分
- 分数差距不要太大（最低不低于30分）

## 花絮生成
- 生成2-3个游戏中的有趣花絮
- 花絮类型：funny（搞笑）、dramatic（戏剧性）、romantic（浪漫）、suspenseful（悬疑）
- 花絮要基于游戏中实际发生的事件
- 花絮描述30-50字

# 输出格式
请严格按照以下JSON格式输出：
{
  "title": "结局标题（10字以内）",
  "endingText": "整体结局描述（200-300字）",
  "endingType": "happy 或 sad 或 surprise 或 chaos 或 bittersweet",
  "characterEndings": [
    {
      "characterName": "角色名称",
      "characterId": "角色ID",
      "ending": "该角色的个人结局（50-80字）",
      "score": 85,
      "tags": ["标签1", "标签2"]
    }
  ],
  "anecdotes": [
    {
      "description": "花絮描述（30-50字）",
      "relatedCharacters": ["角色名称1", "角色名称2"],
      "type": "funny"
    }
  ],
  "overallRating": 4.5
}`,
  variables: [
    'theme',
    'totalRounds',
    'duration',
    'charactersInfo',
    'scoresInfo',
    'gameSummary',
    'voteResults',
    'keyEvents',
  ],
};

/** 获取填充后的结局生成提示词 */
export function getEndingPrompt(variables: {
  theme: string;
  totalRounds: number;
  duration: number;
  charactersInfo: string;
  scoresInfo: string;
  gameSummary: string;
  voteResults: string;
  keyEvents: string;
}): string {
  let prompt = ENDING_PROMPT.template;
  prompt = prompt.replace('{{theme}}', variables.theme);
  prompt = prompt.replace('{{totalRounds}}', String(variables.totalRounds));
  prompt = prompt.replace('{{duration}}', String(variables.duration));
  prompt = prompt.replace('{{charactersInfo}}', variables.charactersInfo);
  prompt = prompt.replace('{{scoresInfo}}', variables.scoresInfo);
  prompt = prompt.replace('{{gameSummary}}', variables.gameSummary);
  prompt = prompt.replace('{{voteResults}}', variables.voteResults);
  prompt = prompt.replace('{{keyEvents}}', variables.keyEvents);
  return prompt;
}
