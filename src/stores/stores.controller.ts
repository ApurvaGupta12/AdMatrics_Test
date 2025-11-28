import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	Param,
	Body,
	UseGuards,
} from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('stores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StoresController {
	constructor(private readonly storesService: StoresService) {}

	@Get()
	async findAll() {
		return this.storesService.findAll();
	}

	@Get(':storeId')
	async findOne(@Param('storeId') storeId: string) {
		return this.storesService.findOne(storeId);
	}

	@Post()
	@Roles(UserRole.ADMIN, UserRole.MANAGER)
	async create(@Body() dto: CreateStoreDto) {
		const store = await this.storesService.create(dto);
		const obj = store.toObject();
		return obj;
	}

	@Patch(':storeId')
	@Roles(UserRole.ADMIN, UserRole.MANAGER)
	async update(
		@Param('storeId') storeId: string,
		@Body() dto: UpdateStoreDto,
	) {
		return this.storesService.update(storeId, dto);
	}

	@Delete(':storeId')
	@Roles(UserRole.ADMIN)
	async remove(@Param('storeId') storeId: string) {
		await this.storesService.remove(storeId);
		return { statusCode: 204 };
	}
}
