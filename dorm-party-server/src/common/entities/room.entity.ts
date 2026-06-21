import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 房间实体
 * 对应数据库中的 rooms 表
 */
@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 6位房间邀请码 */
  @Column({ length: 6, unique: true })
  roomCode: string;

  /** 房主用户ID */
  @Column({ length: 64 })
  hostId: string;

  /** 游戏主题 */
  @Column({ length: 100 })
  theme: string;

  /** 房间状态: waiting / playing / finished */
  @Column({ length: 20, default: 'waiting' })
  status: string;

  /** 当前玩家数量 */
  @Column({ type: 'int', default: 1 })
  playerCount: number;

  /** 最大玩家数量 */
  @Column({ type: 'int', default: 4 })
  maxPlayers: number;

  /** 关联的游戏ID */
  @Column({ length: 64, nullable: true })
  gameId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
