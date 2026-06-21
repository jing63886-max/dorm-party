import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from './modules/redis/redis.module';
import { RoomModule } from './modules/room/room.module';
import { GameModule } from './modules/game/game.module';
import { PlayerModule } from './modules/player/player.module';
import { ChatModule } from './modules/chat/chat.module';
import { AIModule } from './modules/ai/ai.module';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';

/**
 * 应用根模块
 * 导入所有子模块，配置数据库、Redis、全局配置等
 */
@Module({
  imports: [
    // 全局配置模块 - 加载 .env 文件
    ConfigModule.forRoot({
      isGlobal: true, // 全局可用
      load: [databaseConfig, redisConfig], // 加载数据库和Redis配置
      envFilePath: ['.env.local', '.env'], // 按优先级加载环境变量文件
    }),

    // TypeORM 数据库模块
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('database.host', 'localhost'),
        port: configService.get<number>('database.port', 3306),
        username: configService.get<string>('database.username', 'root'),
        password: configService.get<string>('database.password', '123456'),
        database: configService.get<string>('database.database', 'dorm_party'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') !== 'production',
        charset: 'utf8mb4',
      }),
      inject: [ConfigService],
    }),

    // Redis 全局模块
    RedisModule,

    // 业务模块
    RoomModule,
    GameModule,
    PlayerModule,
    ChatModule,
    AIModule,
  ],
})
export class AppModule {}
