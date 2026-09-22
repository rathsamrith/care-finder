import { Module } from '@nestjs/common';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';

// PrismaService and FileStorageService are provided by @Global() modules
// (PrismaModule, FileStorageModule) already imported in AppModule - no need
// to import them here.
@Module({
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
