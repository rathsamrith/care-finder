import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MailService } from '../../core/mail/mail.service';
import { contactReceivedMail } from '../../core/mail/mail.templates';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async create(dto: CreateContactMessageDto) {
    await this.prisma.contactMessage.create({
      data: { email: dto.email, message: dto.message },
    });
    // Stored first, so the message is never lost if mail is down. Only the staff
    // inbox is emailed - this endpoint is unauthenticated, so acknowledging to the
    // typed-in address would let anyone send mail to third parties.
    const inbox = process.env.CONTACT_INBOX ?? process.env.MAIL_FROM_ADDRESS;
    if (inbox) void this.mail.send(inbox, contactReceivedMail(dto.email, dto.message));
    return { message: 'Thanks for reaching out - we will get back to you by email.' };
  }
}
