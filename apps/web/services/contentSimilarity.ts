'use client';

import { ContentItem } from '@/components/ai';

export interface SimilarityScore {
  contentId: string;
  similarity: number;
  factors: {
    tagOverlap: number;
    categoryMatch: number;
    engagementSimilarity: number;
    temporalProximity: number;
    authorSimilarity: number;
    contentTypeMatch: number;
  };
}

export interface SimilarityAnalysis {
  queryContent: ContentItem;
  similarContent: SimilarityScore[];
  totalMatches: number;
  averageSimilarity: number;
  confidence: number;
}

export class ContentSimilarityAnalyzer {
  private static instance: ContentSimilarityAnalyzer;
  private tagWeights: Record<string, number> = {};
  private categoryWeights: Record<string, number> = {};
  private contentTypeWeights: Record<string, number> = {};
  private engagementNormalization: { views: number; likes: number; comments: number; shares: number };

  private constructor() {
    // Initialize with default weights
    this.initializeWeights();
  }

  static getInstance(): ContentSimilarityAnalyzer {
    if (!ContentSimilarityAnalyzer.instance) {
      ContentSimilarityAnalyzer.instance = new ContentSimilarityAnalyzer();
    }
    return ContentSimilarityAnalyzer.instance;
  }

  private initializeWeights(): void {
    // Tag weights based on popularity and relevance
    this.tagWeights = {
      'react': 1.5,
      'typescript': 1.4,
      'javascript': 1.3,
      'nodejs': 1.3,
      'python': 1.2,
      'ai': 1.4,
      'machine-learning': 1.3,
      'webdev': 1.2,
      'frontend': 1.2,
      'backend': 1.2,
      'database': 1.1,
      'api': 1.1,
      'css': 1.0,
      'html': 1.0,
      'general': 0.8,
    };

    // Category weights
    this.categoryWeights = {
      'programming': 1.3,
      'technology': 1.2,
      'education': 1.2,
      'ai': 1.4,
      'webdev': 1.2,
      'design': 1.0,
      'business': 0.9,
      'general': 0.8,
    };

    // Content type weights
    this.contentTypeWeights = {
      'course': 1.3,
      'video': 1.2,
      'post': 1.0,
      'event': 1.1,
    };

    // Engagement normalization factors (based on typical ranges)
    this.engagementNormalization = {
      views: 1000,    // Normalize views to 0-1 scale
      likes: 100,     // Normalize likes to 0-1 scale
      comments: 50,   // Normalize comments to 0-1 scale
      shares: 20,     // Normalize shares to 0-1 scale
    };
  }

  analyzeSimilarity(queryContent: ContentItem, candidateContent: ContentItem[]): SimilarityAnalysis {
    const similarContent: SimilarityScore[] = [];

    candidateContent.forEach(content => {
      // Skip if it's the same content
      if (content.id === queryContent.id) return;

      const similarity = this.calculateSimilarity(queryContent, content);
      if (similarity.similarity > 0.1) { // Only include content with meaningful similarity
        similarContent.push(similarity);
      }
    });

    // Sort by similarity score (highest first)
    similarContent.sort((a, b) => b.similarity - a.similarity);

    const totalMatches = similarContent.length;
    const averageSimilarity = similarContent.length > 0
      ? similarContent.reduce((sum, item) => sum + item.similarity, 0) / similarContent.length
      : 0;

    // Calculate confidence based on number of matches and average similarity
    const confidence = Math.min(
      (totalMatches / 10) * 0.4 + (averageSimilarity) * 0.6,
      1.0
    );

    return {
      queryContent,
      similarContent,
      totalMatches,
      averageSimilarity,
      confidence,
    };
  }

  private calculateSimilarity(content1: ContentItem, content2: ContentItem): SimilarityScore {
    const factors = {
      tagOverlap: this.calculateTagOverlap(content1.tags, content2.tags),
      categoryMatch: this.calculateCategoryMatch(content1.tags, content2.tags),
      engagementSimilarity: this.calculateEngagementSimilarity(content1.engagement, content2.engagement),
      temporalProximity: this.calculateTemporalProximity(content1.createdAt, content2.createdAt),
      authorSimilarity: this.calculateAuthorSimilarity(content1.author, content2.author),
      contentTypeMatch: this.calculateContentTypeMatch(content1.type, content2.type),
    };

    // Weighted average of all factors
    const weights = {
      tagOverlap: 0.25,
      categoryMatch: 0.20,
      engagementSimilarity: 0.20,
      temporalProximity: 0.15,
      authorSimilarity: 0.10,
      contentTypeMatch: 0.10,
    };

    const similarity = Object.entries(factors).reduce((score, [factor, value]) => {
      return score + (value * weights[factor as keyof typeof factors]);
    }, 0);

    return {
      contentId: content2.id,
      similarity: Math.min(similarity, 1.0),
      factors,
    };
  }

