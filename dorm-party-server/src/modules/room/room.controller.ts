import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from '../../common/dto/create-room.dto';
import { JoinRoomDto } from '../../common/dto/join-room.dto';
import { ToggleReadyDto } from '../../common/dto/toggle-ready.dto';

/**
 * 房间控制器
 * 处理房间相关的 HTTP 请求
 */
@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  /**
   * 创建房间
   * POST /api/v1/rooms
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRoom(@Body() dto: CreateRoomDto) {
    const room = await this.roomService.createRoom(dto.hostId, dto.hostNickname, dto.theme);
    return {
      success: true,
      data: room,
      message: '房间创建成功',
    };
  }

  /**
   * 加入房间
   * POST /api/v1/rooms/:roomCode/join
   */
  @Post(':roomCode/join')
  @HttpCode(HttpStatus.OK)
  async joinRoom(
    @Param('roomCode') roomCode: string,
    @Body() dto: JoinRoomDto,
  ) {
    const result = await this.roomService.joinRoom(roomCode, dto.userId, dto.nickname);
    return {
      success: true,
      data: result,
      message: '加入房间成功',
    };
  }

  /**
   * 切换准备状态
   * POST /api/v1/rooms/:roomCode/ready
   */
  @Post(':roomCode/ready')
  @HttpCode(HttpStatus.OK)
  async toggleReady(
    @Param('roomCode') roomCode: string,
    @Body() dto: ToggleReadyDto,
  ) {
    const result = await this.roomService.toggleReady(roomCode, dto.userId);
    return {
      success: true,
      data: result,
      message: result.isReady ? '已准备' : '已取消准备',
    };
  }

  /**
   * 获取房间信息
   * GET /api/v1/rooms/:roomCode
   */
  @Get(':roomCode')
  async getRoomInfo(@Param('roomCode') roomCode: string) {
    const room = await this.roomService.getRoomInfo(roomCode);
    return {
      success: true,
      data: room,
    };
  }

  /**
   * 离开房间
   * POST /api/v1/rooms/:roomCode/leave
   */
  @Post(':roomCode/leave')
  @HttpCode(HttpStatus.OK)
  async leaveRoom(
    @Param('roomCode') roomCode: string,
    @Body() dto: ToggleReadyDto,
  ) {
    await this.roomService.leaveRoom(roomCode, dto.userId);
    return {
      success: true,
      message: '已离开房间',
    };
  }
}
