'use client';

import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Modal - 模态框组件
 * 带遮罩层、动画效果、关闭按钮，支持点击遮罩关闭
 */

interface ModalProps {
  /** 是否显示 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 标题 */
  title?: string;
  /** 子元素 */
  children: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 是否允许点击遮罩关闭（默认 true） */
  closeOnOverlay?: boolean;
  /** 是否显示关闭按钮（默认 true） */
  showClose?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  closeOnOverlay = true,
  showClose = true,
}: ModalProps) {
  /* ESC 键关闭 */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  /* 打开时禁止背景滚动 */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* 遮罩层 - fadeIn 动画 */}
      <div
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm',
          'animate-fade-in'
        )}
        onClick={closeOnOverlay ? onClose : undefined}
      />

      {/* 模态框内容 - slideUp 动画 */}
      <div
        className={cn(
          'relative z-10 w-full max-w-[430px] mx-4 mb-4 sm:mb-0',
          'bg-dark-card border border-dark-border rounded-2xl',
          'animate-slide-up',
          className
        )}
      >
        {/* 头部：标题 + 关闭按钮 */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
            {title && (
              <h3 className="text-lg font-semibold text-white">{title}</h3>
            )}
            {showClose && (
              <button
                onClick={onClose}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full',
                  'text-gray-400 hover:text-white hover:bg-white/10',
                  'transition-colors duration-200'
                )}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* 内容区域 */}
        <div className="px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
