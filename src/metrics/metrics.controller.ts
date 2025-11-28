import { Controller, Get, Query, Param, Post, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { StoresService } from '../stores/stores.service';
import { ShopifyService } from '../integrations/shopify/shopify.service';
import { FacebookService } from '../integrations/facebook/facebook.service';
import { GoogleService } from '../integrations/google/google.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MetricsController {
	constructor(
		private readonly metricsService: MetricsService,
		private readonly storesService: StoresService,
		private readonly shopifyService: ShopifyService,
		private readonly facebookService: FacebookService,
		private readonly googleService: GoogleService,
	) {}

	@Get('stores/:storeId/metrics')
	async getStoreMetrics(
		@Param('storeId') storeId: string,
		@Query('range') range?: string,
		@Query('startDate') startDate?: string,
		@Query('endDate') endDate?: string,
	) {
		return this.metricsService.findByStore(
			storeId,
			range,
			startDate,
			endDate,
		);
	}

	@Get('metrics/aggregate')
	async getAggregate(@Query('range') range?: string) {
		return this.metricsService.aggregate(range || 'last30days');
	}

	@Post('metrics/sync/:storeId')
	@Roles(UserRole.ADMIN, UserRole.MANAGER)
	async manualSync(@Param('storeId') storeId: string) {
		const store = await this.storesService.findOne(storeId);

		const date = new Date();
		date.setDate(date.getDate() - 1);
		date.setHours(0, 0, 0, 0);

		const shopifyData = await this.shopifyService.fetchOrders(
			store,
			date,
			date,
		);
		const fbSpend = await this.facebookService.fetchAdSpend(
			store,
			date,
			date,
		);
		const googleSpend = await this.googleService.fetchAdSpend(
			store,
			date,
			date,
		);

		await this.metricsService.createOrUpdate({
			storeId: store._id,
			date,
			facebookMetaSpend: fbSpend,
			googleAdSpend: googleSpend,
			shopifySoldOrders: shopifyData.soldOrders,
			shopifyOrderValue: shopifyData.orderValue,
			shopifySoldItems: shopifyData.soldItems,
		});

		return {
			message: `Sync initiated for store: ${store.name}`,
			jobId: `manual-${Date.now()}`,
		};
	}
}
