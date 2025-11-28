import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Store, StoreSchema } from './schemas/store.schema';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: Store.name, schema: StoreSchema }]),
		forwardRef(() => MetricsModule),
	],
	providers: [StoresService],
	controllers: [StoresController],
	exports: [StoresService],
})
export class StoresModule {}
