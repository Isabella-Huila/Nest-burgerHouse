import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from './user/user.module';
import { SeedModule } from './seed/seed.module';
import { ProductModule } from './product/product.module';
import { CommonsModule } from './commons/commons.module';
import { ToppingModule } from './topping/topping.module';
import { OrderModule } from './Order/order.module';
import { ReportModule } from './report/report.module';
import { WebhookModule } from './webhook/webhook.module';
import { PdfModule } from './pdf/pdf.module';

@Module({
  imports: [
    // 🌎 Variables de entorno globales
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 🛢️ Configuración dinámica de PostgreSQL
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const isProduction = configService.get('NODE_ENV') === 'production';

        // ☁️ PRODUCCIÓN → Supabase (Render)
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            autoLoadEntities: true,
            synchronize: true, // ❗ NUNCA en producción
            logging: true,
            ssl: {
              rejectUnauthorized: false,
            },
          };
        }

        // 💻 DESARROLLO → PostgreSQL local
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),

          autoLoadEntities: true,
          synchronize: true, // ✔ solo local
          logging: true,
        };
      },
    }),

    // 📦 Módulos de la app
    UserModule,
    SeedModule,
    ProductModule,
    CommonsModule,
    ToppingModule,
    OrderModule,
    ReportModule,
    WebhookModule,
    PdfModule,
  ],
})
export class AppModule {}