import { IsString, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateManualEntryDto {
  @ApiProperty({ example: 'Backend development' })
  @IsString()
  serviceName: string;

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hourlyRate: number;

  @ApiProperty({ example: '2026-04-28' })
  @IsDateString()
  performedAt: string;

  @ApiProperty({ example: 8 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hours: number;

  @ApiPropertyOptional({ example: 'Implementácia REST API' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  clientId?: string;
}
