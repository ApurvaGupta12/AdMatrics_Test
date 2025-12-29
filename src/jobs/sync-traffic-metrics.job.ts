import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StoresService } from '../stores/stores.service';
import { TrafficMetricsService } from '../analytics/traffic-metric.service';
import { ShopifyService } from '../integrations/shopify/shopify.service';

@Injectable()
export class SyncTrafficMetricsJob {
	private readonly logger = new Logger(SyncTrafficMetricsJob.name);

	constructor(
		private readonly storesService: StoresService,
		private readonly trafficMetricsService: TrafficMetricsService,
		private readonly shopifyService: ShopifyService,
	) {}

	private getDateRange(daysBack: number): { startDate: Date; endDate: Date } {
		const endDate = new Date();
		endDate.setDate(endDate.getDate() - 1);
		endDate.setHours(0, 0, 0, 0);

		const startDate = new Date(endDate);
		startDate.setDate(startDate.getDate() - daysBack + 1);

		return { startDate, endDate };
	}

	@Cron(CronExpression.EVERY_DAY_AT_4AM)
	async handleDailyTrafficSync() {
		this.logger.log('Starting daily traffic metrics sync...');

		const stores = await this.storesService.findAll();
		const daysBack = 7;
		const pageLimit = 20;

		const { startDate, endDate } = this.getDateRange(daysBack);
		this.logger.log(
			`Syncing traffic metrics for last ${daysBack} days (ShopifyService handles IST)`,
		);

		for (const store of stores) {
			try {
				this.logger.debug(`Processing store: ${store.name}`);

				// Reset existing data for this date range
				await this.trafficMetricsService.resetStoreTraffic(
					store._id.toString(),
					startDate,
				);

				// Fetch traffic analytics
				const trafficData =
					await this.shopifyService.fetchTrafficAnalytics(
						store,
						daysBack,
						pageLimit,
					);

				let processedCount = 0;
				for (const page of trafficData) {
					await this.trafficMetricsService.upsertTrafficMetric({
						storeId: store._id,
						landingPageType: page.landingPageType,
						landingPagePath: page.landingPagePath,
						onlineStoreVisitors: page.onlineStoreVisitors,
						sessions: page.sessions,
						sessionsWithCartAdditions:
							page.sessionsWithCartAdditions,
						sessionsThatReachedCheckout:
							page.sessionsThatReachedCheckout,
						startDate,
						endDate,
					});
					processedCount++;
				}

				this.logger.log(
					`✓ Synced ${processedCount} landing pages for ${store.name} (last ${daysBack} days)`,
				);
			} catch (error) {
				this.logger.error(
					`✗ Failed to sync traffic for ${store.name}: ${(error as any).message}`,
					(error as any).stack,
				);
			}
		}

		this.logger.log('Daily traffic metrics sync completed');
	}

	@Cron(CronExpression.EVERY_WEEK)
	async handleWeeklyExtendedSync() {
		this.logger.log('Starting weekly extended traffic metrics sync...');

		const stores = await this.storesService.findAll();
		const daysBack = 30;
		const pageLimit = 50;

		const { startDate, endDate } = this.getDateRange(daysBack);
		this.logger.log(
			`Syncing extended traffic metrics for last ${daysBack} days (ShopifyService handles IST)`,
		);

		for (const store of stores) {
			try {
				this.logger.debug(`Processing store: ${store.name}`);

				// Reset existing data for this date range
				await this.trafficMetricsService.resetStoreTraffic(
					store._id.toString(),
					startDate,
				);

				// Fetch traffic analytics
				const trafficData =
					await this.shopifyService.fetchTrafficAnalytics(
						store,
						daysBack,
						pageLimit,
					);

				let processedCount = 0;
				for (const page of trafficData) {
					await this.trafficMetricsService.upsertTrafficMetric({
						storeId: store._id,
						landingPageType: page.landingPageType,
						landingPagePath: page.landingPagePath,
						onlineStoreVisitors: page.onlineStoreVisitors,
						sessions: page.sessions,
						sessionsWithCartAdditions:
							page.sessionsWithCartAdditions,
						sessionsThatReachedCheckout:
							page.sessionsThatReachedCheckout,
						startDate,
						endDate,
					});
					processedCount++;
				}

				this.logger.log(
					`✓ Synced ${processedCount} landing pages for ${store.name} (last ${daysBack} days)`,
				);
			} catch (error) {
				this.logger.error(
					`✗ Failed to sync extended traffic for ${store.name}: ${(error as any).message}`,
					(error as any).stack,
				);
			}
		}

		this.logger.log('Weekly extended traffic metrics sync completed');
	}
}
