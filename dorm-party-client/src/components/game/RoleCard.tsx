'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Shield, Swords, Eye, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Character, CharacterTeam } from '@/types';

/**
 * RoleCard - 角色卡组件
 * 展示角色头像、名称、身份描述、秘密区域、个人目标、技能列表
 */

interface RoleCardProps {
  /** 角色信息 */
  character: Character;
  /** 角色秘密（可选） */
  secret?: string;
  /** 个人目标 */
  personalGoal?: string;
  /** 自定义类名 */
  className?: string;
}

/** 阵营对应的颜色和名称 */
const teamConfig: Record<CharacterTeam, { label: string; colorClass: string; bgClass: string }> = {
  [CharacterTeam.Good]: {
    label: '好人阵营',
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-500/15 border-blue-500/30',
  },
  [CharacterTeam.Bad]: {
    label: '坏人阵营',
    colorClass: 'text-red-400',
    bgClass: 'bg-red-500/15 border-red-500/30',
  },
  [CharacterTeam.Neutral]: {
    label: '中立阵营',
    colorClass: 'text-yellow-400',
    bgClass: 'bg-yellow-500/15 border-yellow-500/30',
  },
};

/** 技能图标映射 */
const skillIcons: Record<string, React.ElementType> = {
  'shield': Shield,
  'swords': Swords,
  'eye': Eye,
  'zap': Zap,
};

export default function RoleCard({
  character,
  secret,
  personalGoal,
  className,
}: RoleCardProps) {
  const [isSecretExpanded, setIsSecretExpanded] = useState(false);
  const team = teamConfig[character.team];

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-2xl',
        'bg-gradient-to-b from-dark-card to-dark',
        'border border-dark-border',
        'animate-bounce-in',
        className
      )}
    >
      {/* 顶部装饰条 */}
      <div className="h-1.5 bg-gradient-to-r from-primary via-secondary to-accent" />

      {/* 角色头像区域 */}
      <div className="flex flex-col items-center pt-6 pb-4">
        {/* 头像容器 */}
        <div className={cn(
          'relative h-24 w-24 rounded-full flex items-center justify-center',
          'border-4',
          'bg-gradient-to-br from-primary/20 to-secondary/20',
          'border-primary/40',
          'shadow-lg shadow-primary/20',
          'animate-pulse-glow'
        )}>
          {character.avatar ? (
            <img
              src={character.avatar}
              alt={character.name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span className="text-4xl">
              {character.team === CharacterTeam.Good ? '🛡️' :
               character.team === CharacterTeam.Bad ? '🗡️' : '⚖️'}
            </span>
          )}
        </div>

        {/* 角色名称 */}
        <h2 className="mt-3 text-2xl font-bold gradient-text">
          {character.name}
        </h2>

        {/* 阵营标签 */}
        <div className={cn(
          'mt-2 px-3 py-1 rounded-full border text-xs font-medium',
          team.bgClass,
          team.colorClass
        )}>
          {team.label}
        </div>
      </div>

      {/* 角色描述 */}
      <div className="mx-5 mb-4 p-4 rounded-xl bg-dark/50 border border-dark-border">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          身份描述
        </h4>
        <p className="text-sm text-gray-200 leading-relaxed">
          {character.description}
        </p>
      </div>

      {/* 技能列表 */}
      {character.abilities.length > 0 && (
        <div className="mx-5 mb-4 p-4 rounded-xl bg-dark/50 border border-dark-border">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            技能
          </h4>
          <div className="space-y-2">
            {character.abilities.map((ability, index) => {
              /* 根据技能关键词匹配图标 */
              const IconComponent = skillIcons[ability.toLowerCase().split(' ')[0]] || Zap;

              return (
                <div
                  key={index}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-primary/5 border border-primary/10"
                >
                  <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <IconComponent className="h-4 w-4 text-primary-light" />
                  </div>
                  <span className="text-sm text-gray-200">{ability}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 秘密区域（可展开/折叠） */}
      {secret && (
        <div className="mx-5 mb-4">
          <button
            onClick={() => setIsSecretExpanded(!isSecretExpanded)}
            className={cn(
              'w-full flex items-center justify-between p-4 rounded-xl',
              'bg-secondary/10 border border-secondary/20',
              'transition-all duration-200',
              'hover:bg-secondary/15'
            )}
          >
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium text-secondary-light">
                我的秘密
              </span>
            </div>
            {isSecretExpanded ? (
              <ChevronUp className="h-4 w-4 text-secondary" />
            ) : (
              <ChevronDown className="h-4 w-4 text-secondary" />
            )}
          </button>

          {/* 秘密内容 */}
          {isSecretExpanded && (
            <div className="mt-2 p-4 rounded-xl bg-secondary/5 border border-secondary/15 animate-fade-in">
              <p className="text-sm text-secondary-light leading-relaxed italic">
                {secret}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 个人目标 */}
      {personalGoal && (
        <div className="mx-5 mb-5 p-4 rounded-xl bg-accent/10 border border-accent/20">
          <h4 className="text-xs font-semibold text-accent/60 uppercase tracking-wider mb-2">
            个人目标
          </h4>
          <p className="text-sm text-accent-light leading-relaxed">
            {personalGoal}
          </p>
        </div>
      )}
    </div>
  );
}
