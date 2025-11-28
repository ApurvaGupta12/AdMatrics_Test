import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { StoresService } from './stores/stores.service';
import { MetricsService } from './metrics/metrics.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from './common/enums/user-role.enum';

async function seed() {
	const app = await NestFactory.createApplicationContext(AppModule);

	const usersService = app.get(UsersService);
	const storesService = app.get(StoresService);
	const metricsService = app.get(MetricsService);

	// eslint-disable-next-line no-console
	console.log('🌱 Seeding database...');

	const adminPassword = await bcrypt.hash('admin123', 12);
	const admin = await usersService.create({
		email: 'admin@example.com',
		password: adminPassword,
		role: UserRole.ADMIN,
	});
	// eslint-disable-next-line no-console
	console.log('✅ Created admin user');

	const managerPassword = await bcrypt.hash('manager123', 12);
	await usersService.create({
		email: 'manager@example.com',
		password: managerPassword,
		role: UserRole.MANAGER,
	});
	// eslint-disable-next-line no-console
	console.log('✅ Created manager user');

	const viewerPassword = await bcrypt.hash('viewer123', 12);
	await usersService.create({
		email: 'viewer@example.com',
		password: viewerPassword,
		role: UserRole.VIEWER,
	});
	// eslint-disable-next-line no-console
	console.log('✅ Created viewer user');

	const store1 = await storesService.create({
		name: 'gopivaid',
		shopifyToken: 'shpat_demo_token_1',
		shopifyStoreUrl: 'https://gopivaid.myshopify.com',
		fbAdSpendToken: 'act_123456789',
		fbAccountId: 'fb_acc_987654321',
	});
	// eslint-disable-next-line no-console
	console.log('✅ Created store: gopivaid');

	const store2 = await storesService.create({
		name: 'juhi',
		shopifyToken: 'shpat_demo_token_2',
		shopifyStoreUrl: 'https://juhi.myshopify.com',
		fbAdSpendToken: 'act_111222333',
		fbAccountId: 'fb_acc_444555666',
	});
	// eslint-disable-next-line no-console
	console.log('✅ Created store: juhi');

	const today = new Date();
	for (let i = 6; i >= 0; i--) {
		const date = new Date(today);
		date.setDate(date.getDate() - i);
		date.setHours(0, 0, 0, 0);

		await metricsService.create({
			storeId: store1._id,
			date,
			facebookMetaSpend: Math.random() * 500 + 300,
			googleAdSpend: Math.random() * 300 + 200,
			shopifySoldOrders: Math.floor(Math.random() * 50 + 20),
			shopifyOrderValue: Math.random() * 3000 + 1500,
			shopifySoldItems: Math.floor(Math.random() * 80 + 30),
		});

		await metricsService.create({
			storeId: store2._id,
			date,
			facebookMetaSpend: Math.random() * 400 + 250,
			googleAdSpend: Math.random() * 250 + 150,
			shopifySoldOrders: Math.floor(Math.random() * 40 + 15),
			shopifyOrderValue: Math.random() * 2500 + 1200,
			shopifySoldItems: Math.floor(Math.random() * 70 + 25),
		});
	}
	// eslint-disable-next-line no-console
	console.log('✅ Created sample metrics for last 7 days');
	// eslint-disable-next-line no-console
	console.log('🎉 Seeding completed!');

	await app.close();
}

seed().catch((err) => {
	// eslint-disable-next-line no-console
	console.error(err);
	process.exit(1);
});
