/* ====== 用户相关类型 ====== */

/** 用户基础信息 */
export interface User {
  id: string;
  nickname: string;
  avatar?: string;
  deviceId: string;
  isOnline?: boolean;
  createdAt?: number;
}

/** 玩家在房间中的状态 */
export interface Player {
  id: string;
  userId: string;
  nickname: string;
  avatar?: string;
  isHost: boolean;       // 是否是房主
  isReady: boolean;      // 是否已准备
  isConnected: boolean;  // 是否在线
  joinedAt: number;      // 加入时间戳
  seatIndex?: number;    // 座位索引
}

/* ====== 房间相关类型 ====== */

/** 房间信息 */
export interface Room {
  id: string;
  code: string;           // 房间邀请码
  hostId: string;         // 房主ID
  players: Player[];
  maxPlayers: number;     // 最大玩家数
  status: RoomStatus;     // 房间状态
  theme?: GameTheme;      // 游戏主题
  createdAt: number;
}

/** 房间状态枚举 */
export enum RoomStatus {
  Waiting = 'waiting',     // 等待中
  Playing = 'playing',     // 游戏中
  Finished = 'finished',   // 已结束
}

/* ====== 游戏相关类型 ====== */

/** 游戏主题枚举 */
export enum GameTheme {
  Classic = 'classic',         // 经典模式
  Romance = 'romance',         // 恋爱主题
  Mystery = 'mystery',        // 悬疑主题
  Comedy = 'comedy',          // 搞笑主题
  TruthOrDare = 'truth_or_dare', // 真心话大冒险
}

/** 游戏阶段枚举 */
export enum GamePhase {
  Waiting = 'waiting',         // 等待开始
  RoleAssign = 'role_assign',  // 角色分配
  Night = 'night',             // 夜晚阶段
  Day = 'day',                 // 白天阶段
  Discussion = 'discussion',    // 讨论阶段
  Voting = 'voting',           // 投票阶段
  Event = 'event',             // 事件阶段
  Ending = 'ending',           // 结束阶段
}

/** 角色信息 */
export interface Character {
  id: string;
  name: string;           // 角色名称
  team: CharacterTeam;    // 阵营
  description: string;     // 角色描述
  avatar?: string;        // 角色头像
  abilities: string[];    // 技能列表
}

/** 角色阵营 */
export enum CharacterTeam {
  Good = 'good',       // 好人阵营
  Bad = 'bad',         // 坏人阵营
  Neutral = 'neutral', // 中立阵营
}

/** 游戏内玩家状态 */
export interface GamePlayer {
  id: string;
  userId: string;
  nickname: string;
  avatar?: string;
  character?: Character;    // 分配的角色
  isAlive: boolean;         // 是否存活
  isProtected: boolean;      // 是否被保护
  votedFor?: string;        // 投票目标ID
  seatIndex: number;        // 座位索引
}

/** 游戏状态 */
export interface GameState {
  phase: GamePhase;         // 当前阶段
  round: number;             // 当前回合
  totalRounds: number;       // 总回合数
  timer: number;             // 倒计时（秒）
  isPaused: boolean;         // 是否暂停
  startedAt?: number;        // 开始时间戳
}

/** 回合状态 */
export interface RoundState {
  round: number;
  phase: GamePhase;
  events: GameEvent[];
  votes: Vote[];
  result?: VoteResult;
  timer: number;
}

/* ====== 消息相关类型 ====== */

/** 消息类型枚举 */
export enum MessageType {
  Chat = 'chat',           // 聊天消息
  System = 'system',       // 系统消息
  Event = 'event',         // 事件消息
  Game = 'game',           // 游戏消息
  Private = 'private',     // 私聊消息
}

/** 聊天消息 */
export interface Message {
  id: string;
  type: MessageType;
  content: string;
  senderId: string;
  senderNickname: string;
  senderAvatar?: string;
  timestamp: number;
  roomId: string;
  /** 私聊接收者ID（仅私聊消息） */
  receiverId?: string;
}

/* ====== 事件相关类型 ====== */

