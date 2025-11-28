import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Store } from '../../stores/schemas/store.schema';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleService {
	private readonly logger = new Logger(GoogleService.name);

	constructor(private readonly configService: ConfigService) {}

	async fetchAdSpend(store: Store, from: Date, to: Date): Promise<number> {
		// TODO: Implement Google Ads API calls using credentials from env.
		this.logger.debug(
			`Fetching Google ad spend for ${store.name} from ${from.toISOString()} to ${to.toISOString()}`,
		);

		try {
			void axios;
			void store;
			void from;
			void to;
			void this.configService;

			return 0;
		} catch (e) {
			this.logger.error(`Google Ads API error: ${(e as any).message}`);
			return 0;
		}
	}
}
