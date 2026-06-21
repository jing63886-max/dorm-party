'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import Button from '@/components/common/Button';
import { useSocket } from '@/hooks/useSocket';
import { useUserStore } from '@/lib/store';
import { cn } from '@/lib/utils';

/**
 * 加入房间页
 * 6位邀请码输入框 + 昵称输入框，加入成功后跳转到等待大厅
 */
export default function JoinRoomPage() {
  const router = useRouter();
  const { emit } = useSocket();
  const { nickname: storedNickname, deviceId } = useUserStore();

  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [nickname, setNickname] = useState(storedNickname || '');
  const [isJoining, setIsJoining] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* 聚焦第一个输入框 */
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  /* 处理邀请码输入 */
  const handleCodeInput = (index: number, value: string) => {
    /* 只允许数字 */
    const digit = value.replace(/\D/g, '');
    if (digit.length > 1) return;

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    /* 自动跳转到下一个输入框 */
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  /* 处理退格键 */
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        /* 当前为空时，退格跳到上一个 */
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        /* 清空当前 */
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    }

    /* 回车键加入 */
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  /* 处理粘贴 */
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newCode = [...Array(6).fill('')];
      pasted.split('').forEach((char, i) => {
        newCode[i] = char;
      });
      setCode(newCode);
      /* 聚焦到最后一个有值的输入框的下一个 */
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  /* 邀请码是否完整 */
  const isCodeComplete = code.every((c) => c !== '');

  /* 加入房间 */
  const handleJoin = async () => {
    if (!isCodeComplete || !nickname.trim() || !deviceId) return;

    setIsJoining(true);
    try {
      const roomCode = code.join('');
      emit('room:join', {
        code: roomCode,
        nickname: nickname.trim(),
        deviceId,
      });
      /* 加入成功后由 socket 事件驱动跳转 */
      router.push(`/game/${roomCode}/lobby`);
    } catch (error) {
      console.error('加入房间失败:', error);
      setIsJoining(false);
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
          <h1 className="text-lg font-bold text-white">加入房间</h1>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* 邀请码输入区域 */}
          <div className="w-full max-w-sm mb-8 animate-fade-in">
            <h2 className="text-center text-base font-semibold text-gray-300 mb-1">
              输入邀请码
            </h2>
            <p className="text-center text-sm text-gray-500 mb-6">
              输入房主分享的6位数字邀请码
            </p>

            {/* 6个独立输入框 */}
            <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeInput(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={cn(
                    'h-14 w-12 rounded-xl text-center text-2xl font-bold',
                    'bg-dark-card border-2 transition-all duration-200',
                    'focus:outline-none',
                    digit
                      ? 'border-primary text-white'
                      : 'border-dark-border text-transparent'
                  )}
                />
              ))}
            </div>
          </div>

          {/* 昵称输入框 */}
          <div className="w-full max-w-sm mb-8 animate-slide-up">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              你的昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入你的昵称"
              maxLength={12}
              className={cn(
                'w-full h-12 px-4 rounded-xl',
                'bg-dark-card border border-dark-border',
                'text-white text-base placeholder-gray-600',
                'transition-all duration-200',
                'focus:border-primary/50'
              )}
            />
          </div>

          {/* 加入按钮 */}
          <div className="w-full max-w-sm animate-slide-up">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!isCodeComplete || !nickname.trim()}
              loading={isJoining}
              onClick={handleJoin}
            >
              加入房间
            </Button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
