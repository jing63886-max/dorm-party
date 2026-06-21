'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trophy, Skull } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import VotePanel, { type VoteTarget } from '@/components/game/VotePanel';
import Button from '@/components/common/Button';
import { useSocket } from '@/hooks/useSocket';
import { useGameStore, useUserStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { VoteResult } from '@/types';

/**
 * 投票页面
 * 投票面板 + 倒计时 + 投票结果展示
 */

/** 模拟投票目标数据 */
const MOCK_VOTE_TARGETS: VoteTarget[] = [
  { id: '1', nickname: '我', isAlive: true, isMe: true },
  { id: '2', nickname: '小明', isAlive: true },
  { id: '3', nickname: '小红', isAlive: true },
  { id: '4', nickname: '小刚', isAlive: false },
];

export default function VotePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  const { emit } = useSocket();
  const { userId } = useUserStore();
  const { voteResult, setVoteResult } = useGameStore();

  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [showResult, setShowResult] = useState(false);

  /* 倒计时 */
  useEffect(() => {
    if (hasVoted || showResult) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          /* 时间到，自动显示结果 */
          handleShowResult();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasVoted, showResult]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 选择投票目标 */
  const handleSelectTarget = useCallback((targetId: string) => {
    if (hasVoted) return;
    setSelectedTargetId(targetId);
  }, [hasVoted]);

  /* 确认投票 */
  const handleConfirmVote = useCallback(() => {
    if (!selectedTargetId) return;

    setHasVoted(true);
    emit('game:vote', { targetId: selectedTargetId });

    /* 模拟：投票后延迟显示结果 */
    setTimeout(() => {
      handleShowResult();
    }, 3000);
  }, [selectedTargetId, emit]);

  /* 跳过投票 */
  const handleSkipVote = useCallback(() => {
    setHasVoted(true);
    emit('game:skip-vote');
  }, [emit]);

  /* 使用技能 */
  const handleUseSkill = useCallback(() => {
    emit('game:action', { action: 'use_skill' });
  }, [emit]);

  /* 显示投票结果 */
  const handleShowResult = useCallback(() => {
    setShowResult(true);
    setVoteResult({
      targetId: '3',
      targetNickname: '小红',
      votes: 2,
      isTie: false,
      allVotes: [
        { voterId: '1', targetId: '3', timestamp: Date.now() },
        { voterId: '2', targetId: '3', timestamp: Date.now() },
        { voterId: '3', targetId: '2', timestamp: Date.now() },
      ],
    });
  }, [setVoteResult]);

  /* 返回聊天大厅 */
  const handleBackToChat = () => {
    router.push(`/game/${gameId}/chat`);
  };

  return (
    <MobileLayout safeTop={false} safeBottom={false}>
      <div className="flex flex-1 flex-col h-full">
        {/* 顶部导航栏 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-border">
          <button
            onClick={handleBackToChat}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-300" />
          </button>
          <h1 className="text-lg font-bold text-white">投票</h1>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {!showResult ? (
            /* 投票面板 */
            <div className="py-4">
              <VotePanel
                targets={MOCK_VOTE_TARGETS}
                selectedTargetId={selectedTargetId}
                onSelectTarget={handleSelectTarget}
                onConfirmVote={handleConfirmVote}
                onSkipVote={handleSkipVote}
                onUseSkill={handleUseSkill}
                votedCount={hasVoted ? 1 : 0}
                totalPlayers={3}
                countdownTotal={30}
                countdownCurrent={countdown}
                onCountdownEnd={handleShowResult}
                hasVoted={hasVoted}
                hasSkill={true}
                skillName="查验身份"
              />
            </div>
          ) : (
            /* 投票结果展示 */
            <div className="flex flex-col items-center justify-center px-6 py-10 animate-fade-in">
              {/* 结果标题 */}
              <div className="text-center mb-8">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 border-2 border-red-500/30 mb-4">
                  <Skull className="h-8 w-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  投票结果
                </h2>
                <p className="text-sm text-gray-400">
                  {voteResult?.isTie
                    ? '平票！本轮无人被投出'
                    : `${voteResult?.targetNickname} 被投出了！`
                  }
                </p>
              </div>

              {/* 得票详情 */}
              {voteResult && !voteResult.isTie && (
                <div className="w-full max-w-sm mb-8 p-4 rounded-xl bg-dark-card border border-dark-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-400">得票详情</span>
                    <span className="text-sm font-bold text-red-400">
                      {voteResult.votes} 票
                    </span>
                  </div>

                  {/* 投票分布 */}
                  <div className="space-y-2">
                    {['小明', '小红', '我'].map((name) => {
                      const target = MOCK_VOTE_TARGETS.find((t) => t.nickname === name);
                      const votesForThis = voteResult.allVotes.filter(
                        (v) => v.targetId === target?.id
                      ).length;
                      const isEliminated = voteResult.targetId === target?.id;

                      return (
                        <div key={name} className="flex items-center gap-3">
                          <span className={cn(
                            'text-sm w-12 shrink-0',
                            isEliminated ? 'text-red-400 font-bold' : 'text-gray-300'
                          )}>
                            {name}
                          </span>
                          <div className="flex-1 h-2 bg-dark-border rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-1000',
                                isEliminated ? 'bg-red-500' : 'bg-primary'
                              )}
                              style={{
                                width: `${Math.max(votesForThis * 33, votesForThis > 0 ? 10 : 0)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-6 text-right">
                            {votesForThis}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 返回按钮 */}
              <Button
                variant="primary"
                size="lg"
                className="w-full max-w-sm"
                onClick={handleBackToChat}
              >
                返回聊天大厅
              </Button>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
