# Dorm Party（宿舍派对）— 技术架构设计文档

> 版本: v1.0.0 | 日期: 2026-06-21 | 作者: AI Game Studio

---

## 一、系统架构图

### 1.1 整体架构

```
                            ┌─────────────┐
                            │   客户端     │
                            │ (手机浏览器)  │
                            └──────┬──────┘
                                   │ HTTPS / WSS
                                   ▼
                            ┌─────────────┐
                            │    Nginx     │
                            │  反向代理     │
                            │  SSL终端      │
                            └──┬───────┬──┘
                               │       │
                  静态资源/SSR │       │ WebSocket
                               ▼       ▼
                    ┌─────────────┐  ┌─────────────┐
                    │  Next.js 14 │  │   NestJS    │
                    │  前端服务     │  │  后端服务    │
                    │             │  │             │
                    │ - App Router│  │ - REST API  │
                    │ - SSR/SSG   │  │ - Socket.io │
                    │ - Tailwind  │  │ - TypeORM   │
                    └──────┬──────┘  └──┬──────┬──┘
                           │            │      │
                           │   HTTP API │      │ Socket.io
                           │            │      │
                           ▼            ▼      ▼
                    ┌──────────────────────────────┐
                    │           数据层               │
                    ├──────────┬──────────┬─────────┤
                    │ MySQL 8.0 │  Redis   │ DeepSeek│
                    │ 持久化存储  │ 缓存/锁  │ AI API  │
                    └──────────┴──────────┴─────────┘
```

### 1.2 核心模块关系

```
┌──────────────────────────────────────────────────────────────────┐
│                        Dorm Party 系统模块关系                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐    创建/加入     ┌─────────────┐   托管游戏状态     │
│  │ Room    │◄───────────────►│ Game        │◄──────────────────┐ │
│  │ Module  │                  │ Module      │                   │ │
│  └────┬────┘                  └──┬──────┬───┘                   │ │
│       │                          │      │                       │ │
│       │ 玩家列表                  │      │ 事件/剧情              │ │
│       ▼                          ▼      ▼                       │ │
│  ┌─────────┐              ┌─────────────┐                  ┌────┴──┐│
│  │ Player  │              │ AI Story   │──────────────────►│Memory ││
│  │ Module  │              │ Engine     │                  │System ││
│  └────┬────┘              └──────┬──────┘                  └───────┘│
│       │                          │                                 │
│       │ 玩家消息                  │ AI旁白/NPC对话                   │
│       ▼                          ▼                                 │
│  ┌──────────────────────────────────┐                             │
│  │            Chat Module            │◄────────────────────────────┘ │
│  │   消息处理 / 关键词检测 / 广播     │      记忆读写                   │
│  └──────────────────────────────────┘                             │
│                                                                  │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│  底层支撑: Socket.io(实时通信) + TypeORM(持久化) + Redis(缓存/锁)  │
└──────────────────────────────────────────────────────────────────┘
```

### 1.3 数据流向

```
玩家操作 → Socket.io Client → Socket.io Gateway → Service层处理
                                                    │
                                          ┌─────────┼─────────┐
                                          ▼         ▼         ▼
                                       Redis     MySQL    DeepSeek
                                      (缓存)    (持久化)  (AI生成)
                                          │         │         │
                                          └─────────┼─────────┘
                                                    ▼
                                          广播结果 → 所有客户端
```

---

## 二、项目目录结构

### 2.1 前端 — dorm-party-client/

```
dorm-party-client/
├── public/                         # 静态资源
│   ├── icons/                      # 图标
│   └── sounds/                     # 音效
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # 根布局（全局样式、字体）
│   │   ├── page.tsx                # 首页（创建/加入房间入口）
│   │   ├── room/
│   │   │   ├── create/
│   │   │   │   └── page.tsx        # 创建房间（选择主题）
│   │   │   └── join/
│   │   │       └── page.tsx        # 加入房间（输入邀请码）
│   │   └── game/
│   │       └── [id]/
│   │           ├── layout.tsx      # 游戏布局（含Socket连接）
│   │           ├── lobby/
│   │           │   └── page.tsx    # 等待大厅（玩家准备状态）
│   │           ├── role/
│   │           │   └── page.tsx    # 角色卡（查看身份/秘密/目标）
│   │           ├── chat/
│   │           │   └── page.tsx    # 聊天大厅（主游戏界面）
│   │           ├── event/
│   │           │   └── page.tsx    # 事件页面（事件详情+选择）
│   │           ├── vote/
│   │           │   └── page.tsx    # 投票页面（投票+技能）
│   │           └── ending/
│   │               └── page.tsx    # 结局页面（得分+成就）
│   ├── components/                 # 组件
│   │   ├── layout/
│   │   │   ├── MobileLayout.tsx    # 移动端布局容器
│   │   │   └── GameHeader.tsx      # 游戏顶部状态栏
│   │   ├── room/
│   │   │   ├── RoomCard.tsx        # 房间卡片
│   │   │   ├── PlayerSlot.tsx      # 玩家位置槽
│   │   │   └── ThemeSelector.tsx   # 主题选择器
│   │   ├── game/
│   │   │   ├── ChatMessage.tsx     # 聊天消息气泡
│   │   │   ├── EventCard.tsx       # 事件卡片
│   │   │   ├── VotePanel.tsx       # 投票面板
│   │   │   ├── RoleCard.tsx        # 角色卡展示
│   │   │   ├── SkillButton.tsx     # 技能按钮
│   │   │   ├── Timer.tsx           # 倒计时组件
│   │   │   └── RelationshipMap.tsx # 关系图可视化
│   │   ├── ai/
│   │   │   ├── AINarration.tsx     # AI旁白展示
│   │   │   ├── NPCDialog.tsx       # NPC对话气泡
│   │   │   └── StoryLog.tsx        # 剧情日志
│   │   └── common/
│   │       ├── Button.tsx          # 通用按钮
│   │       ├── Modal.tsx           # 模态框
│   │       ├── Toast.tsx           # 提示消息
│   │       └── Countdown.tsx       # 倒计时
│   ├── lib/                        # 工具库
│   │   ├── socket.ts              # Socket.io 客户端连接管理
│   │   ├── api.ts                 # REST API 客户端（Axios封装）
│   │   └── store.ts               # 全局状态管理（Zustand）
│   ├── hooks/                      # 自定义 Hooks
│   │   ├── useSocket.ts           # Socket.io 连接与事件订阅
│   │   ├── useGame.ts             # 游戏状态订阅
│   │   ├── useRoom.ts             # 房间状态订阅
│   │   ├── usePlayer.ts           # 当前玩家信息
│   │   ├── useTimer.ts            # 倒计时逻辑
│   │   └── useReconnect.ts        # 断线重连逻辑
│   ├── types/                      # TypeScript 类型定义
│   │   ├── room.ts                # 房间相关类型
│   │   ├── game.ts                # 游戏状态类型
│   │   ├── player.ts              # 玩家类型
│   │   ├── event.ts               # 事件类型
│   │   ├── chat.ts                # 消息类型
│   │   └── socket.ts              # Socket 事件类型
│   └── styles/                     # 样式文件
│       └── globals.css            # 全局样式（TailwindCSS入口）
├── next.config.js                 # Next.js 配置
├── tailwind.config.ts             # TailwindCSS 配置
├── tsconfig.json                  # TypeScript 配置
└── package.json
```

