import { ApiProperty } from '@nestjs/swagger';
import { TerminalStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateTerminalStatusDto {
  @ApiProperty({ enum: TerminalStatus, example: TerminalStatus.INACTIVE })
  @IsEnum(TerminalStatus)
  status!: TerminalStatus;
}
