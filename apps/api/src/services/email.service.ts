import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma';
import { EmailStatus } from '@prisma/client';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';

interface EmailData {
  to: string;
  subject: string;
  template: string;
  data: any;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();
  
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    
    this.loadTemplates();
  }
  
  private async loadTemplates() {
    const templateDir = path.join(__dirname, '../templates/email');
    const templates = ['notification', 'digest', 'password-reset', 'welcome']; // Add other templates here
    
    for (const template of templates) {
      try {
        const html = await fs.readFile(path.join(templateDir, `${template}.hbs`), 'utf-8');
        this.templates.set(template, handlebars.compile(html));
      } catch (error) {
        console.error(`Failed to load template ${template}:`, error);
      }
    }
  }
  
  async sendDigest(userId: string, frequency: 'DAILY' | 'WEEKLY') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - (frequency === 'WEEKLY' ? 7 : 1));

    const notifications = await prisma.notification.findMany({
      where: { userId, createdAt: { gte: sinceDate }, read: false },
      orderBy: { createdAt: 'desc' },
      take: 20, // Limit the number of notifications in a digest
    });

    if (notifications.length === 0) return;

    await this.queueEmail({
      to: user.email,
      subject: `Your ${frequency.toLowerCase()} digest from Skool Clone`,
      template: 'digest',
      data: {
        username: user.username,
        notifications,
        notificationCount: notifications.length,
        frequency: frequency.toLowerCase(),
      },
    });
  }
  
  async queueEmail(email: EmailData) {
    const template = this.templates.get(email.template);
    if (!template) throw new Error(`Template ${email.template} not found`);
    
    const html = template(email.data);
    const text = html.replace(/<[^>]+>/g, '');
    
    await prisma.emailQueue.create({
      data: { to: email.to, subject: email.subject, html, text },
    });
  }
  
  async processEmailQueue() {
    const emails = await prisma.emailQueue.findMany({
      where: { status: 'PENDING', attempts: { lt: 3 } },
      take: 10,
    });
    
    for (const email of emails) {
      await this.sendEmail(email);
    }
  }
  
  private async sendEmail(email: any) {
    try {
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: { status: 'SENDING', attempts: { increment: 1 } },
      });
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (error: any) {
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: { status: 'FAILED', error: error.message },
      });
    }
  }
}

export const emailService = new EmailService();