  private calculateTagOverlap(tags1: string[], tags2: string[]): number {
    if (tags1.length === 0 || tags2.length === 0) return 0;

    const set1 = new Set(tags1.map(tag => tag.toLowerCase()));
    const set2 = new Set(tags2.map(tag => tag.toLowerCase()));
    
    const intersection = new Set([...set1].filter(tag => set2.has(tag)));
    const union = new Set([...set1, ...set2]);
    
    // Jaccard similarity
    const jaccard = intersection.size / union.size;

    // Weight by tag importance
    const weightedIntersection = Array.from(intersection).reduce((sum, tag) => {
      return sum + (this.tagWeights[tag] || 1.0);
    }, 0);

    const weightedUnion = Array.from(union).reduce((sum, tag) => {
      return sum + (this.tagWeights[tag] || 1.0);
    }, 0);

    const weightedJaccard = weightedUnion > 0 ? weightedIntersection / weightedUnion : 0;

    // Combine simple and weighted Jaccard
    return (jaccard * 0.6 + weightedJaccard * 0.4);
  }

  private calculateCategoryMatch(tags1: string[], tags2: string[]): number {
    const categories1 = this.extractCategories(tags1);
    const categories2 = this.extractCategories(tags2);

    if (categories1.length === 0 || categories2.length === 0) return 0;

    const set1 = new Set(categories1);
    const set2 = new Set(categories2);
    
    const intersection = new Set([...set1].filter(cat => set2.has(cat)));
    
    if (intersection.size === 0) return 0;

    // Weight by category importance
    const weightedIntersection = Array.from(intersection).reduce((sum, category) => {
      return sum + (this.categoryWeights[category] || 1.0);
    }, 0);

    const maxPossibleWeight = Math.max(
      Array.from(set1).reduce((sum, cat) => sum + (this.categoryWeights[cat] || 1.0), 0),
      Array.from(set2).reduce((sum, cat) => sum + (this.categoryWeights[cat] || 1.0), 0)
    );

    return weightedIntersection / maxPossibleWeight;
  }

  private extractCategories(tags: string[]): string[] {
    const categoryMap: Record<string, string[]> = {
      'programming': ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust'],
      'webdev': ['react', 'vue', 'angular', 'html', 'css', 'frontend', 'backend'],
      'ai': ['ai', 'machine-learning', 'deep-learning', 'neural-networks', 'nlp'],
      'database': ['sql', 'nosql', 'mongodb', 'postgresql', 'mysql'],
      'devops': ['docker', 'kubernetes', 'ci-cd', 'deployment', 'cloud'],
    };

    const categories: string[] = [];
    
    Object.entries(categoryMap).forEach(([category, keywords]) => {
      if (tags.some(tag => keywords.includes(tag.toLowerCase()))) {
        categories.push(category);
      }
    });

    return categories.length > 0 ? categories : ['general'];
  }

  private calculateEngagementSimilarity(engagement1: ContentItem['engagement'], engagement2: ContentItem['engagement']): number {
    const normalize = (value: number, max: number) => Math.min(value / max, 1.0);

    const views1 = normalize(engagement1.views, this.engagementNormalization.views);
    const views2 = normalize(engagement2.views, this.engagementNormalization.views);
    
    const likes1 = normalize(engagement1.likes, this.engagementNormalization.likes);
    const likes2 = normalize(engagement2.likes, this.engagementNormalization.likes);
    
    const comments1 = normalize(engagement1.comments, this.engagementNormalization.comments);
    const comments2 = normalize(engagement2.comments, this.engagementNormalization.comments);
    
    const shares1 = normalize(engagement1.shares, this.engagementNormalization.shares);
    const shares2 = normalize(engagement2.shares, this.engagementNormalization.shares);

    // Calculate cosine similarity
    const dotProduct = views1 * views2 + likes1 * likes2 + comments1 * comments2 + shares1 * shares2;
    const magnitude1 = Math.sqrt(views1 * views1 + likes1 * likes1 + comments1 * comments1 + shares1 * shares1);
    const magnitude2 = Math.sqrt(views2 * views2 + likes2 * likes2 + comments2 * comments2 + shares2 * shares2);

    return magnitude1 > 0 && magnitude2 > 0 ? dotProduct / (magnitude1 * magnitude2) : 0;
  }

