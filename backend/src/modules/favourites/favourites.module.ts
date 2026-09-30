import { Module } from '@nestjs/common';
import { FavouritesController } from './favourites.controller';
import { FavouritesService } from './favourites.service';

@Module({
  controllers: [FavouritesController],
  providers: [FavouritesService],
  exports: [FavouritesService],
})
export class FavouritesModule {}