### 2.2 后端 — dorm-party-server/

```
dorm-party-server/
├── src/
│   ├── modules/
│   │   ├── room/                   # 房间模块
│   │   │   ├── room.module.ts      # 模块定义
│   │   │   ├── room.controller.ts  # REST API 控制器
│   │   │   ├── room.service.ts     # 房间业务逻辑
│   │   │   ├── room.gateway.ts     # WebSocket 网关（房间事件）
│   │   │   ├── room.entity.ts      # 房间数据库实体
│   │   │   └── dto/
│   │   │       ├── create-room.dto.ts
│   │   │       └── join-room.dto.ts
│   │   ├── game/                   # 游戏模块
│   │   │   ├── game.module.ts      # 模块定义
│   │   │   ├── game.controller.ts  # REST API 控制器
│   │   │   ├── game.service.ts     # 游戏状态机、回合管理
│   │   │   ├── game.gateway.ts     # WebSocket 网关（游戏事件）
│   │   │   ├── game.entity.ts      # 游戏数据库实体
│   │   │   ├── state-machine.ts    # 游戏状态机实现
│   │   │   └── dto/
│   │   │       ├── game-action.dto.ts
│   │   │       └── vote.dto.ts
│   │   ├── player/                 # 玩家模块
│   │   │   ├── player.module.ts    # 模块定义
│   │   │   ├── player.service.ts   # 玩家状态、角色管理
│   │   │   ├── player.entity.ts    # 玩家数据库实体
│   │   │   └── dto/
│   │   │       └── player-action.dto.ts
│   │   ├── ai/                     # AI 剧情引擎模块
│   │   │   ├── ai.module.ts        # 模块定义
│   │   │   ├── ai.service.ts       # DeepSeek API 调用封装
│   │   │   ├── prompt-builder.ts   # Prompt 构建器
│   │   │   ├── output-parser.ts    # LLM 输出解析器
│   │   │   ├── memory.service.ts   # 记忆管理服务
│   │   │   ├── event-trigger.ts    # 事件触发引擎
│   │   │   └── prompts/            # Prompt 模板目录
│   │   │       ├── system.prompt.ts      # 系统级 Prompt
│   │   │       ├── event-generation.prompt.ts  # 事件生成
│   │   │       ├── story-progression.prompt.ts # 剧情推进
│   │   │       ├── ending.prompt.ts    # 结局生成
│   │   │       └── npc-dialogue.prompt.ts # NPC对话
│   │   └── chat/                   # 聊天模块
│   │       ├── chat.module.ts      # 模块定义
│   │       ├── chat.service.ts     # 消息处理、关键词检测
│   │       ├── chat.gateway.ts     # WebSocket 网关（聊天事件）
│   │       ├── chat.entity.ts      # 消息数据库实体
│   │       ├── keyword-detector.ts # 关键词检测器
│   │       └── dto/
│   │           └── send-message.dto.ts
│   ├── common/                     # 公共模块
│   │   ├── dto/                    # 通用 DTO
│   │   │   └── pagination.dto.ts
│   │   ├── guards/                 # 守卫
│   │   │   └── room-guard.ts      # 房间权限守卫
│   │   ├── interceptors/           # 拦截器
│   │   │   └── logging.interceptor.ts
│   │   ├── filters/                # 异常过滤器
│   │   │   └── ws-exception.filter.ts
│   │   └── decorators/            # 自定义装饰器
│   │       ├── ws-message.decorator.ts
│   │       └── require-room.decorator.ts
│   ├── config/                     # 配置
│   │   ├── database.config.ts      # 数据库配置
│   │   ├── redis.config.ts         # Redis 配置
│   │   ├── ai.config.ts            # DeepSeek API 配置
│   │   └── app.config.ts           # 应用通用配置
│   ├── entities/                   # 公共实体
│   │   └── base.entity.ts         # 基础实体（id, createdAt, updatedAt）
│   ├── migrations/                 # 数据库迁移
│   └── app.module.ts               # 根模块
├── test/                           # 测试
│   ├── unit/
│   └── e2e/
├── nest-cli.json                   # NestJS CLI 配置
├── tsconfig.json                  # TypeScript 配置
├── typeorm.config.ts               # TypeORM 配置
└── package.json
```

### 2.3 根目录结构

```
dorm-party/
├── dorm-party-client/              # 前端项目
├── dorm-party-server/              # 后端项目
├── docker-compose.yml              # Docker Compose 编排
├── nginx/
│   └── nginx.conf                  # Nginx 配置
├── .env.example                    # 环境变量模板
├── ARCHITECTURE.md                 # 本文档
└── PRD.md                         # 产品需求文档
```

---

## 三、核心模块说明

### 3.1 RoomModule — 房间模块

**职责**：管理游戏房间的完整生命周期。

