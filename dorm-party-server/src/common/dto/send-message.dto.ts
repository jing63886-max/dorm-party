import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * 发送消息 DTO
 */
export class SendMessageDto {
  /** 玩家ID */
  @IsString()
  @IsNotEmpty({ message: '玩家ID不能为空' })
  playerId: string;

  /** 消息内容 */
  @IsString()
  @IsNotEmpty({ message: '消息内容不能为空' })
  @MaxLength(500, { message: '消息长度不能超过500个字符' })
  content: string;
}
