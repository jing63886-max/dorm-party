import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * 聊天消息实体
 * 对应数据库中的 chat_messages 表
 */
@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 关联游戏ID */
  @Column({ length: 64 })
  gameId: string;

  /** 发送者玩家ID */
  @Column({ length: 64 })
  playerId: string;

  /** 发送者昵称 */
  @Column({ length: 50 })
  nickname: string;

  /** 消息内容 */
  @Column({ type: 'text' })
  content: string;

  /** 消息类型: normal / system / keyword / ai */
  @Column({ length: 20, default: 'normal' })
  type: string;

  /** 关联回合数 */
  @Column({ type: 'int', default: 0 })
  round: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
