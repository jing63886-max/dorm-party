import { generateDeviceId } from './utils';

/* ====== API 配置 ====== */

/** API 基础URL，从环境变量读取 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/** 设备ID存储键 */
const DEVICE_ID_KEY = 'dorm-party-device-id';

/** 请求超时时间（毫秒） */
const REQUEST_TIMEOUT = 15000;

/* ====== 自定义错误类型 ====== */

/** API 错误 */
export class ApiError extends Error {
  code: string;
  status: number;
  data?: unknown;

  constructor(message: string, status: number, code: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

/** 网络错误 */
export class NetworkError extends Error {
  constructor(message: string = '网络连接失败，请检查网络设置') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** 超时错误 */
export class TimeoutError extends Error {
  constructor(message: string = '请求超时，请稍后重试') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/* ====== API 响应类型 ====== */

/** 标准API响应 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
}

/** 分页响应 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/* ====== 请求配置 ====== */

interface RequestConfig extends RequestInit {
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 是否跳过设备ID头 */
  skipDeviceId?: boolean;
  /** 自定义错误处理 */
  skipErrorHandler?: boolean;
}

/* ====== 设备ID管理 ====== */

/**
 * 获取设备ID
 * 优先从 localStorage 读取，不存在则生成新的
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateDeviceId();
  }
  return deviceId;
}

/**
 * 设置设备ID
 */
export function setDeviceId(deviceId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
}

/* ====== 核心请求方法 ====== */

/**
 * 发起HTTP请求
 *
 * @param url - 请求路径（相对路径或绝对路径）
 * @param config - 请求配置
 * @returns 响应数据
 */
async function request<T = unknown>(
  url: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    timeout = REQUEST_TIMEOUT,
    skipDeviceId = false,
    skipErrorHandler = false,
    headers: customHeaders,
    ...fetchConfig
  } = config;

  // 构建完整URL
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  // 添加设备ID头
  if (!skipDeviceId && typeof window !== 'undefined') {
    headers['X-Device-Id'] = getDeviceId();
  }

  // 创建 AbortController 用于超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(fullUrl, {
      ...fetchConfig,
      headers,
      signal: controller.signal,
    });

    // 解析响应
    const data = await response.json();

    // 处理非成功响应
    if (!response.ok) {
      const error = new ApiError(
        data.message || `请求失败 (${response.status})`,
        response.status,
        data.code || 'UNKNOWN_ERROR',
        data
      );

      if (!skipErrorHandler) {
        handleApiError(error);
      }

      throw error;
    }

    return data as T;
  } catch (error) {
    // 处理超时
    if (error instanceof DOMException && error.name === 'AbortError') {
      const timeoutErr = new TimeoutError();
      if (!skipErrorHandler) {
        handleApiError(timeoutErr);
      }
      throw timeoutErr;
    }

    // 处理网络错误
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkErr = new NetworkError();
      if (!skipErrorHandler) {
        handleApiError(networkErr);
      }
      throw networkErr;
    }

    // 其他错误直接抛出
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 错误处理
 * 统一处理API错误，可扩展为 toast 提示等
 */
function handleApiError(error: Error): void {
  console.error('[API Error]', error.message);

  // TODO: 可在此处接入 toast 通知组件
  // toast.error(error.message);
}

/* ====== 便捷请求方法 ====== */

/**
 * GET 请求
 */
export async function get<T = unknown>(
  url: string,
  params?: Record<string, string | number | boolean | undefined>,
  config?: RequestConfig
): Promise<ApiResponse<T>> {
  // 构建查询参数
  let finalUrl = url;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      finalUrl += `?${queryString}`;
    }
  }

  return request<ApiResponse<T>>(finalUrl, {
    ...config,
    method: 'GET',
  });
}

/**
 * POST 请求
 */
export async function post<T = unknown>(
  url: string,
  body?: unknown,
  config?: RequestConfig
): Promise<ApiResponse<T>> {
  return request<ApiResponse<T>>(url, {
    ...config,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT 请求
 */
export async function put<T = unknown>(
  url: string,
  body?: unknown,
  config?: RequestConfig
): Promise<ApiResponse<T>> {
  return request<ApiResponse<T>>(url, {
    ...config,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE 请求
 */
export async function del<T = unknown>(
  url: string,
  config?: RequestConfig
): Promise<ApiResponse<T>> {
  return request<ApiResponse<T>>(url, {
    ...config,
    method: 'DELETE',
  });
}

/* ====== 导出 ====== */

const api = {
  get,
  post,
  put,
  delete: del,
  getDeviceId,
  setDeviceId,
};

export default api;
