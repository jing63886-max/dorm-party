import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerService } from './player.service';
import { Player } from '../../common/entities/player.entity';

/**
 * 玩家模块
 * 管理玩家状态、角色信息、分数等
 */
@Module({
  imports: [TypeOrmModule.forFeature([Player])],
  providers: [PlayerService],
  exports: [PlayerService],
})
export class PlayerModule {}
