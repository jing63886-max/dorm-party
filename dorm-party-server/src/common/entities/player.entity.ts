import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 玩家实体
 * 对应数据库中的 players 表
 */
@Entity('players')
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 用户ID */
  @Column({ length: 64 })
  userId: string;

  /** 昵称 */
  @Column({ length: 50 })
  nickname: string;

  /** 关联房间码 */
  @Column({ length: 6 })
  roomCode: string;

  /** 关联游戏ID */
  @Column({ length: 64, nullable: true })
  gameId: string | null;

  /** 是否为房主 */
  @Column({ type: 'boolean', default: false })
  isHost: boolean;

  /** 玩家状态: waiting / ready / playing / eliminated / disconnected */
  @Column({ length: 20, default: 'waiting' })
  status: string;

  /** 分数 */
  @Column({ type: 'int', default: 0 })
  score: number;

  /** 角色信息JSON */
  @Column({ type: 'json', nullable: true })
  role: Record<string, any> | null;

  /** 加入顺序 */
  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
