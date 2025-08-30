import request from 'supertest';
import app from '../../index';
import { createTestUser, generateToken, cleanupDatabase, prisma } from '../helpers';

describe('Comments API Integration', () => {
  let authToken: string;
  let testUser: any;
  let testCommunity: any;
  let testCategory: any;
  let testPost: any;

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

    // Create test post
    testPost = await prisma.post.create({
      data: {
        title: 'Test Post',
        content: 'Test content',
        authorId: testUser.id,
        communityId: testCommunity.id,
        categoryId: testCategory.id
      }
    });
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  describe('POST /api/comments', () => {
    it('should create a new comment', async () => {
      const commentData = {
        content: 'This is a test comment',
        postId: testPost.id
      };

      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        content: commentData.content,
        postId: testPost.id,
        authorId: testUser.id
      });

      // Verify in database
      const comment = await prisma.comment.findUnique({
        where: { id: response.body.data.id }
      });

      expect(comment).toBeTruthy();
      expect(comment?.content).toBe(commentData.content);
    });

    it('should create a comment with rich text content and attachments', async () => {
      const commentData = {
        content: 'This is a test comment',
        postId: testPost.id,
        richTextContent: '<p>This is <strong>rich</strong> text</p>',
        attachments: ['file1.jpg', 'file2.png']
      };

      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        content: commentData.content,
        postId: testPost.id,
        authorId: testUser.id
      });

      // Verify in database
      const comment = await prisma.comment.findUnique({
        where: { id: response.body.data.id }
      });

      expect(comment).toBeTruthy();
      expect(comment?.richTextContent).toBe(commentData.richTextContent);
      expect(comment?.attachments).toEqual(commentData.attachments);
    });

    it('should require authentication', async () => {
      const commentData = {
        content: 'Unauthorized comment',
        postId: testPost.id
      };

      await request(app)
        .post('/api/comments')
        .send(commentData)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const invalidComment = {
        postId: testPost.id
      };

      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidComment)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent post', async () => {
      const commentData = {
        content: 'Comment on non-existent post',
        postId: '00000-0000-0000-0000-0000'
      };

      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/comments/:id/reply', () => {
    let parentComment: any;

    beforeEach(async () => {
      parentComment = await prisma.comment.create({
        data: {
          content: 'Parent comment',
          postId: testPost.id,
          authorId: testUser.id
        }
      });
    });

    it('should create a reply to a comment', async () => {
      const replyData = {
        content: 'This is a reply',
        postId: testPost.id
      };

      const response = await request(app)
        .post(`/api/comments/${parentComment.id}/reply`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(replyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        content: replyData.content,
        postId: testPost.id,
        authorId: testUser.id,
        parentId: parentComment.id
      });

      // Verify in database
      const reply = await prisma.comment.findUnique({
        where: { id: response.body.data.id }
      });

      expect(reply).toBeTruthy();
      expect(reply?.parentId).toBe(parentComment.id);
    });

    it('should return 404 for non-existent parent comment', async () => {
      const replyData = {
        content: 'Reply to non-existent comment',
        postId: testPost.id
      };

      const fakeId = '00000-0000-0000-0000-00000000';
      const response = await request(app)
        .post(`/api/comments/${fakeId}/reply`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(replyData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/comments/post/:postId', () => {
    beforeEach(async () => {
      // Create test comments
      await prisma.comment.createMany({
        data: [
          {
            content: 'Comment 1',
            postId: testPost.id,
            authorId: testUser.id
          },
          {
            content: 'Comment 2',
            postId: testPost.id,
            authorId: testUser.id
          }
        ]
      });
    });

    it('should return comments for post', async () => {
      const response = await request(app)
        .get(`/api/comments/post/${testPost.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((c: any) => c.postId === testPost.id)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/comments/post/${testPost.id}?page=1&limit=1`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.totalPages).toBeDefined();
      expect(response.body.currentPage).toBe(1);
    });

    it('should return empty array for post with no comments', async () => {
      const emptyPost = await prisma.post.create({
        data: {
          title: 'Empty Post',
          content: 'No comments here',
          authorId: testUser.id,
          communityId: testCommunity.id,
          categoryId: testCategory.id
        }
      });

      const response = await request(app)
        .get(`/api/comments/post/${emptyPost.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('PUT /api/comments/:id', () => {
    let testComment: any;

    beforeEach(async () => {
      testComment = await prisma.comment.create({
        data: {
          content: 'Original Comment',
          postId: testPost.id,
          authorId: testUser.id
        }
      });
    });

    it('should update own comment', async () => {
      const updates = {
        content: 'Updated Comment',
        richTextContent: '<p>Updated <em>rich</em> text</p>',
        attachments: ['updated.jpg']
      };

      const response = await request(app)
        .put(`/api/comments/${testComment.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(updates.content);
      expect(response.body.data.richTextContent).toBe(updates.richTextContent);
      expect(response.body.data.attachments).toEqual(updates.attachments);
    });

    it('should not update others comment', async () => {
      const otherUser = await createTestUser({ email: 'other@test.com' });
      const otherAuthToken = generateToken(otherUser.id, otherUser.email);
      const otherComment = await prisma.comment.create({
        data: {
          content: 'Other Comment',
          postId: testPost.id,
          authorId: otherUser.id
        }
      });

      await request(app)
        .put(`/api/comments/${otherComment.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Hacked' })
        .expect(403);
    });

    it('should return 404 for non-existent comment', async () => {
      const fakeId = '0000-0000-0000-0000-00000000';
      const response = await request(app)
        .put(`/api/comments/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Update' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/comments/:id', () => {
    it('should delete own comment', async () => {
      const testComment = await prisma.comment.create({
        data: {
          content: 'To Delete',
          postId: testPost.id,
          authorId: testUser.id
        }
      });

      const response = await request(app)
        .delete(`/api/comments/${testComment.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify soft delete in database
      const deleted = await prisma.comment.findUnique({
        where: { id: testComment.id }
      });

      expect(deleted?.deletedAt).toBeTruthy();
      expect(deleted?.content).toBe('[Deleted]');
    });

    it('should not delete others comment', async () => {
      const otherUser = await createTestUser({ email: 'other@test.com' });
      const otherComment = await prisma.comment.create({
        data: {
          content: 'Should not be deleted',
          postId: testPost.id,
          authorId: otherUser.id
        }
      });

      await request(app)
        .delete(`/api/comments/${otherComment.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent comment', async () => {
      const fakeId = '0000-0000-0000-0000-00000000';
      const response = await request(app)
        .delete(`/api/comments/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/comments/:id/report', () => {
    let testComment: any;

    beforeEach(async () => {
      testComment = await prisma.comment.create({
        data: {
          content: 'Comment to report',
          postId: testPost.id,
          authorId: testUser.id
        }
      });
    });

    it('should report a comment', async () => {
      const reportData = {
        reason: 'Inappropriate content',
        details: 'This comment contains inappropriate content'
      };

      const response = await request(app)
        .post(`/api/comments/${testComment.id}/report`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(reportData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Comment reported successfully');
    });

    it('should return 404 for non-existent comment', async () => {
      const fakeId = '0000-0000-0000-0000-00000000';
      const reportData = {
        reason: 'Inappropriate content'
      };

      const response = await request(app)
        .post(`/api/comments/${fakeId}/report`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(reportData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});