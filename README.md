# Dorm Party（宿舍派对）

> 4人联机AI剧情互动游戏 -- 不依赖固定剧本，AI实时生成剧情，每次游戏体验完全不同。

## 项目简介

Dorm Party 是一款面向大学群体的 4 人联机 AI 剧情互动游戏。4 位玩家通过手机网页加入同一个虚拟房间，在 AI 主持下体验动态生成的剧情故事。游戏融合了角色扮演、社交推理和 AI 叙事，适合宿舍聚会、周末社交和线上团建场景。

**核心特色：**
- AI 实时生成剧情，每局体验独一无二
- 4 人联机，通过手机浏览器即可参与
- 多主题剧本（恐怖、悬疑、搞笑等）
- 实时聊天 + 投票 + AI 事件驱动

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Next.js 14 + React 18 + TypeScript | App Router, SSR/SSG, Tailwind CSS |
| 状态管理 | Zustand | 轻量级状态管理 |
| 实时通信 | Socket.IO 4 | WebSocket 双向通信 |
| 后端 | NestJS 10 + TypeScript | 模块化架构, 依赖注入 |
| 数据库 | MySQL 8.0 + TypeORM | 持久化存储 |
| 缓存 | Redis 7 | 游戏状态缓存、分布式锁 |
| AI | DeepSeek API | 剧情生成、角色对话、事件编排 |
| 反向代理 | Nginx 1.25 | 静态资源服务、API 代理、WebSocket 代理 |
| 部署 | Docker + Docker Compose | 容器化一键部署 |

## 项目结构

```
dorm-party/
├── docker-compose.yml          # Docker Compose 编排
├── .env.example                # 环境变量示例
├── database.sql                # 数据库初始化脚本
├── README.md                   # 项目总览（本文件）
├── PRD.md                      # 产品需求文档
├── ARCHITECTURE.md             # 技术架构设计文档
├── API_DESIGN.md               # API 接口设计文档
│
├── dorm-party-server/          # NestJS 后端
│   ├── Dockerfile
│   ├── .env.example
│   ├── nest-cli.json
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── main.ts             # 应用入口
│       ├── app.module.ts       # 根模块
│       ├── config/             # 配置模块
│       │   ├── ai.config.ts
│       │   ├── database.config.ts
│       │   └── redis.config.ts
│       ├── common/             # 公共模块
│       │   ├── dto/            # 数据传输对象
│       │   ├── entities/       # 数据库实体
│       │   └── interfaces/     # 接口定义
│       └── modules/            # 业务模块
│           ├── ai/             # AI 剧情生成
│           ├── chat/           # 聊天网关
│           ├── game/           # 游戏核心逻辑
│           ├── player/         # 玩家管理
│           ├── redis/          # Redis 服务
│           └── room/           # 房间管理
│
├── dorm-party-client/          # Next.js 前端
│   ├── Dockerfile
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── app/                # App Router 页面
│       │   ├── page.tsx        # 首页
│       │   ├── layout.tsx      # 根布局
│       │   ├── globals.css     # 全局样式
│       │   ├── room/           # 房间页面（创建/加入）
│       │   └── game/           # 游戏页面（大厅/角色/聊天/投票/结局）
│       ├── components/         # 组件
│       │   ├── common/         # 通用组件（Button, Modal, Toast 等）
│       │   ├── game/           # 游戏组件（ChatMessage, RoleCard, VotePanel 等）
│       │   ├── layout/         # 布局组件
│       │   └── room/           # 房间组件
│       ├── hooks/              # 自定义 Hooks
│       ├── lib/                # 工具库（API, Socket, Store）
│       └── types/              # TypeScript 类型定义
│
└── nginx/                      # Nginx 配置
    └── nginx.conf              # 反向代理 + WebSocket + 静态资源缓存
```

## 快速开始

### 环境要求

| 工具 | 版本要求 | 说明 |
|------|---------|------|
| Docker | >= 20.10 | 容器运行时 |
| Docker Compose | >= 2.0 | 容器编排 |
| Node.js | >= 18.x | 本地开发（可选） |
| npm / pnpm / yarn | 最新版 | 包管理器（可选） |

