import { IsNumber, IsInt, Min, Max, IsString, IsNotEmpty } from 'class-validator';

/**
 * 提交选择 DTO
 */
export class SubmitChoiceDto {
  /** 玩家ID */
  @IsString()
  @IsNotEmpty({ message: '玩家ID不能为空' })
  playerId: string;

  /** 事件ID */
  @IsNumber()
  @IsInt()
  @Min(0, { message: '事件ID不能为负数' })
  eventId: number;

  /** 选择的选项索引 */
  @IsNumber()
  @IsInt()
  @Min(0, { message: '选项索引不能为负数' })
  @Max(10, { message: '选项索引不能超过10' })
  choiceIndex: number;
}
