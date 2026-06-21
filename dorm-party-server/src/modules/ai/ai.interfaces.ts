/**
 * AI 模块相关接口定义
 * 定义 AI 服务中使用的请求/响应类型、Prompt 模板、记忆条目等
 */

// ==================== 角色生成相关 ====================

/** 角色技能接口 */
export interface CharacterSkill {
  /** 技能ID */
  skillId: string;
  /** 技能名称 */
  name: string;
  /** 技能描述 */
  description: string;
  /** 技能效果 */
  effect: string;
  /** 使用次数限制 */
  maxUses: number;
}

/** 角色目标接口 */
export interface CharacterGoal {
  /** 目标描述 */
  description: string;
  /** 目标优先级（1-5） */
  priority: number;
  /** 是否为秘密目标 */
  isSecret: boolean;
}

/** 生成的单个角色 */
export interface GeneratedCharacter {
  /** 角色名称 */
  name: string;
  /** 角色身份/职业 */
  identity: string;
  /** 角色描述 */
  description: string;
  /** 角色秘密（仅自己可见） */
  secret: string;
  /** 角色性格特征 */
  personality: string;
  /** 角色头像标识 */
  avatar: string;
  /** 角色目标 */
  goal: CharacterGoal;
  /** 角色技能 */
  skill: CharacterSkill;
  /** 初始好感度 */
  affinity: number;
}

/** 角色生成响应 */
export interface CharacterGenerateResponse {
  /** 是否成功 */
  success: boolean;
  /** 生成的角色列表 */
  characters: GeneratedCharacter[];
  /** 错误信息 */
  error?: string;
}

// ==================== 事件生成相关 ====================

/** 事件选项接口 */
export interface EventOption {
  /** 选项索引 */
  index: number;
  /** 选项文本 */
  text: string;
  /** 选项效果描述 */
  effect: string;
  /** 选项影响的角色ID（可选） */
  targetRoleId?: string;
  /** 选项带来的分数变化 */
  scoreChange?: number;
}

/** 生成的事件 */
export interface GeneratedEvent {
  /** 事件ID */
  eventId: string;
  /** 事件标题 */
  title: string;
  /** 事件描述（旁白文本） */
  description: string;
  /** 事件类型 */
  type: 'plot' | 'conflict' | 'cooperation' | 'vote_trigger' | 'skill_trigger';
  /** 事件选项列表 */
  options: EventOption[];
  /** 关联角色ID列表 */
  relatedPlayers?: string[];
  /** 事件权重（影响后续剧情） */
  weight?: number;
  /** 事件标签 */
  tags?: string[];
}

/** 事件生成响应 */
export interface EventGenerateResponse {
  /** 是否成功 */
  success: boolean;
  /** 生成的事件 */
  event?: GeneratedEvent;
  /** 错误信息 */
  error?: string;
}

// ==================== 选择处理相关 ====================

/** 选择处理响应 */
export interface ChoiceProcessResponse {
  /** 是否成功 */
  success: boolean;
  /** 选择结果的叙述文本 */
  narrative: string;
  /** 状态变更描述 */
  stateChanges: {
    /** 受影响的玩家ID */
    playerId: string;
    /** 变更类型 */
    type: 'score' | 'affinity' | 'status';
    /** 变更值 */
    value: number;
    /** 变更描述 */
    description: string;
  }[];
  /** 是否触发后续事件 */
  triggerNextEvent: boolean;
  /** 错误信息 */
  error?: string;
}

// ==================== 投票处理相关 ====================

/** 投票处理响应 */
export interface VoteProcessResponse {
  /** 是否成功 */
  success: boolean;
  /** 投票结果的叙述文本 */
  narrative: string;
  /** 受影响的玩家ID */
  affectedPlayerId?: string;
  /** 影响描述 */
  effect?: string;
  /** 错误信息 */
  error?: string;
}

// ==================== 结局生成相关 ====================

/** 角色结局接口 */
export interface CharacterEnding {
  /** 角色名称 */
  characterName: string;
  /** 角色ID */
  characterId: string;
  /** 角色结局描述 */
  ending: string;
  /** 结局评分 */
  score: number;
  /** 结局标签 */
  tags: string[];
}

/** 花絮接口 */
export interface GameAnecdote {
  /** 花絮描述 */
  description: string;
  /** 相关角色 */
  relatedCharacters: string[];
  /** 花絮类型 */
  type: 'funny' | 'dramatic' | 'romantic' | 'suspenseful';
}

/** 结局生成响应 */
export interface EndingGenerateResponse {
  /** 是否成功 */
  success: boolean;
  /** 结局标题 */
  title: string;
  /** 结局文本 */
  endingText: string;
  /** 结局类型 */
  endingType: 'happy' | 'sad' | 'surprise' | 'chaos' | 'bittersweet';
  /** 各角色结局 */
  characterEndings: CharacterEnding[];
  /** 花絮列表 */
  anecdotes: GameAnecdote[];
  /** 总体评价 */
  overallRating: number;
  /** 错误信息 */
  error?: string;
}

// ==================== 旁白生成相关 ====================

/** 旁白生成响应 */
export interface NarrationResponse {
  /** 是否成功 */
  success: boolean;
  /** 旁白文本 */
  narration: string;
  /** 旁白风格 */
  style: 'dramatic' | 'humorous' | 'mysterious' | 'warm';
  /** 旁白时长（预估秒数） */
  estimatedDuration: number;
  /** 错误信息 */
  error?: string;
}

// ==================== Prompt 模板相关 ====================

/** Prompt 模板接口 */
export interface PromptTemplate {
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 模板内容（包含 {{variable}} 占位符） */
  template: string;
  /** 可用变量列表 */
  variables: string[];
}

// ==================== 记忆系统相关 ====================

/** 记忆类型枚举 */
export enum MemoryType {
  /** 事件记忆 */
  EVENT = 'event',
  /** 选择记忆 */
  CHOICE = 'choice',
  /** 投票记忆 */
  VOTE = 'vote',
  /** 聊天记忆 */
  CHAT = 'chat',
  /** 技能使用记忆 */
  SKILL = 'skill',
  /** 回合摘要 */
  ROUND_SUMMARY = 'round_summary',
  /** 角色互动 */
  INTERACTION = 'interaction',
}

/** 记忆条目接口 */
export interface MemoryItem {
  /** 记忆ID */
  id: string;
  /** 关联游戏ID */
  gameId: string;
  /** 记忆类型 */
  type: MemoryType;
  /** 记忆内容 */
  content: string;
  /** 关联回合数 */
  round: number;
  /** 关联玩家ID列表 */
  relatedPlayers?: string[];
  /** 记忆创建时间 */
  createdAt: number;
  /** 记忆权重（用于压缩时判断重要性） */
  weight: number;
  /** 是否已压缩 */
  compressed: boolean;
}

/** AI 上下文接口 */
export interface AIContext {
  /** 游戏ID */
  gameId: string;
  /** 当前回合数 */
  currentRound: number;
  /** 游戏主题 */
  theme: string;
  /** 压缩后的历史记忆摘要 */
  compressedHistory: string;
  /** 最近N条未压缩记忆 */
  recentMemories: MemoryItem[];
  /** 当前玩家状态概要 */
  playerSummary: {
    id: string;
    nickname: string;
    roleName: string;
    personality: string;
    score: number;
  }[];
}