```
RoomModule
├── room.controller.ts   — REST API
│   ├── POST   /api/rooms          # 创建房间
│   ├── GET    /api/rooms/:id      # 获取房间信息
│   ├── POST   /api/rooms/:id/join # 加入房间
│   └── DELETE /api/rooms/:id      # 关闭房间
│
├── room.gateway.ts     — WebSocket 网关
│   ├── @SubscribeMessage('room:join')      # 玩家加入
│   ├── @SubscribeMessage('room:leave')     # 玩家离开
│   ├── @SubscribeMessage('room:ready')     # 玩家准备
│   ├── @SubscribeMessage('room:unready')   # 取消准备
│   ├── @SubscribeMessage('room:kick')      # 踢出玩家
│   └── @SubscribeMessage('room:chat')      # 大厅聊天
│
├── room.service.ts      — 业务逻辑
│   ├── createRoom()       # 创建房间，生成6位邀请码
│   ├── joinRoom()         # 加入房间，校验人数上限
│   ├── leaveRoom()        # 离开房间，转移房主
│   ├── toggleReady()      # 切换准备状态
│   ├── checkAllReady()    # 检查全员是否准备
│   └── closeRoom()        # 关闭房间，清理资源
│
└── room.entity.ts       — 数据模型
    ├── id: string (UUID)
    ├── inviteCode: string (6位唯一码)
    ├── hostId: string
    ├── theme: string
    ├── status: 'waiting' | 'playing' | 'finished'
    ├── maxPlayers: number (默认4)
    ├── currentPlayers: number
    └── createdAt / updatedAt
```

**关键设计**：
- 房间创建时在 Redis 中缓存房间状态，减少 MySQL 读取压力
- 邀请码使用 6 位大写字母+数字组合，通过 Redis SET 去重
- 房主离开时自动转移房主权限给最早加入的玩家
- 全员准备后，由 RoomService 调用 GameService 初始化游戏

### 3.2 GameModule — 游戏模块

**职责**：管理游戏状态机、回合推进、投票结算。

```
GameModule
├── game.controller.ts   — REST API
│   ├── GET    /api/games/:id         # 获取游戏状态
│   ├── GET    /api/games/:id/history # 获取游戏历史
│   └── GET    /api/games/:id/result  # 获取游戏结果
│
├── game.gateway.ts     — WebSocket 网关
│   ├── @SubscribeMessage('game:start')      # 开始游戏
│   ├── @SubscribeMessage('game:action')     # 玩家行动（选择/技能）
│   ├── @SubscribeMessage('game:vote')       # 投票
│   ├── @SubscribeMessage('game:use-skill')  # 使用技能
│   └── @SubscribeMessage('game:sync')       # 状态同步请求
│
├── game.service.ts      — 业务逻辑
│   ├── initGame()         # 初始化游戏，调用AI生成角色
│   ├── startRound()       # 开始新回合
│   ├── advancePhase()     # 推进游戏阶段
│   ├── processAction()    # 处理玩家行动
│   ├── processVote()      # 处理投票，计算结果
│   ├── checkRoundEnd()    # 检查回合是否结束
│   ├── endGame()          # 结束游戏，调用AI生成结局
│   └── getFullState()     # 获取完整游戏状态（用于重连）
│
├── state-machine.ts    — 状态机实现
│   └── 见下方状态机设计
│
└── game.entity.ts       — 数据模型
    ├── id: string (UUID)
    ├── roomId: string (外键)
    ├── theme: string
    ├── status: GameState 枚举
    ├── currentRound: number
    ├── totalRounds: number
    ├── currentPhase: GamePhase 枚举
    ├── storyHistory: JSON
    ├── worldSetting: JSON
    └── result: JSON (游戏结束后填充)
```

**游戏状态机设计**：

```
GameState 状态机:

  ┌─────────────┐
  │ ROOM_CREATED │ ←── 房间创建完成
  └──────┬──────┘
         │ 选择主题
         ▼
  ┌──────────────┐
  │THEME_SELECTED│
  └──────┬───────┘
         │ 全员准备
         ▼
  ┌─────────────┐
  │PLAYERS_READY│
  └──────┬──────┘
         │ AI生成角色中
         ▼
  ┌──────────────┐
  │GAME_STARTING │ ←── AI生成角色/世界观
  └──────┬───────┘
         │ 角色生成完成
         ▼
  ┌─────────────┐     ┌──────────────────┐
  │ ROUND_INTRO  │────►│ ROUND_FREE_CHAT  │
  └─────────────┘     └────────┬─────────┘
         ▲                      │ 时间到/条件满足
         │                      ▼
         │               ┌─────────────┐
         │               │ROUND_EVENT  │
         │               └──────┬──────┘
         │                      │ 事件处理完成
         │                      ▼
         │               ┌─────────────┐
         │               │ ROUND_VOTE  │
         │               └──────┬──────┘
         │                      │ 投票结算完成
         │                      ▼
         │               ┌──────────────┐
         │               │ROUND_RESULT  │
         │               └──────┬───────┘
         │                      │
         │           ┌──────────┴──────────┐
         │           │                     │
         │     还有下一轮?            最后一轮?
         │           │                     │
         │           ▼                     ▼
         │    回到 ROUND_INTRO      ┌───────────┐
         │                          │  FINALE   │
         │                          └─────┬─────┘
         │                                │ 结局生成完成
         │                                ▼
         │                          ┌───────────┐
         │                          │ GAME_OVER │
         │                          └───────────┘
         │
         └────── (循环)
```

**PlayerState 状态机**：

```
IDLE → JOINED → READY → ROLE_ASSIGNED → PLAYING ⇄ VOTING
                                            ↓
                                        FINISHED
```

### 3.3 AIModule — AI 剧情引擎模块

**职责**：封装 DeepSeek API 调用，管理 Prompt 构建、输出解析、记忆管理。

