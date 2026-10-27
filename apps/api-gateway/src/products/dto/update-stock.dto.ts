import { IsInt, Min, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStockDto {
  @ApiPropertyOptional({
    example: 50,
    description: 'Absolute new stock quantity',
  })
  @IsOptional()
  @IsInt({ message: 'Stock quantity must be an integer' })
  @Min(0, { message: 'Stock quantity cannot be negative' })
  stockQuantity?: number;

  @ApiPropertyOptional({
    example: -5,
    description: 'Relative stock adjustment delta',
  })
  @IsOptional()
  @IsInt({ message: 'Delta adjustment must be an integer' })
  delta?: number;
}
