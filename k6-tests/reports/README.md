# K6 Test Reports Organization

This directory contains all K6 performance testing reports and analysis files organized by type and purpose.

## Directory Structure

```
reports/
├── performance/        # Raw K6 test execution results
├── analysis/          # Detailed analysis and insights
├── archived/          # Historical reports and backups
└── README.md          # This file
```

## Performance Reports (`/performance/`)

Contains raw JSON output from K6 test executions with detailed metrics:

- **`api-test-results.json`** - Comprehensive API endpoint testing results
- **`auth-flow-results.json`** - Authentication flow testing results  
- **`load-test-results.json`** - Load testing performance metrics
- **`spike-test-results.json`** - Spike testing results and recovery metrics
- **`stress-test-results.json`** - Stress testing and breaking point analysis

### Key Metrics Included:
- Request/response times (avg, min, max, percentiles)
- Throughput (requests per second)
- Error rates and status codes
- Virtual user concurrency data
- Network and data transfer metrics

## Analysis Reports (`/analysis/`)

Contains processed analysis and insights derived from raw test data:

- **`api-analysis.json`** - API performance analysis and recommendations
- **`auth-analysis.json`** - Authentication system performance insights
- **`spike-analysis.json`** - Spike handling capabilities analysis
- **`stress-analysis.json`** - System stress testing conclusions

### Analysis Content:
- Performance trend analysis
- Bottleneck identification
- Scalability recommendations
- Error pattern analysis
- Optimization suggestions

## Archived Reports (`/archived/`)

Historical reports and backup files for:
- Previous test runs
- Baseline comparisons
- Long-term performance tracking
- Version comparison data

## Usage Guidelines

### Generating New Reports

1. **Performance Reports**: K6 automatically generates these during test execution
   ```bash
   k6 run --out json=reports/performance/new-test-$(date +%Y%m%d-%H%M%S).json test.js
   ```

2. **Analysis Reports**: Generated post-execution using analysis scripts
   ```bash
   npm run analyze-results reports/performance/test-results.json
   ```

### File Naming Convention

- **Performance Reports**: `{test-type}-test-results-{timestamp}.json`
- **Analysis Reports**: `{test-type}-analysis-{timestamp}.json`
- **Archived Reports**: `{original-name}-{archive-date}.json`

### Report Retention

- **Performance Reports**: Keep latest 10 runs per test type
- **Analysis Reports**: Keep latest 5 analyses per test type  
- **Archived Reports**: Monthly cleanup of files older than 6 months

## Quick Commands

```bash
# View latest performance summary
cat reports/performance/*-test-results.json | jq '.metrics'

# Compare test results
diff reports/performance/load-test-results.json reports/archived/load-test-baseline.json

# Archive old reports
mv reports/performance/*-$(date -d '30 days ago' +%Y%m%d)*.json reports/archived/

# Generate summary report
node utils/generate-summary.js reports/performance/ > reports/test-summary.md
```

## Key Performance Benchmarks

Based on current optimized backend:

| Test Type | Avg Response Time | Throughput (RPS) | P95 Response Time |
|-----------|------------------|------------------|-------------------|
| Load Test | 932µs | 10,458 | 1.76ms |
| Stress Test | <2ms | 8,000+ | <5ms |
| Spike Test | Variable | Peak: 12,000+ | <10ms |
| Auth Flow | <1ms | 5,000+ | <3ms |

## Integration with CI/CD

Reports can be automatically processed for:
- Performance regression detection
- Automated alerts on threshold breaches
- Historical trend analysis
- Performance dashboards

## Maintenance

- Weekly cleanup of temporary files
- Monthly archival of old reports
- Quarterly performance baseline updates
- Annual retention policy review
