import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { Game } from '../../common/entities/game.entity';
import { Player } from '../../common/entities/player.entity';
import { RoomModule } from '../room/room.module';
import { AIModule } from '../ai/ai.module';
import { ChatModule } from '../chat/chat.module';

/**
 * 游戏模块
 * 管理游戏生命周期：开始、回合推进、选择处理、投票、结局
 * 包含游戏 WebSocket 网关，处理实时通信
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Game, Player]),
    RoomModule,
    AIModule,
    ChatModule,
  ],
  controllers: [GameController],
  providers: [GameService, GameGateway],
  exports: [GameService],
})
export class GameModule {}
