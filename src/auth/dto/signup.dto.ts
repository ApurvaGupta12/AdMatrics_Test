import {
	IsEmail,
	IsString,
	MinLength,
	IsEnum,
	IsOptional,
} from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class SignupDto {
	@IsEmail()
	email: string;

	@IsString()
	@MinLength(8)
	password: string;

	@IsOptional()
	@IsEnum(UserRole)
	role?: UserRole;
}