### Docker 一键部署

```bash
# 1. 克隆项目
git clone <repository-url>
cd dorm-party

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入 DeepSeek AI API Key 等配置

# 3. 一键启动所有服务
docker compose up -d

# 4. 查看服务状态
docker compose ps

# 5. 查看日志
docker compose logs -f          # 所有服务
docker compose logs -f server   # 仅后端
docker compose logs -f client   # 仅前端
```

启动成功后访问：
- **前端页面**: http://localhost
- **后端 API**: http://localhost/api
- **WebSocket**: ws://localhost/socket.io

### 本地开发

#### 后端（NestJS）

```bash
cd dorm-party-server

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入数据库和 Redis 连接信息

# 启动开发服务器（热重载）
npm run start:dev
```

后端服务运行在 http://localhost:3001

#### 前端（Next.js）

```bash
cd dorm-party-client

# 安装依赖
npm install

# 配置环境变量
# 本地开发时在 .env 中设置：
# NEXT_PUBLIC_API_URL=http://localhost:3001
# NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# 启动开发服务器（热重载）
npm run dev
```

前端服务运行在 http://localhost:3000

> **注意**: 本地开发需要提前安装并启动 MySQL 8.0 和 Redis 7，或通过 Docker 单独运行数据库服务：
> ```bash
> docker compose up -d mysql redis
> ```

## 配置说明

所有配置通过环境变量管理，详见 [.env.example](.env.example)。

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DB_PASSWORD` | MySQL root 密码 | `root123456` |
| `DB_DATABASE` | 数据库名称 | `dorm_party` |
| `REDIS_PASSWORD` | Redis 密码（留空则无密码） | 空 |
| `AI_API_KEY` | DeepSeek AI API Key | 无 |
| `AI_BASE_URL` | AI API 地址 | `https://api.deepseek.com/v1` |
| `AI_MODEL` | AI 模型名称 | `deepseek-chat` |
| `AI_MAX_TOKENS` | AI 最大生成 token 数 | `2000` |
| `AI_TEMPERATURE` | AI 温度参数（0-1） | `0.8` |
| `NEXT_PUBLIC_API_URL` | 前端 API 地址（构建时注入） | `http://localhost` |
| `NEXT_PUBLIC_SOCKET_URL` | 前端 WebSocket 地址（构建时注入） | `http://localhost` |

## 文档索引

| 文档 | 说明 |
|------|------|
| [PRD.md](PRD.md) | 产品需求文档 -- 游戏玩法、功能设计、用户故事 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 技术架构设计 -- 系统架构、模块关系、数据流、部署方案 |
| [API_DESIGN.md](API_DESIGN.md) | API 接口文档 -- RESTful API + WebSocket 事件定义 |

## 开发路线图

### Phase 1 -- MVP 核心玩法 (当前阶段)

- [x] 项目架构搭建（NestJS + Next.js + MySQL + Redis）
- [x] 房间系统（创建房间、加入房间、准备状态）
- [x] 游戏核心流程（角色分配、剧情推进、投票、结局）
- [x] 实时聊天系统（Socket.IO）
- [x] AI 剧情生成（DeepSeek API 集成）
- [x] 基础 UI 界面（移动端适配）

### Phase 2 -- 体验优化

- [ ] 多主题剧本支持（恐怖、悬疑、搞笑、校园）
- [ ] AI 角色个性化和记忆系统
- [ ] 音效和背景音乐
- [ ] 游戏回放和精彩时刻
- [ ] 好友系统和历史战绩

### Phase 3 -- 社交与增长

- [ ] 用户注册和登录系统
- [ ] 好友邀请链接和分享
- [ ] 排行榜和成就系统
- [ ] 公开房间和匹配系统
- [ ] 微信小程序适配

### Phase 4 -- 商业化

- [ ] 付费主题剧本
- [ ] 虚拟装扮和头像
- [ ] 广告变现
- [ ] 数据分析和用户行为追踪

## License

MIT
