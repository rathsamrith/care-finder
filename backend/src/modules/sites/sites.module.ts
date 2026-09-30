import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [SitesController],
  providers: [SitesService],
})
export class SitesModule {}
