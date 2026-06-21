'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * MobileLayout - 移动端布局容器
 * 最大宽度 430px 居中，暗色背景，安全区域适配
 */
interface MobileLayoutProps {
  /** 子元素 */
  children: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 是否显示顶部安全区域（默认 true） */
  safeTop?: boolean;
  /** 是否显示底部安全区域（默认 true） */
  safeBottom?: boolean;
}

export default function MobileLayout({
  children,
  className,
  safeTop = true,
  safeBottom = true,
}: MobileLayoutProps) {
  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-dark-darker">
      {/* 移动端容器 - 最大宽度 430px */}
      <div
        className={cn(
          'relative flex min-h-screen min-h-[100dvh] w-full max-w-[430px] flex-col bg-dark overflow-hidden',
          safeTop && 'pt-safe-top',
          safeBottom && 'pb-safe-bottom',
          className
        )}
      >
        {/* 顶部安全区域占位 */}
        {safeTop && (
          <div className="h-[env(safe-area-inset-top,0px)] shrink-0" />
        )}

        {/* 主内容区域 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {children}
        </div>

        {/* 底部安全区域占位 */}
        {safeBottom && (
          <div className="h-[env(safe-area-inset-bottom,0px)] shrink-0" />
        )}
      </div>
    </div>
  );
}
