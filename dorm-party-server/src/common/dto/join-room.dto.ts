import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * 加入房间 DTO
 */
export class JoinRoomDto {
  /** 用户ID */
  @IsString()
  @IsNotEmpty({ message: '用户ID不能为空' })
  userId: string;

  /** 玩家昵称 */
  @IsString()
  @IsNotEmpty({ message: '昵称不能为空' })
  @MaxLength(20, { message: '昵称长度不能超过20个字符' })
  nickname: string;
}
