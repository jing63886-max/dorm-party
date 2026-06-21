'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Countdown from '@/components/common/Countdown';
import Button from '@/components/common/Button';

/**
 * VotePanel - 投票面板组件
 * 投票目标列表、选中状态、已投票人数、倒计时、确认按钮、技能使用按钮
 */

/** 投票目标 */
export interface VoteTarget {
  /** 玩家 ID */
  id: string;
  /** 玩家昵称 */
  nickname: string;
  /** 玩家头像 */
  avatar?: string;
  /** 是否存活 */
  isAlive: boolean;
  /** 是否是自己 */
  isMe?: boolean;
}

interface VotePanelProps {
  /** 投票目标列表 */
  targets: VoteTarget[];
  /** 当前选中的目标 ID */
  selectedTargetId: string | null;
  /** 选择目标回调 */
  onSelectTarget: (targetId: string) => void;
  /** 确认投票回调 */
  onConfirmVote: () => void;
  /** 跳过投票回调 */
  onSkipVote?: () => void;
  /** 使用技能回调 */
  onUseSkill?: () => void;
  /** 已投票人数 */
  votedCount?: number;
  /** 总玩家数 */
  totalPlayers?: number;
  /** 倒计时总秒数 */
  countdownTotal?: number;
  /** 倒计时当前秒数 */
  countdownCurrent?: number;
  /** 倒计时结束回调 */
  onCountdownEnd?: () => void;
  /** 是否已投票 */
  hasVoted?: boolean;
  /** 是否有可用技能 */
  hasSkill?: boolean;
  /** 技能名称 */
  skillName?: string;
  /** 自定义类名 */
  className?: string;
}

export default function VotePanel({
  targets,
  selectedTargetId,
  onSelectTarget,
  onConfirmVote,
  onSkipVote,
  onUseSkill,
  votedCount = 0,
  totalPlayers = 4,
  countdownTotal = 30,
  countdownCurrent = 30,
  onCountdownEnd,
  hasVoted = false,
  hasSkill = false,
  skillName = '使用技能',
  className,
}: VotePanelProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* 头部：标题 + 倒计时 + 投票进度 */}
      <div className="flex items-center justify-between px-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">投票阶段</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            选择你认为是可疑的玩家
          </p>
        </div>
        <Countdown
          totalSeconds={countdownTotal}
          currentSeconds={countdownCurrent}
          size={52}
          onComplete={onCountdownEnd}
        />
      </div>

      {/* 投票进度 */}
      <div className="mx-4 mb-4">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
          <span>投票进度</span>
          <span>{votedCount}/{totalPlayers} 人已投票</span>
        </div>
        <div className="h-1.5 bg-dark-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${totalPlayers > 0 ? (votedCount / totalPlayers) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* 投票目标列表 */}
      <div className="px-4 space-y-2 mb-4">
        {targets.map((target) => {
          const isSelected = selectedTargetId === target.id;
          const isDisabled = hasVoted || !target.isAlive || target.isMe;

          return (
            <button
              key={target.id}
              onClick={() => !isDisabled && onSelectTarget(target.id)}
              disabled={isDisabled}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl',
                'border transition-all duration-200',
                'active:scale-[0.98]',
                /* 未选中 */
                !isSelected && [
                  'bg-dark-card border-dark-border',
                  !isDisabled && 'hover:border-primary/40',
                ],
                /* 选中 */
                isSelected && [
                  'bg-primary/15 border-primary/50',
                  'shadow-md shadow-primary/10',
                ],
                /* 禁用状态 */
                isDisabled && [
                  'opacity-40 cursor-not-allowed',
                ],
                /* 已死亡 */
                !target.isAlive && 'line-through'
              )}
            >
              {/* 头像 */}
              <div className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                target.avatar ? 'overflow-hidden' : 'bg-gradient-to-br from-primary/30 to-secondary/30'
              )}>
                {target.avatar ? (
                  <img
                    src={target.avatar}
                    alt={target.nickname}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-white">
                    {target.nickname.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* 昵称 */}
              <span className={cn(
                'flex-1 text-sm font-medium text-left',
                isSelected ? 'text-primary-light' : 'text-gray-200'
              )}>
                {target.nickname}
                {target.isMe && <span className="text-xs text-gray-500 ml-1">(自己)</span>}
                {!target.isAlive && <span className="text-xs text-red-400 ml-1">(已出局)</span>}
              </span>

              {/* 选中指示器 */}
              {isSelected && (
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 操作按钮区域 */}
      <div className="px-4 space-y-2">
        {/* 确认投票按钮 */}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!selectedTargetId || hasVoted}
          loading={hasVoted}
          onClick={onConfirmVote}
        >
          {hasVoted ? '已投票' : '确认投票'}
        </Button>

        {/* 底部操作行：跳过投票 + 使用技能 */}
        <div className="flex gap-2">
          {onSkipVote && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              disabled={hasVoted}
              onClick={onSkipVote}
            >
              跳过投票
            </Button>
          )}
          {hasSkill && onUseSkill && (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              disabled={hasVoted}
              onClick={onUseSkill}
            >
              {skillName}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
