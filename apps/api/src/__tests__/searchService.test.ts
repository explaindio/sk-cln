import { SearchService } from '../services/searchService';

describe('SearchService', () => {
  let searchService: SearchService;

  beforeEach(() => {
    searchService = new SearchService();
  });

  describe('search', () => {
    it('should perform a basic search', async () => {
      // Mock the Elasticsearch client
      jest.spyOn(searchService as any, 'esClient', 'get').mockReturnValue({
        search: jest.fn().mockResolvedValue({
          hits: {
            hits: [
              {
                _id: '1',
                _index: 'posts',
                _score: 1.0,
                _source: {
                  id: '1',
                  title: 'Test Post',
                  content: 'This is a test post'
                }
              }
            ],
            total: { value: 1, relation: 'eq' }
          },
          aggregations: {},
          took: 5
        })
      });

      const results = await searchService.search({
        query: 'test',
        type: 'all',
        page: 1,
        limit: 20
      });

      expect(results.hits).toHaveLength(1);
      expect(results.total).toBe(1);
      expect(results.hits[0]._source.title).toBe('Test Post');
    });

    it('should handle search with filters', async () => {
      // Mock the Elasticsearch client
      jest.spyOn(searchService as any, 'esClient', 'get').mockReturnValue({
        search: jest.fn().mockResolvedValue({
          hits: {
            hits: [],
            total: { value: 0, relation: 'eq' }
          },
          aggregations: {},
          took: 2
        })
      });

      const results = await searchService.search({
        query: 'test',
        type: 'posts',
        page: 1,
        limit: 20,
        filters: {
          communityId: 'community-123',
          dateRange: {
            from: '2023-01-01',
            to: '2023-12-31'
          }
        }
      });

      expect(results.hits).toHaveLength(0);
      expect(results.total).toBe(0);
    });

    it('should handle phrase search', async () => {
      // Mock the Elasticsearch client
      jest.spyOn(searchService as any, 'esClient', 'get').mockReturnValue({
        search: jest.fn().mockResolvedValue({
          hits: {
            hits: [
              {
                _id: '1',
                _index: 'posts',
                _score: 1.5,
                _source: {
                  id: '1',
                  title: 'Test Post',
                  content: 'This is a test post'
                }
              }
            ],
            total: { value: 1, relation: 'eq' }
          },
          aggregations: {},
          took: 3
        })
      });

      const results = await searchService.search({
        query: 'test post',
        type: 'all',
        page: 1,
        limit: 20,
        phraseSearch: true
      });

      expect(results.hits).toHaveLength(1);
      expect(results.total).toBe(1);
    });

    it('should handle proximity search', async () => {
      // Mock the Elasticsearch client
      jest.spyOn(searchService as any, 'esClient', 'get').mockReturnValue({
        search: jest.fn().mockResolvedValue({
          hits: {
            hits: [
              {
                _id: '1',
                _index: 'posts',
                _score: 1.2,
                _source: {
                  id: '1',
                  title: 'Test Post',
                  content: 'This is a test post'
                }
              }
            ],
            total: { value: 1, relation: 'eq' }
          },
          aggregations: {},
          took: 4
        })
      });

      const results = await searchService.search({
        query: 'test post',
        type: 'all',
        page: 1,
        limit: 20,
        proximitySearch: {
          distance: 5,
          terms: ['test', 'post']
        }
      });

      expect(results.hits).toHaveLength(1);
      expect(results.total).toBe(1);
    });
  });

  describe('suggest', () => {
    it('should return search suggestions', async () => {
      // Mock the Elasticsearch client
      jest.spyOn(searchService as any, 'esClient', 'get').mockReturnValue({
        search: jest.fn().mockResolvedValue({
          aggregations: {
            suggestions: {
              buckets: [
                { key: 'test', doc_count: 5 },
                { key: 'testing', doc_count: 3 }
              ]
            }
          }
        })
      });

      const suggestions = await searchService.suggest(['posts'], 'tes', 'title', 10);

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].text).toBe('test');
      expect(suggestions[0].count).toBe(5);
    });

    it('should return empty array when no suggestions', async () => {
      // Mock the Elasticsearch client
      jest.spyOn(searchService as any, 'esClient', 'get').mockReturnValue({
        search: jest.fn().mockResolvedValue({
          aggregations: {
            suggestions: {
              buckets: []
            }
          }
        })
      });

      const suggestions = await searchService.suggest(['posts'], 'xyz', 'title', 10);

      expect(suggestions).toHaveLength(0);
    });
  });

  describe('findSimilar', () => {
    it('should find similar content', async () => {
      // Mock the Elasticsearch client
      jest.spyOn(searchService as any, 'esClient', 'get').mockReturnValue({
        search: jest.fn().mockResolvedValue({
          hits: {
            hits: [
              {
                _id: '2',
                _score: 0.8,
                _source: {
                  id: '2',
                  title: 'Similar Post',
                  content: 'This is a similar post'
                }
              }
            ],
            total: { value: 1, relation: 'eq' }
          },
          took: 3
        })
      });

      const results = await searchService.findSimilar({
        index: 'posts',
        id: '1',
        maxResults: 5
      });

      expect(results.hits).toHaveLength(1);
      expect(results.total).toBe(1);
      expect(results.hits[0]._source.title).toBe('Similar Post');
    });
  });

  describe('fallbackSearch', () => {
    it('should fallback to database search when Elasticsearch fails', async () => {
      // Mock the Elasticsearch client to throw an error
      jest.spyOn(searchService as any, 'esClient', 'get').mockReturnValue({
        search: jest.fn().mockRejectedValue(new Error('Elasticsearch unavailable'))
      });

      // Mock the searchPosts method
      const searchPostsSpy = jest.spyOn(searchService, 'searchPosts').mockResolvedValue({
        posts: [
          {
            id: '1',
            title: 'Test Post',
            content: 'This is a test post',
            authorId: 'user-1',
            communityId: 'community-1',
            categoryId: 'category-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            richTextContent: null,
            attachments: [],
            isPinned: false,
            isLocked: false,
            viewCount: 0,
            likeCount: 0,
            commentCount: 0,
            author: {
              id: 'user-1',
              username: 'testuser',
              avatarUrl: null
            },
            community: {
              id: 'community-1',
              name: 'Test Community',
              slug: 'test-community'
            },
            category: {
              id: 'category-1',
              name: 'Test Category'
            }
          }
        ],
        total: 1
      });

      const results = await searchService.search({
        query: 'test',
        type: 'posts',
        page: 1,
        limit: 20
      });

      expect(searchPostsSpy).toHaveBeenCalledWith('test', undefined, 1, 20);
      expect(results.hits).toHaveLength(1);
      expect(results.total).toBe(1);
    });
  });
});