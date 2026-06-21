'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * ThemeSelector - 主题选择器
 * 网格布局（2列），10个主题卡片，选中状态高亮
 */

/** 主题数据 */
export interface ThemeOption {
  /** 主题标识 */
  id: string;
  /** 主题名称 */
  name: string;
  /** 主题图标（emoji） */
  icon: string;
  /** 主题描述 */
  description: string;
}

/** 10个预设主题列表 */
export const THEME_LIST: ThemeOption[] = [
  { id: 'ancient-court', name: '古代宫廷', icon: '🏯', description: '深宫内苑，权谋争斗' },
  { id: 'cultivation', name: '修仙宗门', icon: '⚔️', description: '仙侠世界，问道长生' },
  { id: 'magic-academy', name: '魔法学院', icon: '🧙', description: '魔法世界，学院风云' },
  { id: 'space-station', name: '未来太空站', icon: '🚀', description: '星际时代，太空冒险' },
  { id: 'university-dorm', name: '大学宿舍', icon: '🎓', description: '校园生活，青春故事' },
  { id: 'republic-era', name: '民国风云', icon: '🎩', description: '民国乱世，家国情怀' },
  { id: 'medieval-west', name: '西方中世纪', icon: '🏰', description: '骑士王国，宫廷阴谋' },
  { id: 'jianghu', name: '江湖武林', icon: '🗡️', description: '武侠江湖，恩怨情仇' },
  { id: 'mythology', name: '神话世界', icon: '🐉', description: '上古神话，天地传说' },
  { id: 'time-travel', name: '穿越乱炖', icon: '🌀', description: '时空穿越，古今碰撞' },
];

interface ThemeSelectorProps {
  /** 当前选中的主题 ID */
  selectedId: string | null;
  /** 选中回调 */
  onSelect: (theme: ThemeOption) => void;
  /** 自定义类名 */
  className?: string;
}

export default function ThemeSelector({
  selectedId,
  onSelect,
  className,
}: ThemeSelectorProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* 标题 */}
      <h3 className="text-base font-semibold text-gray-200 mb-3">
        选择游戏主题
      </h3>

      {/* 2列网格 */}
      <div className="grid grid-cols-2 gap-3">
        {THEME_LIST.map((theme) => {
          const isSelected = selectedId === theme.id;

          return (
            <button
              key={theme.id}
              onClick={() => onSelect(theme)}
              className={cn(
                /* 基础样式 */
                'relative flex flex-col items-center gap-2 p-4 rounded-xl',
                'border transition-all duration-200',
                'active:scale-[0.97]',
                /* 未选中 */
                !isSelected && [
                  'bg-dark-card border-dark-border',
                  'hover:border-primary/40 hover:bg-dark-card/80',
                ],
                /* 选中 */
                isSelected && [
                  'bg-primary/15 border-primary/60',
                  'shadow-lg shadow-primary/20',
                ]
              )}
            >
              {/* 选中标记 */}
              {isSelected && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}

              {/* 主题图标 */}
              <span className="text-3xl" role="img" aria-label={theme.name}>
                {theme.icon}
              </span>

              {/* 主题名称 */}
              <span
                className={cn(
                  'text-sm font-medium',
                  isSelected ? 'text-primary-light' : 'text-gray-300'
                )}
              >
                {theme.name}
              </span>

              {/* 主题描述 */}
              <span className="text-xs text-gray-500 text-center leading-tight">
                {theme.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
