import { Module } from '@nestjs/common';
import { HospitalPromotionsController } from './hospital-promotions.controller';
import { HospitalPromotionsService } from './hospital-promotions.service';

// PrismaService and FileStorageService are provided by @Global() modules
// (PrismaModule, FileStorageModule) already imported in AppModule - no need
// to import them here.
@Module({
  controllers: [HospitalPromotionsController],
  providers: [HospitalPromotionsService],
  exports: [HospitalPromotionsService],
})
export class HospitalPromotionsModule {}
