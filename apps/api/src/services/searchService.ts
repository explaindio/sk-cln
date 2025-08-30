import { prisma } from '../lib/prisma';
import { Client } from '@elastic/elasticsearch';

// Initialize Elasticsearch client
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  maxRetries: 5,
 requestTimeout: 30000,
});

// Index names mapping
const INDEX_NAMES = {
  posts: 'posts',
  comments: 'comments',
  users: 'users',
  communities: 'communities',
  courses: 'courses'
};

interface SearchOptions {
  query: string;
  type: string;
  page: number;
  limit: number;
  sortBy?: string;
 sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  searchFields?: string[]; // Specific fields to search in
  searchOperator?: 'and' | 'or'; // Search operator
  phraseSearch?: boolean; // Exact phrase search
  proximitySearch?: { distance: number; terms: string[] }; // Proximity search
}

interface SearchResults {
  hits: any[];
  total: number;
  aggregations?: any;
  took: number;
}

export class SearchService {
  async searchPosts(query: string, communityId?: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (communityId) {
      where.communityId = communityId;
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    return { posts, total };
  }

  async searchUsers(query: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { username: { contains: query, mode: 'insensitive' as const } },
        { firstName: { contains: query, mode: 'insensitive' as const } },
        { lastName: { contains: query, mode: 'insensitive' as const } },
      ],
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  // Full-text search across multiple indices with improved ranking and advanced options
  async search(options: SearchOptions): Promise<SearchResults> {
    const {
      query,
      type,
      page = 1,
      limit = 20,
      sortBy,
      sortOrder = 'desc',
      filters = {},
      searchFields,
      searchOperator = 'or',
      phraseSearch = false,
      proximitySearch
    } = options;

    const from = (page - 1) * limit;
    const indices = type === 'all' 
      ? Object.values(INDEX_NAMES)
      : [INDEX_NAMES[type as keyof typeof INDEX_NAMES] || type];

    // Build Elasticsearch query with improved scoring and advanced options
    const esQuery: any = {
      bool: {
        filter: [],
        // Boost more recent content
        should: [
          {
            range: {
              createdAt: {
                gte: "now-7d/d",
                boost: 2.0
              }
            }
          },
          {
            range: {
              createdAt: {
                gte: "now-30d/d",
                boost: 1.5
              }
            }
          }
        ]
      }
    };

    // Handle different search types
    if (query) {
      if (phraseSearch) {
        // Exact phrase search
        esQuery.bool.must = [
          {
            match_phrase: {
              content: {
                query: query,
                slop: 0
              }
            }
          }
        ];
      } else if (proximitySearch) {
        // Proximity search
        esQuery.bool.must = [
          {
            match_phrase: {
              content: {
                query: proximitySearch.terms.join(' '),
                slop: proximitySearch.distance
              }
            }
          }
        ];
      } else {
        // Regular search with configurable fields and operator
        const searchFieldsToUse = searchFields && searchFields.length > 0 
          ? searchFields 
          : [
              'title^3',
              'name^3',
              'username^3',
              'firstName^2',
              'lastName^2',
              'description^2',
              'content',
              'tags'
            ];

        esQuery.bool.must = [
          {
            multi_match: {
              query,
              fields: searchFieldsToUse,
              type: 'best_fields',
              fuzziness: 'AUTO',
              operator: searchOperator
            }
          }
        ];
      }
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Handle range filters (e.g., date ranges)
        if (key === 'dateRange' && typeof value === 'object') {
          const dateRange = value as { from?: string; to?: string };
          if (dateRange.from || dateRange.to) {
            const rangeFilter: any = { range: { createdAt: {} } };
            if (dateRange.from) rangeFilter.range.createdAt.gte = dateRange.from;
            if (dateRange.to) rangeFilter.range.createdAt.lte = dateRange.to;
            esQuery.bool.filter.push(rangeFilter);
          }
        } 
        // Handle array filters (e.g., tags, categories)
        else if (Array.isArray(value)) {
          if (value.length > 0) {
            esQuery.bool.filter.push({
              terms: { [key]: value }
            });
          }
        }
        // Handle boolean filters
        else if (typeof value === 'boolean') {
          esQuery.bool.filter.push({
            term: { [key]: value }
          });
        }
        // Handle numeric range filters
        else if (key.endsWith('Range') && typeof value === 'object') {
          const rangeKey = key.replace('Range', '');
          const rangeValue = value as { min?: number; max?: number };
          if (rangeValue.min !== undefined || rangeValue.max !== undefined) {
            const rangeFilter: any = { range: { [rangeKey]: {} } };
            if (rangeValue.min !== undefined) rangeFilter.range[rangeKey].gte = rangeValue.min;
            if (rangeValue.max !== undefined) rangeFilter.range[rangeKey].lte = rangeValue.max;
            esQuery.bool.filter.push(rangeFilter);
          }
        }
        // Handle regular term filters
        else {
          esQuery.bool.filter.push({
            term: { [key]: value }
          });
        }
      }
    });

