import { PrismaClient, PointType, RewardType, StreakType, UserRole, CourseDifficulty } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
console.log('DATABASE_URL:', process.env.DATABASE_URL);
const prisma = new PrismaClient();
const now = new Date();

async function main() {
  // Create test users
  const passwordHash = await hashPassword('Test123!@#');

  // Admin user
  const adminUser = await prisma.users.upsert({
    where: { id: 'admin1' },
    update: {},
    create: {
      id: 'admin1',
      email: 'admin@skool.com',
      username: 'admin',
      password_hash: passwordHash,
      first_name: 'Admin',
      last_name: 'User',
      role: UserRole.ADMIN,
      email_verified: true,
      created_at: now,
      updated_at: now,
    },
  });

  // Teacher user
  const teacherUser = await prisma.users.upsert({
    where: { id: 'teacher1' },
    update: {},
    create: {
      id: 'teacher1',
      email: 'teacher@skool.com',
      username: 'teacher',
      password_hash: passwordHash,
      first_name: 'Teacher',
      last_name: 'User',
      role: UserRole.USER,
      email_verified: true,
      created_at: now,
      updated_at: now,
    },
  });

  // Student user
  const studentUser = await prisma.users.upsert({
    where: { id: 'student1' },
    update: {},
    create: {
      id: 'student1',
      email: 'student@skool.com',
      username: 'student',
      password_hash: passwordHash,
      first_name: 'Student',
      last_name: 'User',
      role: UserRole.USER,
      email_verified: true,
      created_at: now,
      updated_at: now,
    },
  });

  console.log('Created users:', adminUser.username, teacherUser.username, studentUser.username);

  // Create communities
  const techCommunity = await prisma.communities.upsert({
    where: { id: 'tech' },
    update: {},
    create: {
      id: 'tech',
      name: 'Tech Community',
      slug: 'tech-community',
      description: 'A community for technology discussions and learning',
      is_public: true,
      owner_id: adminUser.id,
      member_count: 0,
      created_at: now,
      updated_at: now,
    },
  });

  const learningCommunity = await prisma.communities.upsert({
    where: { id: 'learning' },
    update: {},
    create: {
      id: 'learning',
      name: 'Learning Community',
      slug: 'learning-community',
      description: 'A community focused on education and skill development',
      is_public: true,
      owner_id: teacherUser.id,
      member_count: 0,
      created_at: now,
      updated_at: now,
    },
  });

  // Add users to communities
  await prisma.community_members.upsert({
    where: {
      community_id_user_id: {
        community_id: techCommunity.id,
        user_id: adminUser.id,
      },
    },
    update: { role: 'owner' },
    create: {
      id: 'member1',
      community_id: techCommunity.id,
      user_id: adminUser.id,
      role: 'owner',
      status: 'active',
      points: 0,
      level: 1,
      joined_at: now,
    },
  });

  await prisma.community_members.upsert({
    where: {
      community_id_user_id: {
        community_id: techCommunity.id,
        user_id: teacherUser.id,
      },
    },
    update: { role: 'member' },
    create: {
      id: 'member2',
      community_id: techCommunity.id,
      user_id: teacherUser.id,
      role: 'member',
      status: 'active',
      points: 0,
      level: 1,
      joined_at: now,
    },
  });

  await prisma.community_members.upsert({
    where: {
      community_id_user_id: {
        community_id: learningCommunity.id,
        user_id: teacherUser.id,
      },
    },
    update: { role: 'owner' },
    create: {
      id: 'member3',
      community_id: learningCommunity.id,
      user_id: teacherUser.id,
      role: 'owner',
      status: 'active',
      points: 0,
      level: 1,
      joined_at: now,
    },
  });

  await prisma.community_members.upsert({
    where: {
      community_id_user_id: {
        community_id: learningCommunity.id,
        user_id: studentUser.id,
      },
    },
    update: { role: 'member' },
    create: {
      id: 'member4',
      community_id: learningCommunity.id,
      user_id: studentUser.id,
      role: 'member',
      status: 'active',
      points: 0,
      level: 1,
      joined_at: now,
    },
  });

  console.log('Created communities and memberships');

  // Create categories for communities
  const techCategory = await prisma.categories.upsert({
    where: { id: 'tech-general' },
    update: {},
    create: {
      id: 'tech-general',
      community_id: techCommunity.id,
      name: 'General',
      description: 'General technology discussions',
      position: 0,
      is_locked: false,
      created_at: now,
    },
  });

  const learningCategory = await prisma.categories.upsert({
    where: { id: 'learning-general' },
    update: {},
    create: {
      id: 'learning-general',
      community_id: learningCommunity.id,
      name: 'General',
      description: 'General learning discussions',
      position: 0,
      is_locked: false,
      created_at: now,
    },
  });

  // Create posts
  const posts = [
    {
      id: 'post1',
      title: 'Welcome to Tech Community',
      content: 'This is a welcome post for our technology community. Feel free to share your tech insights!',
      author_id: adminUser.id,
      community_id: techCommunity.id,
      category_id: techCategory.id,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      is_pinned: false,
      is_locked: false,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'post2',
      title: 'Learning Resources Available',
      content: 'Check out our collection of learning resources and courses designed to help you grow.',
      author_id: teacherUser.id,
      community_id: learningCommunity.id,
      category_id: learningCategory.id,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      is_pinned: false,
      is_locked: false,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'post3',
      title: 'New Programming Language Trends',
      content: 'What programming languages are you excited about this year? Share your thoughts!',
      author_id: teacherUser.id,
      community_id: techCommunity.id,
      category_id: techCategory.id,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      is_pinned: false,
      is_locked: false,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'post4',
      title: 'Study Tips for Beginners',
      content: 'Here are some effective study tips for those just starting their learning journey.',
      author_id: studentUser.id,
      community_id: learningCommunity.id,
      category_id: learningCategory.id,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      is_pinned: false,
      is_locked: false,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'post5',
      title: 'Community Guidelines',
      content: 'Please review our community guidelines to ensure a positive experience for everyone.',
      author_id: adminUser.id,
      community_id: techCommunity.id,
      category_id: techCategory.id,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      is_pinned: true,
      is_locked: false,
      created_at: now,
      updated_at: now,
    },
  ];

  for (const post of posts) {
    await prisma.posts.upsert({
      where: { id: post.id },
      update: post,
      create: post,
    });
  }

  console.log('Created 5 posts');

  // Create course with module
  const course = await prisma.courses.upsert({
    where: { id: 'course1' },
    update: {},
    create: {
      id: 'course1',
      title: 'Intro Course',
      description: 'An introductory course covering fundamental concepts',
      instructor_id: teacherUser.id,
      community_id: learningCommunity.id,
      is_published: true,
      price: 0,
      difficulty: CourseDifficulty.BEGINNER,
      enrollment_count: 0,
      position: 0,
      created_at: now,
      updated_at: now,
    },
  });

  const module = await prisma.course_modules.upsert({
    where: { id: 'module1' },
    update: {},
    create: {
      id: 'module1',
      title: 'Introduction Module',
      description: 'Getting started with the basics',
      course_id: course.id,
      position: 1,
      created_at: now,
    },
  });

  console.log('Created course and module:', course.title, module.title);

  // Create achievements
  const achievements = [
    {
      id: 'achievement1',
      name: 'first_post',
      description: 'Create your first post',
      icon: '✍️',
      category: 'posting',
      points: 10,
      criteria: { type: 'posts_created', target: 1 },
      maxLevel: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'achievement2',
      name: 'prolific_poster',
      description: 'Create 100 posts',
      icon: '📝',
      category: 'posting',
      points: 100,
      criteria: { type: 'posts_created', target: 100 },
      maxLevel: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'achievement3',
      name: 'helpful_member',
      description: 'Receive 50 likes on your posts',
      icon: '👍',
      category: 'engagement',
      points: 50,
      criteria: { type: 'likes_received', target: 50 },
      maxLevel: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'achievement4',
      name: 'streak_starter',
      description: 'Maintain a 7-day login streak',
      icon: '🔥',
      category: 'streak',
      points: 30,
      criteria: { type: 'login_streak', target: 7 },
      maxLevel: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'achievement5',
      name: 'knowledge_seeker',
      description: 'Complete 10 lessons',
      icon: '📚',
      category: 'learning',
      points: 50,
      criteria: { type: 'lessons_completed', target: 10 },
      maxLevel: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const achievement of achievements) {
    await prisma.achievements.upsert({
      where: { id: achievement.id },
      update: achievement,
      create: achievement,
    });
  }

  console.log('Created achievements');

  // Create rewards
  const rewards = [
    {
      id: 'reward1',
      name: 'Premium Badge',
      description: 'Get a premium badge for your profile',
      type: RewardType.PROFILE_BADGE,
      cost: 500,
      stock: null,
      is_active: true,
      created_at: now,
    },
    {
      id: 'reward2',
      name: 'Course Discount',
      description: '10% discount on any course',
      type: RewardType.DISCOUNT_CODE,
      cost: 200,
      stock: 100,
      is_active: true,
      created_at: now,
    },
    {
      id: 'reward3',
      name: 'Exclusive Content',
      description: 'Access to exclusive community content',
      type: RewardType.EXCLUSIVE_CONTENT,
      cost: 300,
      stock: null,
      is_active: true,
      created_at: now,
    },
    {
      id: 'reward4',
      name: 'Virtual Gift',
      description: 'Send a virtual gift to another member',
      type: RewardType.COURSE_ACCESS,
      cost: 50,
      stock: null,
      is_active: true,
      created_at: now,
    },
  ];

  await prisma.rewards.deleteMany({});
  for (const reward of rewards) {
    await prisma.rewards.create({
      data: reward,
    });
  }

  console.log('Created rewards');

  // Create some initial points for testing
  const pointsData = [
    { id: 'point1', userId: adminUser.id, amount: 150, type: PointType.POST_CREATED, reason: 'Creating test post', createdAt: now },
    { id: 'point2', userId: adminUser.id, amount: 25, type: PointType.COMMENT_CREATED, reason: 'Adding test comment', createdAt: now },
    { id: 'point3', userId: adminUser.id, amount: 5, type: PointType.DAILY_LOGIN, reason: 'Daily login bonus', createdAt: now },
    { id: 'point4', userId: teacherUser.id, amount: 100, type: PointType.POST_CREATED, reason: 'Creating test post', createdAt: now },
    { id: 'point5', userId: studentUser.id, amount: 75, type: PointType.POST_CREATED, reason: 'Creating test post', createdAt: now },
  ];

  for (const point of pointsData) {
    await prisma.points.create({
      data: point,
    });
  }

  console.log('Created initial points');

  // Create user levels
  const levels = [
    { id: 'level1', userId: adminUser.id, level: 3, experience: 1000, nextLevelXp: 1500, createdAt: now, updatedAt: now },
    { id: 'level2', userId: teacherUser.id, level: 2, experience: 500, nextLevelXp: 750, createdAt: now, updatedAt: now },
    { id: 'level3', userId: studentUser.id, level: 1, experience: 250, nextLevelXp: 500, createdAt: now, updatedAt: now },
  ];

  for (const level of levels) {
    await prisma.user_levels.upsert({
      where: { id: level.id },
      update: level,
      create: level,
    });
  }

  console.log('Created user levels');

  // Create streaks
  const streaks = [
    { id: 'streak1', userId: adminUser.id, type: StreakType.DAILY_LOGIN, currentDays: 7, bestDays: 14 },
    { id: 'streak2', userId: teacherUser.id, type: StreakType.DAILY_LOGIN, currentDays: 3, bestDays: 5 },
  ];

  for (const streak of streaks) {
    await prisma.streaks.upsert({
      where: { id: streak.id },
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