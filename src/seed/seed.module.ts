import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { UserSeedService } from './users/user-seed.service';
import { UserSeedController } from './users/user-seed.controller';
import { UserModule } from '../user/user.module';
import { ProductSeedController } from './products/product-seed.controller';
import { ProductSeedService } from './products/product-seed.service';
import { ProductModule } from '../product/product.module';
import { ToppingSeedService } from './toppings/topping-seed.service';
import { ToppingModule } from '../topping/topping.module';
import { ToppingSeedController } from './toppings/topping-seed.controller';
import { OrderSeedController } from './orders/order-seed.controller';
import { OrderSeedService } from './orders/order-seed.service';
import { OrderModule } from '../Order/order.module';
import { ReportController } from '../report/report.controller';
import { ReportService } from '../report/report.service';
import { ReportModule } from '../report/report.module';
import { PdfModule } from '../pdf/pdf.module';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [UserSeedController, ProductSeedController, ToppingSeedController, OrderSeedController, ReportController],
  providers: [
    UserSeedService,
    ProductSeedService,
    ToppingSeedService,
    OrderSeedService,
    ReportService,
  ],
  imports: [UserModule, ProductModule, ToppingModule, OrderModule, ReportModule, PdfModule],
})
export class SeedModule implements OnModuleInit {
  private readonly logger = new Logger(SeedModule.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userSeedService: UserSeedService,
    private readonly productSeedService: ProductSeedService,
    private readonly toppingSeedService: ToppingSeedService,
    private readonly orderSeedService: OrderSeedService,
  ) {}

  async onModuleInit() {
    const seedDb = this.configService.get<boolean>('SEED_DB');

    if (seedDb) {
      this.logger.log('Seeding database...');
      try {
        await this.userSeedService.runUserSeed();
        await this.productSeedService.runProductSeed();
        await this.toppingSeedService.runToppingSeed();
        await this.orderSeedService.runOrderSeed();
        this.logger.log('Database seeding complete.');
      } catch (error) {
        this.logger.error('Database seeding failed:', error.message);
      }
    }
  }
}
