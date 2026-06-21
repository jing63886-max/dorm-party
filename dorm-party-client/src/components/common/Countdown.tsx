'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Countdown - 圆形倒计时组件
 * 带圆形进度条、数字显示、颜色变化（绿->黄->红）和完成回调
 */

interface CountdownProps {
  /** 总秒数 */
  totalSeconds: number;
  /** 当前剩余秒数 */
  currentSeconds: number;
  /** 自定义类名 */
  className?: string;
  /** 圆形进度条尺寸（像素） */
  size?: number;
  /** 倒计时完成回调 */
  onComplete?: () => void;
}

export default function Countdown({
  totalSeconds,
  currentSeconds,
  className,
  size = 64,
  onComplete,
}: CountdownProps) {
  /* 是否已完成 */
  const [completed, setCompleted] = useState(false);

  /* 进度百分比 */
  const progress = totalSeconds > 0
    ? Math.max(0, currentSeconds / totalSeconds)
    : 0;

  /* 根据剩余时间比例计算颜色 */
  const getColor = (): string => {
    if (progress > 0.5) return '#22C55E';       // 绿色
    if (progress > 0.25) return '#F59E0B';      // 黄色
    return '#EF4444';                             // 红色
  };

  const color = getColor();

  /* SVG 圆形参数 */
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  /* 完成检测 */
  useEffect(() => {
    if (currentSeconds <= 0 && !completed) {
      setCompleted(true);
      onComplete?.();
    }
  }, [currentSeconds, completed, onComplete]);

  /* 重置完成状态（当秒数恢复时） */
  useEffect(() => {
    if (currentSeconds > 0) {
      setCompleted(false);
    }
  }, [currentSeconds]);

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center',
        completed && 'animate-pulse',
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* SVG 圆形进度条 */}
      <svg
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90"
      >
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>

      {/* 中间数字 */}
      <span
        className="relative z-10 font-bold tabular-nums"
        style={{
          fontSize: size * 0.32,
          color,
        }}
      >
        {Math.max(0, currentSeconds)}
      </span>
    </div>
  );
}
