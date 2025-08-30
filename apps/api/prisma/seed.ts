import { PrismaClient, PointType, RewardType, StreakType } from '../src/generated/prisma';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
  // Create test users
  const passwordHash = await hashPassword('Test123!@#');

  const testUser1 = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      username: 'testuser',
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
      emailVerified: true,
    },
  });

  const testUser2 = await prisma.user.upsert({
    where: { email: 'test2@example.com' },
    update: {},
    create: {
      email: 'test2@example.com',
      username: 'testuser2',
      passwordHash,
      firstName: 'Test',
      lastName: 'User 2',
      emailVerified: true,
    },
  });

  const testUser3 = await prisma.user.upsert({
    where: { email: 'test3@example.com' },
    update: {},
    create: {
      email: 'test3@example.com',
      username: 'testuser3',
      passwordHash,
      firstName: 'Test',
      lastName: 'User 3',
      emailVerified: true,
    },
  });

  console.log('Created test users:', testUser1.username, testUser2.username, testUser3.username);

  // Create test community
  const community = await prisma.community.upsert({
    where: { slug: 'test-community' },
    update: {},
    create: {
      name: 'Test Community',
      slug: 'test-community',
      description: 'A test community for development',
      isPublic: true,
      ownerId: testUser1.id,
    },
  });

  // Add users to community
  await prisma.communityMember.upsert({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId: testUser1.id,
      },
    },
    update: { role: 'owner' },
    create: {
      communityId: community.id,
      userId: testUser1.id,
      role: 'owner',
    },
  });

  await prisma.communityMember.upsert({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId: testUser2.id,
      },
    },
    update: { role: 'member' },
    create: {
      communityId: community.id,
      userId: testUser2.id,
      role: 'member',
    },
  });

  await prisma.communityMember.upsert({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId: testUser3.id,
      },
    },
    update: { role: 'member' },
    create: {
      communityId: community.id,
      userId: testUser3.id,
      role: 'member',
    },
  });

  console.log('Created test community:', community.name);

  // Create achievements
  const achievements = [
    {
      name: 'first_post',
      description: 'Create your first post',
      icon: '✍️',
      category: 'posting',
      points: 10,
      criteria: { type: 'posts_created', target: 1 },
    },
    {
      name: 'prolific_poster',
      description: 'Create 100 posts',
      icon: '📝',
      category: 'posting',
      points: 100,
      criteria: { type: 'posts_created', target: 100 },
    },
    {
      name: 'helpful_member',
      description: 'Receive 50 likes on your posts',
      icon: '👍',
      category: 'engagement',
      points: 50,
      criteria: { type: 'likes_received', target: 50 },
    },
    {
      name: 'streak_starter',
      description: 'Maintain a 7-day login streak',
      icon: '🔥',
      category: 'streak',
      points: 30,
      criteria: { type: 'login_streak', target: 7 },
    },
    {
      name: 'knowledge_seeker',
      description: 'Complete 10 lessons',
      icon: '📚',
      category: 'learning',
      points: 50,
      criteria: { type: 'lessons_completed', target: 10 },
    },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { name: achievement.name },
      update: achievement,
      create: achievement,
    });
  }

  console.log('Created achievements');

  // Create rewards
  const rewards = [
    {
      name: 'Premium Badge',
      description: 'Get a premium badge for your profile',
      type: RewardType.PROFILE_BADGE,
      cost: 500,
      stock: null,
      isActive: true,
    },
    {
      name: 'Course Discount',
      description: '10% discount on any course',
      type: RewardType.DISCOUNT_CODE,
      cost: 200,
      stock: 100,
      isActive: true,
    },
    {
      name: 'Exclusive Content',
      description: 'Access to exclusive community content',
      type: RewardType.EXCLUSIVE_CONTENT,
      cost: 300,
      stock: null,
      isActive: true,
    },
    {
      name: 'Virtual Gift',
      description: 'Send a virtual gift to another member',
      type: RewardType.COURSE_ACCESS,
      cost: 50,
      stock: null,
      isActive: true,
    },
  ];

  await prisma.reward.deleteMany({});
  const createdRewards = [];
  for (const reward of rewards) {
    const createdReward = await prisma.reward.create({
      data: reward,
    });
    createdRewards.push(createdReward);
  }

  console.log('Created rewards');

  // Create some initial points for testing
  const pointsData = [
    { userId: testUser1.id, amount: 150, type: PointType.POST_CREATED, reason: 'Creating test post' },
    { userId: testUser1.id, amount: 25, type: PointType.COMMENT_CREATED, reason: 'Adding test comment' },
    { userId: testUser1.id, amount: 5, type: PointType.DAILY_LOGIN, reason: 'Daily login bonus' },
    { userId: testUser2.id, amount: 100, type: PointType.POST_CREATED, reason: 'Creating test post' },
    { userId: testUser3.id, amount: 75, type: PointType.POST_CREATED, reason: 'Creating test post' },
  ];

  for (const point of pointsData) {
    await prisma.points.create({
      data: point,
    });
  }

  console.log('Created initial points');

  // Create user levels
  const levels = [
    { userId: testUser1.id, level: 2, experience: 150, nextLevelXp: 200 },
    { userId: testUser2.id, level: 1, experience: 100, nextLevelXp: 100 },
    { userId: testUser3.id, level: 1, experience: 75, nextLevelXp: 100 },
  ];

  for (const level of levels) {
    await prisma.userLevel.upsert({
      where: { userId: level.userId },
      update: level,
      create: level,
    });
  }

  console.log('Created user levels');

  // Create streaks
  const streaks = [
    { userId: testUser1.id, type: StreakType.DAILY_LOGIN, currentDays: 3, bestDays: 7 },
    { userId: testUser2.id, type: StreakType.DAILY_LOGIN, currentDays: 1, bestDays: 1 },
  ];

  for (const streak of streaks) {
    await prisma.streak.upsert({
      where: { userId_type: { userId: streak.userId, type: streak.type } },
      update: streak,
      create: streak,
    });
  }

  console.log('Created streaks');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });