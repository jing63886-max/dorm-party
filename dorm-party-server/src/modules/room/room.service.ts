import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Room } from '../../common/entities/room.entity';
import { Player } from '../../common/entities/player.entity';
import { RedisService } from '../redis/redis.service';

/** 最大玩家数量 */
const MAX_PLAYERS = 4;

/** 房间码字符集（排除易混淆字符） */
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * 房间服务
 * 处理房间创建、加入、准备、状态查询等业务逻辑
 */
@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 创建房间
   * @param hostId 房主用户ID
   * @param hostNickname 房主昵称
   * @param theme 游戏主题
   * @returns 创建的房间信息
   */
  async createRoom(hostId: string, hostNickname: string, theme: string) {
    // 生成唯一的6位房间邀请码
    const roomCode = await this.generateUniqueRoomCode();

    // 创建房间记录
    const room = this.roomRepository.create({
      roomCode,
      hostId,
      theme,
      status: 'waiting',
      playerCount: 1,
      maxPlayers: MAX_PLAYERS,
    });
    await this.roomRepository.save(room);

    // 创建房主玩家记录
    const player = this.playerRepository.create({
      userId: hostId,
      nickname: hostNickname,
      roomCode,
      isHost: true,
      status: 'waiting',
      order: 0,
    });
    await this.playerRepository.save(player);

    // 缓存房间信息到 Redis
    await this.cacheRoomInfo(roomCode, {
      roomCode,
      hostId,
      theme,
      status: 'waiting',
      playerCount: 1,
      maxPlayers: MAX_PLAYERS,
      players: [
        {
          id: player.id,
          userId: hostId,
          nickname: hostNickname,
          isHost: true,
          status: 'waiting',
          order: 0,
        },
      ],
    });

    this.logger.log(`房间已创建: ${roomCode}, 房主: ${hostNickname}`);

    return {
      roomCode,
      hostId,
      hostNickname,
      theme,
      status: 'waiting',
      playerCount: 1,
      maxPlayers: MAX_PLAYERS,
    };
  }

  /**
   * 加入房间
   * @param roomCode 房间邀请码
   * @param userId 用户ID
   * @param nickname 昵称
   * @returns 加入后的房间信息
   */
  async joinRoom(roomCode: string, userId: string, nickname: string) {
    // 查找房间
    const room = await this.findRoomOrThrow(roomCode);

    // 检查房间状态
    if (room.status !== 'waiting') {
      throw new BadRequestException('房间已在游戏中，无法加入');
    }

    // 检查是否已在房间中
    const existingPlayer = await this.playerRepository.findOne({
      where: { roomCode, userId },
    });
    if (existingPlayer) {
      throw new BadRequestException('你已在房间中');
    }

    // 检查房间人数
    if (room.playerCount >= room.maxPlayers) {
      throw new BadRequestException('房间已满（最多4人）');
    }

    // 检查昵称是否重复
    const nameExists = await this.playerRepository.findOne({
      where: { roomCode, nickname },
    });
    if (nameExists) {
      throw new BadRequestException('该昵称已被使用');
    }

    // 创建玩家记录
    const player = this.playerRepository.create({
      userId,
      nickname,
      roomCode,
      isHost: false,
      status: 'waiting',
      order: room.playerCount,
    });
    await this.playerRepository.save(player);

    // 更新房间人数
    room.playerCount += 1;
    await this.roomRepository.save(room);

    // 更新 Redis 缓存
    await this.updateRoomCache(roomCode);

    this.logger.log(`玩家 ${nickname} 加入房间 ${roomCode}`);

    return {
      roomCode: room.roomCode,
      theme: room.theme,
      playerCount: room.playerCount,
      maxPlayers: room.maxPlayers,
      player: {
        id: player.id,
        userId,
        nickname,
        isHost: false,
        status: 'waiting',
        order: player.order,
      },
    };
  }

  /**
   * 切换准备状态
   * @param roomCode 房间邀请码
   * @param userId 用户ID
   * @returns 准备状态信息
   */
  async toggleReady(roomCode: string, userId: string) {
    const room = await this.findRoomOrThrow(roomCode);

    if (room.status !== 'waiting') {
      throw new BadRequestException('房间已在游戏中');
    }

    const player = await this.playerRepository.findOne({
      where: { roomCode, userId },
    });
    if (!player) {
      throw new NotFoundException('玩家不在该房间中');
    }

    // 切换准备状态
    player.status = player.status === 'ready' ? 'waiting' : 'ready';
    await this.playerRepository.save(player);

    // 检查是否全员准备
    const allReady = await this.checkAllReady(roomCode);

    // 更新 Redis 缓存
    await this.updateRoomCache(roomCode);

    this.logger.log(
      `玩家 ${player.nickname} ${player.status === 'ready' ? '已准备' : '取消准备'}，全员准备: ${allReady}`,
    );

    return {
      userId,
      nickname: player.nickname,
      isReady: player.status === 'ready',
      allReady,
    };
  }

  /**
   * 获取房间信息
   * @param roomCode 房间邀请码
   * @returns 房间详情
   */
  async getRoomInfo(roomCode: string) {
    const room = await this.findRoomOrThrow(roomCode);

    // 获取房间内所有玩家
    const players = await this.playerRepository.find({
      where: { roomCode },
      order: { order: 'ASC' },
    });

    return {
      roomCode: room.roomCode,
      theme: room.theme,
      status: room.status,
      playerCount: room.playerCount,
      maxPlayers: room.maxPlayers,
      hostId: room.hostId,
      gameId: room.gameId,
      players: players.map((p) => ({
        id: p.id,
        userId: p.userId,
        nickname: p.nickname,
        isHost: p.isHost,
        status: p.status,
        order: p.order,
      })),
    };
  }

  /**
   * 离开房间
   * @param roomCode 房间邀请码
   * @param userId 用户ID
   */
  async leaveRoom(roomCode: string, userId: string) {
    const room = await this.findRoomOrThrow(roomCode);

    const player = await this.playerRepository.findOne({
      where: { roomCode, userId },
    });
    if (!player) {
      throw new NotFoundException('玩家不在该房间中');
    }

    // 删除玩家
    await this.playerRepository.remove(player);

    if (room.status === 'waiting') {
      // 等待阶段：更新房间人数
      room.playerCount -= 1;

      // 如果离开的是房主，转移房主权限
      if (userId === room.hostId && room.playerCount > 0) {
        const nextHost = await this.playerRepository.findOne({
          where: { roomCode },
          order: { order: 'ASC' },
        });
        if (nextHost) {
          room.hostId = nextHost.userId;
          nextHost.isHost = true;
          await this.playerRepository.save(nextHost);
        }
      }

      // 如果房间空了，删除房间
      if (room.playerCount <= 0) {
        await this.roomRepository.remove(room);
        await this.redisService.del(RedisService.getRoomKey(roomCode));
        this.logger.log(`房间 ${roomCode} 已删除（无玩家）`);
      } else {
        await this.roomRepository.save(room);
        await this.updateRoomCache(roomCode);
      }
    }

    this.logger.log(`玩家 ${player.nickname} 离开房间 ${roomCode}`);
  }

  /**
   * 检查是否全员准备
   * @param roomCode 房间邀请码
   * @returns 是否全员准备
   */
  async checkAllReady(roomCode: string): Promise<boolean> {
    const players = await this.playerRepository.find({
      where: { roomCode },
    });

    if (players.length < 2) {
      return false; // 至少需要2人才能开始
    }

    return players.every((p) => p.status === 'ready');
  }

  /**
   * 获取房间内所有玩家
   * @param roomCode 房间邀请码
   */
  async getRoomPlayers(roomCode: string): Promise<Player[]> {
    return this.playerRepository.find({
      where: { roomCode },
      order: { order: 'ASC' },
    });
  }

  /**
   * 更新房间状态（供 Game 模块调用）
   * @param roomCode 房间邀请码
   * @param status 新状态
   * @param gameId 关联游戏ID（可选）
   */
  async updateRoomStatus(roomCode: string, status: string, gameId?: string) {
    await this.roomRepository.update({ roomCode }, { status, gameId });
    await this.updateRoomCache(roomCode);
  }

  // ==================== 私有方法 ====================

  /**
   * 生成唯一的6位房间邀请码
   * @returns 唯一的房间码
   */
  private async generateUniqueRoomCode(): Promise<string> {
    let roomCode: string;
    let roomExists = true;

    while (roomExists) {
      roomCode = '';
      for (let i = 0; i < 6; i++) {
        roomCode += ROOM_CODE_CHARS.charAt(
          Math.floor(Math.random() * ROOM_CODE_CHARS.length),
        );
      }
      const existing = await this.roomRepository.findOne({ where: { roomCode } });
      roomExists = !!existing;
    }

    return roomCode;
  }

  /**
   * 查找房间，不存在则抛出异常
   * @param roomCode 房间邀请码
   */
  private async findRoomOrThrow(roomCode: string): Promise<Room> {
    const room = await this.roomRepository.findOne({ where: { roomCode } });
    if (!room) {
      throw new NotFoundException(`房间 ${roomCode} 不存在`);
    }
    return room;
  }

  /**
   * 缓存房间信息到 Redis
   */
  private async cacheRoomInfo(roomCode: string, data: any): Promise<void> {
    await this.redisService.set(RedisService.getRoomKey(roomCode), data, 7200);
  }

  /**
   * 更新 Redis 中的房间缓存
   */
  private async updateRoomCache(roomCode: string): Promise<void> {
    const roomInfo = await this.getRoomInfo(roomCode);
    await this.cacheRoomInfo(roomCode, roomInfo);
  }
}
