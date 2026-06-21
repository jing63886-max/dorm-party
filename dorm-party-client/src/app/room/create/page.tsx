'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import Button from '@/components/common/Button';
import ThemeSelector, { type ThemeOption } from '@/components/room/ThemeSelector';
import { useSocket } from '@/hooks/useSocket';
import { useUserStore } from '@/lib/store';

/**
 * 创建房间页
 * 选择游戏主题，创建房间后跳转到等待大厅
 */
export default function CreateRoomPage() {
  const router = useRouter();
  const { emit } = useSocket();
  const { userId, nickname, deviceId } = useUserStore();

  const [selectedTheme, setSelectedTheme] = useState<ThemeOption | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  /* 选择主题 */
  const handleSelectTheme = (theme: ThemeOption) => {
    setSelectedTheme(theme);
  };

  /* 创建房间 */
  const handleCreate = async () => {
    if (!selectedTheme || !userId || !nickname || !deviceId) return;

    setIsCreating(true);
    try {
      emit('room:create', {
        nickname,
        deviceId,
      });
      /* 创建成功后由 socket 事件驱动跳转 */
      /* 实际项目中 room:created 事件会返回房间信息 */
      /* 这里模拟跳转 */
      router.push('/game/abc123/lobby');
    } catch (error) {
      console.error('创建房间失败:', error);
      setIsCreating(false);
    }
  };

  /* 返回首页 */
  const handleBack = () => {
    router.push('/');
  };

  return (
    <MobileLayout>
      <div className="flex flex-1 flex-col">
        {/* 顶部导航栏 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-border">
          <button
            onClick={handleBack}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-300" />
          </button>
          <h1 className="text-lg font-bold text-white">创建房间</h1>
        </div>

        {/* 内容区域（可滚动） */}
        <div className="flex-1 overflow-y-auto px-4 py-5">
          {/* 主题选择器 */}
          <ThemeSelector
            selectedId={selectedTheme?.id || null}
            onSelect={handleSelectTheme}
          />
        </div>

        {/* 底部操作区域 */}
        <div className="shrink-0 px-4 py-4 border-t border-dark-border safe-bottom">
          {/* 已选主题提示 */}
          {selectedTheme && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 animate-fade-in">
              <span className="text-lg">{selectedTheme.icon}</span>
              <span className="text-sm text-primary-light">
                已选择：{selectedTheme.name}
              </span>
            </div>
          )}

          {/* 创建按钮 */}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!selectedTheme}
            loading={isCreating}
            onClick={handleCreate}
          >
            创建房间
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
