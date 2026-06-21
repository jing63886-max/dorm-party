import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

/**
 * 创建房间 DTO
 */
export class CreateRoomDto {
  /** 房主用户ID */
  @IsString()
  @IsNotEmpty({ message: '房主ID不能为空' })
  hostId: string;

  /** 房主昵称 */
  @IsString()
  @IsNotEmpty({ message: '昵称不能为空' })
  @MaxLength(20, { message: '昵称长度不能超过20个字符' })
  hostNickname: string;

  /** 游戏主题 */
  @IsString()
  @IsNotEmpty({ message: '游戏主题不能为空' })
  @MaxLength(50, { message: '主题长度不能超过50个字符' })
  theme: string;
}
