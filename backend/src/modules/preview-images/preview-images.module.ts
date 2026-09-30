import { Module } from '@nestjs/common';
import { PreviewImagesController } from './preview-images.controller';
import { PreviewImagesService } from './preview-images.service';

// PrismaService and FileStorageService are provided by @Global() modules
// (PrismaModule, FileStorageModule) already imported in AppModule - no need
// to import them here.
@Module({
  controllers: [PreviewImagesController],
  providers: [PreviewImagesService],
  exports: [PreviewImagesService],
})
export class PreviewImagesModule {}