```
AIModule
├── ai.service.ts       — DeepSeek API 调用封装
│   ├── generateStory()     # 生成剧情内容（通用入口）
│   ├── generateCharacters() # 生成4个玩家角色
│   ├── generateEvent()     # 生成游戏事件
│   ├── generateEnding()    # 生成游戏结局
│   ├── generateNPCDialogue()# 生成NPC对话
│   └── callDeepSeek()      # 底层API调用（含重试/限流）
│
├── prompt-builder.ts   — Prompt 构建器
│   ├── buildSystemPrompt()      # 构建系统级Prompt
│   ├── buildEventPrompt()       # 构建事件生成Prompt
│   ├── buildStoryPrompt()       # 构建剧情推进Prompt
│   ├── buildEndingPrompt()      # 构建结局Prompt
│   ├── buildNPCPrompt()         # 构建NPC对话Prompt
│   └── injectGameState()        # 注入当前游戏状态到Prompt
│
├── output-parser.ts    — LLM 输出解析器
│   ├── parseEventResponse()     # 解析事件JSON
│   ├── parseCharacterResponse() # 解析角色JSON
│   ├── parseEndingResponse()    # 解析结局JSON
│   └── validateOutput()         # 校验输出格式合法性
│
├── memory.service.ts   — 记忆管理服务
│   ├── getShortTermMemory()     # 获取短期记忆（当前回合）
│   ├── getMidTermMemory()       # 获取中期记忆（当前游戏）
│   ├── addMemory()              # 添加记忆条目
│   ├── compressRoundMemory()    # 压缩回合记忆为摘要
│   └── buildContextWindow()      # 构建上下文窗口（Token控制）
│
├── event-trigger.ts    — 事件触发引擎
│   ├── detectKeywords()         # 关键词检测
│   ├── checkRelationships()     # 关系值变化检测
│   ├── checkRoundProgress()    # 回合进度检测
│   ├── checkHiddenQuests()      # 隐藏任务检测
│   └── selectBestTrigger()      # 选择最优触发事件
│
└── prompts/            — Prompt 模板
    ├── system.prompt.ts         # 系统级模板
    ├── event-generation.prompt.ts
    ├── story-progression.prompt.ts
    ├── ending.prompt.ts
    └── npc-dialogue.prompt.ts
```

**DeepSeek API 调用策略**：

```
ai.service.ts 核心逻辑:

async callDeepSeek(prompt: string, options?: CallOptions): Promise<AIResponse> {
  // 1. 构建请求参数
  const params = {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: options?.temperature ?? 0.8,  // 剧情生成用较高温度
    max_tokens: options?.maxTokens ?? 2000,
    response_format: { type: 'json_object' }  // 强制JSON输出
  };

  // 2. 调用API（含重试机制）
  let retries = 3;
  while (retries > 0) {
    try {
      const response = await this.httpService.post(
        DEEPSEEK_API_URL,
        params,
        { headers: { Authorization: `Bearer ${this.apiKey}` } }
      );
      return this.parseResponse(response.data);
    } catch (error) {
      retries--;
      if (error.status === 429) {
        // 限流：指数退避
        await sleep(Math.pow(2, 4 - retries) * 1000);
      } else if (retries === 0) {
        throw error;
      }
    }
  }
}
```

**记忆压缩策略**：

```
记忆管理流程:

每轮结束时:
  1. 将本轮聊天记录压缩为摘要（<200字）
  2. 提取关键决策点（谁做了什么选择）
  3. 更新关系矩阵（玩家间关系值变化）
  4. 标记重要事件（用于后续Prompt引用）

上下文窗口构建（每次调用LLM前）:
  ┌──────────────────────────────────┐
  │  系统Prompt (~500 tokens)        │
  ├──────────────────────────────────┤
  │  世界观设定 (~300 tokens)         │
  ├──────────────────────────────────┤
  │  角色信息 (~400 tokens)           │
  ├──────────────────────────────────┤
  │  最近3轮完整记录 (~3000 tokens)    │
  ├──────────────────────────────────┤
  │  更早轮次摘要 (~500 tokens)       │
  ├──────────────────────────────────┤
  │  关系矩阵 (~200 tokens)           │
  ├──────────────────────────────────┤
  │  当前事件/任务 (~300 tokens)       │
  ├──────────────────────────────────┤
  │  预留输出空间 (~2000 tokens)      │
  └──────────────────────────────────┘
  总计控制在 ~7000 tokens 以内
```

### 3.4 ChatModule — 聊天模块

**职责**：处理玩家消息、关键词检测、消息广播。

```
ChatModule
├── chat.gateway.ts      — WebSocket 网关
│   ├── @SubscribeMessage('chat:send')       # 发送消息
│   ├── @SubscribeMessage('chat:typing')      # 正在输入
│   └── @SubscribeMessage('chat:history')     # 获取历史消息
│
├── chat.service.ts      — 业务逻辑
│   ├── sendMessage()       # 处理消息，持久化，广播
│   ├── getHistory()        # 获取聊天历史（分页）
│   ├── filterMessage()     # 消息过滤（敏感词）
│   └── broadcastMessage()  # 广播消息给房间内所有玩家
│
├── keyword-detector.ts  — 关键词检测器
│   ├── detect()             # 检测消息中的关键词
│   ├── matchPatterns()      # 匹配预定义模式
│   └── triggerEvent()       # 触发关联事件
│
└── chat.entity.ts       — 数据模型
    ├── id: string (UUID)
    ├── gameId: string (外键)
    ├── playerId: string
    ├── playerName: string
    ├── content: string
    ├── type: 'player' | 'ai' | 'system' | 'npc'
    └── createdAt
```

**关键词检测机制**：

```typescript
// keyword-detector.ts 核心逻辑
interface KeywordRule {
  keywords: string[];        // 触发关键词
  eventType: string;         // 触发的事件类型
  threshold: number;         // 需要匹配的关键词数量
  cooldown: number;          // 冷却时间（毫秒）
}

// 示例规则
const rules: KeywordRule[] = [
  {
    keywords: ['杀', '死', '凶手', '密室'],
    eventType: 'REVELATION',
    threshold: 2,
    cooldown: 60000
  },
  {
    keywords: ['合作', '一起', '联盟'],
    eventType: 'COOPERATION',
    threshold: 1,
    cooldown: 120000
  }
];
```

