import { IsString, IsNotEmpty, IsUrl } from 'class-validator';

export class CreateStoreDto {
	@IsString()
	@IsNotEmpty()
	name: string;

	@IsString()
	@IsNotEmpty()
	shopifyToken: string;

	@IsUrl()
	@IsNotEmpty()
	shopifyStoreUrl: string;

	@IsString()
	@IsNotEmpty()
	fbAdSpendToken: string;

	@IsString()
	@IsNotEmpty()
	fbAccountId: string;
}
