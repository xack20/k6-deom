import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ProductsModule } from './products/products.module';
import { SimulationModule } from './simulation/simulation.module';
import { UploadModule } from './upload/upload.module';
import { UsersModule } from './users/users.module';
import { WebSocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    // Ultra-high performance rate limiting for K6 testing
    ThrottlerModule.forRoot({
      ttl: 60000, // 1 minute
      limit: 10000, // 10,000 req/min per IP (very high for K6)
    }),
    AuthModule,
    UsersModule,
    ProductsModule,
    UploadModule,
    WebSocketModule,
    HealthModule,
    SimulationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
