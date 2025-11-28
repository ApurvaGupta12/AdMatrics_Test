import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { SetUserActiveDto } from './dto/set-user-active.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get()
	async findAll() {
		const users = await this.usersService.findAll();
		return users.map((u) => {
			const obj = u.toObject();
			delete obj.password;
			delete obj.__v;
			return obj;
		});
	}

	@Patch(':userId/role')
	async updateRole(
		@Param('userId') userId: string,
		@Body() dto: UpdateUserRoleDto,
	) {
		const user = await this.usersService.updateRole(userId, dto.role);
		const obj = user.toObject();
		delete obj.password;
		delete obj.__v;
		return obj;
	}

	@Patch(':userId/active')
	async setActive(
		@Param('userId') userId: string,
		@Body() dto: SetUserActiveDto,
	) {
		const user = await this.usersService.setActiveStatus(
			userId,
			dto.isActive,
		);
		const obj = user.toObject();
		delete obj.password;
		delete obj.__v;
		return obj;
	}
}