  private calculateTemporalProximity(date1: string, date2: string): number {
    const time1 = new Date(date1).getTime();
    const time2 = new Date(date2).getTime();
    const timeDiff = Math.abs(time1 - time2);

    // Consider content published within 30 days as temporally related
    const maxTimeDiff = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    if (timeDiff > maxTimeDiff) return 0;

    // Linear decay function
    return 1 - (timeDiff / maxTimeDiff);
  }

  private calculateAuthorSimilarity(author1: ContentItem['author'], author2: ContentItem['author']): number {
    if (author1.id === author2.id) return 1.0;

    // Check if authors have similar usernames (simple string similarity)
    const username1 = author1.username.toLowerCase();
    const username2 = author2.username.toLowerCase();

    // Simple Jaccard similarity for usernames
    const set1 = new Set(username1.split(''));
    const set2 = new Set(username2.split(''));
    
    const intersection = new Set([...set1].filter(char => set2.has(char)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private calculateContentTypeMatch(type1: ContentItem['type'], type2: ContentItem['type']): number {
    if (type1 === type2) return 1.0;

    // Define content type similarity matrix
    const similarityMatrix: Record<string, Record<string, number>> = {
      'course': { 'video': 0.7, 'post': 0.4, 'event': 0.3 },
      'video': { 'course': 0.7, 'post': 0.5, 'event': 0.4 },
      'post': { 'course': 0.4, 'video': 0.5, 'event': 0.6 },
      'event': { 'course': 0.3, 'video': 0.4, 'post': 0.6 },
    };

    return similarityMatrix[type1]?.[type2] || 0.2;
  }

  updateWeights(newWeights: {
    tagWeights?: Record<string, number>;
    categoryWeights?: Record<string, number>;
    contentTypeWeights?: Record<string, number>;
    engagementNormalization?: { views: number; likes: number; comments: number; shares: number };
  }): void {
    if (newWeights.tagWeights) {
      this.tagWeights = { ...this.tagWeights, ...newWeights.tagWeights };
    }
    if (newWeights.categoryWeights) {
      this.categoryWeights = { ...this.categoryWeights, ...newWeights.categoryWeights };
    }
    if (newWeights.contentTypeWeights) {
      this.contentTypeWeights = { ...this.contentTypeWeights, ...newWeights.contentTypeWeights };
    }
    if (newWeights.engagementNormalization) {
      this.engagementNormalization = { ...this.engagementNormalization, ...newWeights.engagementNormalization };
    }
  }

  getSimilarityExplanation(similarity: SimilarityScore): string {
    const { factors } = similarity;
    const explanations: string[] = [];

    if (factors.tagOverlap > 0.7) {
      explanations.push('High tag overlap');
    } else if (factors.tagOverlap > 0.4) {
      explanations.push('Similar tags');
    }

    if (factors.categoryMatch > 0.7) {
      explanations.push('Same category');
    } else if (factors.categoryMatch > 0.4) {
      explanations.push('Related categories');
    }

    if (factors.engagementSimilarity > 0.7) {
      explanations.push('Similar engagement levels');
    }

    if (factors.temporalProximity > 0.7) {
      explanations.push('Published around the same time');
    }

    if (factors.authorSimilarity > 0.8) {
      explanations.push('Same author');
    } else if (factors.authorSimilarity > 0.4) {
      explanations.push('Similar authors');
    }

    if (factors.contentTypeMatch > 0.8) {
      explanations.push('Same content type');
    } else if (factors.contentTypeMatch > 0.5) {
      explanations.push('Similar content types');
    }

    return explanations.length > 0 ? explanations.join(', ') : 'General similarity';
  }

  getTopSimilarContent(content: ContentItem, candidateContent: ContentItem[], limit: number = 5): ContentItem[] {
    const analysis = this.analyzeSimilarity(content, candidateContent);
    const topSimilar = analysis.similarContent.slice(0, limit);
    
    return topSimilar.map(similarity => 
      candidateContent.find(content => content.id === similarity.contentId)!
    ).filter(Boolean);
  }
}

// Export singleton instance
export const contentSimilarityAnalyzer = ContentSimilarityAnalyzer.getInstance();

// Export utility functions for direct use
export function calculateContentSimilarity(content1: ContentItem, content2: ContentItem): number {
  return contentSimilarityAnalyzer.calculateSimilarity(content1, content2).similarity;
}

export function findSimilarContent(queryContent: ContentItem, candidateContent: ContentItem[]): SimilarityAnalysis {
  return contentSimilarityAnalyzer.analyzeSimilarity(queryContent, candidateContent);
}

export function getContentSimilarityExplanation(similarity: SimilarityScore): string {
  return contentSimilarityAnalyzer.getSimilarityExplanation(similarity);
}