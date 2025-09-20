import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyCounts() {
  try {
    // Check what models are available
    console.log('📊 Available Prisma models:', Object.keys(prisma).filter(key => !key.startsWith('$') && !key.startsWith('_')));

    const userCount = await prisma.users.count();
    const postCount = await prisma.posts.count();
    const communityCount = await prisma.communities.count();

    console.log('📊 Database Counts Verification:');
    console.log(`👥 Users: ${userCount}`);
    console.log(`📝 Posts: ${postCount}`);
    console.log(`🏘️ Communities: ${communityCount}`);

    // Verify we have seeded data
    if (userCount >= 3) {
      console.log('✅ User count looks good (seeded data present)');
    } else {
      console.log('⚠️ User count seems low - expected at least 3 from seed');
    }

    if (postCount >= 5) {
      console.log('✅ Post count looks good (seeded data present)');
    } else {
      console.log('⚠️ Post count seems low - expected at least 5 from seed');
    }

    if (communityCount >= 2) {
      console.log('✅ Community count looks good (seeded data present)');
    } else {
      console.log('⚠️ Community count seems low - expected at least 2 from seed');
    }

  } catch (error) {
    console.error('❌ Error verifying database counts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCounts();