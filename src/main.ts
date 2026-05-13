import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use('/webhook/stripe', bodyParser.raw({ type: 'application/json' }));

  // Habilitar CORS
const allowedOrigins = [
  'http://localhost:3000', // desarrollo
  'https://next-burger-house-roan.vercel.app', // producción
];

app.enableCors({
  origin: allowedOrigins,
  credentials: true,
});

 

  const config = new DocumentBuilder()
    .setTitle('Burger House RESTFul API')
    .setDescription('Burger House management endpoints')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT Token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
