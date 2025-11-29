import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	@Get('/')
	@ApiOperation({ summary: 'Get status' })
	@ApiOkResponse({
		description: 'Returns status string',
		schema: { type: 'string', example: 'Hello World!' },
	})
	getHello(): string {
		return this.appService.getHello();
	}
}
