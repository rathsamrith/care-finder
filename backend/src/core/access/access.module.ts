import { Global, Module } from '@nestjs/common';
import { HospitalAccessService } from './hospital-access.service';

@Global()
@Module({
  providers: [HospitalAccessService],
  exports: [HospitalAccessService],
})
export class AccessModule {}
