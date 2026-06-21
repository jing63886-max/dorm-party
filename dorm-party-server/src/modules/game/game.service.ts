import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Game } from '../../common/entities/game.entity';
import { Player } from '../../common/entities/player.entity';
import { RoomService } from '../room/room.service';
import { AIService } from '../ai/ai.service';
import { ChatService } from '../chat/chat.service';
import { RedisService } from '../redis/redis.service';
import {
  GameState,
  GamePhase,
  PlayerState,
  PlayerStatus,
  RoundState,
  GameEvent,
  EventChoice,
} from '../../common/interfaces/game-state.interface';

/** 默认总回合数 */
const DEFAULT_TOTAL_ROUNDS = 5;

/** 各阶段时间限制（秒） */
const PHASE_TIME_LIMITS: Record<string, number> = {
  [GamePhase.FREE_CHAT]: 120, // 自由聊天 2 分钟
  [GamePhase.EVENT]: 30, // 事件展示 30 秒
  [GamePhase.CHOICE]: 30, // 选择阶段 30 秒
  [GamePhase.VOTE]: 30, // 投票阶段 30 秒
  [GamePhase.ENDING]: 60, // 结局展示 60 秒
};

/**
 * 游戏服务
 * 管理游戏完整生命周期：初始化、回合推进、选择/投票处理、结局生成
 */
