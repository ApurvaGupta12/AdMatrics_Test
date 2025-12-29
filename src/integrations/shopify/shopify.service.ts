import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { Store } from '../../stores/schemas/store.schema';
import { AuditService } from '../../audit/audit.service';
import { AuditAction, AuditStatus } from '../../audit/schemas/audit-log.schema';

interface DailyOrdersSummary {
	date: string;
	soldOrders: number;
	orderValue: number;
	soldItems: number;
}

interface ProductSalesData {
	productId: string;
	productName: string;
	productImage: string;
	productUrl: string;
	quantitySold: number;
	revenue: number;
}

interface TrafficAnalyticsData {
	landingPageType: string;
	landingPagePath: string;
	onlineStoreVisitors: number;
	sessions: number;
	sessionsWithCartAdditions: number;
	sessionsThatReachedCheckout: number;
}

@Injectable()
export class ShopifyService {
	private readonly logger = new Logger(ShopifyService.name);

	constructor(private readonly auditService: AuditService) {}

	private async callShopify(store: Store, query: string, variables: any) {
		const url = `https://${store.shopifyStoreUrl}/admin/api/2024-01/graphql.json`;

		try {
			const response = await axios.post(
				url,
				{ query, variables },
				{
					headers: {
						'X-Shopify-Access-Token': store.shopifyToken,
						'Content-Type': 'application/json',
					},
				},
			);

			if (response.data.errors) {
				this.logger.error(
					`Shopify GraphQL Errors: ${JSON.stringify(response.data.errors)}`,
				);
				throw new Error('Shopify GraphQL error');
			}

			return response.data.data;
		} catch (error) {
			const err = error as AxiosError;
			this.logger.error(`Shopify API Error: ${err.message}`);
			throw err;
		}
	}

