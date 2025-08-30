import { Client } from '@elastic/elasticsearch';

const elasticsearchUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';

export const esClient = new Client({
  node: elasticsearchUrl,
  maxRetries: 5,
  requestTimeout: 30000,
});

// Health check function
export async function checkElasticsearchHealth(): Promise<boolean> {
  try {
    const health = await esClient.cluster.health();
    return health.status !== 'red';
  } catch (error) {
    console.error('Elasticsearch health check failed:', error);
    return false;
  }
}

// Initialize connection
export async function initializeElasticsearch(): Promise<void> {
  const isHealthy = await checkElasticsearchHealth();
  if (!isHealthy) {
    throw new Error('Elasticsearch is not healthy');
  }
  console.log('Elasticsearch connection established');
}