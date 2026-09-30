import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppThrottlerGuard, defaultLimitPerMinute, minutes } from './common/throttle';
import { PrismaModule } from './core/prisma/prisma.module';
import { FileStorageModule } from './core/file-storage/file-storage.module';
import { WebsocketModule } from './core/websocket/websocket.module';
import { AuthModule } from './core/auth/auth.module';
import { MailModule } from './core/mail/mail.module';
import { AccessModule } from './core/access/access.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { HospitalServicesModule } from './modules/hospital-services/hospital-services.module';
import { PreviewImagesModule } from './modules/preview-images/preview-images.module';
import { HospitalPromotionsModule } from './modules/hospital-promotions/hospital-promotions.module';
import { HospitalsModule } from './modules/hospitals/hospitals.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AppointmentNotificationsModule } from './modules/appointment-notifications/appointment-notifications.module';
import { RatesModule } from './modules/rates/rates.module';
import { RateRepliesModule } from './modules/rate-replies/rate-replies.module';
import { FavouritesModule } from './modules/favourites/favourites.module';
import { SubscribePlansModule } from './modules/subscribe-plans/subscribe-plans.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { SystemRequestsModule } from './modules/system-requests/system-requests.module';
import { ContactModule } from './modules/contact/contact.module';
import { PostsModule } from './modules/posts/posts.module';
import { SitesModule } from './modules/sites/sites.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { KiosksModule } from './modules/kiosks/kiosks.module';
import { UserAddressesModule } from './modules/user-addresses/user-addresses.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: minutes(1), limit: defaultLimitPerMinute() }],
      errorMessage: 'Too many requests. Please wait a few minutes and try again.',
    }),
    PrismaModule,
    FileStorageModule,
    WebsocketModule,
    MailModule,
    AccessModule,
    AuthModule,
    CategoriesModule,
    DepartmentsModule,
    RoomsModule,
    HospitalServicesModule,
    PreviewImagesModule,
    HospitalPromotionsModule,
    HospitalsModule,
    DoctorsModule,
    AppointmentsModule,
    AppointmentNotificationsModule,
    RatesModule,
    RateRepliesModule,
    FavouritesModule,
    SubscribePlansModule,
    SubscriptionsModule,
    SystemRequestsModule,
    ContactModule,
    PostsModule,
    UserAddressesModule,
    SitesModule,
    OrganizationsModule,
    KiosksModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class AppModule {}
