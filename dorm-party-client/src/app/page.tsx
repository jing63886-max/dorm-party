'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PartyPopper, History, Wifi, WifiOff } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import Button from '@/components/common/Button';
import { useSocket } from '@/hooks/useSocket';
import { useUserStore } from '@/lib/store';
import { generateDeviceId } from '@/lib/utils';

/**
 * 首页 - Dorm Party 宿舍派对
 * 游戏入口页面，展示游戏信息和快速开始
 */

/** 最近游戏记录 */
interface GameRecord {
  id: string;
  themeName: string;
  date: string;
  result: string;
}

/** localStorage 存储键 */
const GAME_HISTORY_KEY = 'dorm-party-game-history';

export default function HomePage() {
  const router = useRouter();
  const { isConnected } = useSocket();
  const { userId, nickname, setUser } = useUserStore();
  const [recentGames, setRecentGames] = useState<GameRecord[]>([]);

  /* 初始化用户信息 */
  const ensureUser = () => {
    if (!userId) {
      const deviceId = generateDeviceId();
      setUser({
        userId: `user_${Date.now()}`,
        nickname: `玩家_${Math.floor(Math.random() * 9999)}`,
        deviceId,
      });
    }
  };

  /* 读取最近游戏记录 */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(GAME_HISTORY_KEY);
        if (stored) {
          setRecentGames(JSON.parse(stored));
        }
      } catch {
        /* 忽略解析错误 */
      }
    }
  }, []);

  /* 创建房间 */
  const handleCreateRoom = () => {
    ensureUser();
    router.push('/room/create');
  };

  /* 加入房间 */
  const handleJoinRoom = () => {
    ensureUser();
    router.push('/room/join');
  };

  return (
    <MobileLayout>
      <div className="flex flex-1 flex-col">
        {/* 顶部连接状态栏 */}
        <div className="flex items-center justify-between px-5 py-3">
          <h1 className="text-lg font-bold gradient-text">Dorm Party</h1>
          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-gray-500" />
            )}
            <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-gray-500'}`}>
              {isConnected ? '已连接' : '未连接'}
            </span>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          {/* Logo 区域 */}
          <div className="text-center mb-10 animate-fade-in">
            {/* Logo 图标 */}
            <div className="relative inline-block mb-5">
              <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-2xl shadow-primary/30 animate-float">
                <PartyPopper className="h-12 w-12 text-white" />
              </div>
              {/* 装饰圆点 */}
              <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-accent animate-bounce" />
              <div className="absolute -bottom-1 -left-1 h-3 w-3 rounded-full bg-secondary animate-pulse" />
            </div>

            {/* 标题 */}
            <h2 className="text-4xl font-extrabold gradient-text mb-2">
              Dorm Party
            </h2>
            <p className="text-gray-400 text-base">
              宿舍派对
            </p>
            <p className="text-gray-500 text-sm mt-1">
              多人实时互动派对游戏
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="w-full max-w-xs space-y-3 animate-slide-up">
            <Button
              variant="primary"
              size="lg"
              className="w-full animate-pulse-glow"
              onClick={handleCreateRoom}
            >
              创建房间
            </Button>

            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={handleJoinRoom}
            >
              加入房间
            </Button>
          </div>

          {/* 最近游戏记录 */}
          {recentGames.length > 0 && (
            <div className="w-full max-w-xs mt-8 animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-400">最近游戏</span>
              </div>
              <div className="space-y-2">
                {recentGames.slice(0, 3).map((game) => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-dark-card border border-dark-border"
                  >
                    <div>
                      <p className="text-sm text-gray-200">{game.themeName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{game.date}</p>
                    </div>
                    <span className="text-xs text-gray-400">{game.result}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部版本号 */}
        <footer className="text-center py-5 safe-bottom">
          <p className="text-xs text-gray-600">
            Dorm Party v1.0.0
          </p>
          <p className="text-xs text-gray-700 mt-0.5">
            和室友一起嗨翻天
          </p>
        </footer>
      </div>
    </MobileLayout>
  );
}
