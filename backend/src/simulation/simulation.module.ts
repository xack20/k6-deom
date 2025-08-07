import { Module } from '@nestjs/common';
import { SimulationController } from './simulation.controller';

@Module({
  controllers: [SimulationController],
})
export class SimulationModule {}
