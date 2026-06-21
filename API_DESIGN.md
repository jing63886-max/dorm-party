# Dorm Party（宿舍派对）API 接口设计文档

> 版本：v1.0.0
> 更新日期：2026-06-21

---

## 目录

- [第一部分：RESTful API](#第一部分restful-api)
  - [基础信息](#基础信息)
  - [通用响应格式](#通用响应格式)
  - [通用错误码](#通用错误码)
  - [用户模块](#用户模块)
  - [房间模块](#房间模块)
  - [游戏模块](#游戏模块)
- [第二部分：WebSocket 事件设计](#第二部分websocket-事件设计)
  - [连接信息](#连接信息)
  - [客户端 → 服务端事件](#客户端--服务端事件)
  - [服务端 → 客户端事件](#服务端--客户端事件)
  - [TypeScript 类型定义汇总](#typescript-类型定义汇总)

---

# 第一部分：RESTful API

## 基础信息

| 项目 | 说明 |
|------|------|
| Base URL | `/api/v1` |
| 认证方式 | MVP 阶段使用设备 ID（请求头 `X-Device-Id`） |
| Content-Type | `application/json` |
| 字符编码 | UTF-8 |

### 认证说明

MVP 阶段采用无注册登录机制，通过设备唯一标识进行用户身份识别：

```
X-Device-Id: 550e8400-e29b-41d4-a716-446655440000
```

> 设备 ID 由客户端生成并持久化存储，格式为 UUID v4。

## 通用响应格式

所有接口统一返回以下 JSON 结构：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | number | 业务状态码，200 表示成功 |
| message | string | 状态描述信息 |
| data | T | 业务数据，失败时为 `null` |

## 通用错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| 200 | 200 | 成功 |
| 400 | 400 | 请求参数错误 |
| 401 | 401 | 未认证（缺少 X-Device-Id） |
| 403 | 403 | 无权限（非房主等） |
| 404 | 404 | 资源不存在 |
| 409 | 409 | 状态冲突（如房间已满、游戏已开始） |
| 429 | 429 | 请求过于频繁 |
| 500 | 500 | 服务器内部错误 |

---

## 用户模块

### POST /users/register — 创建临时用户

创建一个新的临时用户，绑定设备 ID 与昵称。若设备 ID 已注册则更新昵称。

**请求**

```
POST /api/v1/users/register
Header: X-Device-Id: <device_id>
Content-Type: application/json
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 是 | 昵称，2-12 个字符 |

```json
{
  "nickname": "小明"
}
```

**成功响应**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userId": "u_550e8400e29b41d4a716",
    "nickname": "小明",
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "avatar": "default_01",
    "createdAt": "2026-06-21T10:00:00.000Z"
  }
}
```

**错误响应**

| 错误码 | 说明 |
|--------|------|
| 400 | 昵称格式不合法（为空或超长） |
| 401 | 缺少 X-Device-Id |

```json
{
  "code": 400,
  "message": "昵称长度需在2-12个字符之间",
  "data": null
}
```

---

### GET /users/me — 获取当前用户信息

根据请求头中的设备 ID 获取对应用户信息。

**请求**

```
GET /api/v1/users/me
Header: X-Device-Id: <device_id>
```

**成功响应**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userId": "u_550e8400e29b41d4a716",
    "nickname": "小明",
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "avatar": "default_01",
    "stats": {
      "totalGames": 15,
      "winCount": 8,
      "favoriteRole": "幽灵"
    },
    "createdAt": "2026-06-21T10:00:00.000Z"
  }
}
```

**错误响应**

| 错误码 | 说明 |
|--------|------|
| 401 | 缺少 X-Device-Id |
| 404 | 用户不存在（设备 ID 未注册） |

```json
{
  "code": 404,
  "message": "用户不存在，请先注册",
  "data": null
}
```

---

## 房间模块

### POST /rooms — 创建房间

创建一个新的游戏房间，创建者自动成为房主。

**请求**

```
POST /api/v1/rooms
Header: X-Device-Id: <device_id>
Content-Type: application/json
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| theme | string | 是 | 游戏主题，可选值见下表 |
| maxPlayers | number | 否 | 最大玩家数，默认 6，范围 4-8 |

**可选主题值**

| theme 值 | 说明 |
|----------|------|
| `classic` | 经典宿舍 |
| `mystery` | 悬疑宿舍 |
| `romance` | 浪漫宿舍 |
| `chaos` | 混乱宿舍 |

```json
{
  "theme": "mystery",
  "maxPlayers": 6
}
```

**成功响应**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "roomCode": "A3X9",
    "theme": "mystery",
    "status": "waiting",
    "maxPlayers": 6,
    "currentPlayers": 1,
    "hostId": "u_550e8400e29b41d4a716",
    "createdAt": "2026-06-21T10:05:00.000Z"
  }
}
```

**错误响应**

| 错误码 | 说明 |
|--------|------|
| 400 | 参数错误（无效主题、玩家数超范围） |
| 401 | 缺少 X-Device-Id |
| 409 | 用户已在其他房间中 |

```json
{
  "code": 409,
  "message": "你已在房间 B2K7 中，请先离开当前房间",
  "data": null
}
```

---

### GET /rooms/:roomCode — 获取房间信息

根据房间码获取房间详细信息。

**请求**

```
GET /api/v1/rooms/A3X9
Header: X-Device-Id: <device_id>
```

**路径参数**

| 字段 | 类型 | 说明 |
|------|------|------|
| roomCode | string | 4 位房间码 |

**成功响应**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "roomCode": "A3X9",
    "theme": "mystery",
    "status": "waiting",
    "maxPlayers": 6,
    "currentPlayers": 3,
    "hostId": "u_550e8400e29b41d4a716",
    "players": [
      {
        "userId": "u_550e8400e29b41d4a716",
        "nickname": "小明",
        "avatar": "default_01",
        "isHost": true,
        "isReady": true,
        "joinedAt": "2026-06-21T10:05:00.000Z"
      },
      {
        "userId": "u_a1b2c3d4e5f6g7h8i9j0",
        "nickname": "小红",
        "avatar": "default_03",
        "isHost": false,
        "isReady": false,
        "joinedAt": "2026-06-21T10:06:00.000Z"
      },
      {
        "userId": "u_f9e8d7c6b5a4f3e2d1c0",
        "nickname": "小刚",
        "avatar": "default_05",
        "isHost": false,
        "isReady": true,
        "joinedAt": "2026-06-21T10:07:00.000Z"
      }
    ],
    "createdAt": "2026-06-21T10:05:00.000Z"
  }
}
```

**错误响应**

| 错误码 | 说明 |
|--------|------|
| 404 | 房间不存在 |

```json
{
  "code": 404,
  "message": "房间不存在或已解散",
  "data": null
}
```

---

### POST /rooms/:roomCode/join — 加入房间

玩家通过房间码加入指定房间。

**请求**

```
POST /api/v1/rooms/A3X9/join
Header: X-Device-Id: <device_id>
Content-Type: application/json
```

**路径参数**

| 字段 | 类型 | 说明 |
|------|------|------|
| roomCode | string | 4 位房间码 |

**请求体**

无额外请求体（用户身份通过 X-Device-Id 识别）。

**成功响应**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "roomCode": "A3X9",
    "theme": "mystery",
    "status": "waiting",
    "maxPlayers": 6,
    "currentPlayers": 4,
    "hostId": "u_550e8400e29b41d4a716",
    "joinedAt": "2026-06-21T10:08:00.000Z"
  }
}
```

**错误响应**

| 错误码 | 说明 |
|--------|------|
| 404 | 房间不存在 |
| 409 | 房间已满 |
| 409 | 游戏已开始，无法加入 |
| 409 | 用户已在房间中 |

```json
{
  "code": 409,
  "message": "房间已满（6/6）",
  "data": null
}
```

---

### POST /rooms/:roomCode/ready — 准备/取消准备

切换玩家的准备状态。所有非房主玩家准备后，房主方可开始游戏。

**请求**

```
POST /api/v1/rooms/A3X9/ready
Header: X-Device-Id: <device_id>
Content-Type: application/json
```

**路径参数**

| 字段 | 类型 | 说明 |
|------|------|------|
| roomCode | string | 4 位房间码 |

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| isReady | boolean | 是 | true = 准备，false = 取消准备 |

```json
{
  "isReady": true
}
```

**成功响应**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userId": "u_a1b2c3d4e5f6g7h8i9j0",
    "nickname": "小红",
    "isReady": true,
    "readyCount": 3,
    "totalPlayers": 4,
    "allReady": false
  }
}
```

**错误响应**

| 错误码 | 说明 |
|--------|------|
| 404 | 房间不存在 |
| 409 | 游戏已开始，无法切换准备状态 |

---

### GET /rooms/:roomCode/players — 获取房间玩家列表

获取房间内所有玩家的简要信息。

**请求**

```
GET /api/v1/rooms/A3X9/players
Header: X-Device-Id: <device_id>
```

**路径参数**

| 字段 | 类型 | 说明 |
|------|------|------|
| roomCode | string | 4 位房间码 |

**成功响应**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "roomCode": "A3X9",
    "players": [
      {
        "userId": "u_550e8400e29b41d4a716",
        "nickname": "小明",
        "avatar": "default_01",
        "isHost": true,
        "isReady": true
      },
      {
        "userId": "u_a1b2c3d4e5f6g7h8i9j0",
        "nickname": "小红",
        "avatar": "default_03",
        "isHost": false,
        "isReady": false
      }
    ],
    "currentPlayers": 2,
    "maxPlayers": 6
  }
}
```

**错误响应**

| 错误码 | 说明 |
|--------|------|
| 404 | 房间不存在 |

---

## 游戏模块

### POST /games/start — 开始游戏

房主发起开始游戏。所有玩家必须已准备。

**请求**

```
POST /api/v1/games/start
Header: X-Device-Id: <device_id>
Content-Type: application/json
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomCode | string | 是 | 房间码 |

```json
{
  "roomCode": "A3X9"
}
```

**成功响应**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "gameId": "g_20260621A3X90001",
    "roomCode": "A3X9",
    "status": "role_reveal",
    "totalRounds": 5,
    "players": [
      {
        "userId": "u_550e8400e29b41d4a716",
        "nickname": "小明",
        "role": "幽灵",
        "roleDescription": "你是宿舍里的幽灵，每晚可以窥探一名玩家的秘密...",
        "team": "evil"
      },
      {
        "userId": "u_a1b2c3d4e5f6g7h8i9j0",
        "nickname": "小红",
        "role": "侦探",
        "roleDescription": "你是宿舍里的侦探，拥有敏锐的观察力...",
        "team": "good"
      }
    ]
  }
}
```

> **注意**：每个玩家只能看到自己的角色信息，其他玩家的角色字段为 `"hidden"`。

**错误响应**

| 错误码 | 说明 |
|--------|------|
| 403 | 非房主无权开始游戏 |
| 404 | 房间不存在 |
| 409 | 并非所有玩家都已准备 |
| 409 | 玩家人数不足（至少需要 4 人） |

```json
{
  "code": 409,
  "message": "还有 1 名玩家未准备，无法开始游戏",
  "data": null
}
```

---

### GET /games/:gameId — 获取游戏状态

获取当前游戏的完整状态信息。

**请求**

```
GET /api/v1/games/g_20260621A3X90001
Header: X-Device-Id: <device_id>
```

**路径参数**

| 字段 | 类型 | 说明 |
|------|------|------|
| gameId | string | 游戏 ID |

**成功响应**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "gameId": "g_20260621A3X90001",
    "roomCode": "A3X9",
    "status": "event_phase",
    "phase": "event",
    "round": 3,
    "totalRounds": 5,
    "timer": 45,
    "players": [
      {
        "userId": "u_550e8400e29b41d4a716",
        "nickname": "小明",
        "avatar": "default_01",
        "role": "幽灵",
        "team": "evil",
        "isAlive": true,
        "status": "active"
      },
      {
        "userId": "u_a1b2c3d4e5f6g7h8i9j0",
        "nickname": "小红",
        "avatar": "default_03",
        "role": "侦探",
        "team": "good",
        "isAlive": true,
        "status": "active"
      }
    ],
    "currentEvent": {
      "eventId": "evt_003",
      "title": "深夜的奇怪声响",
      "description": "凌晨两点，宿舍楼里传来奇怪的声响...",
      "choices": [
        { "index": 0, "text": "起床查看" },
        { "index": 1, "text": "继续睡觉" },
        { "index": 2, "text": "叫醒室友" }
      ],
      "deadline": "2026-06-21T10:20:00.000Z"
    },
    "narration": {
      "content": "夜幕降临，宿舍楼的灯光一盏盏熄灭...",
      "mood": "mysterious"
    }
  }
}
```

**错误响应**

| 错误码 | 说明 |
|--------|------|
| 404 | 游戏不存在 |

---

### GET /games/:gameId/role — 获取我的角色信息

获取当前用户在指定游戏中的角色详情。

**请求**

```
GET /api/v1/games/g_20260621A3X90001/role
Header: X-Device-Id: <device_id>
```

**路径参数**

| 字段 | 类型 | 说明 |
|------|------|------|
| gameId | string | 游戏 ID |

**成功响应**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userId": "u_550e8400e29b41d4a716",
    "role": "幽灵",
    "team": "evil",
    "roleDescription": "你是宿舍里的幽灵，每晚可以窥探一名玩家的秘密。你的目标是隐藏身份，在投票中存活到最后。",
    "skills": [
      {
        "skillId": "skill_ghost_peep",
        "name": "窥探",
        "description": "窥探一名玩家的秘密",
        "cooldown": 2,
        "currentCooldown": 0,
        "maxUses": 3,
        "usedCount": 1
      }
    ],
    "objectives": [
      "隐藏身份直到游戏结束",
      "在投票中不被淘汰"
    ]
  }
}
```

**错误响应**

| 错误码 | 说明 |
|--------|------|
| 404 | 游戏不存在 |
| 409 | 用户不在此游戏中 |

---

### POST /games/:gameId/choices — 提交事件选择

玩家在事件阶段提交自己的选择。

**请求**

```
POST /api/v1/games/g_20260621A3X90001/choices
Header: X-Device-Id: <device_id>
Content-Type: application/json
```

**路径参数**

| 字段 | 类型 | 说明 |
|------|------|------|
| gameId | string | 游戏 ID |

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| eventId | string | 是 | 事件 ID |
| choiceIndex | number | 是 | 选择的选项索引（从 0 开始） |

```json
{
  "eventId": "evt_003",
  "choiceIndex": 2
}
```

**成功响应**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "eventId": "evt_003",
    "choiceIndex": 2,
    "submittedAt": "2026-06-21T10:18:30.000Z",
    "isLate": false
  }
}
```

