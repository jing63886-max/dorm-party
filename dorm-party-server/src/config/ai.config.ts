import { registerAs } from '@nestjs/config';

/**
 * DeepSeek AI API 配置
 */
export default registerAs('ai', () => ({
  apiKey: process.env.AI_API_KEY || '',
  baseUrl: process.env.AI_BASE_URL || 'https://api.deepseek.com/v1',
  model: process.env.AI_MODEL || 'deepseek-chat',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS, 10) || 2000,
  temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.8,
  timeout: 30000, // 请求超时时间（毫秒）
}));
