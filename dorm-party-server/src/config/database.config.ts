import { registerAs } from '@nestjs/config';

/**
 * MySQL 数据库连接配置
 */
export default registerAs('database', () => ({
  type: 'mysql' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_DATABASE || 'dorm_party',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production', // 生产环境关闭自动同步
  logging: process.env.NODE_ENV !== 'production',
  charset: 'utf8mb4',
}));
