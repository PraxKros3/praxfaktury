import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 'abc123def456' })
  @IsOptional()
  @IsString()
  togglApiToken?: string;

  @ApiPropertyOptional({ example: '1234567' })
  @IsOptional()
  @IsString()
  togglWorkspaceId?: string;

  @ApiPropertyOptional({ example: 'bearer_token_xyz' })
  @IsOptional()
  @IsString()
  krosApiToken?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultHourlyRate?: number;

  @ApiPropertyOptional({ example: 23 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultVatRate?: number;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 14 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  invoiceDueDays?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() supplierName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierIco?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierDic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierIcDph?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierCity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierZip?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierIban?: string;
}