### 3.5 PlayerModule — 玩家模块

**职责**：管理玩家状态、角色分配、技能使用。

```
PlayerModule
├── player.service.ts    — 业务逻辑
│   ├── assignRole()        # 分配角色（AI生成后）
│   ├── updateStatus()      # 更新玩家状态
│   ├── useSkill()          # 使用技能
│   ├── updateRelationships()# 更新关系值
│   ├── getVisibleInfo()    # 获取对其他玩家可见的信息
│   └── getSecretInfo()     # 获取私密信息（仅自己）
│
└── player.entity.ts     — 数据模型
    ├── id: string (UUID)
    ├── gameId: string (外键)
    ├── userId: string
    ├── nickname: string
    ├── role: JSON (角色信息)
    ├── secrets: JSON (秘密列表)
    ├── objectives: JSON (个人目标)
    ├── skills: JSON (技能列表及使用状态)
    ├── relationships: JSON (与其他玩家的关系值)
    ├── status: PlayerState 枚举
    ├── score: number
    └── isConnected: boolean
```

---

## 四、状态同步方案详解

### 4.1 权威服务器模式

Dorm Party 采用**权威服务器（Authoritative Server）**架构，确保所有游戏状态的一致性。

```
核心原则:
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   客户端只发送【操作指令】，不修改任何游戏状态               │
│   服务器接收指令 → 验证合法性 → 计算结果 → 广播给所有客户端   │
│                                                          │
│   客户端本地状态仅用于【UI渲染】，不做任何逻辑判断            │
│                                                          │
└──────────────────────────────────────────────────────────┘

示例流程 — 玩家投票:

  客户端A                    服务器                   客户端B/C/D
     │                         │                         │
     │  emit('game:vote', {    │                         │
     │    targetId: 'playerB', │                         │
     │    skillId: null        │                         │
     │  })                     │                         │
     │ ──────────────────────► │                         │
     │                         │ 1. 验证: 是否在投票阶段?  │
     │                         │ 2. 验证: 是否已投过票?   │
     │                         │ 3. 验证: 目标是否合法?   │
     │                         │ 4. 记录投票              │
     │                         │ 5. 检查是否全员投票      │
     │                         │                         │
     │  ◄──────────────────────│  emit('game:vote:recorded', {  │
     │                         │    voterId: 'playerA',  │ ────────►
     │                         │  })                     │
     │                         │                         │
     │                         │  (全员投票后)             │
     │  ◄──────────────────────│  emit('game:vote:result', {    │
     │                         │    results: {...},       │ ────────►
     │                         │    stateChanges: {...}  │         │
     │                         │  })                     │
```

### 4.2 操作日志（Oplog）设计

每一步游戏操作都记录为一条操作日志，用于状态回溯和断线重连。

```typescript
// 操作日志结构
interface OpLogEntry {
  id: string;              // 日志ID (UUID)
  gameId: string;          // 游戏ID
  round: number;            // 回合数
  phase: GamePhase;        // 阶段
  sequence: number;        // 序列号（单调递增）
  timestamp: number;       // 时间戳
  playerId: string;        // 操作玩家ID
  action: string;          // 操作类型
  payload: any;            // 操作数据
  stateDiff: any;          // 状态差异（JSON Patch格式）
}

// 操作类型枚举
enum GameAction {
  // 房间操作
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  TOGGLE_READY = 'toggle_ready',

  // 游戏操作
  START_GAME = 'start_game',
  SEND_MESSAGE = 'send_message',
  MAKE_CHOICE = 'make_choice',
  CAST_VOTE = 'cast_vote',
  USE_SKILL = 'use_skill',

  // 系统操作
  PHASE_CHANGE = 'phase_change',
  ROUND_START = 'round_start',
  ROUND_END = 'round_end',
  EVENT_TRIGGER = 'event_trigger',
  AI_NARRATION = 'ai_narration',
  GAME_END = 'game_end',
}

// Oplog 存储策略
// - Redis List: 存储当前游戏的 Oplog（快速读写）
// - MySQL: 游戏结束后批量持久化（用于回放/分析）
```

**Oplog 在 Redis 中的存储结构**：

```
Redis Key: oplog:{gameId}
数据类型: List
元素: JSON序列化的 OpLogEntry

操作:
- LPUSH oplog:{gameId} <entry>     # 追加新操作
- LRANGE oplog:{gameId} 0 -1      # 获取全部操作
- LRANGE oplog:{gameId} {seq} -1   # 获取seq之后的操作（增量同步）
```

### 4.3 增量同步策略

大部分时间使用增量同步，只传输变化的数据，减少带宽消耗。

```
增量同步流程:

  客户端                          服务器
    │                               │
    │  emit('game:sync', {          │
    │    lastSequence: 42           │
    │  })                           │
    │ ────────────────────────────► │
    │                               │  查询 oplog seq > 42 的记录
    │                               │
    │  ◄──────────────────────────── │  emit('game:sync:delta', {
    │                               │    fromSequence: 43,
    │                               │    entries: [
    │                               │      { seq: 43, action: '...', diff: {...} },
    │                               │      { seq: 44, action: '...', diff: {...} },
    │                               │      ...
    │                               │    ],
    │                               │    currentSequence: 47
    │                               │  })
    │                               │
    │  本地应用 stateDiff 更新UI     │
    │                               │

心跳机制:
- 客户端每 30 秒发送心跳
- 服务器每 30 秒发送心跳确认
- 超过 90 秒无心跳 → 标记为断线
```

**客户端状态管理（Zustand）**：

```typescript
// store.ts 简化示例
interface GameState {
  // 基础信息
  gameId: string | null;
  currentRound: number;
  currentPhase: GamePhase;
  players: PlayerInfo[];
  messages: Message[];

  // 同步控制
  lastSequence: number;

  // Actions
  applyDelta: (entry: OpLogEntry) => void;
  applyFullState: (state: FullGameState) => void;
}

const useGameStore = create<GameState>((set) => ({
  // ...初始状态

  applyDelta: (entry) => set((state) => {
    // 根据 stateDiff 应用增量更新
    return applyJsonPatch(state, entry.stateDiff);
  }),

  applyFullState: (fullState) => set(() => ({
    // 全量替换
    ...fullState,
    lastSequence: fullState.currentSequence
  }))
}));
```

