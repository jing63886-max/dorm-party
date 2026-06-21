import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

/**
 * Redis 全局模块
 * 提供缓存、房间状态存储、游戏状态存储等功能
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {
  constructor(private readonly configService: ConfigService) {}
}
