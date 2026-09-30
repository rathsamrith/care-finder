import { Module } from '@nestjs/common';
import { RateRepliesController } from './rate-replies.controller';
import { RateRepliesService } from './rate-replies.service';

@Module({
  controllers: [RateRepliesController],
  providers: [RateRepliesService],
  exports: [RateRepliesService],
})
export class RateRepliesModule {}
