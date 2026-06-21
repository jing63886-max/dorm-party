import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { RoomGateway } from './room.gateway';
import { Room } from '../../common/entities/room.entity';
import { Player } from '../../common/entities/player.entity';

/**
 * 房间模块
 * 管理游戏房间的创建、加入、准备等功能
 * 包含房间 WebSocket 网关，处理房间级别的实时通信
 */
@Module({
  imports: [TypeOrmModule.forFeature([Room, Player])],
  controllers: [RoomController],
  providers: [RoomService, RoomGateway],
  exports: [RoomService],
})
export class RoomModule {}