### 4.4 关键节点全量同步

在以下场景执行全量同步，确保客户端状态与服务器完全一致。

```
全量同步触发时机:

1. 回合开始时
   ┌──────────────────────────────────────────┐
   │ 服务器广播 game:round:start               │
   │ 携带完整游戏状态快照:                      │
   │   - 当前回合信息                           │
   │   - 所有玩家状态                           │
   │   - 关系矩阵                               │
   │   - 剧情摘要                               │
   │   - 当前序列号                             │
   └──────────────────────────────────────────┘

2. 断线重连时
   ┌──────────────────────────────────────────┐
   │ 客户端重连成功                             │
   │   → emit('game:reconnect', {             │
   │       playerId: 'xxx',                    │
   │       lastSequence: 42                    │
   │     })                                   │
   │                                          │
   │ 服务器返回:                                │
   │   → 全量状态快照 + seq>42 的增量Oplog      │
   │   → 客户端先应用全量，再应用增量            │
   └──────────────────────────────────────────┘

3. 投票结算时
   ┌──────────────────────────────────────────┐
   │ 全员投票完成后                             │
   │   → 服务器计算投票结果                     │
   │   → 广播 game:vote:result                │
   │   → 携带完整投票结果 + 状态变更            │
   └──────────────────────────────────────────┘

4. 游戏结束时
   ┌──────────────────────────────────────────┐
   │ AI生成结局后                              │
   │   → 广播 game:ending                     │
   │   → 携带完整结局数据 + 最终得分            │
   └──────────────────────────────────────────┘
```

**全量状态快照结构**：

```typescript
interface FullGameState {
  gameId: string;
  theme: string;
  currentRound: number;
  totalRounds: number;
  currentPhase: GamePhase;
  currentSequence: number;

  players: Array<{
    id: string;
    nickname: string;
    roleName: string;
    roleDescription: string;   // 公开信息
    status: PlayerState;
    isConnected: boolean;
    score: number;
    // 注意: secrets 和 objectives 不包含在全量同步中
    // 私密信息通过单独接口获取
  }>;

  relationships: Record<string, Record<string, number>>; // 关系矩阵
  storySummary: string;        // 剧情摘要
  activeEvent: Event | null;    // 当前活跃事件
  revealedSecrets: string[];    // 已揭露的秘密ID
}
```

---

## 五、部署架构

### 5.1 Docker Compose 编排

```yaml
# docker-compose.yml
version: '3.8'

services:
  # ─── Nginx 反向代理 ───
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - client
      - server
    restart: always
    networks:
      - dorm-party-net

  # ─── Next.js 前端 ───
  client:
    build:
      context: ./dorm-party-client
      dockerfile: Dockerfile
    environment:
      - NEXT_PUBLIC_SOCKET_URL=${SOCKET_URL}
      - NEXT_PUBLIC_API_URL=${API_URL}
    restart: always
    networks:
      - dorm-party-net

  # ─── NestJS 后端 ───
  server:
    build:
      context: ./dorm-party-server
      dockerfile: Dockerfile
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_NAME=dorm_party
      - DB_USER=${DB_USER}
      - DB_PASS=${DB_PASS}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      - DEEPSEEK_API_URL=${DEEPSEEK_API_URL}
      - SOCKET_PORT=3001
      - CORS_ORIGIN=${CORS_ORIGIN}
    ports:
      - "3000:3000"   # REST API
      - "3001:3001"   # Socket.io
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    networks:
      - dorm-party-net

  # ─── MySQL 8.0 ───
  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASS}
      - MYSQL_DATABASE=dorm_party
      - MYSQL_USER=${DB_USER}
      - MYSQL_PASSWORD=${DB_PASS}
    volumes:
      - mysql-data:/var/lib/mysql
      - ./mysql/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    networks:
      - dorm-party-net

  # ─── Redis ───
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASS} --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASS}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    networks:
      - dorm-party-net

volumes:
  mysql-data:
  redis-data:

networks:
  dorm-party-net:
    driver: bridge
```

### 5.2 Nginx 反向代理配置

```nginx
# nginx/nginx.conf

upstream nextjs_upstream {
    server client:3000;
}

upstream nestjs_api_upstream {
    server server:3000;
}

upstream nestjs_socket_upstream {
    server server:3001;
}

server {
    listen 80;
    server_name dormparty.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dormparty.example.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # ─── 前端页面（Next.js SSR + 静态资源）───
    location / {
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # ─── REST API ───
    location /api/ {
        proxy_pass http://nestjs_api_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # API 限流
        limit_req zone=api burst=20 nodelay;
    }

    # ─── Socket.io WebSocket ───
    location /socket.io/ {
        proxy_pass http://nestjs_socket_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # WebSocket 超时设置
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;

        # WebSocket 限流
        limit_req zone=ws burst=50 nodelay;
    }

    # ─── 静态资源缓存 ───
    location /_next/static/ {
        proxy_pass http://nextjs_upstream;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # ─── Gzip 压缩 ───
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1024;
}
```

### 5.3 部署架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        生产环境部署架构                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐                                                  │
│   │  用户手机  │                                                  │
│   └─────┬────┘                                                  │
│         │ HTTPS/WSS                                              │
│         ▼                                                       │
│   ┌──────────┐                                                  │
│   │  Nginx   │  SSL终端 / 反向代理 / 限流 / Gzip               │
│   └──┬───┬──┘                                                  │
│      │   │                                                      │
│      │   │ /socket.io/                                          │
│      │   ▼                                                      │
│      │ ┌──────────┐  ┌──────────┐                              │
│      │ │ NestJS   │  │ NestJS   │  Socket.io 端口:3001         │
│      │ │ Instance │  │ Instance │  (可水平扩展)                 │
│      │ └────┬─────┘  └────┬─────┘                              │
│      │      │             │                                     │
│      │      └──────┬──────┘                                     │
│      │             │                                            │
│   / │ /api/  ┌────┴────┐                                       │
│      │        │  Redis  │  Pub/Sub 跨实例通信                    │
│      ▼        │  Cluster│  分布式锁                              │
│   ┌──────────┐│         │  状态缓存                              │
│   │ Next.js  │└─────────┘                                       │
│   │ (SSR)    │                                                  │
│   └──────────┘                                                  │
│                                                                 │
│   ┌──────────┐  ┌──────────┐                                   │
│   │ MySQL 8.0│  │ DeepSeek │  外部AI服务                        │
│   │ 主从复制  │  │   API    │                                   │
│   └──────────┘  └──────────┘                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 六、Redis 使用策略

