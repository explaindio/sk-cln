import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Verifying data counts...');
    const users = await prisma.users.count();
    const posts = await prisma.posts.count();
    const communities = await prisma.communities.count();
    console.log('Users:', users);
    console.log('Posts:', posts);
    console.log('Communities:', communities);
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();