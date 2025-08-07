import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

// Import health module directly
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    // High-performance rate limiting
    ThrottlerModule.forRoot({
      ttl: 60000, // 1 minute
      limit: 2000, // Very high limit for K6 testing
    }),
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModuleLite {}
