'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import MobileLayout from '@/components/layout/MobileLayout';
import Button from '@/components/common/Button';
import RoleCard from '@/components/game/RoleCard';
import { useGameStore } from '@/lib/store';

/**
 * 角色卡页面
 * 展示分配到的角色信息，确认后进入聊天大厅
 */
export default function RolePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  const { myRole } = useGameStore();

  /* 进入游戏 */
  const handleEnterGame = () => {
    router.push(`/game/${gameId}/chat`);
  };

  return (
    <MobileLayout>
      <div className="flex flex-1 flex-col">
        {/* 顶部提示 */}
        <div className="text-center px-4 pt-6 pb-3 animate-fade-in">
          <p className="text-sm text-gray-400">
            你的角色已分配
          </p>
          <p className="text-xs text-gray-500 mt-1">
            请仔细阅读你的角色信息，不要让其他人看到
          </p>
        </div>

        {/* 角色卡内容（可滚动） */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {myRole ? (
            <RoleCard
              character={myRole}
              secret="你有一个不为人知的秘密，在游戏中你需要隐藏这个秘密直到最后。"
              personalGoal="找出所有隐藏身份的玩家，保护自己的秘密不被发现。"
            />
          ) : (
            /* 模拟角色数据（开发预览用） */
            <RoleCard
              character={{
                id: 'role_1',
                name: '宫廷侍卫',
                team: 'good' as never,
                description: '你是皇宫中的侍卫长，负责保护皇帝的安全。你拥有敏锐的观察力和过人的武艺，但你需要小心，因为刺客可能就潜伏在你身边。',
                abilities: ['夜间巡逻 - 每晚可查看一名玩家的身份', '保护 - 可以保护一名玩家免受攻击'],
              }}
              secret="你其实是前朝皇族的后裔，你潜伏在宫廷中是为了寻找机会恢复家族荣耀。"
              personalGoal="在不暴露自己真实身份的前提下，找出所有对皇帝有威胁的人。"
            />
          )}
        </div>

        {/* 底部操作按钮 */}
        <div className="shrink-0 px-4 py-4 border-t border-dark-border safe-bottom">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleEnterGame}
          >
            我已了解，进入游戏
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