@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    private readonly roomService: RoomService,
    private readonly aiService: AIService,
    private readonly chatService: ChatService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 开始游戏
   * @param roomCode 房间邀请码
   * @returns 游戏信息
   */
  async startGame(roomCode: string) {
    // 检查全员是否准备
    const allReady = await this.roomService.checkAllReady(roomCode);
    if (!allReady) {
      throw new BadRequestException('并非所有玩家都已准备');
    }

    // 获取房间玩家
    const players = await this.roomService.getRoomPlayers(roomCode);
    if (players.length < 2) {
      throw new BadRequestException('至少需要2名玩家才能开始游戏');
    }

    // 获取房间信息
    const roomInfo = await this.roomService.getRoomInfo(roomCode);

    // 创建游戏记录
    const gameId = uuidv4();
    const game = this.gameRepository.create({
      id: gameId,
      roomCode,
      theme: roomInfo.theme,
      phase: GamePhase.ROLE_ASSIGN,
      currentRound: 0,
      totalRounds: DEFAULT_TOTAL_ROUNDS,
    });
    await this.gameRepository.save(game);

    // 更新房间状态
    await this.roomService.updateRoomStatus(roomCode, 'playing', gameId);

    // 更新所有玩家状态
    for (const player of players) {
      player.gameId = gameId;
      player.status = 'playing';
      await this.playerRepository.save(player);
    }

    // 调用 AI 生成角色
    const nicknames = players.map((p) => p.nickname);
    const roleResult = await this.aiService.generateRoles({
      theme: roomInfo.theme,
      playerCount: players.length,
      nicknames,
    });

    // 分配角色
    const playerStates: PlayerState[] = players.map((p, index) => ({
      id: p.userId,
      nickname: p.nickname,
      status: PlayerStatus.PLAYING,
      score: 0,
      isHost: p.isHost,
      order: p.order,
      role: roleResult.success && roleResult.roles[index]
        ? {
            roleId: `role_${index}`,
            name: roleResult.roles[index].name,
            description: roleResult.roles[index].description,
            secret: roleResult.roles[index].secret,
            personality: roleResult.roles[index].personality,
            avatar: roleResult.roles[index].avatar,
            affinity: 50,
          }
        : {
            roleId: `role_${index}`,
            name: p.nickname,
            description: '普通宿舍成员',
            secret: '没有秘密',
            personality: '普通',
            avatar: 'default',
            affinity: 50,
          },
    }));

    // 保存角色到玩家记录
    for (let i = 0; i < players.length; i++) {
      players[i].role = playerStates[i].role;
      await this.playerRepository.save(players[i]);
    }

    // 构建初始游戏状态
    const gameState: GameState = {
      gameId,
      roomCode,
      theme: roomInfo.theme,
      phase: GamePhase.ROLE_ASSIGN,
      currentRound: 0,
      totalRounds: DEFAULT_TOTAL_ROUNDS,
      players: playerStates,
      roundHistory: [],
      startedAt: Date.now(),
    };

    // 缓存游戏状态到 Redis
    await this.redisService.set(
      RedisService.getGameStateKey(gameId),
      gameState,
      7200,
    );

    // 保存到数据库
    game.gameState = gameState as any;
    await this.gameRepository.save(game);

    this.logger.log(`游戏已开始: ${gameId}, 房间: ${roomCode}`);

    // 延迟进入第一回合
    setTimeout(() => {
      this.advanceToNextPhase(gameId).catch((err) => {
        this.logger.error(`自动推进阶段失败: ${err.message}`);
      });
    }, 5000); // 5秒后自动进入第一回合

    return {
      gameId,
      roomCode,
      theme: roomInfo.theme,
      phase: GamePhase.ROLE_ASSIGN,
      totalRounds: DEFAULT_TOTAL_ROUNDS,
      players: playerStates.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        isHost: p.isHost,
      })),
    };
  }

  /**
   * 获取游戏状态
   * @param gameId 游戏ID
   */
  async getGameState(gameId: string): Promise<GameState> {
    // 优先从 Redis 获取
    const cached = await this.redisService.get<GameState>(
      RedisService.getGameStateKey(gameId),
    );
    if (cached) {
      return cached;
    }

    // 从数据库获取
    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException(`游戏 ${gameId} 不存在`);
    }

    return game.gameState as GameState;
  }

  /**
   * 获取玩家角色
   * @param gameId 游戏ID
   * @param userId 用户ID
   */
  async getPlayerRole(gameId: string, userId: string) {
    const gameState = await this.getGameState(gameId);
    const player = gameState.players.find((p) => p.id === userId);

    if (!player) {
      throw new NotFoundException('玩家不在该游戏中');
    }

    return {
      playerId: userId,
      nickname: player.nickname,
      role: player.role,
    };
  }

  /**
   * 提交选择
   * @param gameId 游戏ID
   * @param playerId 玩家ID
   * @param eventId 事件ID
   * @param choiceIndex 选项索引
   */
  async submitChoice(
    gameId: string,
    playerId: string,
    eventId: number,
    choiceIndex: number,
  ) {
    const gameState = await this.getGameState(gameId);

    // 验证游戏阶段
    if (gameState.phase !== GamePhase.CHOICE) {
      throw new BadRequestException('当前不在选择阶段');
    }

    // 验证玩家
    const player = gameState.players.find((p) => p.id === playerId);
    if (!player || player.status === PlayerStatus.ELIMINATED) {
      throw new BadRequestException('玩家无法进行选择');
    }

    // 验证事件
    if (!gameState.currentRoundState?.currentEvent) {
      throw new BadRequestException('当前没有待处理的事件');
    }

    const event = gameState.currentRoundState.currentEvent;
    if (event.eventId !== eventId) {
      throw new BadRequestException('事件ID不匹配');
    }

    if (choiceIndex < 0 || choiceIndex >= event.choices.length) {
      throw new BadRequestException('无效的选项索引');
    }

    // 记录选择
    player.currentChoice = choiceIndex;
    gameState.currentRoundState.playerChoices.set(playerId, choiceIndex);

    // 检查是否所有人都已选择
    const activePlayers = gameState.players.filter(
      (p) => p.status !== PlayerStatus.ELIMINATED,
    );
    const allChosen = activePlayers.every((p) =>
      gameState.currentRoundState.playerChoices.has(p.id),
    );

    // 更新缓存
    await this.saveGameState(gameId, gameState);

    if (allChosen) {
      // 所有人选择完毕，处理选择结果
      const result = await this.processChoiceResults(gameId, gameState);
      return {
        submitted: true,
        allSubmitted: true,
        result,
      };
    }

    return {
      submitted: true,
      allSubmitted: false,
      remainingPlayers: activePlayers.length - gameState.currentRoundState.playerChoices.size,
    };
  }

  /**
   * 提交投票
   * @param gameId 游戏ID
   * @param playerId 投票者ID
   * @param targetId 被投票者ID
   */
  async submitVote(gameId: string, playerId: string, targetId: string) {
    const gameState = await this.getGameState(gameId);

    // 验证游戏阶段
    if (gameState.phase !== GamePhase.VOTE) {
      throw new BadRequestException('当前不在投票阶段');
    }

    // 验证投票者
    const voter = gameState.players.find((p) => p.id === playerId);
    if (!voter || voter.status === PlayerStatus.ELIMINATED) {
      throw new BadRequestException('投票者无效');
    }

    // 验证目标
    const target = gameState.players.find((p) => p.id === targetId);
    if (!target || target.status === PlayerStatus.ELIMINATED) {
      throw new BadRequestException('投票目标无效');
    }

    // 不能投自己
    if (playerId === targetId) {
      throw new BadRequestException('不能投给自己');
    }

    // 记录投票
    voter.currentVote = targetId;
    gameState.currentRoundState.playerVotes.set(playerId, targetId);

    // 检查是否所有人都已投票
    const activePlayers = gameState.players.filter(
      (p) => p.status !== PlayerStatus.ELIMINATED,
    );
    const allVoted = activePlayers.every((p) =>
      gameState.currentRoundState.playerVotes.has(p.id),
    );

    // 更新缓存
    await this.saveGameState(gameId, gameState);

    if (allVoted) {
      // 所有人投票完毕，处理投票结果
      const result = await this.processVoteResults(gameId, gameState);
      return {
        submitted: true,
        allSubmitted: true,
        result,
      };
    }

    return {
      submitted: true,
      allSubmitted: false,
      remainingPlayers: activePlayers.length - gameState.currentRoundState.playerVotes.size,
    };
  }

  /**
   * 获取结局
   * @param gameId 游戏ID
   */
  async getEnding(gameId: string) {
    const gameState = await this.getGameState(gameId);

    if (gameState.phase !== GamePhase.ENDING && gameState.phase !== GamePhase.FINISHED) {
      throw new BadRequestException('游戏尚未结束');
    }

    return {
      endingText: gameState.endingText,
      endingType: gameState.endingType,
      players: gameState.players.map((p) => ({
        nickname: p.nickname,
        score: p.score,
        role: p.role?.name,
      })),
    };
  }

  // ==================== 游戏流程控制 ====================

  /**
   * 推进到下一阶段
   * @param gameId 游戏ID
   */
  async advanceToNextPhase(gameId: string) {
    const gameState = await this.getGameState(gameId);

    switch (gameState.phase) {
      case GamePhase.ROLE_ASSIGN:
        // 角色分配完成后，进入第一回合的自由聊天阶段
        gameState.phase = GamePhase.FREE_CHAT;
        gameState.currentRound = 1;
        gameState.currentRoundState = this.createRoundState(1, GamePhase.FREE_CHAT);
        break;

      case GamePhase.FREE_CHAT:
        // 自由聊天结束，生成事件
        gameState.phase = GamePhase.EVENT;
        await this.generateAndSetEvent(gameId, gameState);
        break;

      case GamePhase.EVENT:
        // 事件展示结束，进入选择阶段
        gameState.phase = GamePhase.CHOICE;
        if (gameState.currentRoundState) {
          gameState.currentRoundState.phase = GamePhase.CHOICE;
          gameState.currentRoundState.startedAt = Date.now();
          gameState.currentRoundState.timeRemaining = PHASE_TIME_LIMITS[GamePhase.CHOICE];
        }
        break;

      case GamePhase.CHOICE:
        // 选择完成，进入投票阶段（如果事件类型是 vote_trigger）
        if (gameState.currentRoundState?.currentEvent?.type === 'vote_trigger') {
          gameState.phase = GamePhase.VOTE;
          if (gameState.currentRoundState) {
            gameState.currentRoundState.phase = GamePhase.VOTE;
            gameState.currentRoundState.startedAt = Date.now();
            gameState.currentRoundState.timeRemaining = PHASE_TIME_LIMITS[GamePhase.VOTE];
            gameState.currentRoundState.playerVotes = new Map();
          }
        } else {
          // 否则直接进入下一回合
          await this.advanceRound(gameId, gameState);
          return;
        }
        break;

      case GamePhase.VOTE:
        // 投票完成，进入下一回合
        await this.advanceRound(gameId, gameState);
        return;

      default:
        this.logger.warn(`未知阶段: ${gameState.phase}`);
        return;
    }

    await this.saveGameState(gameId, gameState);
    this.logger.log(`游戏 ${gameId} 进入阶段: ${gameState.phase}, 回合: ${gameState.currentRound}`);
  }

  /**
   * 推进回合
   * @param gameId 游戏ID
   * @param gameState 当前游戏状态
   */
  private async advanceRound(gameId: string, gameState: GameState) {
    // 保存当前回合历史
    if (gameState.currentRoundState) {
      gameState.roundHistory.push(gameState.currentRoundState);
    }

    // 检查是否是最后一回合
    if (gameState.currentRound >= gameState.totalRounds) {
      await this.endGame(gameId, gameState);
      return;
    }

    // 进入下一回合
    gameState.currentRound += 1;
    gameState.phase = GamePhase.FREE_CHAT;
    gameState.currentRoundState = this.createRoundState(
      gameState.currentRound,
      GamePhase.FREE_CHAT,
    );

    // 清除玩家的当前选择和投票
    for (const player of gameState.players) {
      player.currentChoice = undefined;
      player.currentVote = undefined;
    }

    await this.saveGameState(gameId, gameState);
    this.logger.log(`游戏 ${gameId} 进入回合 ${gameState.currentRound}`);
  }

  /**
   * 生成并设置事件
   */
  private async generateAndSetEvent(gameId: string, gameState: GameState) {
    const chatKeywords = await this.chatService.getRecentKeywords(gameId);
    const previousSummary = this.getPreviousRoundSummary(gameState);

    const eventResult = await this.aiService.generateEventFromRequest({
      theme: gameState.theme,
      round: gameState.currentRound,
      totalRounds: gameState.totalRounds,
      roles: gameState.players.map((p) => ({
        name: p.role?.name || p.nickname,
        personality: p.role?.personality || '普通',
      })),
      previousSummary,
      chatKeywords,
    });

    if (eventResult.success && eventResult.event) {
      const gameEvent: GameEvent = {
        eventId: Date.now(),
        title: eventResult.event.title,
        description: eventResult.event.description,
        type: eventResult.event.type,
        choices: (eventResult.event.choices || []).map((c, i) => ({
          index: i,
          text: c.text,
          effect: c.effect,
        })),
        relatedPlayers: eventResult.event.relatedPlayers,
        round: gameState.currentRound,
      };

      if (gameState.currentRoundState) {
        gameState.currentRoundState.currentEvent = gameEvent;
        gameState.currentRoundState.phase = GamePhase.EVENT;
        gameState.currentRoundState.startedAt = Date.now();
        gameState.currentRoundState.timeRemaining = PHASE_TIME_LIMITS[GamePhase.EVENT];
      }
    } else {
      // AI 生成失败，使用默认事件
      this.logger.warn(`AI 事件生成失败，使用默认事件: ${eventResult.error}`);
      const defaultEvent: GameEvent = {
        eventId: Date.now(),
        title: '宿舍日常',
        description: '今天宿舍里发生了一件小事，大家需要做出选择。',
        type: 'plot',
        choices: [
          { index: 0, text: '积极参与', effect: '你选择了积极参与' },
          { index: 1, text: '保持观望', effect: '你选择了保持观望' },
        ],
        round: gameState.currentRound,
      };

      if (gameState.currentRoundState) {
        gameState.currentRoundState.currentEvent = defaultEvent;
        gameState.currentRoundState.phase = GamePhase.EVENT;
        gameState.currentRoundState.startedAt = Date.now();
        gameState.currentRoundState.timeRemaining = PHASE_TIME_LIMITS[GamePhase.EVENT];
      }
    }
  }

  /**
   * 处理选择结果
   */
  private async processChoiceResults(gameId: string, gameState: GameState) {
    const event = gameState.currentRoundState.currentEvent;
    const choices = Array.from(gameState.currentRoundState.playerChoices.entries());

    // 统计各选项的票数
    const choiceCount: Record<number, number> = {};
    for (const [, choiceIdx] of choices) {
      choiceCount[choiceIdx] = (choiceCount[choiceIdx] || 0) + 1;
    }

    // 根据选择计算分数
    for (const [playerId, choiceIdx] of choices) {
      const player = gameState.players.find((p) => p.id === playerId);
      if (player) {
        // 多数选择加分
        const isMajority = choiceCount[choiceIdx] > choices.length / 2;
        player.score += isMajority ? 10 : 5;
      }
    }

    // 生成选择结果叙述
    const resultNarrative = this.generateChoiceNarrative(event, choices, choiceCount);

    // 保存回合历史
    gameState.roundHistory.push({ ...gameState.currentRoundState });
    await this.saveGameState(gameId, gameState);

    // 推进到下一阶段
    setTimeout(() => {
      this.advanceToNextPhase(gameId).catch((err) => {
        this.logger.error(`推进阶段失败: ${err.message}`);
      });
    }, 3000);

    return {
      eventTitle: event.title,
      choiceDistribution: choiceCount,
      narrative: resultNarrative,
    };
  }

  /**
   * 处理投票结果
   */
  private async processVoteResults(gameId: string, gameState: GameState) {
    const votes = Array.from(gameState.currentRoundState.playerVotes.entries());

    // 统计票数
    const voteCount: Record<string, number> = {};
    for (const [, targetId] of votes) {
      voteCount[targetId] = (voteCount[targetId] || 0) + 1;
    }

    // 找出票数最多的玩家
    let maxVotes = 0;
    let eliminatedId: string | undefined;
    for (const [targetId, count] of Object.entries(voteCount)) {
      if (count > maxVotes) {
        maxVotes = count;
        eliminatedId = targetId;
      }
    }

    // 淘汰玩家（扣分但不移除）
    if (eliminatedId) {
      const eliminated = gameState.players.find((p) => p.id === eliminatedId);
      if (eliminated) {
        eliminated.score -= 15;
        // 不直接淘汰，只是扣分
      }
    }

    // 给投票正确的玩家加分
    for (const [voterId, targetId] of votes) {
      const voter = gameState.players.find((p) => p.id === voterId);
      if (voter && targetId === eliminatedId) {
        voter.score += 5;
      }
    }

    // 生成投票结果叙述
    const voteNarrative = this.generateVoteNarrative(votes, voteCount, eliminatedId, gameState);

    // 保存回合历史
    gameState.roundHistory.push({ ...gameState.currentRoundState });
    await this.saveGameState(gameId, gameState);

    // 推进到下一阶段
    setTimeout(() => {
      this.advanceToNextPhase(gameId).catch((err) => {
        this.logger.error(`推进阶段失败: ${err.message}`);
      });
    }, 3000);

    return {
      voteDistribution: voteCount,
      eliminatedId,
      eliminatedNickname: eliminatedId
        ? gameState.players.find((p) => p.id === eliminatedId)?.nickname
        : undefined,
      narrative: voteNarrative,
    };
  }

  /**
   * 结束游戏
   */
  private async endGame(gameId: string, gameState: GameState) {
    gameState.phase = GamePhase.ENDING;
    gameState.endedAt = Date.now();

    // 收集游戏摘要
    const gameSummary = this.buildGameSummary(gameState);
    const scores = gameState.players.map((p) => ({
      nickname: p.nickname,
      score: p.score,
    }));
    const voteResults: { voter: string; target: string }[] = [];
    for (const round of gameState.roundHistory) {
      if (round.playerVotes) {
        for (const [voter, target] of round.playerVotes.entries()) {
          voteResults.push({ voter, target });
        }
      }
    }

    // 调用 AI 生成结局
    const endingResult = await this.aiService.generateEndingFromRequest({
      theme: gameState.theme,
      roles: gameState.players.map((p) => ({
        name: p.role?.name || p.nickname,
        personality: p.role?.personality || '普通',
        secret: p.role?.secret || '',
      })),
      scores,
      gameSummary,
      voteResults,
    });

    if (endingResult.success) {
      gameState.endingText = endingResult.endingText || '游戏结束';
      gameState.endingType = endingResult.endingType || 'happy';
    } else {
      gameState.endingText = '游戏结束了！感谢大家的参与。';
      gameState.endingType = 'happy';
      this.logger.warn(`AI 结局生成失败: ${endingResult.error}`);
    }

    // 标记游戏为已完成
    gameState.phase = GamePhase.FINISHED;

    // 更新数据库
    await this.gameRepository.update(gameId, {
      phase: gameState.phase,
      currentRound: gameState.currentRound,
      endingText: gameState.endingText,
      endingType: gameState.endingType,
      gameState: gameState as any,
    });

    // 更新房间状态
    await this.roomService.updateRoomStatus(gameState.roomCode, 'finished');

    // 更新 Redis 缓存
    await this.saveGameState(gameId, gameState);

    this.logger.log(`游戏 ${gameId} 已结束，结局类型: ${gameState.endingType}`);
  }

  // ==================== 辅助方法 ====================

  /**
   * 创建回合状态
   */
  private createRoundState(round: number, phase: GamePhase): RoundState {
    return {
      round,
      phase,
      playerChoices: new Map(),
      playerVotes: new Map(),
      timeRemaining: PHASE_TIME_LIMITS[phase] || 60,
      startedAt: Date.now(),
    };
  }

  /**
   * 保存游戏状态到 Redis 和数据库
   */
  private async saveGameState(gameId: string, gameState: GameState): Promise<void> {
    // 序列化 Map 为普通对象以便 JSON 序列化
    const serializable = JSON.parse(JSON.stringify(gameState, (key, value) => {
      if (value instanceof Map) {
        return Object.fromEntries(value);
      }
      return value;
    }));

    await this.redisService.set(
      RedisService.getGameStateKey(gameId),
      serializable,
      7200,
    );

    await this.gameRepository.update(gameId, {
      phase: gameState.phase,
      currentRound: gameState.currentRound,
      gameState: serializable,
    });
  }

  /**
   * 获取上一回合摘要
   */
  private getPreviousRoundSummary(gameState: GameState): string {
    if (gameState.roundHistory.length === 0) {
      return '游戏刚开始';
    }

    const lastRound = gameState.roundHistory[gameState.roundHistory.length - 1];
    const summaries: string[] = [];

    if (lastRound.currentEvent) {
      summaries.push(`事件：${lastRound.currentEvent.title}`);
    }

    if (lastRound.playerChoices && lastRound.playerChoices.size > 0) {
      const choiceEntries = Object.entries(
        lastRound.playerChoices instanceof Map
          ? Object.fromEntries(lastRound.playerChoices)
          : lastRound.playerChoices,
      );
      summaries.push(
        `选择：${choiceEntries
          .map(([playerId, choiceIdx]) => {
            const player = gameState.players.find((p) => p.id === playerId);
            return `${player?.nickname || playerId}选择了选项${choiceIdx + 1}`;
          })
          .join('、')}`,
      );
    }

    return summaries.join('。') || '上一回合无特殊事件';
  }

  /**
   * 生成选择结果叙述
   */
  private generateChoiceNarrative(
    event: GameEvent,
    choices: [string, number][],
    choiceCount: Record<number, number>,
  ): string {
    const lines: string[] = [`在"${event.title}"中：`];

    for (let i = 0; i < event.choices.length; i++) {
      const count = choiceCount[i] || 0;
      const playerNames = choices
        .filter(([, idx]) => idx === i)
        .map(([playerId]) => {
          const player = choices.find(([pid]) => pid === playerId);
          return playerId;
        })
        .join('、');
      lines.push(`${count}人选择了"${event.choices[i].text}"`);
    }

    return lines.join('\n');
  }

  /**
   * 生成投票结果叙述
   */
  private generateVoteNarrative(
    votes: [string, string][],
    voteCount: Record<string, number>,
    eliminatedId: string | undefined,
    gameState: GameState,
  ): string {
    const eliminatedName = eliminatedId
      ? gameState.players.find((p) => p.id === eliminatedId)?.nickname
      : '无人';

    return `投票结果：${eliminatedName}获得了最多的关注（${voteCount[eliminatedId] || 0}票）。`;
  }

  /**
   * 构建游戏摘要
   */
  private buildGameSummary(gameState: GameState): string {
    const summaries: string[] = [];
    summaries.push(`主题：${gameState.theme}`);
    summaries.push(`共进行了${gameState.roundHistory.length}个回合`);

    for (const round of gameState.roundHistory) {
      if (round.currentEvent) {
        summaries.push(`回合${round.round}：${round.currentEvent.title}`);
      }
    }

    return summaries.join('；');
  }
}