### 6.1 房间状态缓存

```
Redis Key 设计 — 房间相关:

room:{roomId}                          Hash     房间基本信息
room:{roomId}:players                  Set      房间内玩家ID集合
room:{roomId}:player:{playerId}        Hash     玩家在房间中的状态
invite:{inviteCode}                    String   邀请码 → roomId 映射
room:waiting:list                     Set      等待中的房间列表

数据结构示例:

# room:ABC123 (Hash)
{
  "id": "ABC123",
  "hostId": "player_001",
  "theme": "ancient_court",
  "status": "waiting",
  "maxPlayers": 4,
  "createdAt": "1718956800000"
}

# room:ABC123:players (Set)
{ "player_001", "player_002", "player_003" }

# invite:DPARTY (String) → "ABC123"

TTL 策略:
- 等待中的房间: 24小时过期
- 游戏中的房间: 2小时过期（每次操作续期）
- 已结束的房间: 1小时后清理缓存
```

### 6.2 游戏状态缓存

```
Redis Key 设计 — 游戏相关:

game:{gameId}                          Hash     游戏核心状态
game:{gameId}:state                    String   完整状态快照(JSON)
game:{gameId}:oplog                    List     操作日志
game:{gameId}:players                  Hash     所有玩家状态
game:{gameId}:chat:{round}            List     每轮聊天记录
game:{gameId}:memory:short             Hash     短期记忆
game:{gameId}:memory:mid               Hash     中期记忆
game:{gameId}:timer                    String   当前计时器状态

数据结构示例:

# game:game_001 (Hash)
{
  "id": "game_001",
  "roomId": "ABC123",
  "theme": "ancient_court",
  "status": "ROUND_FREE_CHAT",
  "currentRound": 3,
  "totalRounds": 6,
  "currentPhase": "free_chat",
  "worldSetting": "{...}",
  "currentSequence": 156
}

# game:game_001:oplog (List)
[
  '{"seq":155,"action":"send_message","playerId":"p1","payload":{...}}',
  '{"seq":156,"action":"phase_change","playerId":"system","payload":{"phase":"event"}}'
]

# game:game_001:chat:3 (List) — 第3轮聊天
[
  '{"playerId":"p1","name":"玩家A","content":"我觉得...","type":"player","ts":1718956900}',
  '{"playerId":"ai","name":"AI旁白","content":"突然...","type":"ai","ts":1718956910}'
]

TTL 策略:
- 游戏中的状态: 游戏结束后2小时过期
- Oplog: 游戏结束后1小时过期（先持久化到MySQL再清理）
- 聊天记录: 游戏结束后1小时过期
```

### 6.3 分布式锁（防止并发问题）

```typescript
// 分布式锁工具类 — lock.util.ts

import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisLock {
  constructor(private readonly redis: Redis) {}

  /**
   * 获取分布式锁
   * @param key    锁的Key
   * @param ttl    锁的过期时间（毫秒）
   * @param retry  重试次数
   * @param delay  重试间隔（毫秒）
   */
  async acquireLock(
    key: string,
    ttl: number = 5000,
    retry: number = 3,
    delay: number = 200,
  ): Promise<string | null> {
    const lockId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    for (let i = 0; i < retry; i++) {
      const result = await this.redis.set(key, lockId, 'PX', ttl, 'NX');
      if (result === 'OK') {
        return lockId;
      }
      await sleep(delay);
    }
    return null; // 获取锁失败
  }

  /**
   * 释放分布式锁（使用Lua脚本保证原子性）
   */
  async releaseLock(key: string, lockId: string): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.redis.eval(script, 1, key, lockId);
    return result === 1;
  }
}
```

**锁的使用场景**：

```
需要加锁的并发敏感操作:

1. 加入房间
   lock:room:join:{roomId}
   TTL: 5秒
   场景: 防止多个玩家同时加入导致人数超限

2. 开始游戏
   lock:game:start:{roomId}
   TTL: 30秒
   场景: 防止重复触发游戏初始化（AI生成角色耗时较长）

3. 投票结算
   lock:game:vote:{gameId}
   TTL: 10秒
   场景: 防止最后几票同时到达导致重复结算

4. 使用技能
   lock:player:skill:{playerId}
   TTL: 5秒
   场景: 防止玩家快速点击重复使用技能

5. 回合推进
   lock:game:phase:{gameId}
   TTL: 15秒
   场景: 防止阶段切换时的并发冲突
```

### 6.4 Pub/Sub（跨实例通信）

当 NestJS 部署多个实例时，使用 Redis Pub/Sub 实现跨实例消息广播。

```
Pub/Sub 频道设计:

game:{gameId}:broadcast          # 游戏内广播（所有房间成员）
room:{roomId}:update             # 房间状态更新
system:health                   # 系统健康检查
```

```typescript
// pub-sub.service.ts — Redis Pub/Sub 服务

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class PubSubService implements OnModuleInit, OnModuleDestroy {
  private publisher: Redis;
  private subscriber: Redis;
  private handlers = new Map<string, (...args: any[]) => void>();

  constructor(private readonly redisUrl: string) {
    this.publisher = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);
  }

  onModuleInit() {
    // 订阅所有游戏广播频道（使用模式匹配）
    this.subscriber.psubscribe('game:*:broadcast');
    this.subscriber.psubscribe('room:*:update');

    this.subscriber.on('pmessage', (pattern, channel, message) => {
      const handler = this.handlers.get(channel);
      if (handler) {
        handler(JSON.parse(message));
      }
    });
  }

  /**
   * 发布消息到指定频道
   */
  async publish(channel: string, data: any): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(data));
  }

  /**
   * 注册频道处理器
   */
  on(channel: string, handler: (...args: any[]) => void) {
    this.handlers.set(channel, handler);
  }

  onModuleDestroy() {
    this.publisher.disconnect();
    this.subscriber.disconnect();
  }
}
```