**错误响应**

| 错误码 | 说明 |
|--------|------|
| 400 | 参数错误（无效的 eventId 或 choiceIndex） |
| 409 | 不在事件阶段 |
| 409 | 已提交过该事件的选择 |
| 409 | 事件已过期 |

```json
{
  "code": 409,
  "message": "该事件选择已截止",
  "data": null
}
```

---

### POST /games/:gameId/vote — 提交投票

玩家在投票阶段提交投票。

**请求**

```
POST /api/v1/games/g_20260621A3X90001/vote
Header: X-Device-Id: <device_id>
Content-Type: application/json
```

**路径参数**

| 字段 | 类型 | 说明 |
|------|------|------|
| gameId | string | 游戏 ID |

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| targetId | string | 是 | 被投票的玩家 userId |

```json
{
  "targetId": "u_a1b2c3d4e5f6g7h8i9j0"
}
```

**成功响应**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "targetId": "u_a1b2c3d4e5f6g7h8i9j0",
    "submittedAt": "2026-06-21T10:25:00.000Z",
    "voteCount": 3
  }
}
```

**错误响应**

| 错误码 | 说明 |
|--------|------|
| 400 | 参数错误（targetId 无效） |
| 409 | 不在投票阶段 |
| 409 | 已投过票 |
| 409 | 已被淘汰的玩家无法投票 |

```json
{
  "code": 409,
  "message": "你已被淘汰，无法投票",
  "data": null
}
```

---

### GET /games/:gameId/ending — 获取结局

游戏结束后获取结局详情。

**请求**

```
GET /api/v1/games/g_20260621A3X90001/ending
Header: X-Device-Id: <device_id>
```

**路径参数**

| 字段 | 类型 | 说明 |
|------|------|------|
| gameId | string | 游戏 ID |

**成功响应**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "gameId": "g_20260621A3X90001",
    "winner": "good",
    "endings": [
      {
        "userId": "u_550e8400e29b41d4a716",
        "nickname": "小明",
        "role": "幽灵",
        "team": "evil",
        "endingTitle": "暴露的幽灵",
        "endingDescription": "你的伪装最终被识破，在最后一轮投票中被淘汰。宿舍恢复了平静...",
        "isWinner": false
      },
      {
        "userId": "u_a1b2c3d4e5f6g7h8i9j0",
        "nickname": "小红",
        "role": "侦探",
        "team": "good",
        "endingTitle": "正义的侦探",
        "endingDescription": "凭借敏锐的洞察力，你成功揪出了隐藏在宿舍中的幽灵...",
        "isWinner": true
      }
    ],
    "rankings": [
      { "rank": 1, "userId": "u_a1b2c3d4e5f6g7h8i9j0", "nickname": "小红", "score": 120 },
      { "rank": 2, "userId": "u_f9e8d7c6b5a4f3e2d1c0", "nickname": "小刚", "score": 95 },
      { "rank": 3, "userId": "u_550e8400e29b41d4a716", "nickname": "小明", "score": 60 }
    ],
    "gameDuration": 1820,
    "totalRounds": 5,
    "endedAt": "2026-06-21T10:35:20.000Z"
  }
}
```

