import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
	getStatus(): string {
		return 'Ad Matrix Backend is running successfully!';
	}

	healthCheck(): { status: string; timestamp: string } {
		return {
			status: 'ok',
			timestamp: new Date().toISOString(),
		};
	}
}
