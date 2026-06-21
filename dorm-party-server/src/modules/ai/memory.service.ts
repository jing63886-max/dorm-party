import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import {
  MemoryItem,
  MemoryType,
  AIContext,
} from './ai.interfaces';
import { GameState, PlayerState } from '../../common/interfaces/game-state.interface';
import { v4 as uuidv4 } from 'uuid';

/** Redis 中记忆列表的键前缀 */
const MEMORY_KEY_PREFIX = 'ai:memory:';

/** Redis 中回合摘要的键前缀 */
const ROUND_SUMMARY_PREFIX = 'ai:round_summary:';

/** Redis 中压缩记忆的键前缀 */
const COMPRESSED_MEMORY_PREFIX = 'ai:compressed:';

/** 未压缩记忆的最大保留数量（超过此数量将触发压缩） */
const MAX_UNCOMPRESSED_MEMORIES = 50;

/** 压缩后保留的最近记忆数量 */
const RECENT_MEMORY_COUNT = 10;

/** 默认记忆权重 */
const DEFAULT_WEIGHTS: Record<MemoryType, number> = {
  [MemoryType.EVENT]: 3,
  [MemoryType.CHOICE]: 2,
  [MemoryType.VOTE]: 3,
  [MemoryType.CHAT]: 1,
  [MemoryType.SKILL]: 2,
  [MemoryType.ROUND_SUMMARY]: 4,
  [MemoryType.INTERACTION]: 2,
};

/**
 * 记忆管理服务
 * 管理游戏过程中的记忆存储、检索、压缩和上下文构建
 * 使用 Redis 存储记忆数据，支持高效检索和自动压缩
 */
