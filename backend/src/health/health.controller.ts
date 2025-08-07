import { Controller, Get, HttpCode, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();
  
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Basic health check',
    description: 'Returns basic health status for load balancer checks'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Health check successful'
  })
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      serverUptime: (Date.now() - this.startTime) / 1000,
    };
  }

  @Get('ping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Ultra-fast ping endpoint',
    description: 'Minimal response for high-frequency health checks'
  })
  @ApiResponse({ status: 200, description: 'Pong response' })
  ping() {
    return { message: 'pong', timestamp: Date.now() };
  }

  @Get('slow')
  @ApiOperation({ 
    summary: 'Slow endpoint for timeout testing',
    description: 'Simulates slow responses for performance testing'
  })
  @ApiResponse({ status: 200, description: 'Slow endpoint for testing timeouts' })
  async slowEndpoint() {
    // Simulate slow response (1-5 seconds)
    const delay = Math.floor(Math.random() * 4000) + 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return {
      status: 'ok',
      delay: `${delay}ms`,
      message: 'This endpoint simulates slow responses',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('error')
  @ApiOperation({ 
    summary: 'Error simulation endpoint',
    description: 'Randomly returns errors for error handling testing'
  })
  @ApiResponse({ status: 500, description: 'Simulated server error' })
  async errorEndpoint() {
    // 30% chance of throwing an error
    if (Math.random() < 0.3) {
      throw new HttpException('Simulated server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    
    return {
      status: 'ok',
      message: 'No error this time',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('memory')
  @ApiOperation({ 
    summary: 'Memory intensive operation',
    description: 'Performs memory intensive operations for testing'
  })
  @ApiResponse({ status: 200, description: 'Memory intensive operation' })
  async memoryIntensive() {
    // Create a large array and process it
    const result = Array.from({ length: 100000 }, (_, i) => ({ 
      id: i, 
      data: Math.random().toString(36),
      timestamp: Date.now()
    }));
    
    return {
      status: 'ok',
      processedItems: result.length,
      message: 'Memory intensive operation completed',
      memory: process.memoryUsage(),
    };
  }
}
