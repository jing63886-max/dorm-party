import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { RedisService } from '../redis/redis.service';

/**
 * 聊天 WebSocket 网关
 * 处理实时聊天消息、房间事件、游戏事件的推送
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/game',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 客户端连接处理
   */
  async handleConnection(client: Socket) {
    this.logger.log(`客户端已连接: ${client.id}`);

    // 发送心跳响应
    client.on('ping', () => {
      client.emit('pong');
    });
  }

  /**
   * 客户端断开连接处理
   */
  async handleDisconnect(client: Socket) {
    const data = client.data as { userId?: string; roomCode?: string; nickname?: string };

    if (data.roomCode) {
      // 通知房间内其他玩家
      client.to(`room:${data.roomCode}`).emit('room:playerLeft', {
        userId: data.userId,
        message: `${data.nickname || '玩家'} 已断开连接`,
      });

      this.logger.log(
        `客户端已断开: ${client.id}, 用户: ${data.userId || '未知'}, 房间: ${data.roomCode}`,
      );
    } else {
      this.logger.log(`客户端已断开: ${client.id}`);
    }
  }

  /**
   * 加入房间
   */
  async handleRoomJoin(client: Socket, data: { roomCode: string; userId: string; nickname: string }) {
    // 加入 Socket.IO 房间
    await client.join(`room:${data.roomCode}`);
    client.data = { ...client.data, userId: data.userId, roomCode: data.roomCode, nickname: data.nickname } as { userId?: string; roomCode?: string; nickname?: string };

    // 通知房间内其他玩家
    client.to(`room:${data.roomCode}`).emit('room:playerJoined', {
      userId: data.userId,
      nickname: data.nickname,
    });

    this.logger.log(`用户 ${data.nickname}(${data.userId}) 加入房间 ${data.roomCode}`);
  }

  /**
   * 离开房间
   */
  async handleRoomLeave(client: Socket, data: { roomCode: string; userId: string }) {
    await client.leave(`room:${data.roomCode}`);
    client.data = { ...client.data, roomCode: undefined } as { userId?: string; roomCode?: string; nickname?: string };

    client.to(`room:${data.roomCode}`).emit('room:playerLeft', {
      userId: data.userId,
    });

    this.logger.log(`用户 ${data.userId} 离开房间 ${data.roomCode}`);
  }

  /**
   * 处理聊天消息
   */
  async handleChatMessage(client: Socket, data: { gameId: string; playerId: string; content: string }) {
    try {
      // 处理消息（关键词检测等）
      const result = await this.chatService.processMessage(data.gameId, data.playerId, data.content);

      // 广播消息给同一游戏的所有玩家
      this.server.to(`room:${client.data.roomCode}`).emit('chat:message', {
        playerId: data.playerId,
        nickname: client.data.nickname || '未知',
        content: data.content,
        type: result.type,
        timestamp: result.timestamp,
      });

      // 如果检测到关键词，发送系统提示
      if (result.keywords && result.keywords.length > 0) {
        this.server.to(`room:${client.data.roomCode}`).emit('chat:system', {
          content: `检测到关键词：${result.keywords.map((k) => k.word).join('、')}`,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      this.logger.error(`处理聊天消息失败: ${error.message}`);
      client.emit('error', { message: '消息发送失败', code: 'CHAT_ERROR' });
    }
  }

  /**
   * 处理游戏选择提交
   */
  async handleGameChoice(
    client: Socket,
    data: { gameId: string; playerId: string; eventId: number; choiceIndex: number },
  ) {
    // 广播选择事件给同一游戏的所有玩家
    this.server.to(`room:${client.data.roomCode}`).emit('game:choiceResult', {
      eventId: data.eventId,
      playerId: data.playerId,
      choiceIndex: data.choiceIndex,
    });
  }

  /**
   * 处理游戏投票提交
   */
  async handleGameVote(
    client: Socket,
    data: { gameId: string; playerId: string; targetId: string },
  ) {
    // 广播投票事件给同一游戏的所有玩家
    this.server.to(`room:${client.data.roomCode}`).emit('game:voteResult', {
      playerId: data.playerId,
      targetId: data.targetId,
    });
  }

  /**
   * 向指定房间广播系统消息
   * @param roomCode 房间码
   * @param content 消息内容
   */
  broadcastSystemMessage(roomCode: string, content: string) {
    this.server.to(`room:${roomCode}`).emit('chat:system', {
      content,
      timestamp: Date.now(),
    });
  }

  /**
   * 向指定房间广播游戏状态变更
   * @param roomCode 房间码
   * @param data 游戏状态数据
   */
  broadcastGamePhaseChange(roomCode: string, data: { gameId: string; phase: string; round: number }) {
    this.server.to(`room:${roomCode}`).emit('game:phaseChanged', data);
  }

  /**
   * 向指定房间广播新事件
   * @param roomCode 房间码
   * @param eventData 事件数据
   */
  broadcastNewEvent(roomCode: string, eventData: any) {
    this.server.to(`room:${roomCode}`).emit('game:newEvent', eventData);
  }

  /**
   * 向指定房间广播游戏结束
   * @param roomCode 房间码
   * @param endingData 结局数据
   */
  broadcastGameEnd(roomCode: string, endingData: any) {
    this.server.to(`room:${roomCode}`).emit('game:ended', endingData);
  }

  /**
   * 向指定玩家发送角色分配
   * @param clientSocketId 客户端 Socket ID
   * @param roleData 角色数据
   */
  sendRoleToPlayer(clientSocketId: string, roleData: any) {
    this.server.to(clientSocketId).emit('game:roleAssigned', roleData);
  }
}