@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(private readonly redisService: RedisService) {}

  // ==================== 记忆操作 ====================

  /**
   * 添加记忆
   * 将一条新记忆存入 Redis 列表
   * @param gameId 游戏ID
   * @param type 记忆类型
   * @param content 记忆内容
   * @param round 关联回合数
   * @param relatedPlayers 关联玩家ID列表（可选）
   * @param weight 记忆权重（可选，默认根据类型决定）
   */
  async addMemory(
    gameId: string,
    type: MemoryType,
    content: string,
    round: number,
    relatedPlayers?: string[],
    weight?: number,
  ): Promise<MemoryItem> {
    const memory: MemoryItem = {
      id: uuidv4(),
      gameId,
      type,
      content,
      round,
      relatedPlayers,
      createdAt: Date.now(),
      weight: weight ?? DEFAULT_WEIGHTS[type] ?? 1,
      compressed: false,
    };

    try {
      // 将记忆追加到 Redis 列表
      const key = `${MEMORY_KEY_PREFIX}${gameId}`;
      const existingMemories = await this.getMemories(gameId);
      existingMemories.push(memory);

      // 保存到 Redis，设置2小时过期
      await this.redisService.set(key, existingMemories, 7200);

      this.logger.debug(
        `记忆已添加: gameId=${gameId}, type=${type}, round=${round}`,
      );

      // 检查是否需要压缩
      if (existingMemories.length > MAX_UNCOMPRESSED_MEMORIES) {
        await this.compressMemories(gameId);
      }

      return memory;
    } catch (error) {
      this.logger.error(`添加记忆失败: ${error.message}`);
      return memory;
    }
  }

  /**
   * 获取记忆
   * 获取指定游戏的全部或指定类型的记忆列表
   * @param gameId 游戏ID
   * @param type 记忆类型（可选，不传则返回全部）
   * @returns 记忆列表
   */
  async getMemories(gameId: string, type?: MemoryType): Promise<MemoryItem[]> {
    try {
      const key = `${MEMORY_KEY_PREFIX}${gameId}`;
      const memories = await this.redisService.get<MemoryItem[]>(key);

      if (!memories) {
        return [];
      }

      // 如果指定了类型，进行过滤
      if (type) {
        return memories.filter((m) => m.type === type);
      }

      return memories;
    } catch (error) {
      this.logger.error(`获取记忆失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 压缩旧记忆
   * 将超过保留数量的旧记忆压缩为摘要文本
   * 保留最近 N 条记忆不压缩
   * @param gameId 游戏ID
   */
  async compressMemories(gameId: string): Promise<void> {
    try {
      const key = `${MEMORY_KEY_PREFIX}${gameId}`;
      const memories = await this.redisService.get<MemoryItem[]>(key);

      if (!memories || memories.length <= RECENT_MEMORY_COUNT) {
        return;
      }

      // 按时间排序
      memories.sort((a, b) => a.createdAt - b.createdAt);

      // 分离需要压缩的和保留的
      const toCompress = memories.slice(0, -RECENT_MEMORY_COUNT);
      const toKeep = memories.slice(-RECENT_MEMORY_COUNT);

      // 按回合分组压缩
      const roundGroups = new Map<number, MemoryItem[]>();
      for (const memory of toCompress) {
        const group = roundGroups.get(memory.round) || [];
        group.push(memory);
        roundGroups.set(memory.round, group);
      }

      // 生成压缩摘要
      const summaries: string[] = [];
      for (const [round, items] of roundGroups.entries()) {
        const eventMemories = items.filter((m) => m.type === MemoryType.EVENT);
        const choiceMemories = items.filter((m) => m.type === MemoryType.CHOICE);
        const voteMemories = items.filter((m) => m.type === MemoryType.VOTE);

        const parts: string[] = [`第${round}回合：`];

        if (eventMemories.length > 0) {
          parts.push(eventMemories.map((m) => m.content).join('；'));
        }
        if (choiceMemories.length > 0) {
          parts.push(`选择：${choiceMemories.map((m) => m.content).join('；')}`);
        }
        if (voteMemories.length > 0) {
          parts.push(`投票：${voteMemories.map((m) => m.content).join('；')}`);
        }

        summaries.push(parts.join(' '));
      }

      const compressedText = summaries.join('\n');

      // 保存压缩后的记忆
      const compressedKey = `${COMPRESSED_MEMORY_PREFIX}${gameId}`;
      const existingCompressed = await this.redisService.get<string>(compressedKey);
      const finalCompressed = existingCompressed
        ? `${existingCompressed}\n${compressedText}`
        : compressedText;

      await this.redisService.set(compressedKey, finalCompressed, 7200);

      // 标记被压缩的记忆
      for (const memory of toCompress) {
        memory.compressed = true;
      }

      // 更新 Redis 中的记忆列表（只保留未压缩的）
      await this.redisService.set(key, toKeep, 7200);

      this.logger.log(
        `记忆已压缩: gameId=${gameId}, 压缩了 ${toCompress.length} 条记忆，保留 ${toKeep.length} 条`,
      );
    } catch (error) {
      this.logger.error(`压缩记忆失败: ${error.message}`);
    }
  }

  /**
   * 获取回合摘要
   * 获取指定回合的记忆摘要
   * @param gameId 游戏ID
   * @param round 回合数
   * @returns 回合摘要文本
   */
  async getRoundSummary(gameId: string, round: number): Promise<string> {
    try {
      const memories = await this.getMemories(gameId);
      const roundMemories = memories.filter((m) => m.round === round);

      if (roundMemories.length === 0) {
        return `第${round}回合：无特殊事件记录。`;
      }

      const parts: string[] = [`第${round}回合摘要：`];

      // 按类型分组
      const events = roundMemories.filter((m) => m.type === MemoryType.EVENT);
      const choices = roundMemories.filter((m) => m.type === MemoryType.CHOICE);
      const votes = roundMemories.filter((m) => m.type === MemoryType.VOTE);
      const chats = roundMemories.filter((m) => m.type === MemoryType.CHAT);
      const skills = roundMemories.filter((m) => m.type === MemoryType.SKILL);

      if (events.length > 0) {
        parts.push(`事件：${events.map((m) => m.content).join('；')}`);
      }
      if (choices.length > 0) {
        parts.push(`选择：${choices.map((m) => m.content).join('；')}`);
      }
      if (votes.length > 0) {
        parts.push(`投票：${votes.map((m) => m.content).join('；')}`);
      }
      if (skills.length > 0) {
        parts.push(`技能：${skills.map((m) => m.content).join('；')}`);
      }
      if (chats.length > 0) {
        const chatSummary = chats
          .slice(-5) // 只取最近5条聊天
          .map((m) => m.content)
          .join('；');
        parts.push(`聊天要点：${chatSummary}`);
      }

      return parts.join('\n');
    } catch (error) {
      this.logger.error(`获取回合摘要失败: ${error.message}`);
      return `第${round}回合：数据获取失败。`;
    }
  }

  /**
   * 为 AI 构建上下文
   * 整合压缩记忆、最近记忆和当前玩家状态，构建完整的 AI 上下文
   * @param gameId 游戏ID
   * @param gameState 当前游戏状态（可选，不传则只返回记忆上下文）
   * @returns AI 上下文对象
   */
  async getContextForAI(
    gameId: string,
    gameState?: GameState,
  ): Promise<AIContext> {
    try {
      // 获取压缩后的历史记忆
      const compressedKey = `${COMPRESSED_MEMORY_PREFIX}${gameId}`;
      const compressedHistory =
        (await this.redisService.get<string>(compressedKey)) || '暂无历史记忆。';

      // 获取最近的未压缩记忆
      const recentMemories = await this.getMemories(gameId);

      // 构建玩家状态概要
      let playerSummary: AIContext['playerSummary'] = [];
      if (gameState) {
        playerSummary = gameState.players.map((p: PlayerState) => ({
          id: p.id,
          nickname: p.nickname,
          roleName: p.role?.name || '未分配',
          personality: p.role?.personality || '未知',
          score: p.score,
        }));
      }

      return {
        gameId,
        currentRound: gameState?.currentRound || 0,
        theme: gameState?.theme || '',
        compressedHistory,
        recentMemories,
        playerSummary,
      };
    } catch (error) {
      this.logger.error(`构建AI上下文失败: ${error.message}`);
      return {
        gameId,
        currentRound: 0,
        theme: '',
        compressedHistory: '上下文获取失败。',
        recentMemories: [],
        playerSummary: [],
      };
    }
  }

  /**
   * 保存回合摘要
   * 将回合摘要保存到 Redis
   * @param gameId 游戏ID
   * @param round 回合数
   * @param summary 摘要文本
   */
  async saveRoundSummary(
    gameId: string,
    round: number,
    summary: string,
  ): Promise<void> {
    try {
      const key = `${ROUND_SUMMARY_PREFIX}${gameId}`;
      const summaries = await this.redisService.get<
        Record<number, string>
      >(key);
      const updated = summaries || {};
      updated[round] = summary;

      await this.redisService.set(key, updated, 7200);
    } catch (error) {
      this.logger.error(`保存回合摘要失败: ${error.message}`);
    }
  }

  /**
   * 清除游戏的所有记忆数据
   * @param gameId 游戏ID
   */
  async clearMemories(gameId: string): Promise<void> {
    try {
      await this.redisService.del(`${MEMORY_KEY_PREFIX}${gameId}`);
      await this.redisService.del(`${COMPRESSED_MEMORY_PREFIX}${gameId}`);
      await this.redisService.del(`${ROUND_SUMMARY_PREFIX}${gameId}`);
      this.logger.log(`已清除游戏 ${gameId} 的所有记忆数据`);
    } catch (error) {
      this.logger.error(`清除记忆失败: ${error.message}`);
    }
  }
}
