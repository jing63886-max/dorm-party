import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 className
 * 结合 clsx 和 tailwind-merge，支持条件类名和 Tailwind 冲突处理
 *
 * @param inputs - 类名参数，支持字符串、对象、数组等格式
 * @returns 合并后的类名字符串
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-primary', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * 格式化时间（秒 -> mm:ss）
 *
 * @param seconds - 秒数
 * @returns 格式化后的时间字符串
 *
 * @example
 * formatTime(90) => '01:30'
 * formatTime(5)  => '00:05'
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 生成设备唯一ID
 * 使用 crypto API 生成随机 UUID，并持久化到 localStorage
 *
 * @returns 设备ID字符串
 */
export function generateDeviceId(): string {
  const STORAGE_KEY = 'dorm-party-device-id';

  // 尝试从 localStorage 读取已有设备ID
  if (typeof window !== 'undefined') {
    const existingId = localStorage.getItem(STORAGE_KEY);
    if (existingId) {
      return existingId;
    }
  }

  // 生成新的设备ID
  const deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // 持久化到 localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  return deviceId;
}

/**
 * 复制文本到剪贴板
 * 支持现代浏览器和旧版浏览器的 fallback
 *
 * @param text - 要复制的文本
 * @returns 是否复制成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // 优先使用现代 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback: 使用 execCommand
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (error) {
    console.error('复制到剪贴板失败:', error);
    return false;
  }
}

/**
 * 防抖函数
 *
 * @param fn - 要防抖的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 截断文本
 *
 * @param text - 原始文本
 * @param maxLength - 最大长度
 * @param suffix - 截断后缀，默认 '...'
 * @returns 截断后的文本
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = '...'
): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}
