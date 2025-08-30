export { esClient, checkElasticsearchHealth, initializeElasticsearch } from './client';

// Simple stub implementations for now to get the API server running
export const searchService = {
  async search(indices: string[], query: string) {
    // Stub implementation - returns empty results
    console.warn('Search service not fully implemented yet');
    return {
      total: 0,
      hits: [],
      aggregations: {}
    };
  },

  async suggest(indices: string[], query: string, field: string) {
    // Stub implementation - returns empty suggestions
    console.warn('Search suggestions not fully implemented yet');
    return [];
  }
};

export const syncService = {
  async syncAll() {
    // Stub implementation - does nothing for now
    console.warn('Sync service not fully implemented yet');
    return Promise.resolve();
  }
};