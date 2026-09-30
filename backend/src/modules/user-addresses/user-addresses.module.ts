import { Module } from '@nestjs/common';
import { UserAddressesController } from './user-addresses.controller';
import { UserAddressesService } from './user-addresses.service';

@Module({
  controllers: [UserAddressesController],
  providers: [UserAddressesService],
})
export class UserAddressesModule {}
