'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * ChatMessage - 聊天消息气泡组件
 * 区分消息类型，不同类型不同样式
 */

/** 消息类型 */
export type ChatMessageType =
  | 'chat'           // 玩家聊天
  | 'ai_narration'   // AI 旁白
  | 'npc_dialogue'   // NPC 对话
  | 'system'         // 系统消息
  | 'event';         // 事件通知

interface ChatMessageProps {
  /** 消息类型 */
  type: ChatMessageType;
  /** 消息内容 */
  content: string;
  /** 发送者昵称 */
  senderNickname?: string;
  /** 发送者头像 */
  senderAvatar?: string;
  /** 是否是自己发送的 */
  isSelf?: boolean;
  /** NPC 名称（仅 npc_dialogue 类型） */
  npcName?: string;
  /** 事件标题（仅 event 类型） */
  eventTitle?: string;
  /** 时间戳 */
  timestamp?: number;
  /** 自定义类名 */
  className?: string;
}

export default function ChatMessage({
  type,
  content,
  senderNickname,
  senderAvatar,
  isSelf = false,
  npcName,
  eventTitle,
  timestamp,
  className,
}: ChatMessageProps) {
  /* 格式化时间 */
  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  /* ====== AI 旁白 ====== */
  if (type === 'ai_narration') {
    return (
      <div className={cn('flex justify-center my-3 px-4', className)}>
        <div className="max-w-[85%] text-center">
          {/* 装饰线 */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary/30" />
            <span className="text-xs text-primary/60 font-medium">AI 旁白</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary/30" />
          </div>
          {/* 旁白内容 */}
          <p className="text-sm leading-relaxed text-purple-200/90 italic px-2">
            {content}
          </p>
        </div>
      </div>
    );
  }

  /* ====== NPC 对话 ====== */
  if (type === 'npc_dialogue') {
    return (
      <div className={cn('flex justify-center my-3 px-4', className)}>
        <div className="max-w-[85%] w-full">
          {/* NPC 名称 */}
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-accent">
              {npcName || 'NPC'}
            </span>
          </div>
          {/* 对话气泡 */}
          <div className="relative bg-accent/10 border border-accent/25 rounded-2xl px-4 py-3">
            {/* 左上角装饰三角 */}
            <div className="absolute -top-px left-6 w-3 h-3 bg-accent/10 border-t border-l border-accent/25 transform rotate-45 -translate-y-1/2" />
            <p className="text-sm leading-relaxed text-accent-light">
              {content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ====== 系统消息 ====== */
  if (type === 'system') {
    return (
      <div className={cn('flex justify-center my-2 px-4', className)}>
        <div className="bg-dark-card/60 border border-dark-border/50 rounded-full px-4 py-1.5">
          <p className="text-xs text-gray-500 text-center">
            {content}
          </p>
        </div>
      </div>
    );
  }

  /* ====== 事件通知 ====== */
  if (type === 'event') {
    return (
      <div className={cn('flex justify-center my-3 px-4', className)}>
        <div className="max-w-[85%] w-full bg-secondary/10 border border-secondary/25 rounded-xl px-4 py-3">
          {/* 事件标题 */}
          {eventTitle && (
            <p className="text-xs font-semibold text-secondary mb-1">
              {eventTitle}
            </p>
          )}
          <p className="text-sm text-secondary-light leading-relaxed">
            {content}
          </p>
        </div>
      </div>
    );
  }

  /* ====== 玩家聊天 ====== */
  return (
    <div
      className={cn(
        'flex gap-2 my-1.5 px-4 animate-fade-in',
        isSelf ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {/* 头像 */}
      <div className="shrink-0">
        {senderAvatar ? (
          <img
            src={senderAvatar}
            alt={senderNickname}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold',
            isSelf
              ? 'bg-primary/30 text-primary-light'
              : 'bg-secondary/30 text-secondary-light'
          )}>
            {(senderNickname || '?').charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* 消息内容 */}
      <div className={cn(
        'max-w-[75%] flex flex-col',
        isSelf ? 'items-end' : 'items-start'
      )}>
        {/* 发送者昵称 */}
        <p className={cn(
          'text-xs mb-0.5 px-1',
          isSelf ? 'text-gray-500' : 'text-gray-400'
        )}>
          {senderNickname || '未知'}
          {timestamp && (
            <span className="ml-1.5 text-gray-600">{formatTime(timestamp)}</span>
          )}
        </p>

        {/* 气泡 */}
        <div className={cn(
          'rounded-2xl px-3.5 py-2.5',
          isSelf
            ? 'bg-primary/20 border border-primary/30 rounded-br-sm'
            : 'bg-dark-card border border-dark-border rounded-bl-sm'
        )}>
          <p className={cn(
            'text-sm leading-relaxed',
            isSelf ? 'text-gray-100' : 'text-gray-200'
          )}>
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}
