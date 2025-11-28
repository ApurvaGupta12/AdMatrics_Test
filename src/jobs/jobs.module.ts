import { Module, forwardRef } from '@nestjs/common';
import { SyncMetricsJob } from './sync-metrics.job';
import { StoresModule } from '../stores/stores.module';
import { MetricsModule } from '../metrics/metrics.module';
import { ShopifyService } from '../integrations/shopify/shopify.service';
import { FacebookService } from '../integrations/facebook/facebook.service';
import { GoogleService } from '../integrations/google/google.service';

@Module({
	imports: [forwardRef(() => StoresModule), MetricsModule],
	providers: [SyncMetricsJob, ShopifyService, FacebookService, GoogleService],
})
export class JobsModule {}
