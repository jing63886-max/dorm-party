'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Send, ArrowUp } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import Button from '@/components/common/Button';
import GameHeader from '@/components/game/GameHeader';
import ChatMessage, { type ChatMessageType } from '@/components/game/ChatMessage';
import EventCard, { type EventOption } from '@/components/game/EventCard';
import { useSocket } from '@/hooks/useSocket';
import { useGameStore, useUserStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { Message, GameEvent, GamePhase } from '@/types';

/**
 * 聊天大厅（主游戏界面）
 * 包含 GameHeader、消息列表、输入框、事件弹出、投票跳转
 */

/** 模拟消息数据（开发预览用） */
const MOCK_MESSAGES: Array<{
  type: ChatMessageType;
  content: string;
  senderNickname?: string;
  isSelf?: boolean;
  npcName?: string;
  eventTitle?: string;
  timestamp?: number;
}> = [
  {
    type: 'system',
    content: '游戏开始！第 1 回合 - 夜晚阶段',
  },
  {
    type: 'ai_narration',
    content: '夜幕降临，宫廷中的灯火渐渐熄灭。一阵冷风吹过，所有人回到了各自的房间。在这个寂静的夜晚，有人正在密谋着什么...',
  },
  {
    type: 'npc_dialogue',
    content: '陛下，臣有重要情报要禀报。昨夜在御花园发现了一封密信，上面写着令人不安的内容...',
    npcName: '太监总管',
  },
  {
    type: 'chat',
    content: '大家有没有发现什么线索？',
    senderNickname: '玩家小明',
    isSelf: false,
    timestamp: Date.now() - 60000,
  },
  {
    type: 'chat',
    content: '我觉得那个新来的侍卫很可疑',
    senderNickname: '我',
    isSelf: true,
    timestamp: Date.now() - 45000,
  },
  {
    type: 'event',
    content: '御花园中发现了一封神秘信件，信中提到了一个秘密集会的计划...',
    eventTitle: '发现线索',
  },
];

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  const { emit } = useSocket();
  const { userId } = useUserStore();
  const { gameState, messages, currentEvent, addMessage, setCurrentEvent } = useGameStore();

  const [inputText, setInputText] = useState('');
  const [showEvent, setShowEvent] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [eventCountdown, setEventCountdown] = useState(30);

  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* 初始加载模拟数据 */
  useEffect(() => {
    if (messages.length === 0) {
      /* 开发预览：添加模拟消息 */
      MOCK_MESSAGES.forEach((msg, i) => {
        setTimeout(() => {
          addMessage({
            id: `mock_${i}`,
            type: 'chat' as never,
            content: msg.content,
            senderId: msg.isSelf ? (userId || 'me') : 'other',
            senderNickname: msg.senderNickname || '系统',
            timestamp: msg.timestamp || Date.now(),
            roomId: gameId,
          });
        }, i * 500);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* 自动滚动到底部 */
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  /* 事件倒计时 */
  useEffect(() => {
    if (!showEvent) return;
    const timer = setInterval(() => {
      setEventCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowEvent(false);
          setCurrentEvent(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showEvent, setCurrentEvent]);

  /* 发送消息 */
  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    emit('chat:message', { content: text });
    addMessage({
      id: `msg_${Date.now()}`,
      type: 'chat' as never,
      content: text,
      senderId: userId || 'me',
      senderNickname: '我',
      timestamp: Date.now(),
      roomId: gameId,
    });
    setInputText('');
    inputRef.current?.focus();
  }, [inputText, emit, addMessage, userId, gameId]);

  /* 回车发送 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* 事件选项选择 */
  const handleEventSelect = (optionId: string) => {
    setSelectedOption(optionId);
  };

  /* 跳转到投票页 */
  const handleGoToVote = () => {
    router.push(`/game/${gameId}/vote`);
  };

  /* 模拟事件弹出 */
  const handleShowMockEvent = () => {
    setShowEvent(true);
    setEventCountdown(30);
    setSelectedOption(null);
  };

  return (
    <MobileLayout safeTop={false} safeBottom={false}>
      <div className="flex flex-1 flex-col h-full">
        {/* 游戏顶部状态栏 */}
        <GameHeader
          round={gameState?.round || 1}
          totalRounds={gameState?.totalRounds || 5}
          phase={(gameState?.phase || 'discussion') as GamePhase}
          timerTotal={60}
          timerCurrent={45}
          themeName="古代宫廷"
          players={[
            { id: '1', nickname: '我', isAlive: true },
            { id: '2', nickname: '小明', isAlive: true },
            { id: '3', nickname: '小红', isAlive: true },
            { id: '4', nickname: '小刚', isAlive: false },
          ]}
        />

        {/* 消息列表（可滚动） */}
        <div
          ref={messageListRef}
          className="flex-1 overflow-y-auto py-3"
        >
          {/* 渲染消息列表 */}
          {messages.length > 0 ? (
            messages.map((message) => {
              /* 根据消息内容判断类型（简化处理） */
              const mockMsg = MOCK_MESSAGES.find((m) => m.content === message.content);
              const msgType: ChatMessageType = mockMsg?.type || 'chat';

              return (
                <ChatMessage
                  key={message.id}
                  type={msgType}
                  content={message.content}
                  senderNickname={message.senderNickname}
                  senderAvatar={message.senderAvatar}
                  isSelf={message.senderId === (userId || 'me')}
                  npcName={mockMsg?.npcName}
                  eventTitle={mockMsg?.eventTitle}
                  timestamp={message.timestamp}
                />
              );
            })
          ) : (
            /* 空状态 */
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="text-sm">暂无消息</p>
              <p className="text-xs mt-1">等待游戏开始...</p>
            </div>
          )}

          {/* 事件卡片弹出 */}
          {showEvent && (
            <div className="sticky bottom-0 mt-3">
              <EventCard
                title="神秘事件"
                description="你在御花园的假山后发现了一封密信，信中提到了一个秘密集会的时间和地点。你决定..."
                options={[
                  { id: 'a', text: '将密信交给皇帝', icon: '👑' },
                  { id: 'b', text: '独自前往集会地点', icon: '🔦' },
                  { id: 'c', text: '告诉其他玩家', icon: '💬' },
                  { id: 'd', text: '销毁密信', icon: '🔥' },
                ]}
                onSelect={handleEventSelect}
                countdownTotal={30}
                countdownCurrent={eventCountdown}
                onCountdownEnd={() => {
                  setShowEvent(false);
                  setCurrentEvent(null);
                }}
                selectedOptionId={selectedOption}
              />
            </div>
          )}
        </div>

        {/* 底部输入区域 */}
        <div className="shrink-0 border-t border-dark-border bg-dark-card/80 backdrop-blur-md safe-bottom">
          {/* 功能按钮行 */}
          <div className="flex items-center gap-2 px-4 pt-2">
            <button
              onClick={handleShowMockEvent}
              className="px-3 py-1 rounded-lg bg-accent/10 border border-accent/20 text-xs text-accent hover:bg-accent/15 transition-colors"
            >
              模拟事件
            </button>
            <button
              onClick={handleGoToVote}
              className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 hover:bg-red-500/15 transition-colors"
            >
              进入投票
            </button>
          </div>

          {/* 输入框 + 发送按钮 */}
          <div className="flex items-center gap-2 px-4 py-3">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="说点什么..."
              maxLength={200}
              className={cn(
                'flex-1 h-10 px-4 rounded-xl',
                'bg-dark border border-dark-border',
                'text-white text-sm placeholder-gray-500',
                'transition-all duration-200',
                'focus:border-primary/50'
              )}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200',
                inputText.trim()
                  ? 'bg-primary hover:bg-primary-dark text-white active:scale-95'
                  : 'bg-dark border border-dark-border text-gray-600'
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
