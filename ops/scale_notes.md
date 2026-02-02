# Chebigen HMS Performance & Scaling Guide

## Configuration Values

### Database Connection Pool
```env
PG_POOL_MAX=20              # Maximum database connections per instance
POSTGRES_URL=               # Main database URL (with pgbouncer=true for pooling)
```

### Redis & Job Queue
```env
REDIS_HOST=localhost        # Redis server host
REDIS_PORT=6379            # Redis server port
JOB_QUEUE_CONCURRENCY=2    # Number of concurrent jobs per worker
```

### Cache Configuration
```env
CACHE_TTL_REFERENCE=3600000  # Cache time for reference data (1 hour)
CACHE_TTL_USER=300000       # Cache time for user data (5 minutes)
CACHE_TTL_LIST=30000        # Cache time for list data (30 seconds)
```

## Performance Optimization Steps

1. Database Indexes
```bash
# Apply database optimizations
psql -d your_database -f database-optimizations/002_indexes_and_pooling.sql
```

2. Connection Pooling
- Ensure pgbouncer parameter is added to database URL
- Set PG_POOL_MAX in environment variables
- Monitor active connections: `SELECT count(*) FROM pg_stat_activity;`

3. Job Queue Setup
```bash
# Install Redis
# On Windows:
scoop install redis
# Start Redis
redis-server

# Start job queue worker
pnpm worker
```

4. Frontend Optimizations
- Implemented pagination for all list views
- Added React Query for data fetching and caching
- Lazy loading for heavy components
- Optimistic updates for better UX

## Verification Steps

1. Database Optimization Verification
```sql
-- Check if indexes are created
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'appointments';
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'bills';
```

2. Connection Pool Verification
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;
-- Should be less than PG_POOL_MAX during normal operation
```

3. Job Queue Verification
```bash
# Generate a test PDF invoice
# Check Redis queue
redis-cli
> KEYS *
> LLEN queue:pdf-generation
```

4. Load Testing
```bash
# Install k6
pnpm add -g k6

# Run load test
k6 run load-tests/30-users.js

# Expected results:
# - http_req_duration p(95) < 500ms
# - error rate < 10%
# - No connection pool exhaustion
```

## Common Issues & Solutions

1. Connection Pool Exhaustion
- Symptom: "Too many clients already" errors
- Solution: Check PG_POOL_MAX setting and active connections
- Action: Increase pool size or optimize queries

2. Slow API Responses
- Symptom: Requests taking >300ms
- Solution: Check query execution plans
- Action: Run EXPLAIN ANALYZE on slow queries

3. Cache Invalidation Issues
- Symptom: Stale data in UI
- Solution: Check cache durations
- Action: Manually invalidate cache or adjust TTL

4. Job Queue Delays
- Symptom: Background jobs not processing
- Solution: Check Redis connection and worker status
- Action: Increase worker concurrency or add workers

## Monitoring Recommendations

1. Key Metrics to Monitor
- Database connection count
- API response times
- Job queue length
- Cache hit/miss rates
- Error rates

2. Suggested Tools
- Supabase Dashboard for database metrics
- Custom /metrics endpoint for application metrics
- Redis INFO for queue metrics
- Browser DevTools for frontend performance

3. Alert Thresholds
- Database connections > 80% of pool
- API response time p95 > 500ms
- Job queue length > 100
- Error rate > 1%

## Scaling Strategy

1. Vertical Scaling
- Increase PG_POOL_MAX (up to 50% of max_connections)
- Increase worker concurrency
- Increase Redis memory

2. Horizontal Scaling
- Deploy multiple application instances
- Use Redis for session store
- Use Supabase for database scaling
- Implement sticky sessions if needed

## Regular Maintenance

1. Database
```sql
-- Run weekly during low traffic
VACUUM ANALYZE appointments;
VACUUM ANALYZE bills;
VACUUM ANALYZE patients;
```

2. Cache
- Monitor cache size and hit rates
- Adjust TTL values based on usage patterns
- Implement cache warming for critical data

3. Job Queue
- Monitor job completion rates
- Clean up completed jobs weekly
- Adjust retry strategies based on failure patterns