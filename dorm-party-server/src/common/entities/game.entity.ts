import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 游戏实体
 * 对应数据库中的 games 表
 */
@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 关联房间码 */
  @Column({ length: 6 })
  roomCode: string;

  /** 游戏主题 */
  @Column({ length: 100 })
  theme: string;

  /** 当前阶段 */
  @Column({ length: 30, default: 'waiting' })
  phase: string;

  /** 当前回合 */
  @Column({ type: 'int', default: 0 })
  currentRound: number;

  /** 总回合数 */
  @Column({ type: 'int', default: 5 })
  totalRounds: number;

  /** 游戏状态JSON（完整游戏状态快照） */
  @Column({ type: 'json', nullable: true })
  gameState: Record<string, any> | null;

  /** 结局文本 */
  @Column({ type: 'text', nullable: true })
  endingText: string | null;

  /** 结局类型 */
  @Column({ length: 20, nullable: true })
  endingType: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