**错误响应**

| 错误码 | 说明 |
|--------|------|
| 404 | 游戏不存在 |
| 409 | 游戏尚未结束 |

---

### GET /games/:gameId/history — 获取游戏历史

获取已结束游戏的完整历史记录，包含每回合的事件、选择和投票详情。

**请求**

```
GET /api/v1/games/g_20260621A3X90001/history
Header: X-Device-Id: <device_id>
```

**路径参数**

| 字段 | 类型 | 说明 |
|------|------|------|
| gameId | string | 游戏 ID |

**成功响应**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "gameId": "g_20260621A3X90001",
    "theme": "mystery",
    "totalRounds": 5,
    "rounds": [
      {
        "round": 1,
        "narration": "夜幕降临，宿舍楼的灯光一盏盏熄灭...",
        "event": {
          "eventId": "evt_001",
          "title": "门外的脚步声",
          "description": "深夜，走廊上传来一阵奇怪的脚步声..."
        },
        "choices": [
          { "userId": "u_550e8400e29b41d4a716", "choiceIndex": 0 },
          { "userId": "u_a1b2c3d4e5f6g7h8i9j0", "choiceIndex": 2 }
        ],
        "voteResult": {
          "targetId": "u_f9e8d7c6b5a4f3e2d1c0",
          "votes": 3,
          "isEliminated": false
        },
        "stateChanges": []
      }
    ],
    "endedAt": "2026-06-21T10:35:20.000Z"
  }
}
```

**错误响应**

| 错误码 | 说明 |
|--------|------|
| 404 | 游戏不存在 |

---

# 第二部分：WebSocket 事件设计

## 连接信息

| 项目 | 说明 |
|------|------|
| 协议 | Socket.IO |
| 命名空间 | `/game` |
| 连接地址 | `ws://<host>/game` |
| 认证 | 连接时传递 `userId` |

