'use client';

import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toast - 全局提示组件
 * 支持多种类型、自动消失、动画效果
 * 通过 useToast() Hook 调用
 */

/** Toast 类型 */
type ToastType = 'success' | 'error' | 'info' | 'warning';

/** 单条 Toast 数据 */
interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

/** Toast Hook 返回值 */
interface ToastHookReturn {
  /** 显示成功提示 */
  success: (message: string, duration?: number) => void;
  /** 显示错误提示 */
  error: (message: string, duration?: number) => void;
  /** 显示信息提示 */
  info: (message: string, duration?: number) => void;
  /** 显示警告提示 */
  warning: (message: string, duration?: number) => void;
}

/* ====== Toast Context ====== */

const ToastContext = createContext<ToastHookReturn | null>(null);

/** Toast Provider - 包裹在根布局中使用 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /* 添加 Toast */
  const addToast = useCallback(
    (type: ToastType, message: string, duration: number = 3000) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, type, message, duration };
      setToasts((prev) => [...prev, newToast]);

      /* 自动消失 */
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  /* 移除 Toast */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastHook: ToastHookReturn = {
    success: (msg, dur) => addToast('success', msg, dur),
    error: (msg, dur) => addToast('error', msg, dur),
    info: (msg, dur) => addToast('info', msg, dur),
    warning: (msg, dur) => addToast('warning', msg, dur),
  };

  return (
    <ToastContext.Provider value={toastHook}>
      {children}

      {/* Toast 容器 - 固定在顶部 */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 w-full max-w-[400px] px-4">
        {toasts.map((toast) => (
          <ToastItemView
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** 获取 Toast Hook */
export function useToast(): ToastHookReturn {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    /* Provider 未包裹时返回空操作 */
    return {
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
    };
  }
  return ctx;
}

/* ====== Toast 条目组件 ====== */

/** 各类型对应的图标和样式 */
const toastConfig: Record<
  ToastType,
  { icon: React.ElementType; bgClass: string; borderClass: string; textClass: string }
> = {
  success: {
    icon: CheckCircle,
    bgClass: 'bg-green-500/15',
    borderClass: 'border-green-500/30',
    textClass: 'text-green-400',
  },
  error: {
    icon: XCircle,
    bgClass: 'bg-red-500/15',
    borderClass: 'border-red-500/30',
    textClass: 'text-red-400',
  },
  info: {
    icon: Info,
    bgClass: 'bg-primary/15',
    borderClass: 'border-primary/30',
    textClass: 'text-primary-light',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-accent/15',
    borderClass: 'border-accent/30',
    textClass: 'text-accent-light',
  },
};

interface ToastItemViewProps {
  toast: ToastItem;
  onClose: () => void;
}

function ToastItemView({ toast, onClose }: ToastItemViewProps) {
  const [isExiting, setIsExiting] = useState(false);
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  /* 退出动画 */
  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  }, [onClose]);

  return (
    <div
      className={cn(
        'flex items-center gap-3 w-full px-4 py-3 rounded-xl border',
        'shadow-lg backdrop-blur-md',
        config.bgClass,
        config.borderClass,
        isExiting
          ? 'animate-[fadeOut_0.3s_ease-in_forwards]'
          : 'animate-slide-up'
      )}
    >
      {/* 图标 */}
      <Icon className={cn('h-5 w-5 shrink-0', config.textClass)} />

      {/* 消息文本 */}
      <p className={cn('flex-1 text-sm font-medium', config.textClass)}>
        {toast.message}
      </p>

      {/* 关闭按钮 */}
      <button
        onClick={handleClose}
        className={cn(
          'shrink-0 flex h-6 w-6 items-center justify-center rounded-full',
          'text-gray-500 hover:text-white hover:bg-white/10',
          'transition-colors duration-200'
        )}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default ToastProvider;
