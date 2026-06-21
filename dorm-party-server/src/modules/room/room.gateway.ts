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
import { RedisService } from '../redis/redis.service';

/** 心跳超时时间（毫秒） */
const HEARTBEAT_TIMEOUT = 15000;

/** 心跳检测间隔（毫秒） */
const HEARTBEAT_INTERVAL = 10000;

/**
 * 房间 WebSocket 网关
 * 处理房间级别的实时通信，包括加入/离开房间、准备状态、心跳检测
 * 与 GameGateway 分离，职责更清晰
 */
@WebSocketGateway({
  namespace: '/game',
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class RoomGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RoomGateway.name);

  @WebSocketServer()
  server: Server;

  /** 心跳定时器 { socketId -> timer } */
  private readonly heartbeatTimers = new Map<string, NodeJS.Timeout>();

  /** 在线玩家映射 { userId -> socketId } */
  private readonly onlinePlayers = new Map<string, string>();

  constructor(
    private readonly roomService: RoomService,
    private readonly redisService: RedisService,
  ) {}

  // ==================== 生命周期钩子 ====================

  /**
   * 客户端连接处理
   * 初始化连接，启动心跳检测
   */
  async handleConnection(client: Socket) {
    this.logger.log(`房间网关 - 客户端连接: ${client.id}`);

    // 启动心跳检测
    this.startHeartbeat(client);

    // 解析连接参数
    const { userId, nickname } = client.handshake.query;
    if (userId) {
      client.data.userId = userId as string;
      client.data.nickname = nickname as string || '未知玩家';

      // 记录在线状态
      this.onlinePlayers.set(userId as string, client.id);
    }
  }

  /**
   * 客户端断开处理
   * 清理在线状态，通知房间内其他玩家
   */
  async handleDisconnect(client: Socket) {
    this.logger.log(`房间网关 - 客户端断开: ${client.id}`);

    // 清除心跳定时器
    this.stopHeartbeat(client);

    const { userId, roomCode, nickname } = client.data;

    // 清除在线状态
    if (userId) {
      this.onlinePlayers.delete(userId);
    }

    // 如果玩家在房间中，通知其他玩家
    if (userId && roomCode) {
      try {
        const roomInfo = await this.roomService.getRoomInfo(roomCode);

        // 只在等待阶段处理离开逻辑（游戏中由 GameGateway 处理）
        if (roomInfo.status === 'waiting') {
          await this.roomService.leaveRoom(roomCode, userId);

          this.server.to(`room:${roomCode}`).emit('room:playerLeft', {
            userId,
            nickname: nickname || '未知玩家',
            players: await this.getRoomPlayersList(roomCode),
            roomCode,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        this.logger.error(`断开处理失败: ${error.message}`);
      }
    }
  }

  // ==================== 房间事件处理 ====================

  /**
   * 加入房间
   * 玩家通过房间码加入指定房间，加入对应的 Socket.IO room
   */
  @SubscribeMessage('room:join')
  async handleRoomJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomCode: string; userId: string; nickname: string },
  ) {
    try {
      this.logger.log(
        `玩家 ${data.nickname}(${data.userId}) 加入房间 ${data.roomCode}`,
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

      // 加入 Socket.IO room
      client.join(`room:${data.roomCode}`);

      // 更新在线状态
      this.onlinePlayers.set(data.userId, client.id);

      // 获取最新的房间玩家列表
      const players = await this.getRoomPlayersList(data.roomCode);

      // 广播玩家加入通知（房间内所有人，包括自己）
      this.server.to(`room:${data.roomCode}`).emit('room:playerJoined', {
        userId: data.userId,
        nickname: data.nickname,
        players,
        roomCode: data.roomCode,
        playerCount: players.length,
        maxPlayers: result.maxPlayers,
        timestamp: Date.now(),
      });

      return { success: true, data: result };
    } catch (error) {
      this.emitError(client, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 离开房间
   * 玩家主动离开房间，清理 Socket.IO room
   */
  @SubscribeMessage('room:leave')
  async handleRoomLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomCode: string; userId: string },
  ) {
    try {
      this.logger.log(`玩家 ${data.userId} 离开房间 ${data.roomCode}`);

      // 离开 Socket.IO room
      client.leave(`room:${data.roomCode}`);

      // 调用房间服务离开房间
      await this.roomService.leaveRoom(data.roomCode, data.userId);

      // 获取最新的房间玩家列表
      const players = await this.getRoomPlayersList(data.roomCode);

      // 广播玩家离开通知
      this.server.to(`room:${data.roomCode}`).emit('room:playerLeft', {
        userId: data.userId,
        nickname: client.data.nickname || '未知玩家',
        players,
        roomCode: data.roomCode,
        playerCount: players.length,
        timestamp: Date.now(),
      });

      // 清除 socket data
      client.data.roomCode = undefined;

      return { success: true };
    } catch (error) {
      this.emitError(client, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 准备状态变更
   * 玩家切换准备/取消准备状态，全员准备时通知
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

      // 获取最新的房间玩家列表
      const players = await this.getRoomPlayersList(data.roomCode);

      // 广播准备状态变更
      this.server.to(`room:${data.roomCode}`).emit('room:playerReady', {
        userId: data.userId,
        nickname: result.nickname,
        isReady: result.isReady,
        allReady: result.allReady,
        players,
        roomCode: data.roomCode,
        timestamp: Date.now(),
      });

      // 如果全员准备，广播游戏即将开始
      if (result.allReady) {
        this.server.to(`room:${data.roomCode}`).emit('room:gameStarting', {
          roomCode: data.roomCode,
          countdown: 5,
          message: '全员准备就绪，游戏即将开始！',
          timestamp: Date.now(),
        });
      }

      return { success: true, data: result };
    } catch (error) {
      this.emitError(client, error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== 心跳检测 ====================

  /**
   * 处理客户端心跳请求
   * 客户端定期发送 heartbeat 事件保持连接活跃
   */
  @SubscribeMessage('heartbeat')
  handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    // 更新最后心跳时间
    client.data.lastPing = Date.now();

    // 响应心跳
    client.emit('heartbeat:ack', {
      serverTime: Date.now(),
      status: 'ok',
    });
  }

  /**
   * 启动心跳检测定时器
   * 定期检查客户端是否存活
   */
  private startHeartbeat(client: Socket) {
    client.data.lastPing = Date.now();

    const timer = setInterval(() => {
      if (!client.connected) {
        this.stopHeartbeat(client);
        return;
      }

      const lastPing = client.data.lastPing || 0;
      if (Date.now() - lastPing > HEARTBEAT_TIMEOUT) {
        this.logger.warn(
          `房间网关 - 心跳超时，断开客户端: ${client.id}`,
        );
        client.disconnect(true);
      }
    }, HEARTBEAT_INTERVAL);

    this.heartbeatTimers.set(client.id, timer);
  }

  /**
   * 停止心跳检测定时器
   */
  private stopHeartbeat(client: Socket) {
    const timer = this.heartbeatTimers.get(client.id);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(client.id);
    }
  }

  // ==================== 辅助方法 ====================

  /**
   * 获取房间玩家列表（用于广播）
   * @param roomCode 房间码
   * @returns 玩家列表
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
   * 向客户端发送错误消息
   * @param client Socket 客户端
   * @param message 错误消息
   * @param code 错误码（可选）
   */
  private emitError(client: Socket, message: string, code?: string) {
    client.emit('error', {
      message,
      code,
      timestamp: Date.now(),
    });
  }
}
