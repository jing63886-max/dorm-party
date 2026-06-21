'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useCountdown Hook
 * 简单倒计时Hook，适用于各种倒计时场景
 * 支持暂停、恢复、重置
 *
 * @param seconds - 倒计时秒数
 * @param options - 配置选项
 * @returns 倒计时状态和控制方法
 */
interface UseCountdownOptions {
  /** 倒计时结束回调 */
  onComplete?: () => void;
  /** 是否自动开始（默认 false） */
  autoStart?: boolean;
  /** 间隔时间（毫秒，默认 1000） */
  interval?: number;
}

interface UseCountdownReturn {
  /** 剩余秒数 */
  seconds: number;
  /** 是否正在倒计时 */
  isRunning: boolean;
  /** 是否已完成 */
  isCompleted: boolean;
  /** 格式化后的时间 (mm:ss) */
  formatted: string;
  /** 开始倒计时 */
  start: () => void;
  /** 暂停倒计时 */
  pause: () => void;
  /** 恢复倒计时 */
  resume: () => void;
  /** 重置倒计时 */
  reset: (newSeconds?: number) => void;
}

export function useCountdown(
  initialSeconds: number,
  options: UseCountdownOptions = {}
): UseCountdownReturn {
  const {
    onComplete,
    autoStart = false,
    interval = 1000,
  } = options;

  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const initialSecondsRef = useRef(initialSeconds);

  // 更新回调引用
  onCompleteRef.current = onComplete;

  // 清除计时器
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 倒计时逻辑
  useEffect(() => {
    if (!isRunning || seconds <= 0) {
      if (seconds <= 0 && isRunning) {
        clearTimer();
        setIsRunning(false);
        setIsCompleted(true);
        onCompleteRef.current?.();
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setSeconds((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          return 0;
        }
        return next;
      });
    }, interval);

    return clearTimer;
  }, [isRunning, seconds, interval, clearTimer]);

  // 自动开始
  useEffect(() => {
    if (autoStart && initialSeconds > 0) {
      setIsRunning(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // 组件卸载时清理
  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  const start = useCallback(() => {
    if (seconds > 0) {
      setIsRunning(true);
      setIsCompleted(false);
    }
  }, [seconds]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    if (seconds > 0 && !isCompleted) {
      setIsRunning(true);
    }
  }, [seconds, isCompleted]);

  const reset = useCallback(
    (newSeconds?: number) => {
      clearTimer();
      const target = newSeconds !== undefined ? newSeconds : initialSecondsRef.current;
      setSeconds(target);
      setIsRunning(false);
      setIsCompleted(false);
    },
    [clearTimer]
  );

  // 格式化时间
  const formatted = formatCountdownTime(seconds);

  return {
    seconds,
    isRunning,
    isCompleted,
    formatted,
    start,
    pause,
    resume,
    reset,
  };
}

/**
 * 格式化倒计时时间
 */
function formatCountdownTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default useCountdown;
