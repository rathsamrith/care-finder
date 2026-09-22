import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { MailContent } from './mail.templates';

// Sending never throws: a mail outage must not fail a booking or a password
// reset request. Failures are logged and reported through the return value.
// With no MAIL_HOST configured (local dev without a mail catcher) messages
// are logged instead of sent, so flows stay testable.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null | undefined;

  private getTransporter(): Transporter | null {
    if (this.transporter !== undefined) return this.transporter;
    const host = process.env.MAIL_HOST?.trim();
    if (!host) {
      this.transporter = null;
      return null;
    }
    const port = Number(process.env.MAIL_PORT ?? 587);
    const user = process.env.MAIL_USERNAME;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass: process.env.MAIL_PASSWORD } : undefined,
    });
    return this.transporter;
  }

  async send(to: string, content: MailContent): Promise<boolean> {
    const transporter = this.getTransporter();
    const from = `"${process.env.MAIL_FROM_NAME ?? 'Care Finder'}" <${process.env.MAIL_FROM_ADDRESS ?? 'no-reply@localhost'}>`;

    if (!transporter) {
      this.logger.warn(`MAIL_HOST not set - not sending "${content.subject}" to ${to}`);
      return false;
    }
    try {
      await transporter.sendMail({ from, to, subject: content.subject, text: content.text, html: content.html });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send "${content.subject}" to ${to}: ${(error as Error).message}`);
      return false;
    }
  }
}
