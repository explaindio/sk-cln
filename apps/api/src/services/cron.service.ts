import cron from 'node-cron';
import { emailService } from './email.service';
import { notificationService } from './notification.service';

export class CronService {
  start() {
    // Process email queue every minute
    cron.schedule('* * * * *', () => {
      console.log('Processing email queue...');
      emailService.processEmailQueue();
    });

    // Send daily digests at midnight
    cron.schedule('0 0 * * *', () => {
      console.log('Sending daily digests...');
      notificationService.sendDigests('DAILY');
    });

    // Send weekly digests on Sunday at midnight
    cron.schedule('0 0 * * 0', () => {
      console.log('Sending weekly digests...');
      notificationService.sendDigests('WEEKLY');
    });
  }
}

export const cronService = new CronService();