import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(config.get<string>('SMTP_PORT') ?? '587', 10),
        secure: config.get<string>('SMTP_SECURE') === 'true',
        auth: {
          user: config.get<string>('SMTP_USER'),
          pass: config.get<string>('SMTP_PASS'),
        },
      });
    }
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM') ?? 'noreply@smartfinance.co.ke';
    if (!this.transporter) {
      this.logger.warn(`Email not configured. Reset URL for ${to}: ${resetUrl}`);
      return;
    }
    await this.transporter.sendMail({
      from,
      to,
      subject: 'Reset your SmartFinance password',
      html: `
        <p>You requested a password reset for your SmartFinance account.</p>
        <p><a href="${resetUrl}" style="background:#15803d;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Reset Password</a></p>
        <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
      `,
    });
  }
}
