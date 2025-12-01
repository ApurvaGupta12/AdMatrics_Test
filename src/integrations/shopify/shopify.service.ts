import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { Store } from '../../stores/schemas/store.schema';

interface ShopifyOrdersSummary {
	soldOrders: number;
	orderValue: number;
	soldItems: number;
}

@Injectable()
export class ShopifyService {
	private readonly logger = new Logger(ShopifyService.name);

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

	async fetchOrders(
		store: Store,
		from: Date,
		to: Date,
	): Promise<ShopifyOrdersSummary> {
		this.logger.log(
			`Fetching Shopify orders for ${store.name} (${store.shopifyStoreUrl}) from ${from.toISOString()} to ${to.toISOString()}`,
		);

		const queryString = `created_at:>='${from.toISOString()}' AND created_at:<='${to.toISOString()}'`;

		const query = `
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
									}
								}
							}
						}
					}
					pageInfo {
						hasNextPage
					}
				}
			}
		`;

		let cursor: string | null = null;
		let hasNextPage = true;

		let soldOrders = 0;
		let orderValue = 0;
		let soldItems = 0;

		while (hasNextPage) {
			const data = await this.callShopify(store, query, {
				cursor,
				queryString,
			});

			const orders = data.orders.edges;

			for (const order of orders) {
				soldOrders++;
				const price = parseFloat(
					order.node.totalPriceSet.shopMoney.amount || '0',
				);
				orderValue += price;

				const items = order.node.lineItems.edges;
				for (const item of items) {
					soldItems += item.node.quantity;
				}
			}

			hasNextPage = data.orders.pageInfo.hasNextPage;
			cursor = hasNextPage ? orders[orders.length - 1].cursor : null;
		}

		return {
			soldOrders,
			orderValue,
			soldItems,
		};
	}
}
