import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GameService } from './game.service';
import { StartGameDto } from '../../common/dto/start-game.dto';
import { SubmitChoiceDto } from '../../common/dto/submit-choice.dto';
import { SubmitVoteDto } from '../../common/dto/submit-vote.dto';

/**
 * 游戏控制器
 * 处理游戏相关的 HTTP 请求
 */
@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  /**
   * 开始游戏
   * POST /api/v1/games/start
   */
  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  async startGame(@Body() dto: StartGameDto) {
    const game = await this.gameService.startGame(dto.roomCode);
    return {
      success: true,
      data: game,
      message: '游戏已开始',
    };
  }

  /**
   * 获取游戏状态
   * GET /api/v1/games/:gameId
   */
  @Get(':gameId')
  async getGameState(@Param('gameId') gameId: string) {
    const state = await this.gameService.getGameState(gameId);
    return {
      success: true,
      data: state,
    };
  }

  /**
   * 获取玩家角色
   * GET /api/v1/games/:gameId/role/:userId
   */
  @Get(':gameId/role/:userId')
  async getPlayerRole(
    @Param('gameId') gameId: string,
    @Param('userId') userId: string,
  ) {
    const role = await this.gameService.getPlayerRole(gameId, userId);
    return {
      success: true,
      data: role,
    };
  }

  /**
   * 提交选择
   * POST /api/v1/games/:gameId/choices
   */
  @Post(':gameId/choices')
  @HttpCode(HttpStatus.OK)
  async submitChoice(
    @Param('gameId') gameId: string,
    @Body() dto: SubmitChoiceDto,
  ) {
    const result = await this.gameService.submitChoice(
      gameId,
      dto.playerId,
      dto.eventId,
      dto.choiceIndex,
    );
    return {
      success: true,
      data: result,
      message: '选择已提交',
    };
  }

  /**
   * 提交投票
   * POST /api/v1/games/:gameId/vote
   */
  @Post(':gameId/vote')
  @HttpCode(HttpStatus.OK)
  async submitVote(
    @Param('gameId') gameId: string,
    @Body() dto: SubmitVoteDto,
  ) {
    const result = await this.gameService.submitVote(gameId, dto.playerId, dto.targetId);
    return {
      success: true,
      data: result,
      message: '投票已提交',
    };
  }

  /**
   * 获取结局
   * GET /api/v1/games/:gameId/ending
   */
  @Get(':gameId/ending')
  async getEnding(@Param('gameId') gameId: string) {
    const ending = await this.gameService.getEnding(gameId);
    return {
      success: true,
      data: ending,
    };
  }
}