### 连接示例

```javascript
import { io } from 'socket.io-client';

const socket = io('/game', {
  auth: {
    userId: 'u_550e8400e29b41d4a716'
  }
});
```

### 连接认证失败

若 `auth.userId` 无效，服务端将断开连接并触发 `game:error` 事件。

---

## 客户端 → 服务端事件

### room:join — 加入房间

客户端加入指定房间，加入房间频道。

| 项目 | 说明 |
|------|------|
| 事件名 | `room:join` |
| 发送方 | 客户端 |
| 触发条件 | 玩家进入房间页面时 |

**Payload 类型定义**

```typescript
interface RoomJoinPayload {
  roomCode: string;  // 4位房间码
  userId: string;    // 用户ID
}
```

**示例**

```json
{
  "roomCode": "A3X9",
  "userId": "u_550e8400e29b41d4a716"
}
```

---

### room:leave — 离开房间

客户端离开指定房间。

| 项目 | 说明 |
|------|------|
| 事件名 | `room:leave` |
| 发送方 | 客户端 |
| 触发条件 | 玩家主动退出房间或关闭页面 |

**Payload 类型定义**

```typescript
interface RoomLeavePayload {
  roomCode: string;  // 4位房间码
  userId: string;    // 用户ID
}
```

**示例**

```json
{
  "roomCode": "A3X9",
  "userId": "u_550e8400e29b41d4a716"
}
```

---

### room:ready — 准备状态变更

客户端切换准备状态。

| 项目 | 说明 |
|------|------|
| 事件名 | `room:ready` |
| 发送方 | 客户端 |
| 触发条件 | 玩家点击准备/取消准备按钮 |

**Payload 类型定义**

```typescript
interface RoomReadyPayload {
  roomCode: string;  // 4位房间码
  userId: string;    // 用户ID
  isReady: boolean;  // true=准备, false=取消准备
}
```

**示例**

```json
{
  "roomCode": "A3X9",
  "userId": "u_550e8400e29b41d4a716",
  "isReady": true
}
```

---

### game:message — 发送聊天消息

客户端发送游戏内聊天消息。

| 项目 | 说明 |
|------|------|
| 事件名 | `game:message` |
| 发送方 | 客户端 |
| 触发条件 | 玩家在聊天框中发送消息 |

**Payload 类型定义**

```typescript
interface GameMessagePayload {
  gameId: string;    // 游戏ID
  playerId: string;  // 发送者用户ID
  content: string;    // 消息内容，最大200字符
}
```

**示例**

```json
{
  "gameId": "g_20260621A3X90001",
  "playerId": "u_550e8400e29b41d4a716",
  "content": "我觉得小红很可疑..."
}
```

---

### game:choice — 提交事件选择

客户端在事件阶段提交选择。

| 项目 | 说明 |
|------|------|
| 事件名 | `game:choice` |
| 发送方 | 客户端 |
| 触发条件 | 玩家在事件界面选择一个选项 |

**Payload 类型定义**

```typescript
interface GameChoicePayload {
  gameId: string;      // 游戏ID
  playerId: string;    // 玩家ID
  eventId: string;     // 事件ID
  choiceIndex: number; // 选项索引（从0开始）
}
```

**示例**

```json
{
  "gameId": "g_20260621A3X90001",
  "playerId": "u_550e8400e29b41d4a716",
  "eventId": "evt_003",
  "choiceIndex": 2
}
```

---

### game:vote — 提交投票

客户端在投票阶段提交投票。

| 项目 | 说明 |
|------|------|
| 事件名 | `game:vote` |
| 发送方 | 客户端 |
| 触发条件 | 玩家在投票界面选择投票目标并确认 |

**Payload 类型定义**

```typescript
interface GameVotePayload {
  gameId: string;     // 游戏ID
  playerId: string;   // 投票者ID
  targetId: string;   // 被投票目标ID
}
```

**示例**

```json
{
  "gameId": "g_20260621A3X90001",
  "playerId": "u_550e8400e29b41d4a716",
  "targetId": "u_a1b2c3d4e5f6g7h8i9j0"
}
```

---

### game:useSkill — 使用技能

客户端使用角色技能。

