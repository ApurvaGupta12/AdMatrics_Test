import { IsEmail, IsArray, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteViewerDto {
	@ApiProperty({
		example: 'viewer@example.com',
		description: 'Email of the viewer to invite',
	})
	@IsEmail()
	email: string;

	@ApiProperty({
		description: 'Array of store IDs to assign',
		example: ['507f1f77bcf86cd799439011'],
		type: [String],
	})
	@IsArray()
	@IsMongoId({ each: true })
	storeIds: string[];
}
