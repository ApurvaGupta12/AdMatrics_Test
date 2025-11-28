import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { Store } from '../../stores/schemas/store.schema';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookService {
	private readonly logger = new Logger(FacebookService.name);

	constructor(private readonly config: ConfigService) {}

	private async callFacebook(
		url: string,
		params: any,
		retry = 0,
	): Promise<any> {
		try {
			const res = await axios.get(url, { params });
			return res.data;
		} catch (error) {
			const err = error as AxiosError;
			const errData = err.response?.data as any;

			// Rate limit or temporary server issue → retry
			if (errData?.error?.code === 17 && retry < 3) {
				this.logger.warn(`FB rate limit hit, retrying in 2 sec...`);
				await new Promise((res) => setTimeout(res, 2000));
				return this.callFacebook(url, params, retry + 1);
			}

			this.logger.error(
				`Facebook API Error: ${errData?.error?.message || err.message}`,
			);
			return null;
		}
	}

	async fetchAdSpend(store: Store, from: Date, to: Date): Promise<number> {
		const token = this.config.get<string>('FB_ACCESS_TOKEN');
		const adAccountId = store.fbAccountId; // e.g. act_123456789

		const url = `https://graph.facebook.com/v19.0/${adAccountId}/insights`;

		const params = {
			access_token: token,
			fields: 'spend',
			time_range: JSON.stringify({
				since: from.toISOString().slice(0, 10),
				until: to.toISOString().slice(0, 10),
			}),
		};

		this.logger.log(
			`FB Ads spend fetch for ${store.name} (${adAccountId}): ${params.time_range}`,
		);

		const data = await this.callFacebook(url, params);

		if (!data || !data.data || data.data.length === 0) {
			return 0;
		}

		// FB returns spend as string
		return parseFloat(data.data[0].spend || '0');
	}
}
