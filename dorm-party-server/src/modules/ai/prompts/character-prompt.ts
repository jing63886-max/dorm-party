import { PromptTemplate } from '../ai.interfaces';

/**
 * 角色生成 Prompt 模板
 * 用于 AI 生成游戏角色的提示词
 */

/** 角色生成提示词模板 */
export const CHARACTER_PROMPT: PromptTemplate = {
  name: 'character_prompt',
  description: '角色生成提示词，用于生成4个具有独特身份、秘密、目标和技能的角色',
  template: `# 任务
根据游戏主题"{{theme}}"，为{{playerCount}}名玩家生成{{playerCount}}个独特的角色。

# 玩家信息
玩家昵称：{{nicknames}}

# 角色生成规则

## 身份设计规则
- 每个角色有独特的身份/职业（如：学霸、体育特长生、社团社长、游戏宅等）
- 身份应与大学宿舍生活相关
- 身份之间要有差异性和互补性
- 避免刻板印象，角色要有反差萌

## 秘密设计规则
- 每个角色有一个不为人知的秘密
- 秘密应该能影响游戏剧情走向
- 秘密之间可以有关联，形成秘密网络
- 秘密不能过于极端，但要有趣
- 秘密示例：偷偷打工攒钱、其实已经毕业了在复读、在宿舍养了宠物等

## 目标设计规则
- 每个角色有一个主要目标（公开或秘密）
- 目标应该与其他角色的目标有潜在冲突
- 目标分为公开目标和秘密目标
- 目标优先级1-5，5为最高

## 技能设计规则
- 每个角色有一个独特技能
- 技能在游戏中可以使用，影响剧情走向
- 技能使用次数有限（1-3次）
- 技能效果要明确，不能模糊
- 技能示例：人脉广泛（可以获取额外信息）、学霸光环（可以查看某人的选择）等

# 输出格式
请严格按照以下JSON格式输出：
{
  "characters": [
    {
      "name": "角色名称",
      "identity": "角色身份/职业",
      "description": "角色简短描述（20字以内）",
      "secret": "角色秘密（30字以内，仅自己可见）",
      "personality": "性格特征（15字以内）",
      "avatar": "头像标识（emoji或简单描述）",
      "goal": {
        "description": "目标描述",
        "priority": 3,
        "isSecret": false
      },
      "skill": {
        "skillId": "skill_1",
        "name": "技能名称",
        "description": "技能描述",
        "effect": "技能效果",
        "maxUses": 2
      },
      "affinity": 50
    }
  ]
}`,
  variables: ['theme', 'playerCount', 'nicknames'],
};

/** 获取填充后的角色生成提示词 */
export function getCharacterPrompt(
  theme: string,
  playerCount: number,
  nicknames: string,
): string {
  return CHARACTER_PROMPT.template
    .replace('{{theme}}', theme)
    .replace('{{playerCount}}', String(playerCount))
    .replace('{{nicknames}}', nicknames);
}