| 项目 | 说明 |
|------|------|
| 事件名 | `game:useSkill` |
| 发送方 | 客户端 |
| 触发条件 | 玩家在技能界面选择使用某个技能 |

**Payload 类型定义**

```typescript
interface GameUseSkillPayload {
  gameId: string;      // 游戏ID
  playerId: string;    // 使用者ID
  skillId: string;     // 技能ID
  targetId?: string;    // 技能目标ID（可选，部分技能无需目标）
}
```

**示例**

```json
{
  "gameId": "g_20260621A3X90001",
  "playerId": "u_550e8400e29b41d4a716",
  "skillId": "skill_ghost_peep",
  "targetId": "u_a1b2c3d4e5f6g7h8i9j0"
}
```

---

## 服务端 → 客户端事件

### room:playerJoined — 玩家加入

有新玩家加入房间时广播。

| 项目 | 说明 |
|------|------|
| 事件名 | `room:playerJoined` |
| 发送方 | 服务端 |
| 接收方 | 房间内所有玩家 |
| 触发条件 | 新玩家成功加入房间 |

**Payload 类型定义**

```typescript
interface PlayerInfo {
  userId: string;
  nickname: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: string;  // ISO 8601
}

interface RoomPlayerJoinedPayload {
  player: PlayerInfo;
}
```

**示例**

```json
{
  "player": {
    "userId": "u_a1b2c3d4e5f6g7h8i9j0",
    "nickname": "小红",
    "avatar": "default_03",
    "isHost": false,
    "isReady": false,
    "joinedAt": "2026-06-21T10:06:00.000Z"
  }
}
```

---

### room:playerLeft — 玩家离开

有玩家离开房间时广播。

| 项目 | 说明 |
|------|------|
| 事件名 | `room:playerLeft` |
| 发送方 | 服务端 |
| 接收方 | 房间内剩余玩家 |
| 触发条件 | 玩家主动离开或断线超时 |

**Payload 类型定义**

```typescript
interface RoomPlayerLeftPayload {
  userId: string;       // 离开的玩家ID
  newHostId?: string;   // 若离开的是房主，新房主ID
}
```

**示例**

```json
{
  "userId": "u_a1b2c3d4e5f6g7h8i9j0",
  "newHostId": "u_f9e8d7c6b5a4f3e2d1c0"
}
```

---

### room:playerReady — 玩家准备状态变更

玩家切换准备状态时广播。

| 项目 | 说明 |
|------|------|
| 事件名 | `room:playerReady` |
| 发送方 | 服务端 |
| 接收方 | 房间内所有玩家 |
| 触发条件 | 玩家切换准备状态 |

**Payload 类型定义**

```typescript
interface RoomPlayerReadyPayload {
  userId: string;    // 变更的玩家ID
  isReady: boolean;  // 当前准备状态
  readyCount: number;    // 当前已准备人数
  totalPlayers: number;  // 当前房间总人数
  allReady: boolean;     // 是否所有人已准备（不含房主）
}
```

**示例**

```json
{
  "userId": "u_a1b2c3d4e5f6g7h8i9j0",
  "isReady": true,
  "readyCount": 3,
  "totalPlayers": 4,
  "allReady": false
}
```

---

### room:gameStarting — 游戏即将开始

房主发起开始游戏后，广播倒计时。

| 项目 | 说明 |
|------|------|
| 事件名 | `room:gameStarting` |
| 发送方 | 服务端 |
| 接收方 | 房间内所有玩家 |
| 触发条件 | 房主点击开始游戏，进入倒计时阶段 |

**Payload 类型定义**

```typescript
interface RoomGameStartingPayload {
  countdown: number;  // 倒计时秒数（通常为5秒）
  gameId: string;      // 即将开始的游戏ID
}
```

**示例**

```json
{
  "countdown": 5,
  "gameId": "g_20260621A3X90001"
}
```

---

### game:stateUpdate — 游戏状态更新

游戏阶段切换或关键状态变化时广播。

| 项目 | 说明 |
|------|------|
| 事件名 | `game:stateUpdate` |
| 发送方 | 服务端 |
| 接收方 | 游戏内所有玩家 |
| 触发条件 | 游戏阶段切换（如事件阶段→投票阶段）、回合切换、计时器更新 |

**Payload 类型定义**

```typescript
type GamePhase =
  | 'role_reveal'    // 角色揭示
  | 'narration'      // 旁白阶段
  | 'event'          // 事件阶段
  | 'discussion'     // 讨论阶段
  | 'vote'           // 投票阶段
  | 'vote_result'    // 投票结果
  | 'round_end'      // 回合结束
  | 'game_end';      // 游戏结束

interface GameStateUpdatePayload {
  phase: GamePhase;       // 当前阶段
  round: number;           // 当前回合（从1开始）
  timer: number;           // 当前阶段剩余秒数
  totalRounds: number;     // 总回合数
}
```

**示例**

```json
{
  "phase": "event",
  "round": 3,
  "timer": 45,
  "totalRounds": 5
}
```

---

### game:narration — AI 旁白

AI 生成的旁白文本，用于营造氛围。

| 项目 | 说明 |
|------|------|
| 事件名 | `game:narration` |
| 发送方 | 服务端 |
| 接收方 | 游戏内所有玩家 |
| 触发条件 | 每个回合开始时、关键事件触发时 |

**Payload 类型定义**

```typescript
type NarrationMood =
  | 'mysterious'   // 神秘
  | 'tense'        // 紧张
  | 'relaxed'      // 轻松
  | 'dramatic'     // 戏剧性
  | 'horror'       // 恐怖
  | 'romantic'     // 浪漫
  | 'chaotic';     // 混乱

interface GameNarrationPayload {
  content: string;        // 旁白文本内容
  mood: NarrationMood;    // 旁白情绪/氛围
  round: number;          // 当前回合
}
```

**示例**

```json
{
  "content": "夜幕降临，宿舍楼的灯光一盏盏熄灭。只有走廊尽头的应急灯还在闪烁，投下诡异的影子...",
  "mood": "mysterious",
  "round": 1
}
```

---

