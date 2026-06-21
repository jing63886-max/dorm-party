'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Countdown from '@/components/common/Countdown';
import { GamePhase } from '@/types';

/**
 * GameHeader - 游戏顶部状态栏
 * 回合数、当前阶段、计时器、主题名称、玩家头像列表
 */

/** 玩家头像信息 */
export interface HeaderPlayer {
  /** 玩家 ID */
  id: string;
  /** 玩家昵称 */
  nickname: string;
  /** 头像 URL */
  avatar?: string;
  /** 是否存活 */
  isAlive: boolean;
}

/** 阶段显示配置 */
const phaseConfig: Record<GamePhase, { label: string; colorClass: string }> = {
  [GamePhase.Waiting]: { label: '等待中', colorClass: 'text-gray-400' },
  [GamePhase.RoleAssign]: { label: '角色分配', colorClass: 'text-primary-light' },
  [GamePhase.Night]: { label: '夜晚', colorClass: 'text-purple-300' },
  [GamePhase.Day]: { label: '白天', colorClass: 'text-accent-light' },
  [GamePhase.Discussion]: { label: '讨论', colorClass: 'text-blue-300' },
  [GamePhase.Voting]: { label: '投票', colorClass: 'text-red-300' },
  [GamePhase.Event]: { label: '事件', colorClass: 'text-secondary-light' },
  [GamePhase.Ending]: { label: '结束', colorClass: 'text-green-300' },
};

interface GameHeaderProps {
  /** 当前回合数 */
  round: number;
  /** 总回合数 */
  totalRounds?: number;
  /** 当前阶段 */
  phase: GamePhase;
  /** 倒计时总秒数 */
  timerTotal?: number;
  /** 倒计时当前秒数 */
  timerCurrent?: number;
  /** 主题名称 */
  themeName?: string;
  /** 玩家列表 */
  players?: HeaderPlayer[];
  /** 自定义类名 */
  className?: string;
}

export default function GameHeader({
  round,
  totalRounds,
  phase,
  timerTotal = 60,
  timerCurrent = 60,
  themeName,
  players = [],
  className,
}: GameHeaderProps) {
  const phaseInfo = phaseConfig[phase] || phaseConfig[GamePhase.Waiting];

  return (
    <div
      className={cn(
        'shrink-0 bg-dark-card/80 backdrop-blur-md border-b border-dark-border',
        className
      )}
    >
      {/* 顶部信息栏 */}
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* 左侧：回合 + 阶段 */}
        <div className="flex items-center gap-2">
          {/* 回合数 */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark/50 border border-dark-border">
            <span className="text-xs text-gray-400">回合</span>
            <span className="text-sm font-bold text-white">
              {round}
              {totalRounds && <span className="text-gray-500 font-normal">/{totalRounds}</span>}
            </span>
          </div>

          {/* 阶段标签 */}
          <div className={cn(
            'px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20',
            phaseInfo.colorClass
          )}>
            <span className="text-xs font-medium">{phaseInfo.label}</span>
          </div>
        </div>

        {/* 中间：主题名称 */}
        {themeName && (
          <span className="text-xs text-gray-500 truncate max-w-[100px]">
            {themeName}
          </span>
        )}

        {/* 右侧：倒计时 */}
        <Countdown
          totalSeconds={timerTotal}
          currentSeconds={timerCurrent}
          size={40}
        />
      </div>

      {/* 玩家头像列表 */}
      {players.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 pb-2 overflow-x-auto no-scrollbar">
          {players.map((player) => (
            <div
              key={player.id}
              className="relative shrink-0"
              title={player.nickname}
            >
              <div className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold',
                'border-2 transition-all duration-200',
                player.isAlive
                  ? 'border-primary/40 bg-gradient-to-br from-primary/30 to-secondary/30'
                  : 'border-gray-600 bg-gray-700 opacity-50'
              )}>
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

              {/* 死亡标记 */}
              {!player.isAlive && (
                <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-[8px] text-white font-bold">x</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
