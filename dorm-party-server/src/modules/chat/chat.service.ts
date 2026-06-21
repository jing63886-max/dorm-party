import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from '../../common/entities/chat-message.entity';
import { RedisService } from '../redis/redis.service';

/** 关键词检测列表 */
const KEYWORD_PATTERNS: { pattern: RegExp; category: string }[] = [
  { pattern: /秘密|隐瞒|隐藏|偷偷|背地里/, category: 'secret' },
  { pattern: /喜欢|爱|暗恋|心动|好感/, category: 'romance' },
  { pattern: /讨厌|恨|烦|厌恶|不喜欢/, category: 'conflict' },
  { pattern: /偷|拿|碰|翻|看/, category: 'suspicion' },
  { pattern: /投票|淘汰|出局|赶走/, category: 'vote_intent' },
  { pattern: /合作|一起|帮忙|团结|联手/, category: 'cooperation' },
  { pattern: /骗|谎|假|装|伪装/, category: 'deception' },
  { pattern: /对不起|抱歉|原谅|和好/, category: 'reconciliation' },
];

/** Redis 中关键词缓存的键前缀 */
const KEYWORDS_CACHE_PREFIX = 'chat:keywords:';

/**
 * 聊天服务
 * 处理消息存储、关键词检测、消息历史查询
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 处理消息
   * @param gameId 游戏ID
   * @param playerId 玩家ID
   * @param content 消息内容
   * @returns 处理后的消息
   */
  async processMessage(gameId: string, playerId: string, content: string) {
    // 检测关键词
    const keywords = this.detectKeywords(content);
    const messageType = keywords.length > 0 ? 'keyword' : 'normal';

    // 保存消息
    const message = await this.saveMessage(gameId, playerId, content, messageType);

    // 如果检测到关键词，缓存到 Redis 供 AI 事件生成使用
    if (keywords.length > 0) {
      await this.cacheKeywords(gameId, keywords);
    }

    return {
      id: message.id,
      playerId,
      nickname: message.nickname,
      content: message.content,
      type: messageType,
      keywords,
      timestamp: message.createdAt.getTime(),
    };
  }

  /**
   * 关键词检测
   * @param content 消息内容
   * @returns 匹配的关键词列表
   */
  detectKeywords(content: string): { word: string; category: string }[] {
    const results: { word: string; category: string }[] = [];

    for (const { pattern, category } of KEYWORD_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          // 去重
          if (!results.some((r) => r.word === match)) {
            results.push({ word: match, category });
          }
        }
      }
    }

    return results;
  }

  /**
   * 保存消息到数据库
   * @param gameId 游戏ID
   * @param playerId 玩家ID
   * @param content 消息内容
   * @param type 消息类型
   */
  async saveMessage(
    gameId: string,
    playerId: string,
    content: string,
    type: string = 'normal',
  ): Promise<ChatMessage> {
    const message = this.chatMessageRepository.create({
      gameId,
      playerId,
      nickname: '', // 由调用者补充，或通过关联查询
      content,
      type,
      round: 0, // 由调用者补充
    });

    return this.chatMessageRepository.save(message);
  }

  /**
   * 保存系统消息
   * @param gameId 游戏ID
   * @param content 系统消息内容
   * @param round 回合数
   */
  async saveSystemMessage(gameId: string, content: string, round: number = 0) {
    const message = this.chatMessageRepository.create({
      gameId,
      playerId: 'system',
      nickname: '系统',
      content,
      type: 'system',
      round,
    });

    return this.chatMessageRepository.save(message);
  }

  /**
   * 获取游戏聊天历史
   * @param gameId 游戏ID
   * @param limit 消息数量限制
   */
  async getChatHistory(gameId: string, limit: number = 50) {
    const messages = await this.chatMessageRepository.find({
      where: { gameId },
      order: { createdAt: 'ASC' },
      take: limit,
    });

    return messages.map((m) => ({
      id: m.id,
      playerId: m.playerId,
      nickname: m.nickname,
      content: m.content,
      type: m.type,
      round: m.round,
      timestamp: m.createdAt.getTime(),
    }));
  }

  /**
   * 获取最近的关键词（供 AI 事件生成使用）
   * @param gameId 游戏ID
   */
  async getRecentKeywords(gameId: string): Promise<string[]> {
    const cached = await this.redisService.get<{ word: string; category: string }[]>(
      `${KEYWORDS_CACHE_PREFIX}${gameId}`,
    );

    if (cached && cached.length > 0) {
      return cached.map((c) => c.word);
    }

    return [];
  }

  /**
   * 获取指定回合的消息
   * @param gameId 游戏ID
   * @param round 回合数
   */
  async getRoundMessages(gameId: string, round: number) {
    const messages = await this.chatMessageRepository.find({
      where: { gameId, round },
      order: { createdAt: 'ASC' },
    });

    return messages.map((m) => ({
      id: m.id,
      playerId: m.playerId,
      nickname: m.nickname,
      content: m.content,
      type: m.type,
      timestamp: m.createdAt.getTime(),
    }));
  }

  // ==================== 私有方法 ====================

  /**
   * 缓存关键词到 Redis
   */
  private async cacheKeywords(
    gameId: string,
    keywords: { word: string; category: string }[],
  ): Promise<void> {
    const cacheKey = `${KEYWORDS_CACHE_PREFIX}${gameId}`;
    const existing = await this.redisService.get<{ word: string; category: string }[]>(
      cacheKey,
    );

    const merged = existing ? [...existing, ...keywords] : keywords;
    // 只保留最近 20 个关键词
    const trimmed = merged.slice(-20);

    await this.redisService.set(cacheKey, trimmed, 3600);
  }
}
