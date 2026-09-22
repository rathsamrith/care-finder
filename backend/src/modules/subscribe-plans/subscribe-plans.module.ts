import { Module } from '@nestjs/common';
import { SubscribePlansController } from './subscribe-plans.controller';
import { SubscribePlansService } from './subscribe-plans.service';

@Module({
  controllers: [SubscribePlansController],
  providers: [SubscribePlansService],
  exports: [SubscribePlansService],
})
export class SubscribePlansModule {}
