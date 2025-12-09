import { Module, forwardRef } from '@nestjs/common';
import { FacebookAnalyticsController } from './facebook-analytics.controller';
import { FacebookService } from './facebook.service';
import { StoresModule } from '../../stores/stores.module';

@Module({
	imports: [forwardRef(() => StoresModule)],
	controllers: [FacebookAnalyticsController],
	providers: [FacebookService],
	exports: [FacebookService],
})
export class FacebookAnalyticsModule {}