### game:message — 新聊天消息

广播玩家发送的聊天消息。

| 项目 | 说明 |
|------|------|
| 事件名 | `game:message` |
| 发送方 | 服务端 |
| 接收方 | 游戏内所有玩家 |
| 触发条件 | 玩家发送聊天消息后 |

**Payload 类型定义**

```typescript
type MessageType = 'chat' | 'system' | 'role_action';

interface GameMessagePayload {
  id: string;           // 消息唯一ID
  playerId: string;     // 发送者ID（系统消息为 "system"）
  nickname: string;     // 发送者昵称
  content: string;      // 消息内容
  type: MessageType;     // 消息类型
  timestamp: string;     // ISO 8601 时间戳
}
```

**示例**

```json
{
  "id": "msg_001",
  "playerId": "u_550e8400e29b41d4a716",
  "nickname": "小明",
  "content": "我觉得小红很可疑...",
  "type": "chat",
  "timestamp": "2026-06-21T10:22:15.000Z"
}
```

---

### game:event — 新事件

服务端推送新的事件供玩家选择。

| 项目 | 说明 |
|------|------|
| 事件名 | `game:event` |
| 发送方 | 服务端 |
| 接收方 | 游戏内所有玩家 |
| 触发条件 | 进入事件阶段时，AI 生成新事件 |

**Payload 类型定义**

```typescript
interface EventChoice {
  index: number;    // 选项索引
  text: string;     // 选项文本
}

interface EventData {
  eventId: string;          // 事件唯一ID
  title: string;            // 事件标题
  description: string;     // 事件描述
  illustration?: string;    // 事件插图URL（可选）
  choices: EventChoice[];   // 可选选项列表
  duration: number;        // 选择时限（秒）
  round: number;            // 所属回合
}

interface GameEventPayload {
  event: EventData;
}
```

**示例**

```json
{
  "event": {
    "eventId": "evt_003",
    "title": "深夜的奇怪声响",
    "description": "凌晨两点，宿舍楼里传来奇怪的声响，像是有人在走廊里拖拽重物。你从睡梦中惊醒...",
    "illustration": "https://cdn.example.com/events/strange_noise.png",
    "choices": [
      { "index": 0, "text": "起床查看" },
      { "index": 1, "text": "继续睡觉" },
      { "index": 2, "text": "叫醒室友" }
    ],
    "duration": 45,
    "round": 3
  }
}
```

---

### game:voteResult — 投票结果

投票阶段结束后广播投票结果。

| 项目 | 说明 |
|------|------|
| 事件名 | `game:voteResult` |
| 发送方 | 服务端 |
| 接收方 | 游戏内所有玩家 |
| 触发条件 | 所有玩家投票完毕或投票时间截止 |

**Payload 类型定义**

```typescript
interface VoteResult {
  targetId: string;     // 被投票的玩家ID
  targetNickname: string;
  voteCount: number;    // 得票数
  voters: string[];     // 投票者ID列表（公开投票时可见）
}

interface StateChange {
  type: 'elimination' | 'role_reveal' | 'skill_trigger';
  targetId: string;
  description: string;
}

interface GameVoteResultPayload {
  results: VoteResult[];         // 所有投票结果（按票数降序）
  isTie: boolean;                // 是否平票
  eliminatedId?: string;         // 被淘汰的玩家ID（无平票时）
  stateChanges: StateChange[];    // 状态变更列表
}
```

**示例**

```json
{
  "results": [
    {
      "targetId": "u_a1b2c3d4e5f6g7h8i9j0",
      "targetNickname": "小红",
      "voteCount": 3,
      "voters": ["u_550e8400e29b41d4a716", "u_f9e8d7c6b5a4f3e2d1c0", "u_b2c3d4e5f6a7b8c9d0e1"]
    },
    {
      "targetId": "u_f9e8d7c6b5a4f3e2d1c0",
      "targetNickname": "小刚",
      "voteCount": 1,
      "voters": ["u_a1b2c3d4e5f6g7h8i9j0"]
    }
  ],
  "isTie": false,
  "eliminatedId": "u_a1b2c3d4e5f6g7h8i9j0",
  "stateChanges": [
    {
      "type": "elimination",
      "targetId": "u_a1b2c3d4e5f6g7h8i9j0",
      "description": "小红被投票淘汰"
    }
  ]
}
```

---

### game:roundEnd — 回合结束

一个回合结束时广播回合总结。

| 项目 | 说明 |
|------|------|
| 事件名 | `game:roundEnd` |
| 发送方 | 服务端 |
| 接收方 | 游戏内所有玩家 |
| 触发条件 | 投票结果处理完毕，回合结束 |

**Payload 类型定义**

```typescript
interface RoundSummary {
  round: number;              // 回合编号
  eventTitle: string;         // 本回合事件标题
  eliminatedPlayer?: string;  // 本回合被淘汰的玩家昵称
  alivePlayers: string[];     // 存活玩家昵称列表
  keyMoments: string[];       // 本回合关键时刻描述
}

interface GameRoundEndPayload {
  round: number;                  // 已结束的回合编号
  summary: RoundSummary;          // 回合总结
  stateChanges: StateChange[];    // 状态变更列表
  nextRoundIn: number;            // 下一回合倒计时（秒）
}
```

**示例**

```json
{
  "round": 3,
  "summary": {
    "round": 3,
    "eventTitle": "深夜的奇怪声响",
    "eliminatedPlayer": "小红",
    "alivePlayers": ["小明", "小刚", "小华", "小李"],
    "keyMoments": [
      "小红选择了起床查看，发现了走廊里的秘密",
      "小明使用了窥探技能，获取了小刚的秘密"
    ]
  },
  "stateChanges": [
    {
      "type": "elimination",
      "targetId": "u_a1b2c3d4e5f6g7h8i9j0",
      "description": "小红被投票淘汰"
    }
  ],
  "nextRoundIn": 10
}
```

---

### game:ending — 游戏结局

游戏结束时广播最终结局。

