import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateStoreDto {
	@IsString()
	@IsOptional()
	name?: string;

	@IsString()
	@IsOptional()
	shopifyToken?: string;

	@IsUrl()
	@IsOptional()
	shopifyStoreUrl?: string;

	@IsString()
	@IsOptional()
	fbAdSpendToken?: string;

	@IsString()
	@IsOptional()
	fbAccountId?: string;
}
