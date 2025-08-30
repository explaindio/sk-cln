import request from 'supertest';
import app from '../../index';
import { createTestUser, generateToken, cleanupDatabase, prisma } from '../helpers';

describe('Posts API Integration', () => {
  let authToken: string;
  let testUser: any;
  let testCommunity: any;
  let testCategory: any;

  beforeAll(async () => {
    await cleanupDatabase();

    // Create test user
    testUser = await createTestUser();
    authToken = generateToken(testUser.id, testUser.email);

    // Create test community and category
    testCommunity = await prisma.community.create({
      data: {
        name: 'Test Community',
        slug: 'test-community',
        description: 'A test community',
        ownerId: testUser.id
      }
    });

    testCategory = await prisma.category.create({
      data: {
        name: 'Test Category',
        communityId: testCommunity.id
      }
    });
  });

  afterAll(async () => {
   await cleanupDatabase();
 });

  describe('POST /api/posts', () => {
    it('should create a new post', async () => {
      const postData = {
        title: 'Test Post',
        content: 'This is a test post content',
        communityId: testCommunity.id,
        categoryId: testCategory.id
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        title: postData.title,
        content: postData.content,
        authorId: testUser.id,
        communityId: testCommunity.id,
        categoryId: testCategory.id
      });

      // Verify in database
      const post = await prisma.post.findUnique({
        where: { id: response.body.data.id }
      });

      expect(post).toBeTruthy();
      expect(post?.title).toBe(postData.title);
    });

    it('should create a post with rich text content and attachments', async () => {
      const postData = {
        title: 'Test Post with Rich Text',
        content: 'This is a test post content',
        communityId: testCommunity.id,
        categoryId: testCategory.id,
        richTextContent: '<p>This is <strong>rich</strong> text</p>',
        attachments: ['file1.jpg', 'file2.png']
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        title: postData.title,
        content: postData.content,
        authorId: testUser.id,
        communityId: testCommunity.id,
        categoryId: testCategory.id
      });

      // Verify in database
      const post = await prisma.post.findUnique({
        where: { id: response.body.data.id }
      });

      expect(post).toBeTruthy();
      expect(post?.richTextContent).toBe(postData.richTextContent);
      expect(post?.attachments).toEqual(postData.attachments);
    });
  });

  it('should require authentication', async () => {
    const postData = {
      title: 'Unauthorized Post',
      content: 'Should not be created',
      communityId: testCommunity.id,
      categoryId: testCategory.id
    };

    await request(app)
      .post('/api/posts')
      .send(postData)
      .expect(401);
  });

  it('should validate required fields', async () => {
    const invalidPost = {
      content: 'Missing title',
      communityId: testCommunity.id,
      categoryId: testCategory.id
    };

    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidPost)
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should require community membership', async () => {
    // Create a different community that user is not member of
    const otherCommunity = await prisma.community.create({
      data: {
        name: 'Other Community',
        slug: 'other-community',
        description: 'Another test community',
        ownerId: 'different-owner-id'
      }
    });

    const otherCategory = await prisma.category.create({
      data: {
        name: 'Other Category',
        communityId: otherCommunity.id
      }
    });

    const postData = {
      title: 'Post in non-member community',
      content: 'Should be rejected',
      communityId: otherCommunity.id,
      categoryId: otherCategory.id
    };

    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send(postData)
      .expect(403);

    expect(response.body.success).toBe(false);
  });

  describe('GET /api/posts/:id', () => {
    let testPost: any;

    beforeEach(async () => {
      testPost = await prisma.post.create({
        data: {
          title: 'Test Post for Get',
          content: 'Test content',
          authorId: testUser.id,
          communityId: testCommunity.id,
          categoryId: testCategory.id
        }
      });
    });

    it('should return post by id', async () => {
      const response = await request(app)
        .get(`/api/posts/${testPost.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testPost.id);
      expect(response.body.data.title).toBe(testPost.title);
      expect(response.body.data.author.id).toBe(testUser.id);
    });

    it('should return 404 for non-existent post', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/posts/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/posts/community/:communityId', () => {
    beforeEach(async () => {
      // Create test posts
      await prisma.post.createMany({
        data: [
          {
            title: 'Post 1',
            content: 'Content 1',
            authorId: testUser.id,
            communityId: testCommunity.id,
            categoryId: testCategory.id
          },
          {
            title: 'Post 2',
            content: 'Content 2',
            authorId: testUser.id,
            communityId: testCommunity.id,
            categoryId: testCategory.id
          }
        ]
      });
    });

    it('should return posts for community', async () => {
      const response = await request(app)
        .get(`/api/posts/community/${testCommunity.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((p: any) => p.communityId === testCommunity.id)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/posts/community/${testCommunity.id}?page=1&limit=1`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.totalPages).toBeDefined();
      expect(response.body.currentPage).toBe(1);
    });

    it('should return empty array for community with no posts', async () => {
      const emptyCommunity = await prisma.community.create({
        data: {
          name: 'Empty Community',
          slug: 'empty-community',
          description: 'No posts here',
          ownerId: testUser.id
        }
      });

      const response = await request(app)
        .get(`/api/posts/community/${emptyCommunity.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

  });

  describe('PUT /api/posts/:id', () => {
    let testPost: any;

    beforeEach(async () => {
      testPost = await prisma.post.create({
        data: {
          title: 'Original Title',
          content: 'Original Content',
          authorId: testUser.id,
          communityId: testCommunity.id,
          categoryId: testCategory.id
        }
      });
    });

    it('should update post with rich text content and attachments', async () => {
      const updates = {
        title: 'Updated Title',
        content: 'Updated Content',
        richTextContent: '<p>Updated <em>rich</em> text</p>',
        attachments: ['updated.jpg', 'updated.png']
      };

      const response = await request(app)
        .put(`/api/posts/${testPost.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updates.title);
      expect(response.body.data.content).toBe(updates.content);
      expect(response.body.data.richTextContent).toBe(updates.richTextContent);
      expect(response.body.data.attachments).toEqual(updates.attachments);
    });

    it('should update own post', async () => {
      const updates = {
        title: 'Updated Title',
        content: 'Updated Content'
      };

      const response = await request(app)
        .put(`/api/posts/${testPost.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updates.title);
      expect(response.body.data.content).toBe(updates.content);
    });

    it('should not update others post', async () => {
      const otherUser = await createTestUser({ email: 'other@test.com' });
      const otherPost = await prisma.post.create({
        data: {
          title: 'Other Post',
          content: 'Other Content',
          authorId: otherUser.id,
          communityId: testCommunity.id,
          categoryId: testCategory.id
        }
      });

      await request(app)
        .put(`/api/posts/${otherPost.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Hacked' })
        .expect(403);
    });

    it('should return 404 for non-existent post', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/posts/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Update' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('should delete own post', async () => {
      const testPost = await prisma.post.create({
        data: {
          title: 'To Delete',
          content: 'Will be deleted',
          authorId: testUser.id,
          communityId: testCommunity.id,
          categoryId: testCategory.id
        }
      });

      const response = await request(app)
        .delete(`/api/posts/${testPost.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify soft delete in database
      const deleted = await prisma.post.findUnique({
        where: { id: testPost.id }
      });

      expect(deleted?.deletedAt).toBeTruthy();
    });

    it('should not delete others post', async () => {
      const otherUser = await createTestUser({ email: 'other@test.com' });
      const otherPost = await prisma.post.create({
        data: {
          title: 'Other Post',
          content: 'Should not be deleted',
          authorId: otherUser.id,
          communityId: testCommunity.id,
          categoryId: testCategory.id
        }
      });

      await request(app)
        .delete(`/api/posts/${otherPost.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent post', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/posts/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
  describe('POST /api/posts/:id/report', () => {
    let testPost: any;

    beforeEach(async () => {
      testPost = await prisma.post.create({
        data: {
          title: 'Post to report',
          content: 'This post will be reported',
          authorId: testUser.id,
          communityId: testCommunity.id,
          categoryId: testCategory.id
        }
      });
    });

    it('should report a post', async () => {
      const reportData = {
        reason: 'Inappropriate content',
        details: 'This post contains inappropriate content'
      };

      const response = await request(app)
        .post(`/api/posts/${testPost.id}/report`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(reportData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Post reported successfully');
    });

    it('should return 404 for non-existent post', async () => {
      const fakeId = '00000000-0000-0000-0000-00000';
      const reportData = {
        reason: 'Inappropriate content'
      };

      const response = await request(app)
        .post(`/api/posts/${fakeId}/report`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(reportData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});