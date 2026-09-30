import { Module } from '@nestjs/common';
import { HospitalsController } from './hospitals.controller';
import { HospitalsService } from './hospitals.service';

// PrismaService and FileStorageService are provided by @Global() modules
// (PrismaModule, FileStorageModule) already imported in AppModule - no need
// to import them here.
@Module({
  controllers: [HospitalsController],
  providers: [HospitalsService],
  exports: [HospitalsService],
})
export class HospitalsModule {}
