import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RoomService } from '../room/room.service';
import { GameService } from '../game/game.service';
import { ChatService } from '../chat/chat.service';
import { RedisService } from '../redis/redis.service';

/** Redis Pub/Sub 频道前缀 */
const GAME_CHANNEL_PREFIX = 'dorm-party:game:';

/** 断线重连超时时间（毫秒） */
const RECONNECT_TIMEOUT = 30000;

/** 心跳超时时间（毫秒） */
const HEARTBEAT_TIMEOUT = 15000;

/** 心跳检测间隔（毫秒） */
const HEARTBEAT_INTERVAL = 10000;

/**
 * 游戏 WebSocket 网关
 * 处理游戏核心逻辑的实时通信，包括房间管理、游戏流程、聊天、投票等
 * 支持 Redis Pub/Sub 实现跨实例通信
 */
@WebSocketGateway({
  namespace: '/game',
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class GameGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(GameGateway.name);

  @WebSocketServer()
  server: Server;

  /** 断线玩家临时缓存 { socketId -> { userId, roomCode, gameId, nickname, timer } } */
  private readonly disconnectedPlayers = new Map<
    string,
    {
      userId: string;
      roomCode: string;
      gameId: string;
      nickname: string;
      timer: NodeJS.Timeout;
    }
  >();

  /** 心跳定时器 { socketId -> timer } */
  private readonly heartbeatTimers = new Map<string, NodeJS.Timeout>();

  /** Redis Pub/Sub 订阅器 */
  private redisSubscriber: any = null;

  constructor(
    private readonly roomService: RoomService,
    private readonly gameService: GameService,
    private readonly chatService: ChatService,
    private readonly redisService: RedisService,
  ) {
    this.setupRedisPubSub();
  }

  // ==================== 生命周期钩子 ====================

  /**
   * 客户端连接处理
   * 验证连接参数，恢复可能存在的会话
   */
  async handleConnection(client: Socket) {
    this.logger.log(`客户端连接: ${client.id}`);

    // 启动心跳检测
    this.startHeartbeat(client);

    // 检查是否有待恢复的会话（通过 handshake query 传递）
    const { userId, roomCode, gameId, nickname } = client.handshake.query;

    if (userId && roomCode) {
      // 将用户信息存入 socket data
      client.data.userId = userId as string;
      client.data.roomCode = roomCode as string;
      client.data.gameId = gameId as string;
      client.data.nickname = nickname as string;

      // 加入对应的 socket room
      client.join(`room:${roomCode}`);
      if (gameId) {
        client.join(`game:${gameId}`);
      }

      // 检查是否是断线重连
      await this.handleReconnect(client);
    }
  }

  /**
   * 客户端断开处理
   * 标记玩家为断线状态，启动重连等待计时器
   */
  async handleDisconnect(client: Socket) {
    this.logger.log(`客户端断开: ${client.id}`);

    // 清除心跳定时器
    this.stopHeartbeat(client);

    const { userId, roomCode, gameId, nickname } = client.data;

    if (!userId || !roomCode) {
      return;
    }

    // 广播玩家断线通知
    this.server.to(`room:${roomCode}`).emit('game:playerDisconnected', {
      userId,
      nickname: nickname || '未知玩家',
      roomCode,
      timestamp: Date.now(),
    });

    // 设置断线重连等待计时器
    const timer = setTimeout(async () => {
      // 超时未重连，执行离开逻辑
      this.disconnectedPlayers.delete(client.id);
      try {
        await this.roomService.leaveRoom(roomCode, userId);
        this.server.to(`room:${roomCode}`).emit('room:playerLeft', {
          userId,
          players: await this.getRoomPlayersList(roomCode),
        });
      } catch (error) {
        this.logger.error(
          `断线超时后离开房间失败: ${error.message}`,
        );
      }
    }, RECONNECT_TIMEOUT);

    // 缓存断线玩家信息
    this.disconnectedPlayers.set(client.id, {
      userId,
      roomCode,
      gameId: gameId || '',
      nickname: nickname || '',
      timer,
    });

    // 通过 Redis 通知其他实例
    this.publishToRedis(roomCode, 'game:playerDisconnected', {
      userId,
      nickname: nickname || '未知玩家',
      roomCode,
      timestamp: Date.now(),
    });
  }

  // ==================== 房间事件处理 ====================

  /**
   * 加入房间
   * 玩家通过房间码加入指定房间
   */
  @SubscribeMessage('room:join')
  async handleRoomJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomCode: string; userId: string; nickname: string },
  ) {
    try {
      this.logger.log(
        `玩家 ${data.nickname}(${data.userId}) 尝试加入房间 ${data.roomCode}`,
      );

      // 存储用户信息到 socket
      client.data.userId = data.userId;
      client.data.roomCode = data.roomCode;
      client.data.nickname = data.nickname;

      // 调用房间服务加入房间
      const result = await this.roomService.joinRoom(
        data.roomCode,
        data.userId,
        data.nickname,
      );

      // 加入 socket room
      client.join(`room:${data.roomCode}`);

      // 广播玩家加入通知
      this.server.to(`room:${data.roomCode}`).emit('room:playerJoined', {
        userId: data.userId,
        nickname: data.nickname,
        players: await this.getRoomPlayersList(data.roomCode),
        roomCode: data.roomCode,
      });

      // 通过 Redis 通知其他实例
      this.publishToRedis(data.roomCode, 'room:playerJoined', {
        userId: data.userId,
        nickname: data.nickname,
        roomCode: data.roomCode,
      });

      // 向加入的玩家发送当前房间状态
      client.emit('room:playerJoined', {
        userId: data.userId,
        nickname: data.nickname,
        players: await this.getRoomPlayersList(data.roomCode),
        roomCode: data.roomCode,
        isNewPlayer: true,
      });

      return { success: true, data: result };
    } catch (error) {
      this.emitError(client, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 离开房间
   * 玩家主动离开房间
   */
  @SubscribeMessage('room:leave')
  async handleRoomLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomCode: string; userId: string },
  ) {
    try {
      this.logger.log(`玩家 ${data.userId} 离开房间 ${data.roomCode}`);

      // 离开 socket room
      client.leave(`room:${data.roomCode}`);
      if (client.data.gameId) {
        client.leave(`game:${client.data.gameId}`);
      }

      // 调用房间服务离开房间
      await this.roomService.leaveRoom(data.roomCode, data.userId);

      // 广播玩家离开通知
      this.server.to(`room:${data.roomCode}`).emit('room:playerLeft', {
        userId: data.userId,
        players: await this.getRoomPlayersList(data.roomCode),
        roomCode: data.roomCode,
      });

      // 通过 Redis 通知其他实例
      this.publishToRedis(data.roomCode, 'room:playerLeft', {
        userId: data.userId,
        roomCode: data.roomCode,
      });

      // 清除 socket data
      client.data = {};

      return { success: true };
    } catch (error) {
      this.emitError(client, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 准备状态变更
   * 玩家切换准备/取消准备状态
   */
  @SubscribeMessage('room:ready')
  async handleRoomReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomCode: string; userId: string },
  ) {
    try {
      this.logger.log(`玩家 ${data.userId} 切换准备状态`);

      // 调用房间服务切换准备状态
      const result = await this.roomService.toggleReady(
        data.roomCode,
        data.userId,
      );

      // 广播准备状态变更
      this.server.to(`room:${data.roomCode}`).emit('room:playerReady', {
        userId: data.userId,
        nickname: result.nickname,
        isReady: result.isReady,
        allReady: result.allReady,
        players: await this.getRoomPlayersList(data.roomCode),
      });

      // 如果全员准备，广播游戏即将开始
      if (result.allReady) {
        this.server.to(`room:${data.roomCode}`).emit('room:gameStarting', {
          roomCode: data.roomCode,
          countdown: 5, // 5秒倒计时
        });
      }

      // 通过 Redis 通知其他实例
      this.publishToRedis(data.roomCode, 'room:playerReady', {
        userId: data.userId,
        isReady: result.isReady,
        allReady: result.allReady,
      });

      return { success: true, data: result };
    } catch (error) {
      this.emitError(client, error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== 游戏事件处理 ====================

  /**
   * 聊天消息
   * 处理玩家发送的聊天消息，经过 ChatService 处理后广播
   */
  @SubscribeMessage('game:message')
  async handleGameMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { gameId: string; playerId: string; content: string },
  ) {
    try {
      // 调用 ChatService 处理消息（关键词检测、存储等）
      const processed = await this.chatService.processMessage(
        data.gameId,
        data.playerId,
        data.content,
      );

      // 广播消息给房间内所有人
      const messageData = {
        playerId: data.playerId,
        nickname: client.data.nickname || '未知玩家',
        content: data.content,
        type: processed.type,
        keywords: processed.keywords,
        timestamp: Date.now(),
      };

      this.server
        .to(`game:${data.gameId}`)
        .emit('game:message', messageData);

      // 通过 Redis 通知其他实例
      this.publishToRedis(client.data.roomCode, 'game:message', messageData);

      return { success: true, data: processed };
    } catch (error) {
      this.emitError(client, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 事件选择
   * 玩家在事件阶段提交自己的选择
   */
  @SubscribeMessage('game:choice')
  async handleGameChoice(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      gameId: string;
      playerId: string;
      eventId: number;
      choiceIndex: number;
    },
  ) {
    try {
      this.logger.log(
        `玩家 ${data.playerId} 在游戏 ${data.gameId} 中选择选项 ${data.choiceIndex}`,
      );

      // 调用 GameService 处理选择
      const result = await this.gameService.submitChoice(
        data.gameId,
        data.playerId,
        data.eventId,
        data.choiceIndex,
      );

      // 如果所有人已选择完毕，广播结果
      if (result.allSubmitted && result.result) {
        this.server.to(`game:${data.gameId}`).emit('game:voteResult', {
          type: 'choice',
          eventTitle: result.result.eventTitle,
          choiceDistribution: result.result.choiceDistribution,
          narrative: result.result.narrative,
          timestamp: Date.now(),
        });

        // 广播回合结束
        this.server.to(`game:${data.gameId}`).emit('game:roundEnd', {
          round: await this.getCurrentRound(data.gameId),
          reason: 'choice_completed',
          timestamp: Date.now(),
        });

        // 通过 Redis 通知其他实例
        this.publishToRedis(client.data.roomCode, 'game:roundEnd', {
          gameId: data.gameId,
          reason: 'choice_completed',
        });
      }

      // 广播状态更新
      this.server.to(`game:${data.gameId}`).emit('game:stateUpdate', {
        gameId: data.gameId,
        phase: await this.getCurrentPhase(data.gameId),
        submitted: result.allSubmitted,
        remainingPlayers: result.remainingPlayers,
        timestamp: Date.now(),
      });

      return { success: true, data: result };
    } catch (error) {
      this.emitError(client, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 投票
   * 玩家在投票阶段提交投票
   */
  @SubscribeMessage('game:vote')
  async handleGameVote(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { gameId: string; playerId: string; targetId: string },
  ) {
    try {
      this.logger.log(
        `玩家 ${data.playerId} 在游戏 ${data.gameId} 中投票给 ${data.targetId}`,
      );

      // 调用 GameService 处理投票
      const result = await this.gameService.submitVote(
        data.gameId,
        data.playerId,
        data.targetId,
      );

      // 如果所有人已投票完毕，广播结果
      if (result.allSubmitted && result.result) {
        this.server.to(`game:${data.gameId}`).emit('game:voteResult', {
          type: 'vote',
          voteDistribution: result.result.voteDistribution,
          eliminatedId: result.result.eliminatedId,
          eliminatedNickname: result.result.eliminatedNickname,
          narrative: result.result.narrative,
          timestamp: Date.now(),
        });

        // 广播回合结束
        this.server.to(`game:${data.gameId}`).emit('game:roundEnd', {
          round: await this.getCurrentRound(data.gameId),
          reason: 'vote_completed',
          timestamp: Date.now(),
        });

        // 通过 Redis 通知其他实例
        this.publishToRedis(client.data.roomCode, 'game:voteResult', {
          gameId: data.gameId,
          voteDistribution: result.result.voteDistribution,
          eliminatedId: result.result.eliminatedId,
        });
      }

      // 广播状态更新
      this.server.to(`game:${data.gameId}`).emit('game:stateUpdate', {
        gameId: data.gameId,
        phase: await this.getCurrentPhase(data.gameId),
        submitted: result.allSubmitted,
        remainingPlayers: result.remainingPlayers,
        timestamp: Date.now(),
      });

      return { success: true, data: result };
    } catch (error) {
      this.emitError(client, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 使用技能
   * 玩家使用角色特殊技能
   */
  @SubscribeMessage('game:useSkill')
  async handleUseSkill(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      gameId: string;
      playerId: string;
      skillId: string;
      targetId?: string;
    },
  ) {
    try {
      this.logger.log(
        `玩家 ${data.playerId} 在游戏 ${data.gameId} 中使用技能 ${data.skillId}`,
      );

      // 获取游戏状态验证技能使用
      const gameState = await this.gameService.getGameState(data.gameId);
      const player = gameState.players.find((p) => p.id === data.playerId);

      if (!player) {
        throw new Error('玩家不存在');
      }

      // 广播技能使用事件
      this.server.to(`game:${data.gameId}`).emit('game:event', {
        type: 'skill_used',
        playerId: data.playerId,
        playerName: player.nickname,
        skillId: data.skillId,
        targetId: data.targetId,
        description: `${player.nickname} 使用了一个技能！`,
        timestamp: Date.now(),
      });

      // 通过 Redis 通知其他实例
      this.publishToRedis(client.data.roomCode, 'game:event', {
        type: 'skill_used',
        playerId: data.playerId,
        skillId: data.skillId,
      });

      return { success: true };
    } catch (error) {
      this.emitError(client, error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== 心跳检测 ====================

  /**
   * 处理客户端心跳
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong');
    // 重置心跳超时计时器
    this.resetHeartbeat(client);
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeat(client: Socket) {
    const timer = setInterval(() => {
      if (!client.connected) {
        this.stopHeartbeat(client);
        return;
      }
      // 如果超时未收到心跳，断开连接
      const lastPing = client.data.lastPing || Date.now();
      if (Date.now() - lastPing > HEARTBEAT_TIMEOUT) {
        this.logger.warn(
          `心跳超时，断开客户端: ${client.id}`,
        );
        client.disconnect(true);
      }
    }, HEARTBEAT_INTERVAL);

    this.heartbeatTimers.set(client.id, timer);
    client.data.lastPing = Date.now();
  }

  /**
   * 重置心跳计时器
   */
  private resetHeartbeat(client: Socket) {
    client.data.lastPing = Date.now();
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(client: Socket) {
    const timer = this.heartbeatTimers.get(client.id);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(client.id);
    }
  }

  // ==================== 断线重连 ====================

  /**
   * 处理断线重连
   * 检查是否有待恢复的会话，恢复玩家状态
   */
  private async handleReconnect(client: Socket) {
    const { userId, roomCode, gameId, nickname } = client.data;

    // 查找是否有该玩家的断线记录
    for (const [socketId, info] of this.disconnectedPlayers.entries()) {
      if (info.userId === userId && info.roomCode === roomCode) {
        // 找到断线记录，取消超时计时器
        clearTimeout(info.timer);
        this.disconnectedPlayers.delete(socketId);

        // 广播重连通知
        this.server.to(`room:${roomCode}`).emit('game:playerReconnected', {
          userId,
          nickname: nickname || '未知玩家',
          roomCode,
          timestamp: Date.now(),
        });

        // 通过 Redis 通知其他实例
        this.publishToRedis(roomCode, 'game:playerReconnected', {
          userId,
          nickname: nickname || '未知玩家',
          roomCode,
        });

        this.logger.log(`玩家 ${nickname}(${userId}) 已重连`);
        break;
      }
    }
  }

  // ==================== Redis Pub/Sub ====================

  /**
   * 设置 Redis Pub/Sub
   * 用于跨实例通信，确保多节点部署时消息同步
   */
  private setupRedisPubSub() {
    try {
      const redisClient = this.redisService.getClient();
      if (!redisClient || redisClient.status !== 'ready') {
        this.logger.warn('Redis 未就绪，跳过 Pub/Sub 设置');
        return;
      }

      // 创建独立的订阅客户端（ioredis 不允许同一客户端同时订阅和发布）
      this.redisSubscriber = redisClient.duplicate();

      this.redisSubscriber.on('message', (channel: string, message: string) => {
        try {
          const data = JSON.parse(message);
          const { event, payload } = data;

          // 从频道名中提取房间码
          const roomCode = channel.replace(GAME_CHANNEL_PREFIX, '');

          // 向该房间的所有 socket 广播消息
          this.server.to(`room:${roomCode}`).emit(event, payload);
        } catch (error) {
          this.logger.error(`处理 Redis 消息失败: ${error.message}`);
        }
      });

      // 订阅所有游戏频道（使用模式订阅）
      this.redisSubscriber.psubscribe(`${GAME_CHANNEL_PREFIX}*`);
      this.logger.log('Redis Pub/Sub 已设置');
    } catch (error) {
      this.logger.warn(`Redis Pub/Sub 设置失败: ${error.message}`);
    }
  }

  /**
   * 向 Redis 发布消息
   * @param roomCode 房间码
   * @param event 事件名
   * @param payload 事件数据
   */
  private publishToRedis(roomCode: string, event: string, payload: any) {
    try {
      const redisClient = this.redisService.getClient();
      if (!redisClient || redisClient.status !== 'ready') {
        return;
      }

      redisClient.publish(
        `${GAME_CHANNEL_PREFIX}${roomCode}`,
        JSON.stringify({ event, payload }),
      );
    } catch (error) {
      this.logger.error(`Redis 发布消息失败: ${error.message}`);
    }
  }

  // ==================== 辅助方法 ====================

  /**
   * 获取房间玩家列表（用于广播）
   */
  private async getRoomPlayersList(roomCode: string) {
    try {
      const roomInfo = await this.roomService.getRoomInfo(roomCode);
      return roomInfo.players;
    } catch {
      return [];
    }
  }

  /**
   * 获取当前游戏阶段
   */
  private async getCurrentPhase(gameId: string): Promise<string> {
    try {
      const gameState = await this.gameService.getGameState(gameId);
      return gameState.phase;
    } catch {
      return 'unknown';
    }
  }

  /**
   * 获取当前回合数
   */
  private async getCurrentRound(gameId: string): Promise<number> {
    try {
      const gameState = await this.gameService.getGameState(gameId);
      return gameState.currentRound;
    } catch {
      return 0;
    }
  }

  /**
   * 向客户端发送错误消息
   */
  private emitError(client: Socket, message: string, code?: string) {
    client.emit('game:error', {
      message,
      code,
      timestamp: Date.now(),
    });
  }
}
