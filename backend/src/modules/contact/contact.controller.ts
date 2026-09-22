import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { minutes, perIp } from '../../common/throttle';
import { ContactService } from './contact.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

// Public on purpose - the Contact page's form has no logged-in user to
// attach the message to, and the visitor filling it out is often not one.
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  // Public and it emails staff, so it is the easiest endpoint to abuse.
  @Throttle(perIp(5, minutes(10)))
  @Post()
  create(@Body() dto: CreateContactMessageDto) {
    return this.contactService.create(dto);
  }
}