    // Build sort with better relevance scoring
    const sort: any[] = [];
    if (sortBy) {
      sort.push({ [sortBy]: { order: sortOrder } });
    } else {
      // Default sort by relevance score
      sort.push({ _score: { order: 'desc' } });
      // Secondary sort by creation date for content with same relevance
      sort.push({ createdAt: { order: 'desc' } });
    }

    try {
      // Perform search across indices
      const response: any = await esClient.search({
        index: indices,
        body: {
          from,
          size: limit,
          query: esQuery,
          sort,
          aggs: {
            types: {
              terms: { field: '_index' }
            },
            communities: {
              terms: { field: 'communityId.keyword', size: 10 }
            },
            tags: {
              terms: { field: 'tags.keyword', size: 20 }
            },
            date_histogram: {
              date_histogram: {
                field: 'createdAt',
                calendar_interval: '1d'
              }
            }
          },
          highlight: {
            fields: {
              title: {},
              content: {},
              description: {}
            }
          }
        }
      });

      return {
        hits: response.hits.hits.map((hit: any) => ({
          _id: hit._id,
          _index: hit._index,
          _score: hit._score,
          _source: hit._source,
          highlight: hit.highlight
        })),
        total: typeof response.hits.total === 'number' 
          ? response.hits.total 
          : response.hits.total.value,
        aggregations: response.aggregations,
        took: response.took
      };
    } catch (error) {
      console.error('Elasticsearch search error:', error);
      // Fallback to database search
      return this.fallbackSearch(options);
    }
  }

  // Fallback to database search if Elasticsearch fails
  private async fallbackSearch(options: SearchOptions): Promise<SearchResults> {
    const { query, type, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    let results: any[] = [];
    let total = 0;

    if (type === 'all' || type === 'posts') {
      const postResults = await this.searchPosts(query, undefined, page, limit);
      results = results.concat(postResults.posts.map(post => ({
        _source: {
          ...post,
          type: 'post'
        }
      })));
      total += postResults.total;
    }

    if (type === 'all' || type === 'users') {
      const userResults = await this.searchUsers(query, page, limit);
      results = results.concat(userResults.users.map(user => ({
        _source: {
          ...user,
          type: 'user'
        }
      })));
      total += userResults.total;
    }

    return {
      hits: results,
      total,
      took: 0
    };
  }

  // Enhanced search suggestions/autocomplete with popularity weighting
  async suggest(indices: string[], query: string, field: string, size: number = 10) {
    try {
      const response: any = await esClient.search({
        index: indices,
        body: {
          size: 0,
          aggs: {
            suggestions: {
              terms: {
                field: `${field}.keyword`,
                size,
                include: `${query}.*`,
                // Boost popular terms
                order: { "_count": "desc" }
              }
            }
          }
        }
      });

      // Extract term suggestions
      const termSuggestions = response.aggregations.suggestions.buckets.map((bucket: any) => ({
        text: bucket.key,
        count: bucket.doc_count,
        type: 'term'
      }));

      // Sort by count (popularity) and limit to size
      return termSuggestions
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, size);
    } catch (error) {
      console.error('Elasticsearch suggest error:', error);
      return [];
    }
  }

  // Find similar content
  async findSimilar(options: { index: string; id: string; maxResults?: number }) {
    const { index, id, maxResults = 5 } = options;
    
    try {
      const response: any = await esClient.search({
        index: INDEX_NAMES[index as keyof typeof INDEX_NAMES] || index,
        body: {
          query: {
            more_like_this: {
              fields: ['title', 'content', 'description', 'tags'],
              like: [{ _id: id }],
              min_term_freq: 1,
              max_query_terms: 12,
              min_doc_freq: 1
            }
          },
          size: maxResults
        }
      });

      return {
        hits: response.hits.hits.map((hit: any) => ({
          _id: hit._id,
          _score: hit._score,
          _source: hit._source
        })),
        total: typeof response.hits.total === 'number' 
          ? response.hits.total 
          : response.hits.total.value,
        took: response.took
      };
    } catch (error) {
      console.error('Elasticsearch find similar error:', error);
      return { hits: [], total: 0, took: 0 };
    }
  }

  // Sync all indices
  async syncAll() {
    try {
      // Sync posts
      await this.syncPosts();
      // Sync users
      await this.syncUsers();
      // Sync comments
      await this.syncComments();
      // Sync communities
      await this.syncCommunities();
      // Sync courses
      await this.syncCourses();
      
      console.log('All indices synced successfully');
    } catch (error) {
      console.error('Error syncing indices:', error);
      throw error;
    }
  }

  // Sync specific index
  async syncIndex(index: string) {
    switch (index) {
      case 'posts':
        return this.syncPosts();
      case 'users':
        return this.syncUsers();
      case 'comments':
        return this.syncComments();
      case 'communities':
        return this.syncCommunities();
      case 'courses':
        return this.syncCourses();
      default:
        throw new Error(`Unknown index: ${index}`);
    }
  }

  // Sync posts to Elasticsearch with engagement metrics
  private async syncPosts() {
    try {
      const posts = await prisma.post.findMany({
        where: { deletedAt: null },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          community: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          category: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              comments: true,
              reactions: true
            }
          }
        }
      });

      const body = posts.flatMap((post: any) => [
        { index: { _index: 'posts', _id: post.id } },
        {
          id: post.id,
          title: post.title,
          content: post.content,
          richTextContent: post.richTextContent,
          authorId: post.authorId,
          author: {
            id: post.author.id,
            username: post.author.username,
            firstName: post.author.firstName,
            lastName: post.author.lastName
          },
          communityId: post.communityId,
          community: {
            id: post.community.id,
            name: post.community.name,
            slug: post.community.slug
          },
          categoryId: post.categoryId,
          category: {
            id: post.category.id,
            name: post.category.name
          },
          tags: [], // Would come from a tags system if implemented
          commentCount: post._count.comments,
          reactionCount: post._count.reactions,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt
        }
      ]);

      if (body.length > 0) {
        await esClient.bulk({ body, refresh: true });
      }

      console.log(`Synced ${posts.length} posts to Elasticsearch`);
    } catch (error) {
      console.error('Error syncing posts:', error);
      throw error;
    }
  }

  // Sync users to Elasticsearch
  private async syncUsers() {
    try {
      const users = await prisma.user.findMany({
        where: { deletedAt: null }
      });

      const body = users.flatMap((user: any) => [
        { index: { _index: 'users', _id: user.id } },
        {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          bio: user.bio,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      ]);

      if (body.length > 0) {
        await esClient.bulk({ body, refresh: true });
      }

      console.log(`Synced ${users.length} users to Elasticsearch`);
    } catch (error) {
      console.error('Error syncing users:', error);
      throw error;
    }
  }

  // Sync comments to Elasticsearch
  private async syncComments() {
    try {
      const comments = await prisma.comment.findMany({
        where: { deletedAt: null },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          post: {
            select: {
              id: true,
              title: true
            }
          },
          _count: {
            select: {
              reactions: true
            }
          }
        }
      });

      const body = comments.flatMap((comment: any) => [
        { index: { _index: 'comments', _id: comment.id } },
        {
          id: comment.id,
          content: comment.content,
          richTextContent: comment.richTextContent,
          authorId: comment.authorId,
          author: {
            id: comment.author.id,
            username: comment.author.username,
            firstName: comment.author.firstName,
            lastName: comment.author.lastName
          },
          postId: comment.postId,
          post: {
            id: comment.post.id,
            title: comment.post.title
          },
          reactionCount: comment._count.reactions,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt
        }
      ]);

      if (body.length > 0) {
        await esClient.bulk({ body, refresh: true });
      }

      console.log(`Synced ${comments.length} comments to Elasticsearch`);
    } catch (error) {
      console.error('Error syncing comments:', error);
      throw error;
    }
  }

  // Sync communities to Elasticsearch
  private async syncCommunities() {
    try {
      const communities = await prisma.community.findMany({
        include: {
          _count: {
            select: {
              members: true,
              posts: true
            }
          }
        }
      });

      const body = communities.flatMap((community: any) => [
        { index: { _index: 'communities', _id: community.id } },
        {
          id: community.id,
          name: community.name,
          slug: community.slug,
          description: community.description,
          isPublic: community.isPublic,
          memberCount: community._count.members,
          postCount: community._count.posts,
          createdAt: community.createdAt,
          updatedAt: community.updatedAt
        }
      ]);

      if (body.length > 0) {
        await esClient.bulk({ body, refresh: true });
      }

      console.log(`Synced ${communities.length} communities to Elasticsearch`);
    } catch (error) {
      console.error('Error syncing communities:', error);
      throw error;
    }
  }

  // Sync courses to Elasticsearch
  private async syncCourses() {
    try {
      const courses = await prisma.course.findMany({
        include: {
          community: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          _count: {
            select: {
              enrollments: true
            }
          }
        }
      });

      const body = courses.flatMap((course: any) => [
        { index: { _index: 'courses', _id: course.id } },
        {
          id: course.id,
          title: course.title,
          description: course.description,
          communityId: course.communityId,
          community: {
            id: course.community.id,
            name: course.community.name,
            slug: course.community.slug
          },
          enrollmentCount: course._count.enrollments,
          isPublished: course.isPublished,
          createdAt: course.createdAt,
          updatedAt: course.updatedAt
        }
      ]);

      if (body.length > 0) {
        await esClient.bulk({ body, refresh: true });
      }

      console.log(`Synced ${courses.length} courses to Elasticsearch`);
    } catch (error) {
      console.error('Error syncing courses:', error);
      throw error;
    }
  }
}

export const searchService = new SearchService();