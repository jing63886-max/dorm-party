import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 提交投票 DTO
 */
export class SubmitVoteDto {
  /** 投票玩家ID */
  @IsString()
  @IsNotEmpty({ message: '投票者ID不能为空' })
  playerId: string;

  /** 被投票的目标玩家ID */
  @IsString()
  @IsNotEmpty({ message: '投票目标ID不能为空' })
  targetId: string;
}