| 项目 | 说明 |
|------|------|
| 事件名 | `game:ending` |
| 发送方 | 服务端 |
| 接收方 | 游戏内所有玩家 |
| 触发条件 | 满足游戏结束条件（某方全部淘汰 / 达到最大回合数） |

**Payload 类型定义**

```typescript
interface PlayerEnding {
  userId: string;
  nickname: string;
  role: string;               // 角色名称
  team: string;               // 阵营
  endingTitle: string;        // 结局标题
  endingDescription: string;  // 结局描述
  isWinner: boolean;          // 是否为胜方
  score: number;              // 本局得分
}

interface GameEndingPayload {
  winner: string;              // 获胜阵营（"good" / "evil"）
  endings: PlayerEnding[];     // 所有玩家的个人结局
  rankings: Array<{            // 排行榜
    rank: number;
    userId: string;
    nickname: string;
    score: number;
  }>;
  gameDuration: number;        // 游戏总时长（秒）
  totalRounds: number;         // 总回合数
}
```

**示例**

```json
{
  "winner": "good",
  "endings": [
    {
      "userId": "u_550e8400e29b41d4a716",
      "nickname": "小明",
      "role": "幽灵",
      "team": "evil",
      "endingTitle": "暴露的幽灵",
      "endingDescription": "你的伪装最终被识破，在最后一轮投票中被淘汰。宿舍恢复了平静...",
      "isWinner": false,
      "score": 60
    },
    {
      "userId": "u_a1b2c3d4e5f6g7h8i9j0",
      "nickname": "小红",
      "role": "侦探",
      "team": "good",
      "endingTitle": "正义的侦探",
      "endingDescription": "凭借敏锐的洞察力，你成功揪出了隐藏在宿舍中的幽灵...",
      "isWinner": true,
      "score": 120
    }
  ],
  "rankings": [
    { "rank": 1, "userId": "u_a1b2c3d4e5f6g7h8i9j0", "nickname": "小红", "score": 120 },
    { "rank": 2, "userId": "u_f9e8d7c6b5a4f3e2d1c0", "nickname": "小刚", "score": 95 },
    { "rank": 3, "userId": "u_550e8400e29b41d4a716", "nickname": "小明", "score": 60 }
  ],
  "gameDuration": 1820,
  "totalRounds": 5
}
```

---

### game:playerDisconnected — 玩家断线

有玩家断开连接时广播。

| 项目 | 说明 |
|------|------|
| 事件名 | `game:playerDisconnected` |
| 发送方 | 服务端 |
| 接收方 | 游戏内所有玩家 |
| 触发条件 | 玩家 WebSocket 连接断开（网络问题、关闭应用等） |

**Payload 类型定义**

```typescript
interface GamePlayerDisconnectedPayload {
  userId: string;         // 断线玩家ID
  nickname: string;       // 断线玩家昵称
  disconnectedAt: string; // ISO 8601 时间戳
}
```

**示例**

```json
{
  "userId": "u_a1b2c3d4e5f6g7h8i9j0",
  "nickname": "小红",
  "disconnectedAt": "2026-06-21T10:30:00.000Z"
}
```

---

### game:playerReconnected — 玩家重连

有玩家重新连接时广播。

| 项目 | 说明 |
|------|------|
| 事件名 | `game:playerReconnected` |
| 发送方 | 服务端 |
| 接收方 | 游戏内所有玩家 |
| 触发条件 | 断线玩家重新建立 WebSocket 连接 |

**Payload 类型定义**

```typescript
interface GameState {
  phase: GamePhase;
  round: number;
  timer: number;
  players: Array<{
    userId: string;
    nickname: string;
    isAlive: boolean;
  }>;
}

interface GamePlayerReconnectedPayload {
  userId: string;       // 重连玩家ID
  nickname: string;     // 重连玩家昵称
  gameState: GameState; // 当前游戏状态快照（仅发送给重连玩家）
}
```

> **注意**：`gameState` 字段仅发送给重连的玩家本人，其他玩家收到的事件中该字段为 `null`。

**示例（重连玩家收到）**

```json
{
  "userId": "u_a1b2c3d4e5f6g7h8i9j0",
  "nickname": "小红",
  "gameState": {
    "phase": "discussion",
    "round": 3,
    "timer": 30,
    "players": [
      { "userId": "u_550e8400e29b41d4a716", "nickname": "小明", "isAlive": true },
      { "userId": "u_a1b2c3d4e5f6g7h8i9j0", "nickname": "小红", "isAlive": true },
      { "userId": "u_f9e8d7c6b5a4f3e2d1c0", "nickname": "小刚", "isAlive": false }
    ]
  }
}
```

**示例（其他玩家收到）**

```json
{
  "userId": "u_a1b2c3d4e5f6g7h8i9j0",
  "nickname": "小红",
  "gameState": null
}
```

---

### game:error — 错误

服务端向客户端推送错误信息。

| 项目 | 说明 |
|------|------|
| 事件名 | `game:error` |
| 发送方 | 服务端 |
| 接收方 | 触发错误的客户端 |
| 触发条件 | 客户端操作不合法、状态不正确等 |

**Payload 类型定义**

```typescript
interface GameErrorPayload {
  code: string;     // 错误码
  message: string;  // 错误描述
}
```

**错误码定义**

| 错误码 | 说明 |
|--------|------|
| `UNAUTHORIZED` | 未认证或认证失败 |
| `ROOM_NOT_FOUND` | 房间不存在 |
| `ROOM_FULL` | 房间已满 |
| `GAME_NOT_FOUND` | 游戏不存在 |
| `GAME_ALREADY_STARTED` | 游戏已开始 |
| `INVALID_PHASE` | 当前阶段不允许此操作 |
| `ALREADY_VOTED` | 已投过票 |
| `ALREADY_CHOSEN` | 已提交过选择 |
| `PLAYER_ELIMINATED` | 玩家已被淘汰 |
| `SKILL_COOLDOWN` | 技能冷却中 |
| `SKILL_NO_USES` | 技能使用次数已耗尽 |
| `INVALID_TARGET` | 无效的目标 |
| `INTERNAL_ERROR` | 服务器内部错误 |

