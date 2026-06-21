import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemoryService } from './memory.service';
import {
  CharacterGenerateResponse,
  EventGenerateResponse,
  ChoiceProcessResponse,
  VoteProcessResponse,
  EndingGenerateResponse,
  NarrationResponse,
  PromptTemplate,
  MemoryType,
} from './ai.interfaces';
import { GameState } from '../../common/interfaces/game-state.interface';
import {
  AIRoleGenerateRequest,
  AIRoleGenerateResponse,
  AIEventGenerateRequest,
  AIEventGenerateResponse,
  AIEndingGenerateRequest,
  AIEndingGenerateResponse,
} from '../../common/interfaces/ai-response.interface';
import { getSystemPrompt } from './prompts/system-prompt';
import { getCharacterPrompt } from './prompts/character-prompt';
import { getEventPrompt } from './prompts/event-prompt';
import { getEndingPrompt } from './prompts/ending-prompt';

/**
 * AI 服务
 * 集成 DeepSeek API，提供角色生成、事件生成、选择处理、投票处理、结局生成、旁白生成等功能
 * 使用 Prompt 模板构建请求，支持记忆系统集成
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly timeout: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly memoryService: MemoryService,
  ) {
    this.apiKey = this.configService.get<string>('ai.apiKey', '');
    this.baseUrl = this.configService.get<string>(
      'ai.baseUrl',
      'https://api.deepseek.com',
    );
    this.model = this.configService.get<string>('ai.model', 'deepseek-chat');
    this.maxTokens = this.configService.get<number>('ai.maxTokens', 2000);
    this.temperature = this.configService.get<number>('ai.temperature', 0.8);
    this.timeout = this.configService.get<number>('ai.timeout', 30000);
  }

  // ==================== 核心功能方法 ====================

  /**
   * 生成角色
   * 根据游戏主题生成4个角色（身份+秘密+目标+技能）
   * @param theme 游戏主题
   * @returns 角色生成响应
   */
  async generateCharacters(
    theme: string,
  ): Promise<CharacterGenerateResponse> {
    try {
      const systemPrompt = getSystemPrompt(theme);
      const userPrompt = getCharacterPrompt(theme, 4, '由玩家自行填写');

      const result = await this.callDeepSeek(systemPrompt, userPrompt);
      const parsed = this.parseJSONResponse(result);

      if (parsed && parsed.characters && Array.isArray(parsed.characters)) {
        // 记录到记忆系统
        for (const character of parsed.characters) {
          await this.memoryService.addMemory(
            'character_gen',
            MemoryType.EVENT,
            `角色生成：${character.name}（${character.identity}），性格：${character.personality}`,
            0,
            undefined,
            3,
          );
        }

        return { success: true, characters: parsed.characters };
      }

      // AI 返回格式不正确，使用备用方案
      return this.getFallbackCharacters(theme);
    } catch (error) {
      this.logger.error(`生成角色失败: ${error.message}`);
      return this.getFallbackCharacters(theme);
    }
  }

  /**
   * 生成事件
   * 根据当前游戏状态和玩家行为生成剧情事件
   * @param gameState 当前游戏状态
   * @param playerActions 玩家行为描述
   * @returns 事件生成响应
   */
  async generateEvent(
    gameState: GameState,
    playerActions: string,
  ): Promise<EventGenerateResponse> {
    try {
      // 获取 AI 上下文（含记忆）
      const context = await this.memoryService.getContextForAI(
        gameState.gameId,
        gameState,
      );

      // 构建角色信息字符串
      const charactersInfo = gameState.players
        .map(
          (p) =>
            `- ${p.role?.name || p.nickname}（${p.role?.personality || '未知'}），分数：${p.score}`,
        )
        .join('\n');

      // 构建记忆上下文字符串
      const memoryContext = this.buildMemoryContext(context);

      const systemPrompt = getSystemPrompt(gameState.theme);
      const userPrompt = getEventPrompt({
        theme: gameState.theme,
        currentRound: gameState.currentRound,
        totalRounds: gameState.totalRounds,
        phase: gameState.phase,
        charactersInfo,
        memoryContext,
        playerActions,
      });

      const result = await this.callDeepSeek(systemPrompt, userPrompt, 2500);
      const parsed = this.parseJSONResponse(result);

      if (parsed && parsed.title && parsed.options) {
        // 补充 eventId
        parsed.eventId = parsed.eventId || `evt_${gameState.currentRound}_${Date.now()}`;

        // 记录到记忆系统
        await this.memoryService.addMemory(
          gameState.gameId,
          MemoryType.EVENT,
          `事件：${parsed.title} - ${parsed.description}`,
          gameState.currentRound,
          parsed.relatedPlayers,
          3,
        );

        return { success: true, event: parsed };
      }

      // AI 返回格式不正确，使用备用事件
      return this.getFallbackEvent(gameState);
    } catch (error) {
      this.logger.error(`生成事件失败: ${error.message}`);
      return this.getFallbackEvent(gameState);
    }
  }

  /**
   * 处理玩家选择
   * 根据玩家的选择生成分支叙述和状态变更
   * @param gameState 当前游戏状态
   * @param eventId 事件ID
   * @param choice 选择内容描述
   * @returns 选择处理响应
   */
  async processChoice(
    gameState: GameState,
    eventId: string,
    choice: string,
  ): Promise<ChoiceProcessResponse> {
    try {
      const systemPrompt = getSystemPrompt(gameState.theme);
      const userPrompt = `当前事件ID：${eventId}
玩家选择了：${choice}

请根据玩家的选择，生成以下内容：

输出JSON格式：
{
  "narrative": "选择后的叙述文本（100字以内，生动有趣）",
  "stateChanges": [
    {
      "playerId": "受影响的玩家ID",
      "type": "score",
      "value": 10,
      "description": "分数变化描述"
    }
  ],
  "triggerNextEvent": false
}`;

      const result = await this.callDeepSeek(systemPrompt, userPrompt, 1000);
      const parsed = this.parseJSONResponse(result);

      if (parsed && parsed.narrative) {
        // 记录到记忆系统
        await this.memoryService.addMemory(
          gameState.gameId,
          MemoryType.CHOICE,
          `选择：${choice} -> ${parsed.narrative}`,
          gameState.currentRound,
          undefined,
          2,
        );

        return {
          success: true,
          narrative: parsed.narrative,
          stateChanges: parsed.stateChanges || [],
          triggerNextEvent: parsed.triggerNextEvent || false,
        };
      }

      // 使用备用叙述
      return {
        success: true,
        narrative: `玩家做出了选择：${choice}。这个选择将会影响后续的剧情发展。`,
        stateChanges: [],
        triggerNextEvent: false,
      };
    } catch (error) {
      this.logger.error(`处理选择失败: ${error.message}`);
      return {
        success: true,
        narrative: `玩家做出了选择：${choice}。这个选择将会影响后续的剧情发展。`,
        stateChanges: [],
        triggerNextEvent: false,
      };
    }
  }

  /**
   * 处理投票结果
   * 根据投票结果生成叙述和影响
   * @param gameState 当前游戏状态
   * @param votes 投票数据（格式：voterId -> targetId）
   * @returns 投票处理响应
   */
  async processVote(
    gameState: GameState,
    votes: Map<string, string>,
  ): Promise<VoteProcessResponse> {
    try {
      // 构建投票描述
      const voteDescriptions: string[] = [];
      for (const [voterId, targetId] of votes.entries()) {
        const voter = gameState.players.find((p) => p.id === voterId);
        const target = gameState.players.find((p) => p.id === targetId);
        voteDescriptions.push(
          `${voter?.nickname || voterId} 投票给了 ${target?.nickname || targetId}`,
        );
      }

      const systemPrompt = getSystemPrompt(gameState.theme);
      const userPrompt = `投票结果：
${voteDescriptions.join('\n')}

请根据投票结果，生成以下内容：

输出JSON格式：
{
  "narrative": "投票结果叙述（100字以内，戏剧性描述）",
  "affectedPlayerId": "受影响最大的玩家ID",
  "effect": "影响描述"
}`;

      const result = await this.callDeepSeek(systemPrompt, userPrompt, 1000);
      const parsed = this.parseJSONResponse(result);

      if (parsed && parsed.narrative) {
        // 记录到记忆系统
        await this.memoryService.addMemory(
          gameState.gameId,
          MemoryType.VOTE,
          `投票结果：${voteDescriptions.join('；')} -> ${parsed.narrative}`,
          gameState.currentRound,
          undefined,
          3,
        );

        return {
          success: true,
          narrative: parsed.narrative,
          affectedPlayerId: parsed.affectedPlayerId,
          effect: parsed.effect,
        };
      }

      // 使用备用叙述
      return {
        success: true,
        narrative: `投票结束。${voteDescriptions.join('，')}。结果将会影响接下来的剧情。`,
      };
    } catch (error) {
      this.logger.error(`处理投票失败: ${error.message}`);
      return {
        success: true,
        narrative: '投票结束。结果将会影响接下来的剧情。',
      };
    }
  }

  /**
   * 生成结局
   * 根据整个游戏过程生成结局、角色结局和花絮
   * @param gameState 当前游戏状态
   * @returns 结局生成响应
   */
  async generateEnding(gameState: GameState): Promise<EndingGenerateResponse> {
    try {
      // 获取完整的 AI 上下文
      const context = await this.memoryService.getContextForAI(
        gameState.gameId,
        gameState,
      );

      // 构建角色信息
      const charactersInfo = gameState.players
        .map(
          (p) =>
            `- ${p.role?.name || p.nickname}：${p.role?.personality || '未知'}，秘密：${p.role?.secret || '无'}，分数：${p.score}`,
        )
        .join('\n');

      // 构建得分信息
      const scoresInfo = gameState.players
        .map((p) => `${p.nickname}: ${p.score}分`)
        .join('\n');

      // 构建游戏摘要
      const gameSummary = context.compressedHistory;

      // 构建投票结果
      const voteResults = this.buildVoteResultsSummary(gameState);

      // 构建关键事件
      const keyEvents = this.buildKeyEventsSummary(gameState);

      // 计算游戏时长
      const duration = gameState.endedAt && gameState.startedAt
        ? Math.round((gameState.endedAt - gameState.startedAt) / 60000)
        : 0;

      const systemPrompt = getSystemPrompt(gameState.theme);
      const userPrompt = getEndingPrompt({
        theme: gameState.theme,
        totalRounds: gameState.totalRounds,
        duration,
        charactersInfo,
        scoresInfo,
        gameSummary,
        voteResults,
        keyEvents,
      });

      const result = await this.callDeepSeek(systemPrompt, userPrompt, 3000);
      const parsed = this.parseJSONResponse(result);

      if (parsed && parsed.endingText && parsed.endingType) {
        return {
          success: true,
          title: parsed.title || '游戏结束',
          endingText: parsed.endingText,
          endingType: parsed.endingType,
          characterEndings: parsed.characterEndings || [],
          anecdotes: parsed.anecdotes || [],
          overallRating: parsed.overallRating || 4.0,
        };
      }

      // 使用备用结局
      return this.getFallbackEnding(gameState);
    } catch (error) {
      this.logger.error(`生成结局失败: ${error.message}`);
      return this.getFallbackEnding(gameState);
    }
  }

  /**
   * 生成旁白
   * 为指定事件生成旁白文本
   * @param gameState 当前游戏状态
   * @param event 事件描述
   * @returns 旁白生成响应
   */
  async generateNarration(
    gameState: GameState,
    event: string,
  ): Promise<NarrationResponse> {
    try {
      const systemPrompt = getSystemPrompt(gameState.theme);
      const userPrompt = `请为以下事件生成一段旁白（50-100字）：

事件：${event}
当前回合：${gameState.currentRound}

要求：
- 语气生动有趣，有代入感
- 适当使用感叹号和省略号营造氛围
- 可以加入一些幽默元素

输出JSON格式：
{
  "narration": "旁白文本",
  "style": "dramatic 或 humorous 或 mysterious 或 warm",
  "estimatedDuration": 5
}`;

      const result = await this.callDeepSeek(systemPrompt, userPrompt, 500);
      const parsed = this.parseJSONResponse(result);

      if (parsed && parsed.narration) {
        return {
          success: true,
          narration: parsed.narration,
          style: parsed.style || 'dramatic',
          estimatedDuration: parsed.estimatedDuration || 5,
        };
      }

      // 使用备用旁白
      return {
        success: true,
        narration: `第${gameState.currentRound}回合，${event}。故事正在展开...`,
        style: 'dramatic',
        estimatedDuration: 3,
      };
    } catch (error) {
      this.logger.error(`生成旁白失败: ${error.message}`);
      return {
        success: true,
        narration: `第${gameState.currentRound}回合，${event}。故事正在展开...`,
        style: 'dramatic',
        estimatedDuration: 3,
      };
    }
  }

  // ==================== Prompt 构建方法 ====================

  /**
   * 构建 Prompt
   * 使用模板字符串替换变量，生成完整的 Prompt
   * @param template Prompt 模板
   * @param variables 变量键值对
   * @returns 填充后的 Prompt 字符串
   */
  buildPrompt(template: PromptTemplate, variables: Record<string, string>): string {
    let result = template.template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  }

  // ==================== DeepSeek API 调用 ====================

  /**
   * 调用 DeepSeek API
   * 使用原生 fetch 发送请求到 DeepSeek Chat API
   * @param systemPrompt 系统提示词
   * @param userPrompt 用户提示词
   * @param maxTokens 最大 token 数（可选，覆盖默认值）
   * @returns API 返回的文本内容
   */
  async callDeepSeek(
    systemPrompt: string,
    userPrompt: string,
    maxTokens?: number,
  ): Promise<string> {
    // 检查 API Key 是否配置
    if (!this.apiKey) {
      this.logger.warn('DeepSeek API Key 未配置，使用备用方案');
      throw new Error('API Key 未配置');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: this.temperature,
            max_tokens: maxTokens || this.maxTokens,
            response_format: { type: 'json_object' },
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `DeepSeek API 请求失败 (${response.status}): ${errorText}`,
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('DeepSeek API 返回内容为空');
      }

      this.logger.debug(
        `DeepSeek API 调用成功，token 使用: ${data.usage?.total_tokens || '未知'}`,
      );

      return content;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        this.logger.error('DeepSeek API 请求超时');
        throw new Error('API 请求超时');
      }

      throw error;
    }
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 解析 AI 返回的 JSON
   * 处理可能的 markdown 代码块包裹等情况
   * @param text AI 返回的原始文本
   * @returns 解析后的对象，失败返回 null
   */
  private parseJSONResponse(text: string): any {
    // 尝试直接解析
    try {
      return JSON.parse(text);
    } catch {
      // 尝试提取 JSON 代码块
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch {
          // 继续尝试其他方式
        }
      }

      // 尝试提取花括号内容
      const braceMatch = text.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        try {
          return JSON.parse(braceMatch[0]);
        } catch {
          // 最终失败
        }
      }

      this.logger.warn(
        `无法解析 AI 响应为 JSON: ${text.substring(0, 200)}`,
      );
      return null;
    }
  }

  /**
   * 构建记忆上下文字符串
   * @param context AI 上下文
   * @returns 格式化的记忆文本
   */
  private buildMemoryContext(context: any): string {
    const parts: string[] = [];

    // 添加压缩后的历史记忆
    if (context.compressedHistory && context.compressedHistory !== '暂无历史记忆。') {
      parts.push(`历史记忆摘要：\n${context.compressedHistory}`);
    }

    // 添加最近的未压缩记忆（最多10条）
    if (context.recentMemories && context.recentMemories.length > 0) {
      const recentItems = context.recentMemories
        .slice(-10)
        .map(
          (m: any) =>
            `[第${m.round}回合|${m.type}] ${m.content}`,
        )
        .join('\n');
      parts.push(`最近事件：\n${recentItems}`);
    }

    return parts.join('\n\n') || '暂无历史记忆。';
  }

  /**
   * 构建投票结果摘要
   */
  private buildVoteResultsSummary(gameState: GameState): string {
    const results: string[] = [];
    for (const round of gameState.roundHistory) {
      if (round.playerVotes && round.playerVotes.size > 0) {
        const voteEntries =
          round.playerVotes instanceof Map
            ? Array.from(round.playerVotes.entries())
            : Object.entries(round.playerVotes);
        const voteStr = voteEntries
          .map(([voterId, targetId]) => {
            const voter = gameState.players.find((p) => p.id === voterId);
            const target = gameState.players.find((p) => p.id === targetId);
            return `${voter?.nickname || voterId} -> ${target?.nickname || targetId}`;
          })
          .join('；');
        results.push(`第${round.round}回合：${voteStr}`);
      }
    }
    return results.join('\n') || '无投票记录';
  }

  /**
   * 构建关键事件摘要
   */
  private buildKeyEventsSummary(gameState: GameState): string {
    const events: string[] = [];
    for (const round of gameState.roundHistory) {
      if (round.currentEvent) {
        events.push(
          `第${round.round}回合：${round.currentEvent.title}（${round.currentEvent.type}）`,
        );
      }
    }
    return events.join('\n') || '无关键事件记录';
  }

  // ==================== 备用方案 ====================

  /**
   * 备用角色生成
   * 当 AI 调用失败时使用预设角色
   */
  private getFallbackCharacters(theme: string): CharacterGenerateResponse {
    const fallbackCharacters = [
      {
        name: '学霸小陈',
        identity: '学霸',
        description: '成绩优异的学霸室友',
        secret: '其实偷偷在写小说',
        personality: '认真、内向',
        avatar: 'student',
        goal: {
          description: '保住年级第一',
          priority: 4,
          isSecret: false,
        },
        skill: {
          skillId: 'skill_study',
          name: '学霸光环',
          description: '利用学霸身份获取信息',
          effect: '可以查看某位玩家的选择',
          maxUses: 2,
        },
        affinity: 50,
      },
      {
        name: '社交达人小王',
        identity: '社团社长',
        description: '人脉广泛的社交达人',
        secret: '其实社恐，全靠演技',
        personality: '外向、热情',
        avatar: 'social',
        goal: {
          description: '组织一次完美的宿舍聚会',
          priority: 3,
          isSecret: true,
        },
        skill: {
          skillId: 'skill_social',
          name: '人脉网络',
          description: '利用社交关系获取情报',
          effect: '可以获取一条关于其他玩家的秘密线索',
          maxUses: 1,
        },
        affinity: 50,
      },
      {
        name: '游戏宅小李',
        identity: '游戏主播',
        description: '热爱游戏的宅男室友',
        secret: '其实已经拿到了大厂offer',
        personality: '随性、幽默',
        avatar: 'gamer',
        goal: {
          description: '在游戏中找到志同道合的朋友',
          priority: 2,
          isSecret: false,
        },
        skill: {
          skillId: 'skill_game',
          name: '游戏直觉',
          description: '凭借游戏经验做出判断',
          effect: '可以预览事件的选项效果',
          maxUses: 2,
        },
        affinity: 50,
      },
      {
        name: '文艺青年小赵',
        identity: '艺术系学生',
        description: '多才多艺的文艺青年',
        secret: '正在准备出国留学',
        personality: '敏感、浪漫',
        avatar: 'artist',
        goal: {
          description: '完成毕业作品集',
          priority: 5,
          isSecret: true,
        },
        skill: {
          skillId: 'skill_art',
          name: '艺术洞察',
          description: '通过观察发现隐藏的线索',
          effect: '可以揭示一个角色的部分秘密',
          maxUses: 1,
        },
        affinity: 50,
      },
    ];

    return {
      success: true,
      characters: fallbackCharacters,
    };
  }

  /**
   * 备用事件生成
   * 当 AI 调用失败时使用预设事件
   */
  private getFallbackEvent(gameState: GameState): EventGenerateResponse {
    const fallbackEvents = [
      {
        eventId: `evt_fallback_${Date.now()}`,
        title: '宿舍日常',
        description: '今天宿舍里发生了一件小事，大家需要做出选择。',
        type: 'plot' as const,
        options: [
          {
            index: 0,
            text: '积极参与',
            effect: '你选择了积极参与宿舍活动',
            scoreChange: 10,
          },
          {
            index: 1,
            text: '保持观望',
            effect: '你选择了在一旁观察',
            scoreChange: 5,
          },
          {
            index: 2,
            text: '悄悄离开',
            effect: '你选择了回避这件事',
            scoreChange: 0,
          },
        ],
        weight: 1,
        tags: ['日常', '社交'],
      },
      {
        eventId: `evt_fallback_${Date.now()}`,
        title: '意外发现',
        description: '有人在宿舍里发现了一个神秘的箱子，上面写着"请勿打开"。',
        type: 'conflict' as const,
        options: [
          {
            index: 0,
            text: '打开看看',
            effect: '好奇心驱使你打开了箱子',
            scoreChange: 8,
          },
          {
            index: 1,
            text: '召集大家商量',
            effect: '你决定和大家一起决定',
            scoreChange: 10,
          },
          {
            index: 2,
            text: '假装没看到',
            effect: '你选择了忽略这个箱子',
            scoreChange: 3,
          },
        ],
        weight: 1,
        tags: ['悬疑', '冲突'],
      },
    ];

    // 根据回合数选择不同的事件
    const eventIndex = gameState.currentRound % fallbackEvents.length;
    return {
      success: true,
      event: fallbackEvents[eventIndex],
    };
  }

  /**
   * 备用结局生成
   * 当 AI 调用失败时使用预设结局
   */
  private getFallbackEnding(gameState: GameState): EndingGenerateResponse {
    const sortedPlayers = [...gameState.players].sort(
      (a, b) => b.score - a.score,
    );

    return {
      success: true,
      title: '宿舍故事落幕',
      endingText: `在这个主题为"${gameState.theme}"的故事中，经过${gameState.currentRound}回合的互动，大家都有了不同的经历和收获。虽然有些小摩擦，但最终宿舍的友谊更加深厚了。感谢每一位玩家的参与！`,
      endingType: 'happy',
      characterEndings: sortedPlayers.map((p, index) => ({
        characterName: p.role?.name || p.nickname,
        characterId: p.id,
        ending: `${p.nickname}在这次宿舍经历中获得了${p.score}分，${index === 0 ? '表现最为出色！' : '也有自己的收获。'}`,
        score: Math.min(100, Math.max(30, 50 + p.score)),
        tags: index === 0 ? ['赢家', '表现出色'] : ['参与者'],
      })),
      anecdotes: [
        {
          description: '整个游戏过程中，大家的选择都很有趣，展现了不同的性格。',
          relatedCharacters: sortedPlayers.map((p) => p.nickname),
          type: 'funny',
        },
      ],
      overallRating: 4.0,
    };
  }

  // ==================== GameService 适配方法 ====================

  /**
   * 生成角色（GameService 调用接口）
   * 根据请求参数生成角色列表
   */
  async generateRoles(
    request: AIRoleGenerateRequest,
  ): Promise<AIRoleGenerateResponse> {
    try {
      const nicknamesStr = request.nicknames.join('、');
      const systemPrompt = getSystemPrompt(request.theme);
      const userPrompt = getCharacterPrompt(
        request.theme,
        request.playerCount,
        nicknamesStr,
      );

      const result = await this.callDeepSeek(systemPrompt, userPrompt);
      const parsed = this.parseJSONResponse(result);

      if (parsed && parsed.characters && Array.isArray(parsed.characters)) {
        const roles = parsed.characters.map(
          (c: any): AIRoleGenerateResponse['roles'][0] => ({
            name: c.name || '未命名',
            description: c.description || '',
            secret: c.secret || '',
            personality: c.personality || '普通',
            avatar: c.avatar || 'default',
          }),
        );

        return { success: true, roles };
      }

      // AI 失败，使用备用角色
      return this.getFallbackRoles(request.playerCount);
    } catch (error) {
      this.logger.error(`generateRoles 失败: ${error.message}`);
      return this.getFallbackRoles(request.playerCount);
    }
  }

  /**
   * 生成事件（GameService 调用接口）
   */
  async generateEventFromRequest(
    request: AIEventGenerateRequest,
  ): Promise<AIEventGenerateResponse> {
    try {
      const systemPrompt = getSystemPrompt(request.theme);
      const rolesInfo = request.roles
        .map((r) => `- ${r.name}（${r.personality}）`)
        .join('\n');
      const memoryContext = request.previousSummary || '暂无历史记忆。';
      const playerActions = request.chatKeywords
        ? `关键词：${request.chatKeywords.join('、')}`
        : '无特殊行为';

      const userPrompt = getEventPrompt({
        theme: request.theme,
        currentRound: request.round,
        totalRounds: request.totalRounds,
        phase: 'free_chat',
        charactersInfo: rolesInfo,
        memoryContext,
        playerActions,
      });

      const result = await this.callDeepSeek(systemPrompt, userPrompt, 2500);
      const parsed = this.parseJSONResponse(result);

      if (parsed && parsed.title && parsed.options) {
        return {
          success: true,
          event: {
            title: parsed.title,
            description: parsed.description || '',
            type: parsed.type || 'plot',
            choices: (parsed.options || []).map((c: any, i: number) => ({
              text: c.text || `选项${i + 1}`,
              effect: c.effect || '',
            })),
            relatedPlayers: parsed.relatedPlayers,
          },
        };
      }

      return {
        success: false,
        error: 'AI 返回格式不正确',
      };
    } catch (error) {
      this.logger.error(`generateEventFromRequest 失败: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 生成结局（GameService 调用接口）
   */
  async generateEndingFromRequest(
    request: AIEndingGenerateRequest,
  ): Promise<AIEndingGenerateResponse> {
    try {
      const systemPrompt = getSystemPrompt(request.theme);
      const charactersInfo = request.roles
        .map(
          (r) =>
            `- ${r.name}：${r.personality}，秘密：${r.secret}`,
        )
        .join('\n');
      const scoresInfo = request.scores
        .map((s) => `${s.nickname}: ${s.score}分`)
        .join('\n');
      const voteResults = request.voteResults
        .map((v) => `${v.voter} -> ${v.target}`)
        .join('；') || '无投票记录';

      const userPrompt = getEndingPrompt({
        theme: request.theme,
        totalRounds: 5,
        duration: 0,
        charactersInfo,
        scoresInfo,
        gameSummary: request.gameSummary,
        voteResults,
        keyEvents: '',
      });

      const result = await this.callDeepSeek(systemPrompt, userPrompt, 3000);
      const parsed = this.parseJSONResponse(result);

      if (parsed && parsed.endingText && parsed.endingType) {
        return {
          success: true,
          endingText: parsed.endingText,
          endingType: parsed.endingType,
          roleEndings: parsed.characterEndings
            ? parsed.characterEndings.map((ce: any) => ({
                name: ce.characterName || ce.name,
                ending: ce.ending,
              }))
            : [],
        };
      }

      return {
        success: false,
        error: 'AI 返回格式不正确',
      };
    } catch (error) {
      this.logger.error(`generateEndingFromRequest 失败: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 备用角色生成（简化版）
   */
  private getFallbackRoles(
    playerCount: number,
  ): AIRoleGenerateResponse {
    const fallbackNames = [
      { name: '学霸小陈', personality: '认真、内向', secret: '偷偷在写小说', description: '成绩优异的学霸室友', avatar: 'student' },
      { name: '社交达人小王', personality: '外向、热情', secret: '其实社恐全靠演技', description: '人脉广泛的社交达人', avatar: 'social' },
      { name: '游戏宅小李', personality: '随性、幽默', secret: '已拿到大厂offer', description: '热爱游戏的宅男室友', avatar: 'gamer' },
      { name: '文艺青年小赵', personality: '敏感、浪漫', secret: '正在准备出国留学', description: '多才多艺的文艺青年', avatar: 'artist' },
    ];

    const roles = fallbackNames.slice(0, playerCount).map((c) => ({
      name: c.name,
      description: c.description,
      secret: c.secret,
      personality: c.personality,
      avatar: c.avatar,
    }));

    return { success: true, roles };
  }
}