/** 游戏事件类型 */
export enum GameEventType {
  PlayerDied = 'player_died',           // 玩家死亡
  PlayerSaved = 'player_saved',         // 玩家被救
  RoleRevealed = 'role_revealed',        // 角色揭示
  PhaseChange = 'phase_change',         // 阶段切换
  RoundStart = 'round_start',           // 回合开始
  RoundEnd = 'round_end',               // 回合结束
  SpecialEvent = 'special_event',       // 特殊事件
  VoteResult = 'vote_result',           // 投票结果
  GameOver = 'game_over',              // 游戏结束
}

/** 游戏事件 */
export interface GameEvent {
  id: string;
  type: GameEventType;
  title: string;
  description: string;
  data?: Record<string, unknown>;
  timestamp: number;
  round: number;
}

/* ====== 投票相关类型 ====== */

/** 投票 */
export interface Vote {
  voterId: string;       // 投票人ID
  targetId: string;       // 被投票人ID
  timestamp: number;
}

/** 投票结果 */
export interface VoteResult {
  targetId: string;       // 被投出的人ID
  targetNickname: string; // 被投出的人昵称
  votes: number;          // 得票数
  isTie: boolean;         // 是否平票
  allVotes: Vote[];       // 所有投票详情
}

/* ====== 游戏结束相关类型 ====== */

/** 游戏结局 */
export interface GameEnding {
  winner: CharacterTeam;          // 获胜阵营
  reason: string;                 // 结局原因
  survivors: GamePlayer[];        // 存活玩家
  allPlayers: GamePlayer[];       // 所有玩家
  mvpId?: string;                 // MVP玩家ID
  duration: number;               // 游戏时长（秒）
}

/* ====== Socket 事件映射 ====== */

/** 客户端发送的事件 */
export interface ClientToServerEvents {
  // 房间事件
  'room:create': (data: { nickname: string; deviceId: string }) => void;
  'room:join': (data: { code: string; nickname: string; deviceId: string }) => void;
  'room:leave': () => void;
  'room:kick': (data: { playerId: string }) => void;
  'room:ready': (data: { isReady: boolean }) => void;
  'room:start': () => void;

  // 游戏事件
  'game:action': (data: { action: string; targetId?: string; data?: unknown }) => void;
  'game:vote': (data: { targetId: string }) => void;
  'game:skip-vote': () => void;

  // 聊天事件
  'chat:message': (data: { content: string; receiverId?: string }) => void;

  // 心跳
  'ping': () => void;
}

/** 服务端发送的事件 */
export interface ServerToClientEvents {
  // 房间事件
  'room:created': (data: Room) => void;
  'room:joined': (data: { room: Room; player: Player }) => void;
  'room:updated': (data: Room) => void;
  'room:player-joined': (data: Player) => void;
  'room:player-left': (data: { playerId: string }) => void;
  'room:player-ready': (data: { playerId: string; isReady: boolean }) => void;
  'room:player-kicked': (data: { playerId: string; reason?: string }) => void;
  'room:error': (data: { code: string; message: string }) => void;

  // 游戏事件
  'game:started': (data: { gameState: GameState; players: GamePlayer[]; myRole: Character }) => void;
  'game:state-update': (data: GameState) => void;
  'game:phase-change': (data: { phase: GamePhase; round: number }) => void;
  'game:role-assigned': (data: Character) => void;
  'game:player-update': (data: GamePlayer) => void;
  'game:player-died': (data: { playerId: string; reason: string }) => void;
  'game:event': (data: GameEvent) => void;
  'game:vote-result': (data: VoteResult) => void;
  'game:ending': (data: GameEnding) => void;
  'game:timer-update': (data: { timer: number }) => void;

  // 聊天事件
  'chat:message': (data: Message) => void;
  'chat:history': (data: Message[]) => void;

  // 连接事件
  'pong': () => void;
  'error': (data: { message: string }) => void;
}

/** Socket.IO 事件映射类型 */
export type SocketEventMap = ClientToServerEvents & ServerToClientEvents;
