/**
 * AI 响应相关接口定义
 */

/** AI 角色生成请求 */
export interface AIRoleGenerateRequest {
  /** 游戏主题 */
  theme: string;
  /** 玩家数量 */
  playerCount: number;
  /** 玩家昵称列表 */
  nicknames: string[];
}

/** AI 生成的单个角色 */
export interface AIGeneratedRole {
  /** 角色名称 */
  name: string;
  /** 角色描述 */
  description: string;
  /** 角色秘密 */
  secret: string;
  /** 角色性格 */
  personality: string;
  /** 角色头像标识 */
  avatar: string;
}

/** AI 角色生成响应 */
export interface AIRoleGenerateResponse {
  /** 是否成功 */
  success: boolean;
  /** 生成的角色列表 */
  roles: AIGeneratedRole[];
  /** 错误信息 */
  error?: string;
}

/** AI 事件生成请求 */
export interface AIEventGenerateRequest {
  /** 游戏主题 */
  theme: string;
  /** 当前回合数 */
  round: number;
  /** 总回合数 */
  totalRounds: number;
  /** 角色列表 */
  roles: { name: string; personality: string }[];
  /** 上一回合摘要 */
  previousSummary?: string;
  /** 聊天关键词 */
  chatKeywords?: string[];
}

/** AI 生成的事件 */
export interface AIGeneratedEvent {
  /** 事件标题 */
  title: string;
  /** 事件描述 */
  description: string;
  /** 事件类型 */
  type: 'plot' | 'conflict' | 'cooperation' | 'vote_trigger';
  /** 选项列表 */
  choices: {
    /** 选项文本 */
    text: string;
    /** 选项效果描述 */
    effect: string;
  }[];
  /** 关联角色名称 */
  relatedPlayers?: string[];
}

/** AI 事件生成响应 */
export interface AIEventGenerateResponse {
  /** 是否成功 */
  success: boolean;
  /** 生成的事件 */
  event?: AIGeneratedEvent;
  /** 错误信息 */
  error?: string;
}

/** AI 结局生成请求 */
export interface AIEndingGenerateRequest {
  /** 游戏主题 */
  theme: string;
  /** 角色列表 */
  roles: { name: string; personality: string; secret: string }[];
  /** 各玩家分数 */
  scores: { nickname: string; score: number }[];
  /** 游戏过程摘要 */
  gameSummary: string;
  /** 投票结果 */
  voteResults: { voter: string; target: string }[];
}

/** AI 结局生成响应 */
export interface AIEndingGenerateResponse {
  /** 是否成功 */
  success: boolean;
  /** 结局文本 */
  endingText?: string;
  /** 结局类型 */
  endingType?: 'happy' | 'sad' | 'surprise' | 'chaos';
  /** 各角色结局描述 */
  roleEndings?: { name: string; ending: string }[];
  /** 错误信息 */
  error?: string;
}

/** DeepSeek API 聊天消息 */
export interface DeepSeekChatMessage {
  /** 角色：system / user / assistant */
  role: 'system' | 'user' | 'assistant';
  /** 消息内容 */
  content: string;
}

/** DeepSeek API 请求体 */
export interface DeepSeekRequest {
  /** 模型名称 */
  model: string;
  /** 消息列表 */
  messages: DeepSeekChatMessage[];
  /** 最大生成 token 数 */
  max_tokens?: number;
  /** 温度 */
  temperature?: number;
}

/** DeepSeek API 响应体 */
export interface DeepSeekResponse {
  /** 响应ID */
  id: string;
  /** 对象类型 */
  object: string;
  /** 创建时间 */
  created: number;
  /** 模型名称 */
  model: string;
  /** 选择列表 */
  choices: {
    /** 索引 */
    index: number;
    /** 消息 */
    message: DeepSeekChatMessage;
    /** 完成原因 */
    finish_reason: string;
  }[];
  /** 使用量 */
  usage: {
    /** 提示 token 数 */
    prompt_tokens: number;
    /** 完成 token 数 */
    completion_tokens: number;
    /** 总 token 数 */
    total_tokens: number;
  };
}
