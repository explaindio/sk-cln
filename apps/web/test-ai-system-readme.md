# AI Recommendation System Integration Tests

This directory contains comprehensive end-to-end tests for the AI recommendation system, covering all components from user authentication to recommendation display.

## Test Scripts

### 1. Main Integration Test (`test-ai-system-integration.ts`)
Comprehensive test suite that validates the complete AI recommendation system flow.

**Features:**
- User authentication and registration
- Backend API endpoint testing
- Frontend hook integration validation
- Behavioral analytics tracking
- Error handling and fallback scenarios
- Performance benchmarks
- Privacy settings and opt-out functionality
- Data persistence and synchronization

### 2. Test Runner (`test-ai-system-runner.ts`)
Utility script to manage test execution and environment setup.

**Features:**
- Automatic service startup
- Smoke tests for quick validation
- Test data generation
- Environment management
- Cleanup utilities

## Quick Start

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Running backend API server (port 4001)
- Running frontend development server (port 3000)

### Run Full Integration Tests
```bash
# Run with automatic service startup
npm run test:ai-integration -- --setup --full

# Run tests only (services must be running)
npm run test:ai-integration -- --full
```

### Run Quick Smoke Tests
```bash
npm run test:ai-integration -- --smoke
```

### Generate Test Data
```bash
npm run test:ai-integration -- --data
```

### Clean Up Test Data
```bash
npm run test:ai-integration -- --cleanup
```

## Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test:ai-integration": "tsx test-ai-system-runner.ts",
    "test:ai-full": "tsx test-ai-system-runner.ts --full",
    "test:ai-smoke": "tsx test-ai-system-runner.ts --smoke",
    "test:ai-setup": "tsx test-ai-system-runner.ts --setup",
    "test:ai-data": "tsx test-ai-system-runner.ts --data",
    "test:ai-cleanup": "tsx test-ai-system-runner.ts --cleanup",
    "test:ai-direct": "tsx test-ai-system-integration.ts"
  }
}
```

## Test Coverage

### 1. Environment Setup and Health Checks
- ✅ Backend API health verification
- ✅ Frontend service availability
- ✅ Database connectivity
- ✅ Required service dependencies

### 2. User Authentication Flow
- ✅ User registration with email verification
- ✅ Login with JWT token generation
- ✅ Token refresh mechanism
- ✅ Protected route access
- ✅ Authentication error handling

### 3. Content Creation and Management
- ✅ Post creation with tags and categories
- ✅ Course creation with metadata
- ✅ Content association with users
- ✅ Content validation and error handling

### 4. Behavioral Analytics Integration
- ✅ Event tracking (views, likes, comments, searches)
- ✅ Time spent tracking
- ✅ User interaction monitoring
- ✅ Behavioral metrics calculation
- ✅ Offline queue functionality
- ✅ Data synchronization

### 5. AI Recommendation API Endpoints
- ✅ Get personalized recommendations
- ✅ Submit recommendation feedback
- ✅ User preferences management
- ✅ Recommendation scoring and ranking
- ✅ Content-based filtering
- ✅ Collaborative filtering
- ✅ Hybrid recommendation algorithms

### 6. Frontend Hook Integration
- ✅ useAIRecommendations hook functionality
- ✅ Real-time recommendation updates
- ✅ User preference synchronization
- ✅ Error handling and loading states
- ✅ Performance optimization
- ✅ Caching mechanisms

### 7. Error Handling and Fallbacks
- ✅ Invalid authentication handling
- ✅ Network error recovery
- ✅ API timeout handling
- ✅ Rate limiting compliance
- ✅ Graceful degradation
- ✅ User-friendly error messages

### 8. Performance Benchmarks
- ✅ Response time validation (< 500ms target)
- ✅ Concurrent request handling
- ✅ Memory usage monitoring
- ✅ Database query optimization
- ✅ Cache hit rates
- ✅ API throughput testing

### 9. Privacy Settings and Compliance
- ✅ User opt-out functionality
- ✅ Data anonymization
- ✅ Privacy preference persistence
- ✅ GDPR compliance features
- ✅ Data export capabilities
- ✅ Account deletion support

### 10. Data Persistence and Synchronization
- ✅ User preference persistence
- ✅ Behavioral data storage
- ✅ Cross-session data retention
- ✅ Data integrity validation
- ✅ Backup and recovery testing
- ✅ Migration compatibility

## Test Output

### Console Output
The tests provide detailed console output with:
- Real-time test progress
- Performance metrics
- Error details and stack traces
- Success/failure indicators
- Timing information

### Test Reports
After test completion, detailed reports are generated:

**JSON Report** (`ai-system-integration-report.json`):
- Complete test results
- Performance metrics
- Error details
- Timestamp and duration
- Success rates

**Log File** (`ai-test-logs.txt`):
- Detailed execution logs
- Error stack traces
- Performance measurements
- Debug information

## Configuration

### Environment Variables
```bash
API_URL=http://localhost:4001/api
FRONTEND_URL=http://localhost:3000
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPass123!
```

### Test Configuration
Modify `TEST_CONFIG` in the test script to customize:
- Test user credentials
- API endpoints
- Performance thresholds
- Timeout values
- Test data parameters

## Troubleshooting

### Common Issues

1. **Services Not Starting**
   ```bash
   # Check if ports are available
   lsof -i :3000  # Frontend
   lsof -i :4001  # Backend
   
   # Kill existing processes
   kill -9 $(lsof -t -i :3000)
   kill -9 $(lsof -t -i :4001)
   ```

2. **Database Connection Issues**
   ```bash
   # Check database status
   npm run db:status
   
   # Reset database
   npm run db:reset
   ```

3. **Authentication Failures**
   - Verify JWT secret configuration
   - Check user registration endpoints
   - Validate token expiration settings

4. **Performance Issues**
   - Increase timeout values in test configuration
   - Check server resource usage
   - Optimize database queries
   - Enable caching mechanisms

### Debug Mode
Enable verbose logging:
```bash
DEBUG=ai-test:* npm run test:ai-integration -- --full
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: AI System Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    
    - name: Install dependencies
      run: npm install
    
    - name: Start services
      run: |
        npm run dev:api &
        npm run dev &
        sleep 30
    
    - name: Run AI integration tests
      run: npm run test:ai-smoke
    
    - name: Upload test reports
      uses: actions/upload-artifact@v2
      if: always()
      with:
        name: test-reports
        path: |
          ai-system-integration-report.json
          ai-test-logs.txt
```

## Performance Benchmarks

### Target Metrics
- API Response Time: < 500ms
- Recommendation Generation: < 2s
- Behavioral Event Processing: < 100ms
- Frontend Hook Updates: < 1s

### Current Performance
Run benchmarks to get current performance metrics:
```bash
npm run test:ai-integration -- --full
```

Check the generated report for detailed performance data.

## Security Considerations

- All tests use dedicated test users
- No production data is modified
- Test data is automatically cleaned up
- Authentication tokens are properly managed
- Rate limiting is respected

## Contributing

When adding new tests:
1. Follow the existing test structure
2. Add proper error handling
3. Include performance measurements
4. Update documentation
5. Test both success and failure scenarios

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review test logs in `ai-test-logs.txt`
3. Examine the detailed test report
4. Ensure all prerequisites are met