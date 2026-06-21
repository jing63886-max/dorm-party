import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis 服务
 * 封装 Redis 操作，提供房间状态、游戏状态的缓存管理
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  /** 模块初始化时连接 Redis */
  async onModuleInit() {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password');
    const db = this.configService.get<number>('redis.db', 0);
    const keyPrefix = this.configService.get<string>('redis.keyPrefix', 'dorm-party:');

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      db,
      keyPrefix,
      family: 4, // 强制使用 IPv4
      retryStrategy: (times) => {
        if (times > 10) {
          this.logger.error('Redis 连接重试次数过多，停止重试');
          return null;
        }
        return Math.min(times * 200, 5000);
      },
      lazyConnect: true,
    });

    try {
      await this.client.connect();
      this.logger.log(`Redis 已连接: ${host}:${port}`);
    } catch (error) {
      this.logger.warn(`Redis 连接失败，将使用内存存储作为降级方案: ${error.message}`);
    }
  }

  /** 模块销毁时断开 Redis 连接 */
  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis 连接已关闭');
    }
  }

  /** 获取 Redis 客户端实例 */
  getClient(): Redis {
    return this.client;
  }

  /**
   * 设置键值（带过期时间）
   * @param key 键名
   * @param value 值
   * @param ttl 过期时间（秒），默认 1 小时
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    if (!this.client || this.client.status !== 'ready') {
      return;
    }
    const serialized = JSON.stringify(value);
    await this.client.set(key, serialized, 'EX', ttl);
  }

  /**
   * 获取键值
   * @param key 键名
   * @returns 解析后的值，不存在则返回 null
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.client || this.client.status !== 'ready') {
      return null;
    }
    const data = await this.client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  /**
   * 删除键
   * @param key 键名
   */
  async del(key: string): Promise<void> {
    if (!this.client || this.client.status !== 'ready') {
      return;
    }
    await this.client.del(key);
  }

  /**
   * 检查键是否存在
   * @param key 键名
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client || this.client.status !== 'ready') {
      return false;
    }
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * 设置哈希字段
   * @param key 哈希键名
   * @param field 字段名
   * @param value 值
   */
  async hset(key: string, field: string, value: any): Promise<void> {
    if (!this.client || this.client.status !== 'ready') {
      return;
    }
    await this.client.hset(key, field, JSON.stringify(value));
  }

  /**
   * 获取哈希字段
   * @param key 哈希键名
   * @param field 字段名
   */
  async hget<T = any>(key: string, field: string): Promise<T | null> {
    if (!this.client || this.client.status !== 'ready') {
      return null;
    }
    const data = await this.client.hget(key, field);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  /**
   * 获取整个哈希
   * @param key 哈希键名
   */
  async hgetall<T = Record<string, any>>(key: string): Promise<T | null> {
    if (!this.client || this.client.status !== 'ready') {
      return null;
    }
    const data = await this.client.hgetall(key);
    if (!data || Object.keys(data).length === 0) return null;
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      try {
        result[k] = JSON.parse(v);
      } catch {
        result[k] = v;
      }
    }
    return result as T;
  }

  /**
   * 删除哈希键
   * @param key 哈希键名
   */
  async hdel(key: string, ...fields: string[]): Promise<void> {
    if (!this.client || this.client.status !== 'ready') {
      return;
    }
    await this.client.hdel(key, ...fields);
  }

  // ==================== 业务相关的快捷方法 ====================

  /** 获取房间缓存键 */
  static getRoomKey(roomCode: string): string {
    return `room:${roomCode}`;
  }

  /** 获取游戏状态缓存键 */
  static getGameStateKey(gameId: string): string {
    return `game:state:${gameId}`;
  }

  /** 获取房间玩家列表缓存键 */
  static getRoomPlayersKey(roomCode: string): string {
    return `room:players:${roomCode}`;
  }
}