**跨实例通信流程**：

```
场景: 玩家A连接到实例1，玩家B连接到实例2，同一房间

  玩家A(实例1)              Redis Pub/Sub           玩家B(实例2)
     │                         │                         │
     │  发送消息                 │                         │
     │                         │                         │
     │  实例1处理消息            │                         │
     │  1. 验证合法性            │                         │
     │  2. 持久化到MySQL         │                         │
     │  3. 缓存到Redis          │                         │
     │  4. 发布到Pub/Sub        │                         │
     │ ────────────────────────► │                         │
     │                         │  game:xxx:broadcast      │
     │                         │ ────────────────────────►│
     │                         │                         │
     │  实例1本地广播            │                         │  实例2接收Pub/Sub消息
     │  (发给连接在实例1的玩家)   │                         │  本地广播给玩家B
     │                         │                         │
```

### 6.5 Redis Key 命名规范与总览

```
Redis Key 命名规范:
  {业务}:{标识}:{子项}
  示例: game:game_001:oplog

完整 Key 清单:

# 房间相关
room:{roomId}                          Hash     房间信息           TTL: 2h
room:{roomId}:players                  Set      玩家集合           TTL: 2h
room:{roomId}:player:{playerId}        Hash     玩家房间状态       TTL: 2h
invite:{inviteCode}                    String   邀请码映射         TTL: 24h
room:waiting:list                       Set      等待房间列表       无TTL

# 游戏相关
game:{gameId}                          Hash     游戏核心状态       TTL: 2h
game:{gameId}:state                    String   完整状态快照       TTL: 2h
game:{gameId}:oplog                    List     操作日志           TTL: 2h
game:{gameId}:players                  Hash     玩家游戏状态       TTL: 2h
game:{gameId}:chat:{round}             List     回合聊天记录       TTL: 2h
game:{gameId}:memory:short             Hash     短期记忆           TTL: 2h
game:{gameId}:memory:mid               Hash     中期记忆           TTL: 2h
game:{gameId}:timer                    String   计时器状态         TTL: 10min

# 锁相关
lock:room:join:{roomId}                String   加入房间锁         TTL: 5s
lock:game:start:{roomId}               String   开始游戏锁         TTL: 30s
lock:game:vote:{gameId}                String   投票结算锁         TTL: 10s
lock:player:skill:{playerId}           String   技能使用锁         TTL: 5s
lock:game:phase:{gameId}               String   阶段切换锁         TTL: 15s

# Pub/Sub 频道
game:{gameId}:broadcast                 Channel  游戏广播
room:{roomId}:update                   Channel  房间更新
```

---

## 七、技术选型说明

| 技术 | 版本 | 选型理由 |
|------|------|----------|
| Next.js 14 | 14.x | App Router + SSR/SSG，适合移动端首屏加载优化 |
| TailwindCSS | 3.x | 原子化CSS，快速构建移动端UI，减少样式冲突 |
| Socket.io-client | 4.x | 自动重连、房间机制、兼容性好，适合实时游戏 |
| NestJS | 10.x | 模块化架构，原生支持WebSocket网关，TypeScript优先 |
| Socket.io | 4.x | 与客户端配对，支持命名空间、房间、ACK机制 |
| TypeORM | 0.3.x | 成熟的ORM，支持MySQL，装饰器语法与NestJS契合 |
| MySQL 8.0 | 8.0.x | JSON字段支持（存储角色/事件等复杂数据），事务支持 |
| Redis | 7.x | 高性能缓存，原生支持Pub/Sub，适合实时游戏状态管理 |
| DeepSeek API | latest | 性价比高的LLM，支持JSON模式输出，中文能力强 |
| Zustand | 4.x | 轻量状态管理，API简洁，适合游戏客户端状态同步 |
| Docker Compose | 2.x | 一键编排所有服务，开发/部署环境一致 |

---

## 八、安全设计

### 8.1 输入校验

- 所有客户端输入通过 DTO + class-validator 校验
- WebSocket 消息同样经过 DTO 校验
- 聊天消息长度限制（单条消息最大500字符）
- 敏感词过滤（基础版，MVP阶段）

### 8.2 通信安全

- 全链路 HTTPS/WSS 加密
- Nginx 作为 SSL 终端
- Socket.io 使用 CORS 白名单

### 8.3 资源保护

- API 限流（Nginx limit_req）
- DeepSeek API 调用限流（令牌桶算法）
- Redis 分布式锁防止并发攻击
- 房间创建频率限制（同一IP每分钟最多创建3个房间）

---

## 九、监控与日志

### 9.1 关键监控指标

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| 在线房间数 | 当前活跃房间 | > 800 |
| WebSocket 连接数 | 当前连接数 | > 3500 |
| 消息延迟 P99 | 消息从发送到广播的延迟 | > 1s |
| AI 响应时间 | DeepSeek API 平均响应时间 | > 8s |
| AI 调用失败率 | API 调用失败比例 | > 5% |
| Redis 内存使用 | Redis 内存占用 | > 80% |
| MySQL 慢查询 | 执行时间 > 1s 的查询 | > 10/min |

### 9.2 日志策略

```
日志级别:
- ERROR: 系统异常、API调用失败、数据库错误
- WARN:  限流触发、锁获取失败、重试操作
- INFO:  房间创建/关闭、游戏开始/结束、玩家加入/离开
- DEBUG: Oplog 详情、Prompt 内容、AI 响应原文（仅开发环境）

日志输出:
- 控制台: 开发环境
- 文件: 生产环境（按天轮转，保留30天）
- 结构化JSON格式，便于日志采集
```

---

> 文档结束 | Dorm Party 技术架构设计 v1.0.0
