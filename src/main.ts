import { NestFactory } from '@nestjs/core';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.setGlobalPrefix('api', {
		exclude: [{ path: '/', method: RequestMethod.GET }],
	});

	// ------------------ Swagger ------------------
	const config = new DocumentBuilder()
		.setTitle('Ad Matrix Backend API')
		.setDescription('API documentation for the Ad Matrix Backend')
		.setVersion('0.1.0')
		.addBearerAuth(
			{
				type: 'http',
				scheme: 'bearer',
				bearerFormat: 'JWT',
				description: 'Enter JWT token from /auth/login',
			},
			'JWT-auth', // name for reference
		)
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api/docs', app, document, {
		swaggerOptions: {
			persistAuthorization: true,
		},
	});

	app.enableCors({
		origin: process.env.FRONTEND_URL || 'http://localhost:3000',
		credentials: true,
	});

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
		}),
	);

	const port = process.env.PORT || 3001;
	await app.listen(port);
	// eslint-disable-next-line no-console
	console.log(`🚀 Backend running on http://localhost:${port}`);
}
bootstrap();