	private getISTDateString(date: Date): string {
		// Convert to IST (UTC+5:30)
		const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
		const year = istDate.getUTCFullYear();
		const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
		const day = String(istDate.getUTCDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	private getOrderDateKeyIST(orderCreatedAt: string): string {
		const orderDate = new Date(orderCreatedAt);
		return this.getISTDateString(orderDate);
	}

	private getISTDateBoundaries(date: Date): { start: Date; end: Date } {
		// Get the date string in IST (e.g., "2025-12-29")
		const dateStr = this.getISTDateString(date);

		// Parse as UTC midnight, then adjust to IST boundaries
		// Start: 2025-12-29 00:00:00 IST = 2025-12-28 18:30:00 UTC
		const startIST = new Date(`${dateStr}T00:00:00+05:30`);

		// End: 2025-12-29 23:59:59.999 IST = 2025-12-29 18:29:59.999 UTC
		const endIST = new Date(`${dateStr}T23:59:59.999+05:30`);

		return { start: startIST, end: endIST };
	}

	private getOrdersQuery(): string {
		return `
			query getOrders($cursor: String, $queryString: String!) {
				orders(first: 100, after: $cursor, query: $queryString) {
					edges {
						cursor
						node {
							id
							createdAt
							totalPriceSet { shopMoney { amount } }
							lineItems(first: 100) {
								edges {
									node { 
										quantity
										product {
											id
											title
											onlineStoreUrl
											featuredImage {
												url
											}
										}
									}
								}
							}
						}
					}
					pageInfo { hasNextPage }
				}
			}
		`;
	}

	async fetchOrders(
		store: Store,
		from: Date,
		to: Date,
	): Promise<DailyOrdersSummary[]> {
		try {
			const startTime = Date.now();

			const fromBoundaries = this.getISTDateBoundaries(from);
			const toBoundaries = this.getISTDateBoundaries(to);

			this.logger.log(
				`[FIXED] Fetching orders for ${store.name}:
				- Input from (IST): ${this.getISTDateString(from)}
				- Input to (IST): ${this.getISTDateString(to)}
				- Query from (UTC): ${fromBoundaries.start.toISOString()}
				- Query to (UTC): ${toBoundaries.end.toISOString()}`,
			);

			await this.auditService.log({
				action: AuditAction.SHOPIFY_SYNC_STARTED,
				status: AuditStatus.PENDING,
				storeId: store._id.toString(),
				storeName: store.name,
				metadata: {
					fromIST: this.getISTDateString(from),
					toIST: this.getISTDateString(to),
					fromUTC: fromBoundaries.start.toISOString(),
					toUTC: toBoundaries.end.toISOString(),
				},
			});

			const totalDays =
				Math.ceil(
					(to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24),
				) + 1;

			const fromISO = fromBoundaries.start.toISOString();
			const toISO = toBoundaries.end.toISOString();
			const queryString = `created_at:>='${fromISO}' AND created_at:<='${toISO}'`;

			this.logger.debug(`Shopify query: ${queryString}`);

			const ordersMap = new Map<string, DailyOrdersSummary>();
			let cursor: string | null = null;
			let hasNextPage = true;
			let processedOrders = 0;

			while (hasNextPage) {
				const data = await this.callShopify(
					store,
					this.getOrdersQuery(),
					{ cursor, queryString },
				);

				const orders = data.orders.edges;

				for (const order of orders) {
					const dateKey = this.getOrderDateKeyIST(
						order.node.createdAt,
					);

					if (!ordersMap.has(dateKey)) {
						ordersMap.set(dateKey, {
							date: dateKey,
							soldOrders: 0,
							orderValue: 0,
							soldItems: 0,
						});
					}

					const daySummary = ordersMap.get(dateKey)!;
					daySummary.soldOrders++;
					daySummary.orderValue += parseFloat(
						order.node.totalPriceSet.shopMoney.amount || '0',
					);

					for (const item of order.node.lineItems.edges) {
						daySummary.soldItems += item.node.quantity;
					}

					processedOrders++;
				}

				hasNextPage = data.orders.pageInfo.hasNextPage;
				cursor = hasNextPage ? orders[orders.length - 1].cursor : null;

				if (processedOrders % 100 === 0) {
					this.logger.log(
						`Progress: ${processedOrders} orders processed for ${store.name}`,
					);
				}
			}

			const currentDate = new Date(from);
			const endDate = new Date(to);

			while (currentDate <= endDate) {
				const dateKey = this.getISTDateString(currentDate);
				if (!ordersMap.has(dateKey)) {
					ordersMap.set(dateKey, {
						date: dateKey,
						soldOrders: 0,
						orderValue: 0,
						soldItems: 0,
					});
					this.logger.debug(
						`No orders for ${dateKey}, initializing with zeros`,
					);
				}
				currentDate.setDate(currentDate.getDate() + 1);
			}

			// Convert map to sorted array
			const results = Array.from(ordersMap.values()).sort((a, b) =>
				a.date.localeCompare(b.date),
			);

			this.logger.log(
				`✓ Retrieved ${results.length} days of orders (${processedOrders} total orders) for ${store.name}`,
			);

			// Log the dates we got data for
			if (results.length > 0) {
				this.logger.log(
					`Date range in results: ${results[0].date} to ${results[results.length - 1].date}`,
				);
				this.logger.log(
					`Days with orders: ${results.filter((r) => r.soldOrders > 0).length}, Days with zeros: ${results.filter((r) => r.soldOrders === 0).length}`,
				);
			}

			await this.auditService.log({
				action: AuditAction.SHOPIFY_ORDERS_FETCHED,
				status: AuditStatus.SUCCESS,
				storeId: store._id.toString(),
				storeName: store.name,
				duration: Date.now() - startTime,
				metadata: {
					daysProcessed: results.length,
					totalDays,
					totalOrders: processedOrders,
					daysWithOrders: results.filter((r) => r.soldOrders > 0)
						.length,
					daysWithZeros: results.filter((r) => r.soldOrders === 0)
						.length,
					dateRange:
						results.length > 0
							? `${results[0].date} to ${results[results.length - 1].date}`
							: 'no data',
				},
			});

			return results;
		} catch (error) {
			await this.auditService.log({
				action: AuditAction.SHOPIFY_SYNC_FAILED,
				status: AuditStatus.FAILURE,
				storeId: store._id.toString(),
				storeName: store.name,
				errorMessage: (error as any).message,
				errorDetails: error,
			});
			throw error;
		}
	}

	async fetchProductSales(
		store: Store,
		from?: Date,
		to?: Date,
	): Promise<ProductSalesData[]> {
		try {
			const startTime = Date.now();
			await this.auditService.log({
				action: AuditAction.SHOPIFY_SYNC_STARTED,
				status: AuditStatus.PENDING,
				storeId: store._id.toString(),
				storeName: store.name,
				metadata: {
					from: from ? from.toISOString() : 'all-time',
					to: to ? to.toISOString() : 'all-time',
				},
			});

			let queryString = '';
			if (from && to) {
				const fromBoundaries = this.getISTDateBoundaries(from);
				const toBoundaries = this.getISTDateBoundaries(to);
				const fromISO = fromBoundaries.start.toISOString();
				const toISO = toBoundaries.end.toISOString();
				queryString = `created_at:>='${fromISO}' AND created_at:<='${toISO}'`;
			}

			let cursor: string | null = null;
			let hasNextPage = true;
			const productMap = new Map<string, ProductSalesData>();

			const dateRangeLog =
				from && to
					? `${this.getISTDateString(from)} to ${this.getISTDateString(to)}`
					: 'all-time';

			this.logger.log(
				`Fetching product sales for ${store.name}: ${dateRangeLog}`,
			);

			while (hasNextPage) {
				const data = await this.callShopify(
					store,
					this.getOrdersQuery(),
					{
						cursor,
						queryString,
					},
				);

				const orders = data.orders.edges;

				for (const order of orders) {
					const orderTotal = parseFloat(
						order.node.totalPriceSet.shopMoney.amount || '0',
					);
					const totalItems = order.node.lineItems.edges.reduce(
						(sum: number, item: any) => sum + item.node.quantity,
						0,
					);

					for (const item of order.node.lineItems.edges) {
						const product = item.node.product;
						if (!product) continue;

						const productId = product.id;
						const quantity = item.node.quantity;
						const itemRevenue =
							(quantity / totalItems) * orderTotal;

						if (!productMap.has(productId)) {
							productMap.set(productId, {
								productId,
								productName: product.title,
								productImage: product.featuredImage?.url || '',
								productUrl: product.onlineStoreUrl || '',
								quantitySold: 0,
								revenue: 0,
							});
						}

						const existing = productMap.get(productId)!;
						existing.quantitySold += quantity;
						existing.revenue += itemRevenue;
					}
				}

				hasNextPage = data.orders.pageInfo.hasNextPage;
				cursor = hasNextPage ? orders[orders.length - 1].cursor : null;
			}

			const results = Array.from(productMap.values());
			this.logger.log(
				`✓ Retrieved sales data for ${results.length} products from ${store.name}`,
			);
			await this.auditService.log({
				action: AuditAction.SHOPIFY_PRODUCTS_SYNCED,
				status: AuditStatus.SUCCESS,
				storeId: store._id.toString(),
				storeName: store.name,
				duration: Date.now() - startTime,
				metadata: {
					productsProcessed: results.length,
					dateRangeLog: dateRangeLog,
				},
			});

			return results;
		} catch (error) {
			await this.auditService.log({
				action: AuditAction.SHOPIFY_SYNC_FAILED,
				status: AuditStatus.FAILURE,
				storeId: store._id.toString(),
				storeName: store.name,
				errorMessage: (error as any).message,
				errorDetails: error,
			});
			throw error;
		}
	}

	async fetchTrafficAnalytics(
		store: Store,
		daysBack: number = 7,
		limit: number = 10,
	): Promise<TrafficAnalyticsData[]> {
		const url = `https://${store.shopifyStoreUrl}/admin/api/2025-10/graphql.json`;

		const shopifyQLQuery = `
			FROM sessions 
			SHOW online_store_visitors, sessions, sessions_with_cart_additions, sessions_that_reached_checkout 
			WHERE landing_page_path IS NOT NULL 
			AND human_or_bot_session IN ('human', 'bot') 
			GROUP BY landing_page_type, landing_page_path 
			WITH TOTALS 
			SINCE startOfDay(-${daysBack}d) 
			UNTIL today 
			ORDER BY sessions DESC 
			LIMIT ${limit}
		`;

		const graphqlQuery = {
			query: `query {
				shopifyqlQuery(query: "${shopifyQLQuery.replace(/\s+/g, ' ').replace(/"/g, '\\"')}") {
					tableData {
						columns { name dataType displayName }
						rows
					}
					parseErrors
				}
			}`,
		};

		try {
			const startTime = Date.now();
			await this.auditService.log({
				action: AuditAction.SHOPIFY_SYNC_STARTED,
				status: AuditStatus.PENDING,
				storeId: store._id.toString(),
				storeName: store.name,
				metadata: { daysBack: daysBack, limit: limit },
			});

			const response = await axios.post(url, graphqlQuery, {
				headers: {
					'X-Shopify-Access-Token': store.shopifyToken,
					'Content-Type': 'application/json',
				},
			});

			if (response.data.errors) {
				this.logger.error(
					`Shopify GraphQL Errors: ${JSON.stringify(response.data.errors)}`,
				);
				throw new Error('Shopify GraphQL error');
			}

			const queryData = response.data.data.shopifyqlQuery;

			if (queryData.parseErrors && queryData.parseErrors.length > 0) {
				this.logger.error(
					`ShopifyQL Parse Errors: ${JSON.stringify(queryData.parseErrors)}`,
				);
				throw new Error('ShopifyQL parse error');
			}

			const tableData = queryData.tableData;
			const results: TrafficAnalyticsData[] = [];

			for (const row of tableData.rows) {
				results.push({
					landingPageType: row.landing_page_type || 'Unknown',
					landingPagePath: row.landing_page_path || '/',
					onlineStoreVisitors: parseInt(
						row.online_store_visitors || '0',
						10,
					),
					sessions: parseInt(row.sessions || '0', 10),
					sessionsWithCartAdditions: parseInt(
						row.sessions_with_cart_additions || '0',
						10,
					),
					sessionsThatReachedCheckout: parseInt(
						row.sessions_that_reached_checkout || '0',
						10,
					),
				});
			}

			this.logger.log(
				`✓ Retrieved traffic analytics for ${results.length} landing pages from ${store.name}`,
			);
			await this.auditService.log({
				action: AuditAction.SHOPIFY_TRAFFIC_SYNCED,
				status: AuditStatus.SUCCESS,
				storeId: store._id.toString(),
				storeName: store.name,
				duration: Date.now() - startTime,
				metadata: {
					landingPagesProcessed: results.length,
					daysBack: daysBack,
					limit: limit,
				},
			});

			return results;
		} catch (error) {
			const err = error as AxiosError;
			this.logger.error(
				`Shopify Traffic Analytics Error: ${err.message}`,
			);

			await this.auditService.log({
				action: AuditAction.SHOPIFY_SYNC_FAILED,
				status: AuditStatus.FAILURE,
				storeId: store._id.toString(),
				storeName: store.name,
				errorMessage: (err as any).message,
				errorDetails: err,
			});
			throw err;
		}
	}
}
