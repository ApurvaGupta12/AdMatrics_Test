import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectStoreDto {
	@ApiProperty({
		example: 'Invalid credentials provided',
		description: 'Reason for rejection',
	})
	@IsString()
	@IsNotEmpty()
	rejectionReason: string;
}
