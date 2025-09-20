import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCRUDOperations() {
  console.log('🧪 Starting CRUD operations test...');

  try {
    // CREATE operations
    console.log('\n📝 CREATE Operations:');

    // Create a new User
    const now = new Date();
    const newUser = await prisma.users.create({
      data: {
        id: 'test-user-crud',
        email: 'test-crud@skool.com',
        username: 'test-crud-user',
        password_hash: 'hashedpassword123',
        first_name: 'Test',
        last_name: 'User',
        role: 'USER',
        email_verified: true,
        created_at: now,
        updated_at: now,
        is_active: true,
      },
    });
    console.log(`✅ Created User: ${newUser.username} (${newUser.id})`);

    // Create a new Community (using the new user as owner)
    const newCommunity = await prisma.communities.create({
      data: {
        id: 'test-community-crud',
        name: 'Test Community CRUD',
        slug: 'test-community-crud',
        description: 'A test community for CRUD operations',
        is_public: true,
        owner_id: newUser.id,
        member_count: 1,
        created_at: now,
        updated_at: now,
      },
    });
    console.log(`✅ Created Community: ${newCommunity.name} (${newCommunity.id})`);

    // Get existing admin user for post creation (from seed data)
    const adminUser = await prisma.users.findUnique({
      where: { id: 'admin1' },
    });

    if (!adminUser) {
      throw new Error('Admin user not found from seed data');
    }

    // Create a new Post in the new community
    const newPost = await prisma.posts.create({
      data: {
        id: 'test-post-crud',
        title: 'Test Post for CRUD Operations',
        content: 'This is a test post to verify CRUD operations are working correctly.',
        author_id: adminUser.id,
        community_id: newCommunity.id,
        category_id: 'tech-general', // Using existing category from seed
        created_at: now,
        updated_at: now,
        is_pinned: false,
        is_locked: false,
        view_count: 0,
        like_count: 0,
        comment_count: 0,
      },
    });
    console.log(`✅ Created Post: ${newPost.title} (${newPost.id})`);

    // READ operations
    console.log('\n📖 READ Operations:');

    // Read all users
    const users = await prisma.users.findMany({
      take: 5,
    });
    console.log(`✅ Found ${users.length} users (showing first 5)`);
    users.forEach(user => console.log(`  - ${user.username} (${user.email})`));

    // Read the created user specifically
    const foundUser = await prisma.users.findUnique({
      where: { id: newUser.id },
    });
    console.log(`✅ Found created user: ${foundUser?.username}`);

    // Read posts from the new community
    const communityPosts = await prisma.posts.findMany({
      where: { community_id: newCommunity.id },
    });
    console.log(`✅ Found ${communityPosts.length} posts in test community`);

    // UPDATE operations
    console.log('\n📝 UPDATE Operations:');

    // Update user points (assuming user_levels exists)
    const updatedUser = await prisma.users.update({
      where: { id: newUser.id },
      data: {
        last_active: new Date(),
      },
    });
    console.log(`✅ Updated user last_active timestamp: ${updatedUser.last_active}`);

    // Update community member count
    const updatedCommunity = await prisma.communities.update({
      where: { id: newCommunity.id },
      data: {
        member_count: 2,
      },
    });
    console.log(`✅ Updated community member count: ${updatedCommunity.member_count}`);

    // Update post view count
    const updatedPost = await prisma.posts.update({
      where: { id: newPost.id },
      data: {
        view_count: 10,
      },
    });
    console.log(`✅ Updated post view count: ${updatedPost.view_count}`);

    // DELETE operations
    console.log('\n🗑️ DELETE Operations:');

    // Delete the post first (due to foreign key constraints)
    await prisma.posts.delete({
      where: { id: newPost.id },
    });
    console.log(`✅ Deleted post: ${newPost.title}`);

    // Delete the community
    await prisma.communities.delete({
      where: { id: newCommunity.id },
    });
    console.log(`✅ Deleted community: ${newCommunity.name}`);

    // Delete the user
    await prisma.users.delete({
      where: { id: newUser.id },
    });
    console.log(`✅ Deleted user: ${newUser.username}`);

    // VERIFY deletion
    console.log('\n🔍 VERIFICATION:');

    const verifyUser = await prisma.users.findUnique({
      where: { id: newUser.id },
    });
    const verifyCommunity = await prisma.communities.findUnique({
      where: { id: newCommunity.id },
    });
    const verifyPost = await prisma.posts.findUnique({
      where: { id: newPost.id },
    });

    if (!verifyUser && !verifyCommunity && !verifyPost) {
      console.log('✅ All deletions verified - records no longer exist');
    } else {
      console.log('❌ Deletion verification failed');
    }

    console.log('\n🎉 CRUD operations test completed successfully!');
    console.log('✅ All CREATE, READ, UPDATE, DELETE operations working correctly');

  } catch (error) {
    console.error('❌ Error during CRUD operations test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCRUDOperations()
  .catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
  });