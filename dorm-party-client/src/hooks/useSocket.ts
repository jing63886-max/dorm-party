'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { socketManager, SocketStatus } from '@/lib/socket';
import { useUserStore } from '@/lib/store';
import { generateDeviceId } from '@/lib/utils';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types';

/**
 * useSocket Hook
 * 自动管理 Socket.IO 连接的生命周期
 * 组件挂载时自动连接，卸载时自动断开
 *
 * @param options - 配置选项
 * @returns Socket 连接状态和操作方法
 */
interface UseSocketOptions {
  /** 是否自动连接（默认 true） */
  autoConnect?: boolean;
  /** 自定义事件处理器映射 */
  handlers?: Partial<{
    [E in keyof ServerToClientEvents]: ServerToClientEvents[E];
  }>;
}

interface UseSocketReturn {
  /** 当前连接状态 */
  status: SocketStatus;
  /** 是否已连接 */
  isConnected: boolean;
  /** 手动连接 */
  connect: () => void;
  /** 手动断开 */
  disconnect: () => void;
  /** 发送事件 */
  emit: <E extends keyof ClientToServerEvents>(
    event: E,
    ...args: Parameters<ClientToServerEvents[E]>
  ) => boolean;
  /** 监听事件 */
  on: <E extends keyof ServerToClientEvents>(
    event: E,
    listener: ServerToClientEvents[E]
  ) => void;
  /** 移除监听 */
  off: <E extends keyof ServerToClientEvents>(
    event: E,
    listener?: ServerToClientEvents[E]
  ) => void;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { autoConnect = true, handlers = {} } = options;

  const [status, setStatus] = useState<SocketStatus>(SocketStatus.Disconnected);
  const handlersRef = useRef(handlers);
  const isMountedRef = useRef(true);

  // 更新 handlers 引用（避免重新注册）
  handlersRef.current = handlers;

  // 获取用户设备ID
  const deviceId = useUserStore((state) => state.deviceId);

  // 监听连接状态变化
  useEffect(() => {
    const unsubscribe = socketManager.onStatusChange((newStatus) => {
      if (isMountedRef.current) {
        setStatus(newStatus);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 注册事件处理器
  useEffect(() => {
    const currentHandlers = handlersRef.current;

    // 注册所有传入的事件处理器
    (Object.entries(currentHandlers) as [
      keyof ServerToClientEvents,
      ServerToClientEvents[keyof ServerToClientEvents],
    ][]).forEach(([event, handler]) => {
      socketManager.on(event, handler as never);
    });

    return () => {
      // 清理所有事件处理器
      (Object.entries(currentHandlers) as [
        keyof ServerToClientEvents,
        ServerToClientEvents[keyof ServerToClientEvents],
      ][]).forEach(([event, handler]) => {
        socketManager.off(event, handler as never);
      });
    };
  }, []);

  // 自动连接/断开
  useEffect(() => {
    if (autoConnect && deviceId) {
      socketManager.connect(deviceId);
    }

    return () => {
      socketManager.disconnect();
      isMountedRef.current = false;
    };
  }, [autoConnect, deviceId]);

  const connect = useCallback(() => {
    const id = deviceId || generateDeviceId();
    socketManager.connect(id);
  }, [deviceId]);

  const disconnect = useCallback(() => {
    socketManager.disconnect();
  }, []);

  const emit = useCallback(
    <E extends keyof ClientToServerEvents>(
      event: E,
      ...args: Parameters<ClientToServerEvents[E]>
    ) => {
      return socketManager.emit(event, ...args);
    },
    []
  );

  const on = useCallback(
    <E extends keyof ServerToClientEvents>(
      event: E,
      listener: ServerToClientEvents[E]
    ) => {
      socketManager.on(event, listener);
    },
    []
  );

  const off = useCallback(
    <E extends keyof ServerToClientEvents>(
      event: E,
      listener?: ServerToClientEvents[E]
    ) => {
      socketManager.off(event, listener);
    },
    []
  );

  return {
    status,
    isConnected: status === SocketStatus.Connected,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
}

export default useSocket;
