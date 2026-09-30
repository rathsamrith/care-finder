import { Module } from '@nestjs/common';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';

// PrismaService is provided by the @Global() PrismaModule already imported
// in AppModule - no need to import it here.
@Module({
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
