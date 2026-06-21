import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 切换准备状态 DTO
 */
export class ToggleReadyDto {
  /** 用户ID */
  @IsString()
  @IsNotEmpty({ message: '用户ID不能为空' })
  userId: string;
}
