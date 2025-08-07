import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Simulation')
@Controller('simulation')
export class SimulationController {
  @Get('cpu-intensive')
  @ApiResponse({ status: 200, description: 'CPU intensive operation completed' })
  async cpuIntensive(@Query('iterations') iterations: string = '1000000') {
    const iter = parseInt(iterations);
    let result = 0;
    
    for (let i = 0; i < iter; i++) {
      result += Math.sqrt(i) * Math.sin(i);
    }
    
    return {
      result,
      iterations: iter,
      message: 'CPU intensive operation completed',
    };
  }

  @Post('network-simulation')
  @ApiResponse({ status: 200, description: 'Network delay simulation' })
  async networkDelay(@Body() body: { delay?: number; shouldFail?: boolean }) {
    const { delay = 1000, shouldFail = false } = body;
    
    if (shouldFail && Math.random() < 0.3) {
      throw new Error('Simulated network failure');
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return {
      delay,
      message: 'Network simulation completed',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('random-response')
  @ApiQuery({ name: 'size', required: false })
  @ApiResponse({ status: 200, description: 'Random response data' })
  async randomResponse(@Query('size') size: string = '1000') {
    const dataSize = parseInt(size);
    const randomData = Array.from({ length: dataSize }, (_, i) => ({
      id: i,
      data: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
    }));
    
    return {
      data: randomData,
      size: dataSize,
      message: 'Random data generated',
    };
  }
}
