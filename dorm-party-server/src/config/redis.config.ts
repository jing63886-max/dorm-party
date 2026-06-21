import { registerAs } from '@nestjs/config';

/**
 * Redis 连接配置
 */
export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  keyPrefix: 'dorm-party:', // 键名前缀，避免与其他应用冲突
}));
