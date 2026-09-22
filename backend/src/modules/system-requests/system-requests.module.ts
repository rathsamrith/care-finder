import { Module } from '@nestjs/common';
import { SystemRequestsController } from './system-requests.controller';
import { SystemRequestsService } from './system-requests.service';

@Module({
  controllers: [SystemRequestsController],
  providers: [SystemRequestsService],
})
export class SystemRequestsModule {}
