import { prisma } from '../lib/prisma';
import { notificationService } from '../services/notification.service';
import { postService } from '../services/postService';
import { reactionService } from '../services/reactionService';
import { commentService } from '../services/commentService';
import { messageService } from '../services/messageService';
import { courseService } from '../services/courseService';
import { eventService } from '../services/eventService';

// Mock the socket service to avoid WebSocket connections during tests
jest.mock('../services/socket.service', () => ({
  socketService: {
    sendNotification: jest.fn(),
    sendMessage: jest.fn(),
  },
}));

// Mock the email service
jest.mock('../services/email.service', () => ({
  emailService: {
    queueEmail: jest.fn(),
  },
}));

// Mock the push service
jest.mock('../services/push.service', () => ({
  pushService: {
    sendNotification: jest.fn(),
  },
}));

describe('Notification Triggers', () => {
  let testUser1: any;
  let testUser2: any;
  let testCommunity: any;
  let testPost: any;
  let testCourse: any;
  let testConversation: any;

  beforeAll(async () => {
    // Create test users
    testUser1 = await prisma.user.create({
      data: {
        email: 'test1@example.com',
        username: 'testuser1',
        passwordHash: 'hashedpassword',
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: 'test2@example.com',
        username: 'testuser2',
        passwordHash: 'hashedpassword',
      },
    });

    // Create test community
    testCommunity = await prisma.community.create({
      data: {
        name: 'Test Community',
        slug: 'test-community',
        ownerId: testUser1.id,
      },
    });

    // Add users to community
    await prisma.communityMember.create({
      data: {
        communityId: testCommunity.id,
        userId: testUser1.id,
        role: 'member',
      },
    });

    await prisma.communityMember.create({
      data: {
        communityId: testCommunity.id,
        userId: testUser2.id,
        role: 'member',
      },
    });

    // Create test category
    const testCategory = await prisma.category.create({
      data: {
        communityId: testCommunity.id,
        name: 'Test Category',
      },
    });

    // Create test post
    testPost = await prisma.post.create({
      data: {
        communityId: testCommunity.id,
        categoryId: testCategory.id,
        authorId: testUser1.id,
        title: 'Test Post',
        content: 'Test content',
      },
    });

    // Create test course
    testCourse = await prisma.course.create({
      data: {
        communityId: testCommunity.id,
        title: 'Test Course',
      },
    });

    // Create test conversation
    testConversation = await prisma.conversation.create({
      data: {
        type: 'direct',
        createdBy: testUser1.id,
        participants: {
          create: [
            { userId: testUser1.id },
            { userId: testUser2.id },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.conversation.deleteMany({
      where: { id: testConversation.id },
    });

    await prisma.course.deleteMany({
      where: { id: testCourse.id },
    });

    await prisma.post.deleteMany({
      where: { id: testPost.id },
    });

    await prisma.category.deleteMany({
      where: { communityId: testCommunity.id },
    });

    await prisma.communityMember.deleteMany({
      where: {
        communityId: testCommunity.id,
      },
    });

    await prisma.community.deleteMany({
      where: { id: testCommunity.id },
    });

    await prisma.user.deleteMany({
      where: {
        id: { in: [testUser1.id, testUser2.id] },
      },
    });
  });

  beforeEach(async () => {
    // Clear notifications before each test
    await prisma.notification.deleteMany({});
  });

  it('should create notification when post is liked', async () => {
    const result = await reactionService.togglePostReaction(testPost.id, testUser2.id, 'like');
    
    expect(result.action).toBe('added');
    
    // Check if notification was created
    const notifications = await prisma.notification.findMany({
      where: {
        userId: testUser1.id,
        type: 'POST_LIKED',
      },
    });
    
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('Your post was liked');
  });

  it('should create notification when comment is added', async () => {
    const comment = await commentService.create({
      content: 'Test comment',
      postId: testPost.id,
      authorId: testUser2.id,
    });
    
    // Check if notification was created
    const notifications = await prisma.notification.findMany({
      where: {
        userId: testUser1.id,
        type: 'POST_COMMENTED',
      },
    });
    
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('New comment on your post');
  });

  it('should create notification when message is sent', async () => {
    const message = await messageService.sendMessage(
      testConversation.id,
      testUser2.id,
      'Test message'
    );
    
    // Check if notification was created
    const notifications = await prisma.notification.findMany({
      where: {
        userId: testUser1.id,
        type: 'NEW_MESSAGE',
      },
    });
    
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toContain('New message');
  });

  it('should create notification when user enrolls in course', async () => {
    const enrollment = await courseService.enrollInCourse(testUser2.id, testCourse.id);
    
    // Check if notification was created
    const notifications = await prisma.notification.findMany({
      where: {
        userId: testUser2.id,
        type: 'COURSE_ENROLLED',
      },
    });
    
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('Course Enrollment Confirmed');
  });

  it('should create notification when achievement is unlocked', async () => {
    await notificationService.notifyAchievementUnlocked(testUser1.id, 'Test Achievement', 100);
    
    // Check if notification was created
    const notifications = await prisma.notification.findMany({
      where: {
        userId: testUser1.id,
        type: 'ACHIEVEMENT_UNLOCKED',
      },
    });
    
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('Achievement Unlocked!');
  });
});