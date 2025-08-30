const { PrismaClient } = require('./src/generated/prisma');

async function createCategory() {
  const prisma = new PrismaClient();

  try {
    const category = await prisma.category.create({
      data: {
        name: 'General Discussion',
        description: 'General discussion and announcements',
        communityId: '2d676c2f-a065-4d98-8714-924a5f6929ca',
        position: 0,
      },
    });

    console.log('Created category:', category);
  } catch (error) {
    console.error('Error creating category:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createCategory();