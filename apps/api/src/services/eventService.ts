import { prisma } from '../lib/prisma';
import { notificationService } from './notification.service';
import { NotFoundError, ValidationError } from '../utils/errors';

export class EventService {
  async createEvent(data: {
    communityId: string;
    creatorId: string;
    title: string;
    description?: string;
    location?: string;
    meetingUrl?: string;
    startsAt: Date;
    endsAt: Date;
    maxAttendees?: number;
  }) {
    // Validate dates
    if (new Date(data.startsAt) >= new Date(data.endsAt)) {
      throw new ValidationError('End time must be after start time');
    }

    const event = await prisma.event.create({
      data,
      include: {
        community: true,
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return event;
  }

  async updateEvent(eventId: string, data: Partial<{
    title: string;
    description: string;
    location: string;
    meetingUrl: string;
    startsAt: Date;
    endsAt: Date;
    maxAttendees: number;
  }>) {
    // Validate dates if both are provided
    if (data.startsAt && data.endsAt && new Date(data.startsAt) >= new Date(data.endsAt)) {
      throw new ValidationError('End time must be after start time');
    }

    const event = await prisma.event.update({
      where: { id: eventId },
      data,
      include: {
        community: true,
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notify attendees of event update
    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId },
      include: { user: true },
    });

    for (const attendee of attendees) {
      await notificationService.create({
        userId: attendee.userId,
        type: 'EVENT_UPDATED',
        title: 'Event Updated',
        message: `The event "${event.title}" has been updated`,
        actionUrl: `/communities/${event.community.slug}/events/${event.id}`,
      });
    }

    return event;
  }

  async deleteEvent(eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { community: true },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Notify attendees of event cancellation
    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId },
      include: { user: true },
    });

    for (const attendee of attendees) {
      await notificationService.create({
        userId: attendee.userId,
        type: 'EVENT_CANCELLED',
        title: 'Event Cancelled',
        message: `The event "${event.title}" in ${event.community.name} has been cancelled`,
        actionUrl: `/communities/${event.community.slug}/events`,
      });
    }

    return prisma.event.delete({
      where: { id: eventId },
    });
  }

  async attendEvent(eventId: string, userId: string, status: string = 'going') {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    return prisma.eventAttendee.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      create: {
        eventId,
        userId,
        status,
      },
      update: {
        status,
      },
    });
  }

  async getEventAttendees(eventId: string) {
    return prisma.eventAttendee.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async sendEventReminders() {
    // Find events starting in the next 24 hours that haven't sent reminders yet
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    const events = await prisma.event.findMany({
      where: {
        startsAt: {
          gte: new Date(),
          lte: oneDayFromNow,
        },
        remindersSent: false,
      },
      include: {
        attendees: {
          include: { user: true },
        },
        community: true,
      },
    });

    for (const event of events) {
      // Send reminders to all attendees
      for (const attendee of event.attendees) {
        await notificationService.notifyEventReminder(event.id, attendee.userId);
      }

      // Mark reminders as sent
      await prisma.event.update({
        where: { id: event.id },
        data: { remindersSent: true },
      });
    }

    return { message: `Sent reminders for ${events.length} events` };
  }

  async getUpcomingEvents(communityId?: string, limit: number = 10) {
    const where = communityId ? { communityId } : {};
    
    return prisma.event.findMany({
      where: {
        ...where,
        startsAt: {
          gte: new Date(),
        },
      },
      include: {
        community: true,
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: { attendees: true },
        },
      },
      orderBy: {
        startsAt: 'asc',
      },
      take: limit,
    });
  }
}

export const eventService = new EventService();