**示例**

```json
{
  "code": "ALREADY_VOTED",
  "message": "你已经投过票了"
}
```

---

## TypeScript 类型定义汇总

以下为所有 WebSocket 事件 Payload 的完整 TypeScript 类型定义，方便前端直接引用。

```typescript
// ==================== 通用类型 ====================

type GamePhase =
  | 'role_reveal'
  | 'narration'
  | 'event'
  | 'discussion'
  | 'vote'
  | 'vote_result'
  | 'round_end'
  | 'game_end';

type MessageType = 'chat' | 'system' | 'role_action';

type NarrationMood =
  | 'mysterious'
  | 'tense'
  | 'relaxed'
  | 'dramatic'
  | 'horror'
  | 'romantic'
  | 'chaotic';

interface PlayerInfo {
  userId: string;
  nickname: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: string;
}

interface StateChange {
  type: 'elimination' | 'role_reveal' | 'skill_trigger';
  targetId: string;
  description: string;
}

// ==================== 客户端 → 服务端 ====================

interface RoomJoinPayload {
  roomCode: string;
  userId: string;
}

interface RoomLeavePayload {
  roomCode: string;
  userId: string;
}

interface RoomReadyPayload {
  roomCode: string;
  userId: string;
  isReady: boolean;
}

interface GameMessagePayload {
  gameId: string;
  playerId: string;
  content: string;
}

interface GameChoicePayload {
  gameId: string;
  playerId: string;
  eventId: string;
  choiceIndex: number;
}

interface GameVotePayload {
  gameId: string;
  playerId: string;
  targetId: string;
}

interface GameUseSkillPayload {
  gameId: string;
  playerId: string;
  skillId: string;
  targetId?: string;
}

// ==================== 服务端 → 客户端 ====================

interface RoomPlayerJoinedPayload {
  player: PlayerInfo;
}

interface RoomPlayerLeftPayload {
  userId: string;
  newHostId?: string;
}

interface RoomPlayerReadyPayload {
  userId: string;
  isReady: boolean;
  readyCount: number;
  totalPlayers: number;
  allReady: boolean;
}

interface RoomGameStartingPayload {
  countdown: number;
  gameId: string;
}

interface GameStateUpdatePayload {
  phase: GamePhase;
  round: number;
  timer: number;
  totalRounds: number;
}

interface GameNarrationPayload {
  content: string;
  mood: NarrationMood;
  round: number;
}

interface GameMessageBroadcastPayload {
  id: string;
  playerId: string;
  nickname: string;
  content: string;
  type: MessageType;
  timestamp: string;
}

interface EventChoice {
  index: number;
  text: string;
}

interface EventData {
  eventId: string;
  title: string;
  description: string;
  illustration?: string;
  choices: EventChoice[];
  duration: number;
  round: number;
}

interface GameEventPayload {
  event: EventData;
}

interface VoteResult {
  targetId: string;
  targetNickname: string;
  voteCount: number;
  voters: string[];
}

interface GameVoteResultPayload {
  results: VoteResult[];
  isTie: boolean;
  eliminatedId?: string;
  stateChanges: StateChange[];
}

interface RoundSummary {
  round: number;
  eventTitle: string;
  eliminatedPlayer?: string;
  alivePlayers: string[];
  keyMoments: string[];
}

interface GameRoundEndPayload {
  round: number;
  summary: RoundSummary;
  stateChanges: StateChange[];
  nextRoundIn: number;
}

interface PlayerEnding {
  userId: string;
  nickname: string;
  role: string;
  team: string;
  endingTitle: string;
  endingDescription: string;
  isWinner: boolean;
  score: number;
}

interface GameEndingPayload {
  winner: string;
  endings: PlayerEnding[];
  rankings: Array<{
    rank: number;
    userId: string;
    nickname: string;
    score: number;
  }>;
  gameDuration: number;
  totalRounds: number;
}

interface GamePlayerDisconnectedPayload {
  userId: string;
  nickname: string;
  disconnectedAt: string;
}

interface GameState {
  phase: GamePhase;
  round: number;
  timer: number;
  players: Array<{
    userId: string;
    nickname: string;
    isAlive: boolean;
  }>;
}

interface GamePlayerReconnectedPayload {
  userId: string;
  nickname: string;
  gameState: GameState | null;
}

interface GameErrorPayload {
  code: string;
  message: string;
}

// ==================== 事件映射类型 ====================

/** 客户端 emit 事件映射 */
interface ClientToServerEvents {
  'room:join': (payload: RoomJoinPayload) => void;
  'room:leave': (payload: RoomLeavePayload) => void;
  'room:ready': (payload: RoomReadyPayload) => void;
  'game:message': (payload: GameMessagePayload) => void;
  'game:choice': (payload: GameChoicePayload) => void;
  'game:vote': (payload: GameVotePayload) => void;
  'game:useSkill': (payload: GameUseSkillPayload) => void;
}

/** 服务端 emit 事件映射 */
interface ServerToClientEvents {
  'room:playerJoined': (payload: RoomPlayerJoinedPayload) => void;
  'room:playerLeft': (payload: RoomPlayerLeftPayload) => void;
  'room:playerReady': (payload: RoomPlayerReadyPayload) => void;
  'room:gameStarting': (payload: RoomGameStartingPayload) => void;
  'game:stateUpdate': (payload: GameStateUpdatePayload) => void;
  'game:narration': (payload: GameNarrationPayload) => void;
  'game:message': (payload: GameMessageBroadcastPayload) => void;
  'game:event': (payload: GameEventPayload) => void;
  'game:voteResult': (payload: GameVoteResultPayload) => void;
  'game:roundEnd': (payload: GameRoundEndPayload) => void;
  'game:ending': (payload: GameEndingPayload) => void;
  'game:playerDisconnected': (payload: GamePlayerDisconnectedPayload) => void;
  'game:playerReconnected': (payload: GamePlayerReconnectedPayload) => void;
  'game:error': (payload: GameErrorPayload) => void;
}
```
