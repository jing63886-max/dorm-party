import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 开始游戏 DTO
 */
export class StartGameDto {
  /** 房间码 */
  @IsString()
  @IsNotEmpty({ message: '房间码不能为空' })
  roomCode: string;
}
