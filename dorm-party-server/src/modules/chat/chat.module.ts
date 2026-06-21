import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatMessage } from '../../common/entities/chat-message.entity';

/**
 * 聊天模块
 * 处理游戏内聊天消息、关键词检测、WebSocket 实时通信
 */
@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage])],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
