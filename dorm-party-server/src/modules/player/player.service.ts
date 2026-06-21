import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '../../common/entities/player.entity';

/**
 * 玩家服务
 * 管理玩家角色、状态、分数等业务逻辑
 */
@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);

  constructor(
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
  ) {}

  /**
   * 获取玩家角色（含秘密）
   * @param gameId 游戏ID
   * @param userId 用户ID
   * @returns 玩家角色信息
   */
  async getPlayerRole(gameId: string, userId: string) {
    const player = await this.playerRepository.findOne({
      where: { gameId, userId },
    });

    if (!player) {
      throw new NotFoundException('玩家不在该游戏中');
    }

    return {
      playerId: player.userId,
      nickname: player.nickname,
      role: player.role,
      score: player.score,
      status: player.status,
    };
  }

  /**
   * 更新玩家状态
   * @param gameId 游戏ID
   * @param userId 用户ID
   * @param status 新状态
   */
  async updatePlayerStatus(gameId: string, userId: string, status: string) {
    const player = await this.playerRepository.findOne({
      where: { gameId, userId },
    });

    if (!player) {
      throw new NotFoundException('玩家不在该游戏中');
    }

    player.status = status;
    await this.playerRepository.save(player);

    this.logger.log(`玩家 ${player.nickname} 状态更新为: ${status}`);

    return {
      userId,
      nickname: player.nickname,
      status: player.status,
    };
  }

  /**
   * 获取玩家分数
   * @param gameId 游戏ID
   * @param userId 用户ID
   * @returns 玩家分数
   */
  async getPlayerScore(gameId: string, userId: string) {
    const player = await this.playerRepository.findOne({
      where: { gameId, userId },
    });

    if (!player) {
      throw new NotFoundException('玩家不在该游戏中');
    }

    return {
      userId,
      nickname: player.nickname,
      score: player.score,
    };
  }

  /**
   * 更新玩家分数
   * @param gameId 游戏ID
   * @param userId 用户ID
   * @param scoreChange 分数变化值（可为负数）
   */
  async updatePlayerScore(gameId: string, userId: string, scoreChange: number) {
    const player = await this.playerRepository.findOne({
      where: { gameId, userId },
    });

    if (!player) {
      throw new NotFoundException('玩家不在该游戏中');
    }

    player.score += scoreChange;
    // 确保分数不为负
    player.score = Math.max(0, player.score);
    await this.playerRepository.save(player);

    return {
      userId,
      nickname: player.nickname,
      score: player.score,
      scoreChange,
    };
  }

  /**
   * 获取游戏中所有玩家信息
   * @param gameId 游戏ID
   * @returns 玩家列表
   */
  async getGamePlayers(gameId: string): Promise<Player[]> {
    return this.playerRepository.find({
      where: { gameId },
      order: { order: 'ASC' },
    });
  }

  /**
   * 获取玩家排行榜
   * @param gameId 游戏ID
   * @returns 按分数排序的玩家列表
   */
  async getPlayerRanking(gameId: string) {
    const players = await this.playerRepository.find({
      where: { gameId },
      order: { score: 'DESC' },
    });

    return players.map((p, index) => ({
      rank: index + 1,
      userId: p.userId,
      nickname: p.nickname,
      score: p.score,
      roleName: p.role?.name || '未知',
    }));
  }
}
