import { Module } from '@nestjs/common';
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

@Module({
  controllers: [UserSeedController, ProductSeedController, ToppingSeedController,OrderSeedController,ReportController],
  providers: [UserSeedService, ProductSeedService, ToppingSeedService, OrderSeedService, ReportService],
  imports: [UserModule, ProductModule, ToppingModule,OrderModule,ReportModule, PdfModule ],
})
export class SeedModule {}
