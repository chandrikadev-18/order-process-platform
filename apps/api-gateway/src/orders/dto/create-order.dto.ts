import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'UUID of the product to order',
  })
  @IsUUID('4', { message: 'productId must be a valid UUID v4' })
  productId!: string;

  @ApiProperty({
    example: 2,
    description: 'Quantity to purchase (must be >= 1)',
  })
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({
    type: [CreateOrderItemDto],
    description: 'List of items to include in the order',
  })
  @IsArray({ message: 'items must be an array' })
  @ArrayMinSize(1, { message: 'Order must contain at least one item' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
