import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
	getHello(): string {
		return 'Ad Matrix Backend is running successfully!';
	}
}
