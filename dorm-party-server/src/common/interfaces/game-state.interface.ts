/**
 * 游戏状态相关接口定义
 */

/** 游戏阶段枚举 */
export enum GamePhase {
  /** 等待开始 */
  WAITING = 'waiting',
  /** 角色分配 */
  ROLE_ASSIGN = 'role_assign',
  /** 自由聊天 */
  FREE_CHAT = 'free_chat',
  /** 事件触发 */
  EVENT = 'event',
  /** 选择阶段 */
  CHOICE = 'choice',
  /** 投票阶段 */
  VOTE = 'vote',
  /** 结局阶段 */
  ENDING = 'ending',
  /** 游戏结束 */
  FINISHED = 'finished',
}

/** 玩家状态枚举 */
export enum PlayerStatus {
  /** 等待中 */
  WAITING = 'waiting',
  /** 已准备 */
  READY = 'ready',
  /** 游戏中 */
  PLAYING = 'playing',
  /** 已淘汰 */
  ELIMINATED = 'eliminated',
  /** 已退出 */
  DISCONNECTED = 'disconnected',
}

/** 房间状态枚举 */
export enum RoomStatus {
  /** 等待中 */
  WAITING = 'waiting',
  /** 游戏中 */
  PLAYING = 'playing',
  /** 已结束 */
  FINISHED = 'finished',
}

/** 玩家状态接口 */
export interface PlayerState {
  /** 玩家唯一标识 */
  id: string;
  /** 昵称 */
  nickname: string;
  /** 当前状态 */
  status: PlayerStatus;
  /** 分数 */
  score: number;
  /** 是否为房主 */
  isHost: boolean;
  /** 角色信息（游戏开始后分配） */
  role?: PlayerRole;
  /** 当前选择（事件选择阶段） */
  currentChoice?: number;
  /** 当前投票目标 */
  currentVote?: string;
  /** 加入顺序 */
  order: number;
}

/** 玩家角色接口 */
export interface PlayerRole {
  /** 角色ID */
  roleId: string;
  /** 角色名称 */
  name: string;
  /** 角色描述 */
  description: string;
  /** 角色头像标识 */
  avatar: string;
  /** 角色秘密（仅自己可见） */
  secret: string;
  /** 角色性格特征 */
  personality: string;
  /** 初始好感度 */
  affinity: number;
}

/** 事件选项接口 */
export interface EventChoice {
  /** 选项索引 */
  index: number;
  /** 选项文本 */
  text: string;
  /** 选项效果描述 */
  effect: string;
  /** 影响的角色ID（可选） */
  targetRoleId?: string;
}

/** 游戏事件接口 */
export interface GameEvent {
  /** 事件ID */
  eventId: number;
  /** 事件标题 */
  title: string;
  /** 事件描述 */
  description: string;
  /** 事件类型 */
  type: 'plot' | 'conflict' | 'cooperation' | 'vote_trigger';
  /** 可选项 */
  choices: EventChoice[];
  /** 关联角色（可选） */
  relatedPlayers?: string[];
  /** 回合数 */
  round: number;
}

/** 回合状态接口 */
export interface RoundState {
  /** 当前回合数 */
  round: number;
  /** 当前阶段 */
  phase: GamePhase;
  /** 当前事件（事件阶段时） */
  currentEvent?: GameEvent;
  /** 各玩家选择状态 */
  playerChoices: Map<string, number>;
  /** 各玩家投票状态 */
  playerVotes: Map<string, string>;
  /** 剩余时间（秒） */
  timeRemaining: number;
  /** 阶段开始时间 */
  startedAt: number;
}

/** 游戏状态接口 */
export interface GameState {
  /** 游戏唯一标识 */
  gameId: string;
  /** 关联房间码 */
  roomCode: string;
  /** 游戏主题 */
  theme: string;
  /** 当前阶段 */
  phase: GamePhase;
  /** 当前回合 */
  currentRound: number;
  /** 总回合数 */
  totalRounds: number;
  /** 玩家列表 */
  players: PlayerState[];
  /** 回合历史 */
  roundHistory: RoundState[];
  /** 当前回合状态 */
  currentRoundState?: RoundState;
  /** 游戏开始时间 */
  startedAt?: number;
  /** 游戏结束时间 */
  endedAt?: number;
  /** 结局文本 */
  endingText?: string;
  /** 结局类型 */
  endingType?: string;
}
