import { IsString, IsNotEmpty, IsNumber, Min, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'PROD-001', description: 'Unique product SKU' })
  @IsString()
  @IsNotEmpty({ message: 'SKU cannot be empty' })
  sku!: string;

  @ApiProperty({ example: 'Mechanical Keyboard', description: 'Product title' })
  @IsString()
  @IsNotEmpty({ message: 'Product name cannot be empty' })
  name!: string;

  @ApiProperty({ example: 99.99, description: 'Product unit price' })
  @IsNumber({}, { message: 'Price must be a valid number' })
  @Min(0.01, { message: 'Price must be at least 0.01' })
  price!: number;

  @ApiProperty({ example: 100, description: 'Initial inventory quantity' })
  @IsInt({ message: 'Stock quantity must be an integer' })
  @Min(0, { message: 'Stock quantity cannot be negative' })
  stockQuantity!: number;
}
