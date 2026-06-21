'use client';

import React from 'react';
import { Crown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Player } from '@/types';

/**
 * PlayerSlot - 玩家位置组件
 * 4个位置（2x2网格），支持空位/已加入/已准备三种状态
 */

interface PlayerSlotProps {
  /** 该位置的玩家信息（null 表示空位） */
  player: Player | null;
  /** 座位索引（0-3） */
  seatIndex: number;
  /** 是否是当前用户 */
  isMe?: boolean;
  /** 自定义类名 */
  className?: string;
}

export default function PlayerSlot({
  player,
  seatIndex,
  isMe = false,
  className,
}: PlayerSlotProps) {
  const isEmpty = !player;

  return (
    <div
      className={cn(
        /* 基础样式 */
        'relative flex flex-col items-center justify-center gap-2',
        'rounded-xl border p-4 transition-all duration-300',
        /* 空位样式 */
        isEmpty && [
          'bg-dark-card/50 border-dashed border-dark-border',
        ],
        /* 有玩家样式 */
        !isEmpty && [
          'bg-dark-card border-dark-border',
          'animate-on-enter',
        ],
        /* 已准备高亮 */
        player?.isReady && !isEmpty && [
          'border-green-500/40 bg-green-500/5',
        ],
        className
      )}
    >
      {/* 空位状态 */}
      {isEmpty && (
        <>
          {/* 空位占位头像 */}
          <div className="h-14 w-14 rounded-full bg-dark-border/50 flex items-center justify-center">
            <span className="text-2xl text-gray-600">?</span>
          </div>
          <span className="text-sm text-gray-600">
            等待加入...
          </span>
          <span className="text-xs text-gray-700">
            位置 {seatIndex + 1}
          </span>
        </>
      )}

      {/* 已加入状态 */}
      {!isEmpty && (
        <>
          {/* 头像 */}
          <div className="relative">
            <div
              className={cn(
                'h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold',
                'bg-gradient-to-br from-primary/30 to-secondary/30',
                'border-2',
                player.isReady ? 'border-green-500' : 'border-dark-border'
              )}
            >
              {player.avatar ? (
                <img
                  src={player.avatar}
                  alt={player.nickname}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white">
                  {player.nickname.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* 房主标记 */}
            {player.isHost && (
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent flex items-center justify-center">
                <Crown className="h-3 w-3 text-white" />
              </div>
            )}

            {/* 已准备标记 */}
            {player.isReady && (
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </div>

          {/* 昵称 */}
          <div className="text-center">
            <p className={cn(
              'text-sm font-medium truncate max-w-[100px]',
              isMe ? 'text-primary-light' : 'text-gray-200'
            )}>
              {player.nickname}
              {isMe && <span className="text-xs text-gray-500 ml-1">(我)</span>}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {player.isReady ? '已准备' : '未准备'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
