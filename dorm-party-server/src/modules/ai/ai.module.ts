import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { MemoryService } from './memory.service';

/**
 * AI 模块
 * 封装 DeepSeek AI API 调用，提供角色生成、事件生成、结局生成等功能
 * 包含记忆管理服务，支持游戏过程的上下文记忆
 * RedisService 通过全局模块自动注入，无需显式导入
 */
@Module({
  providers: [AIService, MemoryService],
  exports: [AIService, MemoryService],
})
export class AIModule {}
