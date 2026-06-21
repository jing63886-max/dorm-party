import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@/types';

/* ====== Socket 配置 ====== */

/** Socket 服务器地址，从环境变量读取，默认使用当前页面地址（支持手机局域网访问） */
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || '';

/** 心跳间隔（毫秒） */
const HEARTBEAT_INTERVAL = 25000;

/** 重连配置 */
const RECONNECT_CONFIG = {
  /** 是否自动重连 */
  retries: true,
  /** 重连次数 */
  retriesLimit: 10,
  /** 重连延迟（毫秒） */
  delay: 3000,
  /** 最大重连延迟（毫秒） */
  delayMax: 15000,
};

/* ====== 连接状态 ====== */

/** Socket 连接状态枚举 */
export enum SocketStatus {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Reconnecting = 'reconnecting',
}

/* ====== Socket 管理器 ====== */

/** 类型安全的 Socket 实例 */
type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Socket 管理器类 */
class SocketManager {
  private socket: TypedSocket | null = null;
  private status: SocketStatus = SocketStatus.Disconnected;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private statusListeners: Set<(status: SocketStatus) => void> = new Set();
  private currentRoom: string | null = null;

  /**
   * 获取当前连接状态
   */
  getStatus(): SocketStatus {
    return this.status;
  }

  /**
   * 监听连接状态变化
   */
  onStatusChange(listener: (status: SocketStatus) => void): () => void {
    this.statusListeners.add(listener);
    // 立即通知当前状态
    listener(this.status);
    // 返回取消监听函数
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * 更新连接状态并通知监听器
   */
  private setStatus(status: SocketStatus): void {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  /**
   * 建立 Socket 连接
   *
   * @param deviceId - 设备ID
   * @param token - 认证token（可选）
   */
  connect(deviceId: string, token?: string): void {
    // 如果已连接，先断开
    if (this.socket?.connected) {
      this.disconnect();
    }

    this.setStatus(SocketStatus.Connecting);

    // 创建 Socket 连接（使用 /game namespace）
    const socketUrl = SOCKET_URL ? `${SOCKET_URL}/game` : '/game';
    this.socket = io(socketUrl, {
      /* 传输方式：优先 websocket，降级 polling */
      transports: ['websocket', 'polling'],
      /* Socket.io 路径 */
      path: '/socket.io',
      /* 认证信息 */
      auth: {
        deviceId,
        token,
      },
      /* 重连配置 */
      reconnection: RECONNECT_CONFIG.retries,
      reconnectionAttempts: RECONNECT_CONFIG.retriesLimit,
      reconnectionDelay: RECONNECT_CONFIG.delay,
      reconnectionDelayMax: RECONNECT_CONFIG.delayMax,
      /* 超时配置 */
      timeout: 10000,
    });

    this.setupEventListeners();
  }

  /**
   * 设置 Socket 事件监听
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // 连接成功
    this.socket.on('connect', () => {
      console.log('[Socket] 已连接:', this.socket?.id);
      this.setStatus(SocketStatus.Connected);
      this.startHeartbeat();

      // 如果之前在房间中，重新加入
      if (this.currentRoom) {
        this.emit('room:join', { code: this.currentRoom, nickname: '', deviceId: '' });
      }
    });

    // 连接断开
    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] 已断开:', reason);
      this.setStatus(SocketStatus.Disconnected);
      this.stopHeartbeat();
    });

    // 正在重连
    this.socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`[Socket] 正在重连 (第 ${attempt} 次)`);
      this.setStatus(SocketStatus.Reconnecting);
    });

    // 重连成功
    this.socket.io.on('reconnect', () => {
      console.log('[Socket] 重连成功');
      this.setStatus(SocketStatus.Connected);
    });

    // 重连失败
    this.socket.io.on('reconnect_failed', () => {
      console.error('[Socket] 重连失败');
      this.setStatus(SocketStatus.Disconnected);
    });

    // 连接错误
    this.socket.on('connect_error', (error) => {
      console.error('[Socket] 连接错误:', error.message);
    });
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.emit('ping');
    }, HEARTBEAT_INTERVAL);
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 断开 Socket 连接
   */
  disconnect(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentRoom = null;
    this.setStatus(SocketStatus.Disconnected);
  }

  /**
   * 获取 Socket 实例
   */
  getSocket(): TypedSocket | null {
    return this.socket;
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * 加入房间
   *
   * @param roomCode - 房间邀请码
   */
  joinRoom(roomCode: string): void {
    this.currentRoom = roomCode;
    if (this.socket?.connected) {
      this.emit('room:join', { code: roomCode, nickname: '', deviceId: '' });
    }
  }

  /**
   * 离开房间
   */
  leaveRoom(): void {
    if (this.currentRoom && this.socket?.connected) {
      this.emit('room:leave');
    }
    this.currentRoom = null;
  }

  /**
   * 获取当前房间
   */
  getCurrentRoom(): string | null {
    return this.currentRoom;
  }

  /**
   * 类型安全的事件发送
   */
  emit<E extends keyof ClientToServerEvents>(
    event: E,
    ...args: Parameters<ClientToServerEvents[E]>
  ): boolean {
    if (!this.socket?.connected) {
      console.warn(`[Socket] 未连接，无法发送事件: ${String(event)}`);
      return false;
    }
    this.socket.emit(event, ...args);
    return true;
  }

  /**
   * 类型安全的事件监听
   */
  on<E extends keyof ServerToClientEvents>(
    event: E,
    listener: ServerToClientEvents[E]
  ): void {
    this.socket?.on(event, listener as any);
  }

  /**
   * 移除事件监听
   */
  off<E extends keyof ServerToClientEvents>(
    event: E,
    listener?: ServerToClientEvents[E]
  ): void {
    if (listener) {
      this.socket?.off(event, listener as any);
    } else {
      this.socket?.removeAllListeners(event);
    }
  }

  /**
   * 一次性事件监听
   */
  once<E extends keyof ServerToClientEvents>(
    event: E,
    listener: ServerToClientEvents[E]
  ): void {
    this.socket?.once(event, listener as any);
  }

  /**
   * 移除所有事件监听
   */
  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }
}

/* ====== 单例导出 ====== */

/** Socket 管理器单例 */
export const socketManager = new SocketManager();

export default socketManager;
