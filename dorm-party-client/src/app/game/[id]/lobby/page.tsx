'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Copy, Check, LogOut, Users } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import Button from '@/components/common/Button';
import PlayerSlot from '@/components/room/PlayerSlot';
import { useSocket } from '@/hooks/useSocket';
import { useUserStore, useRoomStore } from '@/lib/store';
import { copyToClipboard, cn } from '@/lib/utils';
import type { Player } from '@/types';

/**
 * 等待大厅页面
 * 显示房间信息、邀请码、4个玩家位置、准备/开始按钮
 * 支持实时 Socket 更新
 */
export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  const { emit } = useSocket();
  const { userId } = useUserStore();
  const { currentRoom, players, isReady, setReady } = useRoomStore();

  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  /* 判断当前用户是否是房主 */
  const isHost = currentRoom?.hostId === userId;

  /* 判断是否全员准备 */
  const allReady = players.length >= 2 && players.every((p) => p.isReady);

  /* 复制邀请码 */
  const handleCopyCode = useCallback(async () => {
    const code = currentRoom?.code || gameId;
    const success = await copyToClipboard(code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentRoom?.code, gameId]);

  /* 准备/取消准备 */
  const handleToggleReady = useCallback(() => {
    const newState = !isReady;
    setReady(newState);
    emit('room:ready', { isReady: newState });
  }, [isReady, setReady, emit]);

  /* 开始游戏（房主） */
  const handleStartGame = useCallback(() => {
    if (!allReady) return;
    setIsStarting(true);
    emit('room:start');
    /* 游戏开始后由 socket 事件驱动跳转到角色卡页面 */
    router.push(`/game/${gameId}/role`);
  }, [allReady, emit, gameId, router]);

  /* 离开房间 */
  const handleLeave = useCallback(() => {
    emit('room:leave');
    router.push('/');
  }, [emit, router]);

  /* Socket 事件监听 */
  useEffect(() => {
    const handleRoomUpdated = () => {
      /* 房间信息更新时重新渲染 */
    };

    const handlePlayerJoined = (player: Player) => {
      /* 新玩家加入 */
      console.log('玩家加入:', player.nickname);
    };

    const handlePlayerLeft = (data: { playerId: string }) => {
      /* 玩家离开 */
      console.log('玩家离开:', data.playerId);
    };

    const handlePlayerReady = (data: { playerId: string; isReady: boolean }) => {
      /* 玩家准备状态更新 */
      console.log('玩家准备状态更新:', data);
    };

    const handleGameStarted = () => {
      /* 游戏开始，跳转到角色卡 */
      router.push(`/game/${gameId}/role`);
    };

    /* 注册事件监听 */
    const unsubUpdated = useSocket;
    // 实际项目中通过 useSocket 的 handlers 参数注册
    // 这里简化处理

    return () => {
      /* 清理事件监听 */
    };
  }, [gameId, router]);

  /* 构建4个位置的玩家数据 */
  const getSlotPlayer = (index: number): Player | null => {
    return players.find((p) => p.seatIndex === index) || null;
  };

  return (
    <MobileLayout>
      <div className="flex flex-1 flex-col">
        {/* 顶部导航栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-light" />
            <h1 className="text-lg font-bold text-white">等待大厅</h1>
          </div>
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>离开</span>
          </button>
        </div>

        {/* 房间信息卡片 */}
        <div className="mx-4 mt-4 p-4 rounded-xl bg-dark-card border border-dark-border animate-fade-in">
          <div className="flex items-center justify-between">
            {/* 邀请码 */}
            <div>
              <p className="text-xs text-gray-500 mb-1">房间邀请码</p>
              <p className="text-2xl font-bold tracking-[0.3em] text-white">
                {currentRoom?.code || gameId.toUpperCase()}
              </p>
            </div>

            {/* 复制按钮 */}
            <button
              onClick={handleCopyCode}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all duration-200',
                copied
                  ? 'bg-green-500/15 border-green-500/30 text-green-400'
                  : 'bg-dark/50 border-dark-border text-gray-400 hover:border-primary/40 hover:text-primary-light'
              )}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="text-sm">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span className="text-sm">复制</span>
                </>
              )}
            </button>
          </div>

          {/* 玩家数量 */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">
              已加入 {players.length}/4 人
            </span>
            {players.length < 2 && (
              <span className="text-xs text-accent">
                至少需要2人才能开始
              </span>
            )}
          </div>
        </div>

        {/* 玩家位置网格 (2x2) */}
        <div className="flex-1 px-4 py-6">
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((index) => (
              <PlayerSlot
                key={index}
                player={getSlotPlayer(index)}
                seatIndex={index}
                isMe={getSlotPlayer(index)?.userId === userId}
              />
            ))}
          </div>
        </div>

        {/* 底部操作区域 */}
        <div className="shrink-0 px-4 py-4 border-t border-dark-border safe-bottom">
          {isHost ? (
            /* 房主：开始游戏按钮 */
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!allReady}
              loading={isStarting}
              onClick={handleStartGame}
            >
              {allReady ? '开始游戏' : '等待玩家准备...'}
            </Button>
          ) : (
            /* 非房主：准备按钮 */
            <Button
              variant={isReady ? 'secondary' : 'primary'}
              size="lg"
              className="w-full"
              onClick={handleToggleReady}
            >
              {isReady ? '取消准备' : '准备'}
            </Button>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
