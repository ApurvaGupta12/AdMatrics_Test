import {
	Injectable,
	NotFoundException,
	ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Store } from './schemas/store.schema';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class StoresService {
	constructor(
		@InjectModel(Store.name)
		private readonly storeModel: Model<Store>,
		private readonly metricsService: MetricsService,
	) {}

	async create(dto: CreateStoreDto): Promise<Store> {
		const existing = await this.storeModel
			.findOne({ name: dto.name })
			.exec();
		if (existing) throw new ConflictException('Store name already exists');

		const store = new this.storeModel(dto);
		return store.save();
	}

	async findAll(): Promise<Store[]> {
		return this.storeModel.find().exec();
	}

	async findOne(id: string): Promise<Store> {
		const store = await this.storeModel.findById(id).exec();
		if (!store) throw new NotFoundException('Store not found');
		return store;
	}

	async update(id: string, dto: UpdateStoreDto): Promise<Store> {
		const store = await this.storeModel
			.findByIdAndUpdate(id, dto, { new: true })
			.exec();
		if (!store) throw new NotFoundException('Store not found');
		return store;
	}

	async remove(id: string): Promise<void> {
		const store = await this.storeModel.findByIdAndDelete(id).exec();
		if (!store) throw new NotFoundException('Store not found');
		// Clean up metrics for this store
		await this.metricsService.deleteByStoreId(id);
	}
}
