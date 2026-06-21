import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * NestJS 应用入口
 * 配置 CORS、全局前缀、验证管道，启动 HTTP 和 WebSocket 服务
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 配置 - 开发环境允许所有来源
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  // 全局 API 前缀
  app.setGlobalPrefix('api/v1');

  // 全局验证管道 - 自动验证 DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 过滤掉未在 DTO 中定义的属性
      forbidNonWhitelisted: true, // 如果有未定义的属性则抛出异常
      transform: true, // 自动将请求体转换为 DTO 实例
    }),
  );

  // 启动监听
  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`========================================`);
  console.log(`  Dorm Party 服务器已启动`);
  console.log(`  HTTP:  http://localhost:${port}`);
  console.log(`  WebSocket: ws://localhost:${port}`);
  console.log(`  API:   http://localhost:${port}/api/v1`);
  console.log(`========================================`);
}

bootstrap();
