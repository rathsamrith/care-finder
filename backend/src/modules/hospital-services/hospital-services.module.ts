import { Module } from '@nestjs/common';
import { HospitalServicesController } from './hospital-services.controller';
import { HospitalServicesService } from './hospital-services.service';

// PrismaService and FileStorageService are provided by @Global() modules
// (PrismaModule, FileStorageModule) already imported in AppModule - no need
// to import them here.
@Module({
  controllers: [HospitalServicesController],
  providers: [HospitalServicesService],
  exports: [HospitalServicesService],
})
export class HospitalServicesModule {}
