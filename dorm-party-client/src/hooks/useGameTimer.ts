'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useGameTimer Hook
 * 游戏计时器，支持开始、暂停、重置
 * 倒计时到0时自动触发回调
 *
 * @param options - 计时器配置
 * @returns 计时器状态和控制方法
 */
interface UseGameTimerOptions {
  /** 初始时间（秒） */
  initialTime: number;
  /** 倒计时结束回调 */
  onTimeUp?: () => void;
  /** 每秒回调（返回剩余时间） */
  onTick?: (remaining: number) => void;
  /** 是否自动开始（默认 false） */
  autoStart?: boolean;
  /** 计时方向：倒计时或正计时（默认倒计时） */
  direction?: 'countdown' | 'countup';
}

interface UseGameTimerReturn {
  /** 剩余时间（秒） */
  time: number;
  /** 是否正在运行 */
  isRunning: boolean;
  /** 是否已结束 */
  isFinished: boolean;
  /** 格式化后的时间字符串 (mm:ss) */
  formattedTime: string;
  /** 开始计时 */
  start: () => void;
  /** 暂停计时 */
  pause: () => void;
  /** 重置计时 */
  reset: (newTime?: number) => void;
  /** 设置时间 */
  setTime: (time: number) => void;
}

export function useGameTimer(options: UseGameTimerOptions): UseGameTimerReturn {
  const {
    initialTime,
    onTimeUp,
    onTick,
    autoStart = false,
    direction = 'countdown',
  } = options;

  const [time, setTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeUpRef = useRef(onTimeUp);
  const onTickRef = useRef(onTick);

  // 更新回调引用
  onTimeUpRef.current = onTimeUp;
  onTickRef.current = onTick;

  // 清除计时器
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 计时逻辑
  useEffect(() => {
    if (!isRunning) {
      clearTimer();
      return;
    }

    timerRef.current = setInterval(() => {
      setTime((prevTime) => {
        let newTime: number;

        if (direction === 'countdown') {
          newTime = prevTime - 1;
          // 倒计时结束
          if (newTime <= 0) {
            clearTimer();
            setIsRunning(false);
            setIsFinished(true);
            onTimeUpRef.current?.();
            return 0;
          }
        } else {
          // 正计时
          newTime = prevTime + 1;
        }

        // 触发每秒回调
        onTickRef.current?.(newTime);
        return newTime;
      });
    }, 1000);

    return clearTimer;
  }, [isRunning, direction, clearTimer]);

  // 自动开始
  useEffect(() => {
    if (autoStart) {
      setIsRunning(true);
    }
  }, [autoStart]);

  // 组件卸载时清理
  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  const start = useCallback(() => {
    if (time > 0 || direction === 'countup') {
      setIsRunning(true);
      setIsFinished(false);
    }
  }, [time, direction]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(
    (newTime?: number) => {
      clearTimer();
      setIsRunning(false);
      setIsFinished(false);
      setTime(newTime !== undefined ? newTime : initialTime);
    },
    [clearTimer, initialTime]
  );

  const setTimer = useCallback((newTime: number) => {
    setTime(newTime);
  }, []);

  // 格式化时间
  const formattedTime = formatTimerTime(time);

  return {
    time,
    isRunning,
    isFinished,
    formattedTime,
    start,
    pause,
    reset,
    setTime: setTimer,
  };
}

/**
 * 格式化计时器时间
 */
function formatTimerTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default useGameTimer;
