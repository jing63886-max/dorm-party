'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Button - 通用按钮组件
 * 支持多种样式变体、尺寸、加载状态和禁用状态
 */

/** 按钮样式变体 */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** 按钮尺寸 */
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 样式变体 */
  variant?: ButtonVariant;
  /** 尺寸 */
  size?: ButtonSize;
  /** 是否显示加载状态 */
  loading?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 子元素 */
  children: React.ReactNode;
}

/** 各变体对应的样式映射 */
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/25 hover:shadow-primary/40',
  secondary:
    'bg-dark-card hover:bg-dark-border text-gray-200 border border-dark-border',
  ghost:
    'bg-transparent hover:bg-white/5 text-gray-300 hover:text-white',
  danger:
    'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30',
};

/** 各尺寸对应的样式映射 */
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-base rounded-xl gap-2',
  lg: 'px-6 py-3.5 text-lg rounded-xl gap-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        /* 基础样式 */
        'inline-flex items-center justify-center font-medium',
        'transition-all duration-200 ease-out',
        'active:scale-[0.97]',
        /* 变体样式 */
        variantStyles[variant],
        /* 尺寸样式 */
        sizeStyles[size],
        /* 禁用 / 加载状态 */
        (disabled || loading) && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {/* 加载指示器 */}
      {loading && (
        <Loader2 className="h-4 w-4 animate-spin" />
      )}

      {/* 按钮内容 */}
      <span className={loading ? 'opacity-70' : ''}>
        {children}
      </span>
    </button>
  );
}
