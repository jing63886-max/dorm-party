import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Player,
  Room,
  GamePlayer,
  GameState,
  Message,
  GameEvent,
  VoteResult,
  GameEnding,
  Character,
} from '@/types';

/* ====================================================================
 * useUserStore - 用户状态管理
 * ==================================================================== */

interface UserState {
  /** 用户ID */
  userId: string | null;
  /** 昵称 */
  nickname: string | null;
  /** 设备ID */
  deviceId: string | null;
  /** 头像URL */
  avatar: string | null;

  /* --- 操作方法 --- */
  /** 设置用户信息 */
  setUser: (user: {
    userId: string;
    nickname: string;
    deviceId: string;
    avatar?: string;
  }) => void;
  /** 更新昵称 */
  setNickname: (nickname: string) => void;
  /** 清除用户信息 */
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userId: null,
      nickname: null,
      deviceId: null,
      avatar: null,

      setUser: ({ userId, nickname, deviceId, avatar }) =>
        set({ userId, nickname, deviceId, avatar }),

      setNickname: (nickname) => set({ nickname }),

      clearUser: () =>
        set({
          userId: null,
          nickname: null,
          deviceId: null,
          avatar: null,
        }),
    }),
    {
      name: 'dorm-party-user',
      /* 仅持久化指定字段 */
      partialize: (state) => ({
        userId: state.userId,
        nickname: state.nickname,
        deviceId: state.deviceId,
        avatar: state.avatar,
      }),
    }
  )
);

/* ====================================================================
 * useRoomStore - 房间状态管理
 * ==================================================================== */

interface RoomState {
  /** 当前房间信息 */
  currentRoom: Room | null;
  /** 房间内的玩家列表 */
  players: Player[];
  /** 房间邀请码 */
  roomCode: string | null;
  /** 是否已准备 */
  isReady: boolean;

  /* --- 操作方法 --- */
  /** 设置房间信息 */
  setRoom: (room: Room) => void;
  /** 添加玩家 */
  addPlayer: (player: Player) => void;
  /** 移除玩家 */
  removePlayer: (playerId: string) => void;
  /** 更新玩家准备状态 */
  updatePlayerReady: (playerId: string, isReady: boolean) => void;
  /** 更新玩家在线状态 */
  updatePlayerConnection: (playerId: string, isConnected: boolean) => void;
  /** 设置准备状态 */
  setReady: (isReady: boolean) => void;
  /** 清除房间信息 */
  clearRoom: () => void;
}

export const useRoomStore = create<RoomState>()((set) => ({
  currentRoom: null,
  players: [],
  roomCode: null,
  isReady: false,

  setRoom: (room) =>
    set({
      currentRoom: room,
      players: room.players,
      roomCode: room.code,
    }),

  addPlayer: (player) =>
    set((state) => ({
      players: [...state.players, player],
    })),

  removePlayer: (playerId) =>
    set((state) => ({
      players: state.players.filter((p) => p.id !== playerId),
    })),

  updatePlayerReady: (playerId, isReady) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, isReady } : p
      ),
    })),

  updatePlayerConnection: (playerId, isConnected) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, isConnected } : p
      ),
    })),

  setReady: (isReady) => set({ isReady }),

  clearRoom: () =>
    set({
      currentRoom: null,
      players: [],
      roomCode: null,
      isReady: false,
    }),
}));

/* ====================================================================
 * useGameStore - 游戏状态管理
 * ==================================================================== */

interface GameStoreState {
  /** 游戏状态（阶段、回合、计时器等） */
  gameState: GameState | null;
  /** 聊天消息列表 */
  messages: Message[];
  /** 当前事件 */
  currentEvent: GameEvent | null;
  /** 投票结果 */
  voteResult: VoteResult | null;
  /** 游戏结局 */
  ending: GameEnding | null;
  /** 游戏内玩家状态 */
  players: GamePlayer[];
  /** 我的角色信息 */
  myRole: Character | null;

  /* --- 操作方法 --- */
  /** 设置游戏状态 */
  setGameState: (gameState: GameState) => void;
  /** 更新游戏阶段 */
  setPhase: (phase: GameState['phase'], round?: number) => void;
  /** 更新计时器 */
  setTimer: (timer: number) => void;
  /** 添加消息 */
  addMessage: (message: Message) => void;
  /** 设置消息历史 */
  setMessages: (messages: Message[]) => void;
  /** 清空消息 */
  clearMessages: () => void;
  /** 设置当前事件 */
  setCurrentEvent: (event: GameEvent | null) => void;
  /** 设置投票结果 */
  setVoteResult: (result: VoteResult | null) => void;
  /** 设置游戏结局 */
  setEnding: (ending: GameEnding | null) => void;
  /** 设置游戏内玩家列表 */
  setPlayers: (players: GamePlayer[]) => void;
  /** 更新单个玩家状态 */
  updatePlayer: (player: GamePlayer) => void;
  /** 更新玩家存活状态 */
  updatePlayerAlive: (playerId: string, isAlive: boolean) => void;
  /** 设置我的角色 */
  setMyRole: (role: Character | null) => void;
  /** 初始化游戏（游戏开始时调用） */
  initGame: (data: {
    gameState: GameState;
    players: GamePlayer[];
    myRole: Character;
  }) => void;
  /** 清除游戏状态 */
  clearGame: () => void;
}

/** 初始游戏状态 */
const initialGameState: GameState = {
  phase: 'waiting' as never,
  round: 0,
  totalRounds: 0,
  timer: 0,
  isPaused: false,
};

export const useGameStore = create<GameStoreState>()((set) => ({
  gameState: null,
  messages: [],
  currentEvent: null,
  voteResult: null,
  ending: null,
  players: [],
  myRole: null,

  setGameState: (gameState) => set({ gameState }),

  setPhase: (phase, round) =>
    set((state) => ({
      gameState: state.gameState
        ? {
            ...state.gameState,
            phase,
            ...(round !== undefined ? { round } : {}),
          }
        : null,
    })),

  setTimer: (timer) =>
    set((state) => ({
      gameState: state.gameState
        ? { ...state.gameState, timer }
        : null,
    })),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setMessages: (messages) => set({ messages }),

  clearMessages: () => set({ messages: [] }),

  setCurrentEvent: (event) => set({ currentEvent: event }),

  setVoteResult: (result) => set({ voteResult: result }),

  setEnding: (ending) => set({ ending }),

  setPlayers: (players) => set({ players }),

  updatePlayer: (player) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === player.id ? player : p
      ),
    })),

  updatePlayerAlive: (playerId, isAlive) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, isAlive } : p
      ),
    })),

  setMyRole: (role) => set({ myRole: role }),

  initGame: ({ gameState, players, myRole }) =>
    set({
      gameState,
      players,
      myRole,
      messages: [],
      currentEvent: null,
      voteResult: null,
      ending: null,
    }),

  clearGame: () =>
    set({
      gameState: null,
      messages: [],
      currentEvent: null,
      voteResult: null,
      ending: null,
      players: [],
      myRole: null,
    }),
}));
