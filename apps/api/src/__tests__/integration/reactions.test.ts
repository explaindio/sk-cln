import request from 'supertest';
import app from '../../index';
import { createTestUser, generateToken, cleanupDatabase, prisma } from '../helpers';

describe('Reactions API Integration', () => {
  let authToken: string;
  let testUser: any;
  let testCommunity: any;
  let testCategory: any;
  let testPost: any;
  let testComment: any;

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

    // Create test comment
    testComment = await prisma.comment.create({
      data: {
        content: 'Test comment',
        postId: testPost.id,
        authorId: testUser.id
      }
    });
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  describe('POST /api/reactions/toggle', () => {
    it('should add a like reaction to a post', async () => {
      const reactionData = {
        type: 'like',
        targetType: 'post',
        targetId: testPost.id
      };

      const response = await request(app)
        .post('/api/reactions/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reactionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.action).toBe('added');

      // Verify in database
      const reaction = await prisma.reaction.findUnique({
        where: {
          userId_postId: {
            userId: testUser.id,
            postId: testPost.id
          }
        }
      });

      expect(reaction).toBeTruthy();
      expect(reaction?.type).toBe('like');

      // Verify post like count was incremented
      const post = await prisma.post.findUnique({
        where: { id: testPost.id }
      });

      expect(post?.likeCount).toBe(1);
    });

    it('should remove a like reaction from a post', async () => {
      // First add a reaction
      await prisma.reaction.create({
        data: {
          type: 'like',
          userId: testUser.id,
          postId: testPost.id
        }
      });

      // Update post like count
      await prisma.post.update({
        where: { id: testPost.id },
        data: { likeCount: 1 }
      });

      const reactionData = {
        type: 'like',
        targetType: 'post',
        targetId: testPost.id
      };

      const response = await request(app)
        .post('/api/reactions/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reactionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.action).toBe('removed');

      // Verify in database
      const reaction = await prisma.reaction.findUnique({
        where: {
          userId_postId: {
            userId: testUser.id,
            postId: testPost.id
          }
        }
      });

      expect(reaction).toBeFalsy();

      // Verify post like count was decremented
      const post = await prisma.post.findUnique({
        where: { id: testPost.id }
      });

      expect(post?.likeCount).toBe(0);
    });

    it('should add different reaction types to a post', async () => {
      const reactionTypes = ['love', 'laugh', 'wow', 'sad', 'angry'];

      for (const type of reactionTypes) {
        const reactionData = {
          type,
          targetType: 'post',
          targetId: testPost.id
        };

        const response = await request(app)
          .post('/api/reactions/toggle')
          .set('Authorization', `Bearer ${authToken}`)
          .send(reactionData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.action).toBe('added');

        // Verify in database
        const reaction = await prisma.reaction.findUnique({
          where: {
            userId_postId: {
              userId: testUser.id,
              postId: testPost.id
            }
          }
        });

        expect(reaction).toBeTruthy();
        expect(reaction?.type).toBe(type);

        // Clean up for next iteration
        await prisma.reaction.delete({
          where: {
            userId_postId: {
              userId: testUser.id,
              postId: testPost.id
            }
          }
        });
      }
    });

    it('should add a like reaction to a comment', async () => {
      const reactionData = {
        type: 'like',
        targetType: 'comment',
        targetId: testComment.id
      };

      const response = await request(app)
        .post('/api/reactions/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reactionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.action).toBe('added');

      // Verify in database
      const reaction = await prisma.reaction.findUnique({
        where: {
          userId_commentId: {
            userId: testUser.id,
            commentId: testComment.id
          }
        }
      });

      expect(reaction).toBeTruthy();
      expect(reaction?.type).toBe('like');

      // Verify comment like count was incremented
      const comment = await prisma.comment.findUnique({
        where: { id: testComment.id }
      });

      expect(comment?.likeCount).toBe(1);
    });

    it('should require authentication', async () => {
      const reactionData = {
        type: 'like',
        targetType: 'post',
        targetId: testPost.id
      };

      await request(app)
        .post('/api/reactions/toggle')
        .send(reactionData)
        .expect(401);
    });

    it('should validate reaction type', async () => {
      const reactionData = {
        type: 'invalid',
        targetType: 'post',
        targetId: testPost.id
      };

      const response = await request(app)
        .post('/api/reactions/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reactionData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate target type', async () => {
      const reactionData = {
        type: 'like',
        targetType: 'invalid',
        targetId: testPost.id
      };

      const response = await request(app)
        .post('/api/reactions/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reactionData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent post', async () => {
      const reactionData = {
        type: 'like',
        targetType: 'post',
        targetId: '0000-0000-0000-0000-00000'
      };

      const response = await request(app)
        .post('/api/reactions/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reactionData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent comment', async () => {
      const reactionData = {
        type: 'like',
        targetType: 'comment',
        targetId: '0000-0000-0000-0000-000000'
      };

      const response = await request(app)
        .post('/api/reactions/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reactionData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/reactions/:targetType/:targetId', () => {
    beforeEach(async () => {
      // Create test reactions
      await prisma.reaction.createMany({
        data: [
          {
            type: 'like',
            userId: testUser.id,
            postId: testPost.id
          },
          {
            type: 'love',
            userId: testUser.id,
            postId: testPost.id
          }
        ]
      });
    });

    it('should return reactions for a post', async () => {
      const response = await request(app)
        .get(`/api/reactions/post/${testPost.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.some((r: any) => r.type === 'like')).toBe(true);
      expect(response.body.data.some((r: any) => r.type === 'love')).toBe(true);
    });

    it('should return reactions for a comment', async () => {
      // Create a reaction for the comment
      await prisma.reaction.create({
        data: {
          type: 'wow',
          userId: testUser.id,
          commentId: testComment.id
        }
      });

      const response = await request(app)
        .get(`/api/reactions/comment/${testComment.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('wow');
    });

    it('should return empty array for target with no reactions', async () => {
      const emptyPost = await prisma.post.create({
        data: {
          title: 'Empty Post',
          content: 'No reactions here',
          authorId: testUser.id,
          communityId: testCommunity.id,
          categoryId: testCategory.id
        }
      });

      const response = await request(app)
        .get(`/api/reactions/post/${emptyPost.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/reactions/user/:targetType/:targetId', () => {
    beforeEach(async () => {
      // Create test reaction
      await prisma.reaction.create({
        data: {
          type: 'like',
          userId: testUser.id,
          postId: testPost.id
        }
      });
    });

    it('should return user reaction for a post', async () => {
      const response = await request(app)
        .get(`/api/reactions/user/post/${testPost.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeTruthy();
      expect(response.body.data.type).toBe('like');
    });

    it('should return null for user with no reaction on post', async () => {
      const otherUser = await createTestUser({ email: 'other@test.com' });
      const otherAuthToken = generateToken(otherUser.id, otherUser.email);

      const response = await request(app)
        .get(`/api/reactions/user/post/${testPost.id}`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });

    it('should return user reaction for a comment', async () => {
      // Create a reaction for the comment
      await prisma.reaction.create({
        data: {
          type: 'love',
          userId: testUser.id,
          commentId: testComment.id
        }
      });

      const response = await request(app)
        .get(`/api/reactions/user/comment/${testComment.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeTruthy();
      expect(response.body.data.type).toBe('love');
    });
  });

  describe('GET /api/reactions/types', () => {
    it('should return available reaction types', async () => {
      const response = await request(app)
        .get('/api/reactions/types')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check that each reaction type has required properties
      response.body.data.forEach((reactionType: any) => {
        expect(reactionType).toHaveProperty('type');
        expect(reactionType).toHaveProperty('emoji');
        expect(reactionType).toHaveProperty('label');
      });

      // Check for new reaction types
      const types = response.body.data.map((r: any) => r.type);
      expect(types).toContain('celebrate');
      expect(types).toContain('support');
      expect(types).toContain('insightful');
    });
  });

  describe('POST /api/reactions (comprehensive reaction system)', () => {
    it('should add a new reaction type', async () => {
      const reactionData = {
        type: 'celebrate',
        targetType: 'post',
        targetId: testPost.id
      };

      const response = await request(app)
        .post('/api/reactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reactionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.action).toBe('added');
      expect(response.body.data.newType).toBe('celebrate');

      // Verify in database
      const reaction = await prisma.reaction.findUnique({
        where: {
          userId_postId: {
            userId: testUser.id,
            postId: testPost.id
          }
        }
      });

      expect(reaction).toBeTruthy();
      expect(reaction?.type).toBe('celebrate');
    });

    it('should change reaction type when user reacts with different type', async () => {
      // First add a 'like' reaction
      await prisma.reaction.create({
        data: {
          type: 'like',
          userId: testUser.id,
          postId: testPost.id
        }
      });

      // Change to 'love' reaction
      const reactionData = {
        type: 'love',
        targetType: 'post',
        targetId: testPost.id
      };

      const response = await request(app)
        .post('/api/reactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reactionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.action).toBe('changed');
      expect(response.body.data.previousType).toBe('like');
      expect(response.body.data.newType).toBe('love');

      // Verify in database
      const reaction = await prisma.reaction.findUnique({
        where: {
          userId_postId: {
            userId: testUser.id,
            postId: testPost.id
          }
        }
      });

      expect(reaction).toBeTruthy();
      expect(reaction?.type).toBe('love');
    });

    it('should remove reaction when user reacts with same type', async () => {
      // First add a reaction
      await prisma.reaction.create({
        data: {
          type: 'support',
          userId: testUser.id,
          postId: testPost.id
        }
      });

      // React with same type to remove
      const reactionData = {
        type: 'support',
        targetType: 'post',
        targetId: testPost.id
      };

      const response = await request(app)
        .post('/api/reactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reactionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.action).toBe('removed');
      expect(response.body.data.previousType).toBe('support');

      // Verify in database
      const reaction = await prisma.reaction.findUnique({
        where: {
          userId_postId: {
            userId: testUser.id,
            postId: testPost.id
          }
        }
      });

      expect(reaction).toBeFalsy();
    });

    it('should work with all new reaction types', async () => {
      const newReactionTypes = ['celebrate', 'support', 'insightful'];

      for (const type of newReactionTypes) {
        const reactionData = {
          type,
          targetType: 'post',
          targetId: testPost.id
        };

        const response = await request(app)
          .post('/api/reactions')
          .set('Authorization', `Bearer ${authToken}`)
          .send(reactionData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.newType).toBe(type);

        // Verify in database
        const reaction = await prisma.reaction.findUnique({
          where: {
            userId_postId: {
              userId: testUser.id,
              postId: testPost.id
            }
          }
        });

        expect(reaction).toBeTruthy();
        expect(reaction?.type).toBe(type);

        // Clean up for next iteration
        await prisma.reaction.delete({
          where: {
            userId_postId: {
              userId: testUser.id,
              postId: testPost.id
            }
          }
        });
      }
    });
  });

  describe('GET /api/reactions/stats/:targetType/:targetId', () => {
    beforeEach(async () => {
      // Create test reactions with different types
      const otherUser1 = await createTestUser({ email: 'user1@test.com' });
      const otherUser2 = await createTestUser({ email: 'user2@test.com' });

      await prisma.reaction.createMany({
        data: [
          {
            type: 'like',
            userId: testUser.id,
            postId: testPost.id
          },
          {
            type: 'like',
            userId: otherUser1.id,
            postId: testPost.id
          },
          {
            type: 'love',
            userId: otherUser2.id,
            postId: testPost.id
          },
          {
            type: 'celebrate',
            userId: otherUser1.id,
            postId: testPost.id
          }
        ]
      });
    });

    it('should return reaction statistics for a post', async () => {
      const response = await request(app)
        .get(`/api/reactions/stats/post/${testPost.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('like', 2);
      expect(response.body.data).toHaveProperty('love', 1);
      expect(response.body.data).toHaveProperty('celebrate', 1);
      expect(response.body.data).toHaveProperty('total', 4);
    });

    it('should return empty stats for target with no reactions', async () => {
      const emptyPost = await prisma.post.create({
        data: {
          title: 'Empty Post',
          content: 'No reactions here',
          authorId: testUser.id,
          communityId: testCommunity.id,
          categoryId: testCategory.id
        }
      });

      const response = await request(app)
        .get(`/api/reactions/stats/post/${emptyPost.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total', 0);
    });
  });

  describe('GET /api/reactions/:targetType/:targetId (enhanced with grouping)', () => {
    beforeEach(async () => {
      // Create test reactions with different types
      const otherUser1 = await createTestUser({ email: 'grouped1@test.com' });
      const otherUser2 = await createTestUser({ email: 'grouped2@test.com' });

      await prisma.reaction.createMany({
        data: [
          {
            type: 'like',
            userId: testUser.id,
            postId: testPost.id
          },
          {
            type: 'love',
            userId: otherUser1.id,
            postId: testPost.id
          },
          {
            type: 'like',
            userId: otherUser2.id,
            postId: testPost.id
          }
        ]
      });
    });

    it('should return reactions grouped by type', async () => {
      const response = await request(app)
        .get(`/api/reactions/post/${testPost.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('byType');
      expect(response.body.data).toHaveProperty('total', 3);
      expect(response.body.data).toHaveProperty('summary');

      // Check grouping by type
      expect(response.body.data.byType).toHaveProperty('like');
      expect(response.body.data.byType).toHaveProperty('love');
      expect(response.body.data.byType.like).toHaveLength(2);
      expect(response.body.data.byType.love).toHaveLength(1);

      // Check summary stats
      expect(response.body.data.summary).toHaveProperty('like', 2);
      expect(response.body.data.summary).toHaveProperty('love', 1);
      expect(response.body.data.summary).toHaveProperty('total', 3);
    });
  });

  describe('Validation Tests for New Reaction Types', () => {
    it('should validate new reaction types', async () => {
      const reactionData = {
        type: 'invalidtype',
        targetType: 'post',
        targetId: testPost.id
      };

      const response = await request(app)
        .post('/api/reactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reactionData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should accept all valid reaction types', async () => {
      const validTypes = ['like', 'love', 'laugh', 'angry', 'sad', 'celebrate', 'support', 'insightful'];

      for (const type of validTypes) {
        const reactionData = {
          type,
          targetType: 'post',
          targetId: testPost.id
        };

        const response = await request(app)
          .post('/api/reactions')
          .set('Authorization', `Bearer ${authToken}`)
          .send(reactionData)
          .expect(200);

        expect(response.body.success).toBe(true);
        
        // Clean up after each test
        await prisma.reaction.deleteMany({
          where: {
            userId: testUser.id,
            postId: testPost.id
          }
        });
      }
    });
  });
});