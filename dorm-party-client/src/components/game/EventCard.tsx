'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Countdown from '@/components/common/Countdown';

/**
 * EventCard - 事件卡片组件
 * 标题、描述、选项列表、倒计时、从底部滑入动画
 */

/** 事件选项 */
export interface EventOption {
  /** 选项 ID */
  id: string;
  /** 选项文本 */
  text: string;
  /** 选项图标（可选） */
  icon?: string;
}

interface EventCardProps {
  /** 事件标题 */
  title: string;
  /** 事件描述 */
  description: string;
  /** 选项列表 */
  options: EventOption[];
  /** 选择回调 */
  onSelect: (optionId: string) => void;
  /** 倒计时总秒数 */
  countdownTotal?: number;
  /** 倒计时当前秒数 */
  countdownCurrent?: number;
  /** 倒计时结束回调 */
  onCountdownEnd?: () => void;
  /** 是否已选择 */
  selectedOptionId?: string | null;
  /** 自定义类名 */
  className?: string;
}

export default function EventCard({
  title,
  description,
  options,
  onSelect,
  countdownTotal = 30,
  countdownCurrent = 30,
  onCountdownEnd,
  selectedOptionId,
  className,
}: EventCardProps) {
  return (
    <div
      className={cn(
        /* 基础样式 */
        'relative w-full mx-4',
        'bg-gradient-to-b from-dark-card to-dark-card/90',
        'border border-accent/30 rounded-2xl overflow-hidden',
        /* 从底部滑入动画 */
        'animate-slide-up',
        className
      )}
    >
      {/* 顶部装饰条 */}
      <div className="h-1 bg-gradient-to-r from-accent via-secondary to-primary" />

      {/* 头部区域 */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between">
          {/* 事件标题 */}
          <h3 className="text-lg font-bold text-accent">
            {title}
          </h3>

          {/* 倒计时 */}
          <Countdown
            totalSeconds={countdownTotal}
            currentSeconds={countdownCurrent}
            size={48}
            onComplete={onCountdownEnd}
          />
        </div>

        {/* 事件描述 */}
        <p className="mt-2 text-sm text-gray-300 leading-relaxed">
          {description}
        </p>
      </div>

      {/* 分割线 */}
      <div className="mx-5 h-px bg-dark-border" />

      {/* 选项列表 */}
      <div className="px-5 py-4 space-y-2.5">
        {options.map((option, index) => {
          const isSelected = selectedOptionId === option.id;

          return (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              disabled={!!selectedOptionId}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl',
                'border transition-all duration-200',
                'active:scale-[0.98]',
                /* 未选中 */
                !isSelected && [
                  'bg-dark/50 border-dark-border',
                  'hover:border-primary/40 hover:bg-primary/5',
                  !selectedOptionId && 'cursor-pointer',
                ],
                /* 已选中 */
                isSelected && [
                  'bg-primary/15 border-primary/50',
                  'shadow-md shadow-primary/10',
                ],
                /* 其他选项被选中时置灰 */
                selectedOptionId && !isSelected && [
                  'opacity-40 cursor-not-allowed',
                ]
              )}
            >
              {/* 选项序号 */}
              <span className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                isSelected
                  ? 'bg-primary text-white'
                  : 'bg-dark-border text-gray-400'
              )}>
                {String.fromCharCode(65 + index)}
              </span>

              {/* 选项图标 */}
              {option.icon && (
                <span className="text-lg">{option.icon}</span>
              )}

              {/* 选项文本 */}
              <span className={cn(
                'text-sm font-medium text-left',
                isSelected ? 'text-primary-light' : 'text-gray-200'
              )}>
                {option.text}
              </span>

              {/* 选中标记 */}
              {isSelected && (
                <svg
                  className="ml-auto h-5 w-5 text-primary shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
