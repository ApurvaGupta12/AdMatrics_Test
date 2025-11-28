import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StoresService } from '../stores/stores.service';
import { MetricsService } from '../metrics/metrics.service';
import { ShopifyService } from '../integrations/shopify/shopify.service';
import { FacebookService } from '../integrations/facebook/facebook.service';
import { GoogleService } from '../integrations/google/google.service';

@Injectable()
export class SyncMetricsJob {
	private readonly logger = new Logger(SyncMetricsJob.name);

	constructor(
		private readonly storesService: StoresService,
		private readonly metricsService: MetricsService,
		private readonly shopifyService: ShopifyService,
		private readonly facebookService: FacebookService,
		private readonly googleService: GoogleService,
	) {}

	@Cron(CronExpression.EVERY_DAY_AT_2AM)
	async handleDailySync() {
		this.logger.log('Starting daily metrics sync...');

		const stores = await this.storesService.findAll();
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		yesterday.setHours(0, 0, 0, 0);

		for (const store of stores) {
			try {
				const shopifyData = await this.shopifyService.fetchOrders(
					store,
					yesterday,
					yesterday,
				);
				const fbSpend = await this.facebookService.fetchAdSpend(
					store,
					yesterday,
					yesterday,
				);
				const googleSpend = await this.googleService.fetchAdSpend(
					store,
					yesterday,
					yesterday,
				);

				await this.metricsService.createOrUpdate({
					storeId: store._id,
					date: yesterday,
					facebookMetaSpend: fbSpend,
					googleAdSpend: googleSpend,
					shopifySoldOrders: shopifyData.soldOrders,
					shopifyOrderValue: shopifyData.orderValue,
					shopifySoldItems: shopifyData.soldItems,
				});

				this.logger.log(`✓ Synced metrics for ${store.name}`);
			} catch (error) {
				this.logger.error(
					`✗ Failed to sync ${store.name}: ${(error as any).message}`,
				);
			}
		}

		this.logger.log('Daily metrics sync completed');
	}
}
