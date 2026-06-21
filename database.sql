-- ============================================================
-- Dorm Party（宿舍派对）数据库设计
-- 技术栈：MySQL 8.0
-- 字符集：utf8mb4
-- 引擎：InnoDB
-- 主键类型：UUID（与 TypeORM 实体 PrimaryGeneratedColumn('uuid') 一致）
-- ============================================================
-- 注意：TypeORM 在非 production 环境配置了 synchronize: true，
--       表会自动同步创建。本 SQL 主要用于 Docker 初始化时执行。
--       SQL 结构与实体定义完全一致，确保手动执行与自动同步结果相同。
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------
-- 1. 房间表（rooms）
-- 玩家创建房间后生成6位邀请码，其他玩家通过邀请码加入
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `rooms`;
CREATE TABLE `rooms` (
    `id`           VARCHAR(36)  NOT NULL        COMMENT '房间ID，UUID主键',
    `room_code`    VARCHAR(6)   NOT NULL        COMMENT '6位邀请码，用于其他玩家加入房间',
    `host_id`      VARCHAR(64)  NOT NULL        COMMENT '房主用户ID',
    `theme`        VARCHAR(100) NOT NULL DEFAULT '' COMMENT '主题标识',
    `status`       VARCHAR(20)  NOT NULL DEFAULT 'waiting' COMMENT '房间状态：waiting-等待中, playing-游戏中, finished-已结束',
    `player_count` INT          NOT NULL DEFAULT 1 COMMENT '当前玩家数',
    `max_players`  INT          NOT NULL DEFAULT 4 COMMENT '最大玩家数',
    `game_id`      VARCHAR(64)  NULL            COMMENT '关联的游戏ID',
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE INDEX `uk_room_code` (`room_code`) COMMENT '邀请码唯一索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='房间表 - 管理游戏房间，包含邀请码和房间状态';

-- -----------------------------------------------------------
-- 2. 玩家表（players）
-- 存储玩家基本信息和游戏角色数据
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `players`;
CREATE TABLE `players` (
    `id`         VARCHAR(36)  NOT NULL        COMMENT '玩家ID，UUID主键',
    `user_id`    VARCHAR(64)  NOT NULL        COMMENT '用户ID',
    `nickname`   VARCHAR(50)  NOT NULL        COMMENT '玩家昵称',
    `room_code`  VARCHAR(6)   NOT NULL        COMMENT '所在房间邀请码',
    `game_id`    VARCHAR(64)  NULL            COMMENT '关联的游戏ID',
    `is_host`    TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否为房主：0-否, 1-是',
    `status`     VARCHAR(20)  NOT NULL DEFAULT 'waiting' COMMENT '玩家状态：waiting-等待中, playing-游戏中等',
    `score`      INT          NOT NULL DEFAULT 0 COMMENT '当前得分',
    `role`       JSON         NULL            COMMENT '角色数据，JSON格式',
    `order`      INT          NOT NULL DEFAULT 0 COMMENT '座位顺序',
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`) COMMENT '用户ID索引',
    INDEX `idx_room_code` (`room_code`) COMMENT '房间邀请码索引',
    INDEX `idx_game_id` (`game_id`) COMMENT '游戏ID索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='玩家表 - 存储玩家基本信息和游戏角色数据';

-- -----------------------------------------------------------
-- 3. 游戏表（games）
-- 每个房间对应一局游戏，存储游戏状态和进度
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `games`;
CREATE TABLE `games` (
    `id`            VARCHAR(36)  NOT NULL        COMMENT '游戏ID，UUID主键',
    `room_code`     VARCHAR(6)   NOT NULL        COMMENT '关联房间邀请码',
    `theme`         VARCHAR(100) NOT NULL DEFAULT '' COMMENT '游戏主题',
    `phase`         VARCHAR(30)  NOT NULL DEFAULT 'waiting' COMMENT '当前阶段：waiting-等待, playing-游戏中等',
    `current_round` INT          NOT NULL DEFAULT 0 COMMENT '当前回合数',
    `total_rounds`  INT          NOT NULL DEFAULT 5 COMMENT '总回合数',
    `game_state`    JSON         NULL            COMMENT '完整游戏状态快照，JSON格式',
    `ending_text`   TEXT         NULL            COMMENT '结局文本',
    `ending_type`   VARCHAR(20)  NULL            COMMENT '结局类型',
    `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    INDEX `idx_room_code` (`room_code`) COMMENT '房间邀请码索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='游戏表 - 存储游戏核心数据，包括回合进度和完整状态快照';

-- -----------------------------------------------------------
-- 4. 聊天消息表（chat_messages）
-- 游戏中的所有消息，包括玩家聊天、系统消息等
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `chat_messages`;
CREATE TABLE `chat_messages` (
    `id`         VARCHAR(36)  NOT NULL        COMMENT '消息ID，UUID主键',
    `game_id`    VARCHAR(64)  NOT NULL        COMMENT '关联游戏ID',
    `player_id`  VARCHAR(64)  NOT NULL        COMMENT '发送者玩家ID',
    `nickname`   VARCHAR(50)  NOT NULL        COMMENT '发送者昵称',
    `content`    TEXT         NOT NULL        COMMENT '消息内容',
    `type`       VARCHAR(20)  NOT NULL DEFAULT 'normal' COMMENT '消息类型：normal-普通, system-系统等',
    `round`      INT          NOT NULL DEFAULT 0 COMMENT '所属回合',
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    INDEX `idx_game_id` (`game_id`) COMMENT '游戏ID索引',
    INDEX `idx_game_round` (`game_id`, `round`) COMMENT '游戏+回合复合索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='聊天消息表 - 存储游戏中所有消息';

-- -----------------------------------------------------------
-- 5. 主题配置表（themes）
-- 预设可用的游戏主题，后续可通过管理后台扩展
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `themes`;
CREATE TABLE `themes` (
    `id`           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主题ID，主键自增',
    `code`         VARCHAR(50)  NOT NULL                   COMMENT '主题标识码，用于程序内部引用',
    `name`         VARCHAR(100) NOT NULL                   COMMENT '主题名称，展示给玩家',
    `description`  TEXT         NOT NULL                   COMMENT '主题描述，简要说明世界观和玩法特色',
    `cover_image`  VARCHAR(500) NOT NULL DEFAULT ''        COMMENT '主题封面图URL',
    `player_count` INT          NOT NULL DEFAULT 4         COMMENT '推荐玩家数',
    `round_count`  INT          NOT NULL DEFAULT 6         COMMENT '推荐回合数',
    `is_active`    TINYINT(1)   NOT NULL DEFAULT 1         COMMENT '是否启用：0-禁用, 1-启用',
    `sort_order`   INT          NOT NULL DEFAULT 0         COMMENT '排序权重，数值越大越靠前',
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE INDEX `uk_themes_code` (`code`) COMMENT '主题标识码唯一索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主题配置表 - 预设游戏主题，定义世界观和玩法参数';

-- 插入初始主题数据
INSERT INTO `themes` (`code`, `name`, `description`, `cover_image`, `player_count`, `round_count`, `is_active`, `sort_order`) VALUES
('default',       '经典宿舍',   '最经典的宿舍生活体验，室友之间的日常趣事与矛盾冲突，适合新手入门。',        '', 4, 6, 1, 100),
('mystery',       '深夜谜案',   '宿舍楼里发生了离奇事件，每个人都有秘密。谁是真凶？谁在说谎？',            '', 4, 8, 1, 90),
('romance',       '心动信号',   '宿舍里的暧昧与心动，谁会对谁产生好感？一场关于青春与爱情的社交推理。',    '', 4, 6, 1, 80),
('survival',      '末日求生',   '世界末日降临，宿舍成为最后的避难所。资源有限，信任脆弱，如何活下去？',    '', 4, 8, 1, 70),
('time_travel',   '时空交错',   '一次意外让宿舍的室友们穿越到不同时代，每个人看到的都是不同的世界。',      '', 4, 6, 1, 60),
('detective',     '卧底游戏',   '宿舍里混入了一个卧底，每个人都有隐藏身份。通过对话和投票找出卧底！',      '', 4, 6, 1, 50),
('cooking',       '厨神争霸',   '宿舍厨艺大赛！每个室友都有自己的拿手菜和秘密配方，谁才是真正的厨神？',    '', 4, 6, 1, 40),
('supernatural',  '灵异宿舍',   '这间宿舍似乎不太对劲...半夜的声响、消失的物品、诡异的梦境，真相是什么？', '', 4, 8, 1, 30);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 数据库设计说明
-- ============================================================
--
-- 表结构总览（与 TypeORM 实体一一对应）：
--   rooms          -> Room 实体
--   players        -> Player 实体
--   games          -> Game 实体
--   chat_messages  -> ChatMessage 实体
--   themes         -> 主题配置（独立管理，无对应实体）
--
-- 核心设计决策：
-- 1. 所有业务表使用 UUID 主键（VARCHAR(36)），与 TypeORM PrimaryGeneratedColumn('uuid') 一致
-- 2. 不使用外键约束，通过应用层关联（gameId、roomCode 等字段）
-- 3. game_state / role 使用 JSON 类型，灵活适配不同主题的游戏状态
-- 4. TypeORM synchronize: true 会自动创建/同步表结构，本 SQL 用于 Docker 初始化
--
-- ============================================================
