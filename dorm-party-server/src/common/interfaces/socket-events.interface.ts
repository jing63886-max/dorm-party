/**
 * Socket.IO 事件接口定义
 * 定义客户端与服务器之间的 WebSocket 事件
 */

/** 客户端 -> 服务器的事件 */
export interface ClientToServerEvents {
  /** 加入房间 */
  'room:join': (data: { roomCode: string; userId: string; nickname: string }) => void;
  /** 离开房间 */
  'room:leave': (data: { roomCode: string; userId: string }) => void;
  /** 切换准备状态 */
  'room:ready': (data: { roomCode: string; userId: string }) => void;
  /** 发送聊天消息 */
  'chat:message': (data: { gameId: string; playerId: string; content: string }) => void;
  /** 提交事件选择 */
  'game:choice': (data: { gameId: string; playerId: string; eventId: number; choiceIndex: number }) => void;
  /** 提交投票 */
  'game:vote': (data: { gameId: string; playerId: string; targetId: string }) => void;
  /** 请求游戏状态 */
  'game:state': (data: { gameId: string }) => void;
  /** 心跳 */
  'ping': () => void;
}

/** 服务器 -> 客户端的事件 */
export interface ServerToClientEvents {
  /** 房间更新 */
  'room:updated': (data: { roomCode: string; players: any[]; status: string }) => void;
  /** 玩家加入通知 */
  'room:playerJoined': (data: { userId: string; nickname: string; players: any[] }) => void;
  /** 玩家离开通知 */
  'room:playerLeft': (data: { userId: string; players: any[] }) => void;
  /** 玩家准备状态变更 */
  'room:readyChanged': (data: { userId: string; isReady: boolean; allReady: boolean }) => void;
  /** 游戏开始 */
  'game:started': (data: { gameId: string; theme: string }) => void;
  /** 角色分配 */
  'game:roleAssigned': (data: { playerId: string; role: any }) => void;
  /** 游戏阶段变更 */
  'game:phaseChanged': (data: { gameId: string; phase: string; round: number }) => void;
  /** 新事件触发 */
  'game:newEvent': (data: { event: any; timeLimit: number }) => void;
  /** 聊天消息广播 */
  'chat:message': (data: { playerId: string; nickname: string; content: string; type: string; timestamp: number }) => void;
  /** 系统消息 */
  'chat:system': (data: { content: string; timestamp: number }) => void;
  /** 选择结果 */
  'game:choiceResult': (data: { eventId: number; results: any[]; narrative: string }) => void;
  /** 投票结果 */
  'game:voteResult': (data: { results: any[]; eliminatedId?: string; narrative: string }) => void;
  /** 游戏结束 */
  'game:ended': (data: { endingText: string; endingType: string; roleEndings: any[]; scores: any[] }) => void;
  /** 错误消息 */
  'error': (data: { message: string; code?: string }) => void;
  /** 心跳响应 */
  'pong': () => void;
}

/** Socket 交互数据接口（用于类型推断） */
export interface InterServerEvents {
  // 预留：服务器间通信事件
}

/** Socket 数据标记接口 */
export interface SocketData {
  /** 用户ID */
  userId: string;
  /** 当前房间码 */
  roomCode?: string;
  /** 当前游戏ID */
  gameId?: string;
  /** 昵称 */
  nickname?: string;
}
