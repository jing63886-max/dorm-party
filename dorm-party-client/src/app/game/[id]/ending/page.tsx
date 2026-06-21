'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, RotateCcw, Home, Star, Crown, Skull, ChevronDown, ChevronUp } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import Button from '@/components/common/Button';
import { useGameStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { GamePlayer, CharacterTeam } from '@/types';

/**
 * 结局页面
 * 游戏结局展示、秘密揭晓、玩家排名、个人得分、操作按钮
 */

/** 模拟玩家数据 */
const MOCK_PLAYERS: Array<GamePlayer & { score: number; secret: string }> = [
  {
    id: '1',
    userId: 'user1',
    nickname: '我',
    isAlive: true,
    character: { id: 'c1', name: '宫廷侍卫', team: 'good' as never, description: '', abilities: [] },
    score: 850,
    secret: '你其实是前朝皇族的后裔',
    seatIndex: 0,
    isProtected: false,
  },
  {
    id: '2',
    userId: 'user2',
    nickname: '小明',
    isAlive: true,
    character: { id: 'c2', name: '刺客', team: 'bad' as never, description: '', abilities: [] },
    score: 620,
    secret: '你的真实身份是刺客组织的成员',
    seatIndex: 1,
    isProtected: false,
  },
  {
    id: '3',
    userId: 'user3',
    nickname: '小红',
    isAlive: false,
    character: { id: 'c3', name: '宫女', team: 'good' as never, description: '', abilities: [] },
    score: 430,
    secret: '你暗中帮助刺客传递情报',
    seatIndex: 2,
    isProtected: false,
  },
  {
    id: '4',
    userId: 'user4',
    nickname: '小刚',
    isAlive: false,
    character: { id: 'c4', name: '大臣', team: 'neutral' as never, description: '', abilities: [] },
    score: 310,
    secret: '你试图两面三刀获取最大利益',
    seatIndex: 3,
    isProtected: false,
  },
];

/** 阵营颜色 */
const teamColors: Record<string, string> = {
  good: 'text-blue-400',
  bad: 'text-red-400',
  neutral: 'text-yellow-400',
};

export default function EndingPage() {
  const router = useRouter();
  const { ending } = useGameStore();
  const [showSecrets, setShowSecrets] = useState(false);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  /* 按分数排序 */
  const rankedPlayers = [...MOCK_PLAYERS].sort((a, b) => b.score - a.score);

  /* 获胜阵营 */
  const winnerTeam: CharacterTeam = 'good' as never;
  const winnerLabel = winnerTeam === 'good' ? '好人阵营获胜' : '坏人阵营获胜';

  /* 再来一局 */
  const handlePlayAgain = () => {
    router.push('/room/create');
  };

  /* 返回首页 */
  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <MobileLayout>
      <div className="flex flex-1 flex-col">
        {/* 内容区域（可滚动） */}
        <div className="flex-1 overflow-y-auto">
          {/* 结局标题区域 */}
          <div className="flex flex-col items-center pt-10 pb-6 px-4 animate-fade-in">
            {/* 奖杯图标 */}
            <div className="relative mb-5">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-accent to-yellow-600 flex items-center justify-center shadow-2xl shadow-accent/30 animate-float">
                <Trophy className="h-10 w-10 text-white" />
              </div>
              {/* 装饰粒子 */}
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary animate-ping" />
              <div className="absolute -bottom-2 -left-2 h-3 w-3 rounded-full bg-secondary animate-bounce" />
            </div>

            {/* 结局文字 */}
            <h1 className="text-2xl font-extrabold gradient-text mb-2">
              游戏结束
            </h1>
            <p className="text-lg font-semibold text-accent mb-1">
              {winnerLabel}
            </p>
            <p className="text-sm text-gray-400 text-center max-w-xs">
              好人阵营成功找出了所有隐藏的刺客，宫廷恢复了往日的安宁。
            </p>
          </div>

          {/* 我的得分卡片 */}
          <div className="mx-4 mb-6 p-5 rounded-2xl bg-gradient-to-r from-primary/15 to-secondary/15 border border-primary/25 animate-slide-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">我的得分</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">
                    {MOCK_PLAYERS[0].score}
                  </span>
                  <span className="text-sm text-gray-400">分</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">排名</p>
                <div className="flex items-center gap-1">
                  <Crown className="h-5 w-5 text-accent" />
                  <span className="text-xl font-bold text-accent">
                    #{rankedPlayers.findIndex((p) => p.id === '1') + 1}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 玩家排名列表 */}
          <div className="mx-4 mb-6">
            <h3 className="text-base font-semibold text-gray-200 mb-3">
              玩家排名
            </h3>
            <div className="space-y-2">
              {rankedPlayers.map((player, index) => {
                const isMe = player.id === '1';
                const isExpanded = expandedPlayer === player.id;

                return (
                  <div
                    key={player.id}
                    className={cn(
                      'rounded-xl border overflow-hidden transition-all duration-200',
                      isMe
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-dark-card border-dark-border'
                    )}
                  >
                    {/* 排名行 */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* 排名序号 */}
                      <div className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                        index === 0 && 'bg-accent/20 text-accent',
                        index === 1 && 'bg-gray-400/20 text-gray-300',
                        index === 2 && 'bg-orange-400/20 text-orange-400',
                        index > 2 && 'bg-dark-border text-gray-500'
                      )}>
                        {index === 0 ? (
                          <Star className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>

                      {/* 头像 */}
                      <div className={cn(
                        'h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                        'bg-gradient-to-br from-primary/30 to-secondary/30',
                        !player.isAlive && 'opacity-50 grayscale'
                      )}>
                        {player.nickname.charAt(0)}
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-sm font-medium truncate',
                            isMe ? 'text-primary-light' : 'text-gray-200'
                          )}>
                            {player.nickname}
                            {isMe && <span className="text-xs text-gray-500">(我)</span>}
                          </span>
                          {!player.isAlive && (
                            <Skull className="h-3.5 w-3.5 text-red-400 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn('text-xs', teamColors[player.character?.team || 'good'])}>
                            {player.character?.name || '未知'}
                          </span>
                          <span className="text-xs text-gray-600">|</span>
                          <span className="text-xs text-gray-500">
                            {player.isAlive ? '存活' : '已出局'}
                          </span>
                        </div>
                      </div>

                      {/* 分数 */}
                      <div className="text-right shrink-0">
                        <span className={cn(
                          'text-lg font-bold',
                          index === 0 ? 'text-accent' : 'text-gray-200'
                        )}>
                          {player.score}
                        </span>
                        <span className="text-xs text-gray-500 ml-0.5">分</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 所有秘密揭晓 */}
          <div className="mx-4 mb-6">
            <button
              onClick={() => setShowSecrets(!showSecrets)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-secondary/10 border border-secondary/20 hover:bg-secondary/15 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-secondary-light">
                  揭晓所有秘密
                </span>
                <span className="text-xs text-secondary/60">
                  ({MOCK_PLAYERS.length} 个)
                </span>
              </div>
              {showSecrets ? (
                <ChevronUp className="h-4 w-4 text-secondary" />
              ) : (
                <ChevronDown className="h-4 w-4 text-secondary" />
              )}
            </button>

            {showSecrets && (
              <div className="mt-2 space-y-2 animate-fade-in">
                {MOCK_PLAYERS.map((player) => (
                  <div
                    key={player.id}
                    className="px-4 py-3 rounded-xl bg-dark-card border border-dark-border"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-200">
                        {player.nickname}
                      </span>
                      <span className={cn('text-xs', teamColors[player.character?.team || 'good'])}>
                        ({player.character?.name})
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 italic">
                      {player.secret}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部操作按钮 */}
        <div className="shrink-0 px-4 py-4 border-t border-dark-border safe-bottom space-y-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handlePlayAgain}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            再来一局
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={handleGoHome}
          >
            <Home className="h-4 w-4 mr-2" />
            返回首页
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
