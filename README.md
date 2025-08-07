# K6 Ultimate Capabilities Demo - Complete Test Suite

This project demonstrates the **ultimate capabilities of K6** through a comprehensive testing suite against a realistic NestJS backend. The project showcases all major K6 features and advanced testing scenarios that you would encounter in real-world performance testing.

## 🎯 Project Overview

This is a complete demonstration of K6's performance testing capabilities, including:

- **Realistic NestJS Backend** - Full-featured API with authentication, CRUD operations, WebSocket support, file uploads, and performance simulation endpoints
- **Comprehensive K6 Test Suite** - Multiple test types covering all K6 capabilities from basic load testing to advanced scenarios
- **Real-world Testing Scenarios** - Practical examples of how to test different aspects of modern web applications

## 🏗️ Project Structure

```
k6-demo/
├── backend/                 # NestJS Backend Server
│   ├── src/
│   │   ├── auth/           # JWT Authentication & Authorization
│   │   ├── users/          # User Management CRUD Operations
│   │   ├── products/       # Product Catalog with 1000+ Items
│   │   ├── upload/         # File Upload (Single & Multiple)
│   │   ├── websocket/      # Real-time WebSocket Communication
│   │   ├── health/         # Health Checks & System Monitoring
│   │   ├── simulation/     # Performance Testing Endpoints
│   │   └── app.module.ts   # Main Application Configuration
│   └── package.json
├── k6-tests/               # Complete K6 Testing Suite
│   ├── tests/
│   │   ├── basic-load-test.js     # Multi-stage Load Testing
│   │   ├── stress-test.js         # System Breaking Point Analysis
│   │   ├── spike-test.js          # Traffic Surge Testing
│   │   ├── api-test.js            # Complete API Validation
│   │   ├── auth-flow-test.js      # Authentication Flow Testing
│   │   ├── websocket-test.js      # WebSocket Performance Testing
│   │   └── scenarios/
│   │       ├── mixed-workload.js  # Multiple User Types & Behaviors
│   │       ├── file-upload-test.js # File Upload Performance
│   │       └── advanced-features.js # Advanced K6 Capabilities
│   ├── data/               # Test Data (CSV, JSON, Generated)
│   ├── config/             # Environment-specific Configurations
│   ├── utils/              # Utility Functions & Helpers
│   └── reports/            # Test Results & Analysis
└── README.md               # Complete Documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- K6 (latest version) - [Install K6](https://k6.io/docs/getting-started/installation/)
- npm or yarn

### 1. Setup Backend Server

```bash
cd backend
npm install
npm run start:dev
```

The server will start on `http://localhost:3000` with:
- API endpoints at `http://localhost:3000/api/v1/`
- Swagger documentation at `http://localhost:3000/api`

### 2. Setup K6 Tests

```bash
cd k6-tests
npm install
```

### 3. Run Tests

```bash
# Basic load test
npm run test:load

# Stress test (find breaking points)
npm run test:stress

# Spike test (traffic surge simulation)
npm run test:spike

# Comprehensive API testing
npm run test:api

# Authentication flow testing
npm run test:auth

# Run all tests
npm run test:all
```

## 🧪 K6 Test Types Demonstrated

### 1. Load Testing (`tests/load/basic-load-test.js`)
**Purpose**: Simulate normal expected traffic patterns

**Features Demonstrated**:
- Multi-stage load testing (ramp-up, sustain, ramp-down)
- Performance thresholds and SLA validation
- Custom metrics creation and tracking
- Realistic user behavior simulation
- Response validation and data consistency checks
- Business transaction tracking

**Key K6 Concepts**:
- `stages` configuration for load patterns
- `thresholds` for pass/fail criteria
- Custom metrics (`Rate`, `Counter`, `Trend`, `Gauge`)
- `check()` for response validation
- `sleep()` for user think time simulation

### 2. Stress Testing (`tests/stress/stress-test.js`)
**Purpose**: Find system breaking points by pushing beyond normal capacity

**Features Demonstrated**:
- Gradual load increase to identify breaking points
- System recovery testing after overload
- Resource exhaustion detection
- Error rate monitoring under stress
- Performance degradation analysis

**Key K6 Concepts**:
- High-load stage configurations
- Stress-specific thresholds (more lenient)
- System overload indicators
- Recovery time measurements
- Adaptive test behavior based on system response

### 3. Spike Testing (`tests/spike/spike-test.js`)
**Purpose**: Test system resilience to sudden traffic spikes

**Features Demonstrated**:
- Rapid user increase simulation
- Auto-scaling response validation
- Circuit breaker testing
- Rate limiting effectiveness
- Multiple spike patterns (moderate, severe, extreme)

**Key K6 Concepts**:
- Rapid stage transitions
- Spike-specific metrics
- Rate limiting detection
- Circuit breaker activation tracking
- Phase-based test logic

### 4. API Testing (`tests/api/api-test.js`)
**Purpose**: Comprehensive API endpoint validation and contract testing

**Features Demonstrated**:
- Complete CRUD operations testing
- Response schema validation
- Error handling verification
- Data consistency across endpoints
- API contract compliance
- Performance validation per endpoint

**Key K6 Concepts**:
- `group()` for test organization
- Response schema validation
- Data-driven testing
- API contract testing
- Endpoint-specific metrics

### 5. Authentication Flow Testing (`tests/auth/auth-flow-test.js`)
**Purpose**: Comprehensive authentication and security testing

**Features Demonstrated**:
- Login/logout flow validation
- Token management and refresh
- Session handling under load
- Security vulnerability testing
- Concurrent authentication handling

**Key K6 Concepts**:
- `SharedArray` for test data
- Token-based authentication flows
- Security testing patterns
- Session state management
- Concurrent request handling

## 🔧 Configuration & Customization

### Environment Configuration

Test configurations for different environments:

```bash
# Development environment
npm run test:dev

# Staging environment  
npm run test:staging

# Production environment
npm run test:prod
```

Configuration files in `config/`:
- `dev.json` - Development settings (low load)
- `staging.json` - Staging settings (moderate load)
- `prod.json` - Production settings (high load)

### Custom Metrics

The test suite demonstrates various custom metrics:

```javascript
// Performance metrics
export const businessTransactionDuration = new Trend('business_transaction_duration');
export const apiEndpointSuccess = new Rate('api_endpoint_success');

// System health metrics
export const systemStressLevel = new Gauge('system_stress_level');
export const resourceExhaustionIndicator = new Rate('resource_exhaustion_indicator');

// Security metrics
export const authenticationSuccessRate = new Rate('authentication_success_rate');
export const rateLimitHitRate = new Rate('rate_limit_hit_rate');
```

### Thresholds

Comprehensive threshold configurations:

```javascript
export const PERFORMANCE_THRESHOLDS = {
  // Response time thresholds
  'http_req_duration': ['p(95)<2000'],
  'http_req_duration{api:auth}': ['p(95)<1000'],
  
  // Error rate thresholds
  'http_req_failed': ['rate<0.1'],
  'http_req_failed{api:auth}': ['rate<0.05'],
  
  // Custom business metrics
  'auth_success_rate': ['rate>0.95'],
  'api_availability': ['rate>0.99'],
};
```

## 📊 Reporting & Analysis

### Built-in Reports

```bash
# HTML Report
npm run report:html

# JSON Report
npm run report:json

# InfluxDB Integration
npm run report:influxdb
```

### Advanced Analysis

Each test generates comprehensive analysis reports:

- **Performance Analysis**: Response times, throughput, error rates
- **System Behavior**: Breaking points, recovery times, resource usage
- **Security Assessment**: Authentication flows, rate limiting, vulnerability tests
- **Recommendations**: Actionable insights for system improvements

## 🎯 Advanced K6 Features Demonstrated

### 1. Data Parameterization
- CSV file loading with `SharedArray`
- JSON test data management
- Dynamic data generation

### 2. Realistic User Simulation
- Think time patterns
- User journey workflows
- Session state management

### 3. Protocol Support
- HTTP/1.1 and HTTP/2 testing
- WebSocket testing
- File upload testing

### 4. Performance Monitoring Integration
- Custom metrics export
- InfluxDB integration
- Grafana dashboard compatibility

### 5. CI/CD Integration
- Environment-specific configurations
- Automated test execution
- Result validation and reporting

## 🔐 Backend API Endpoints

The NestJS backend provides comprehensive endpoints for testing:

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get user profile
- `POST /api/v1/auth/refresh` - Refresh JWT token

### Users Management
- `GET /api/v1/users` - List users (paginated, searchable)
- `GET /api/v1/users/:id` - Get user details
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Products Catalog
- `GET /api/v1/products` - List products (with filtering, sorting)
- `GET /api/v1/products/:id` - Get product details
- `POST /api/v1/products` - Create product
- `PATCH /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product
- `GET /api/v1/products/categories` - Get all categories

### Health & Monitoring
- `GET /api/v1/health` - Basic health check
- `GET /api/v1/health/slow` - Slow response simulation
- `GET /api/v1/health/error` - Error simulation
- `GET /api/v1/health/memory-intensive` - Memory-intensive operation

### File Upload
- `POST /api/v1/upload/file` - File upload endpoint

### Performance Simulation
- `GET /api/v1/simulation/cpu-intensive` - CPU-intensive operation
- `POST /api/v1/simulation/network-simulation` - Network delay simulation
- `GET /api/v1/simulation/random-response` - Random data generation

## 🎨 Customization Examples

### Creating Custom Test Scenarios

```javascript
// Custom business scenario
export default function () {
  group('E-commerce User Journey', function () {
    // 1. User browses products
    const browseResponse = http.get(`${API_BASE_URL}/products`);
    
    // 2. User searches for specific item
    const searchResponse = http.get(`${API_BASE_URL}/products?search=laptop`);
    
    // 3. User views product details
    const productId = extractProductId(searchResponse);
    const detailResponse = http.get(`${API_BASE_URL}/products/${productId}`);
    
    // 4. User adds to cart (if authenticated)
    // ... custom business logic
    
    // Track business metrics
    businessTransactionDuration.add(totalTime);
    customerSatisfactionScore.add(calculateSatisfaction(responses));
  });
}
```

### Adding Custom Metrics

```javascript
// Custom business metrics
export const checkoutSuccessRate = new Rate('checkout_success_rate');
export const averageOrderValue = new Trend('average_order_value');
export const customerSatisfactionScore = new Trend('customer_satisfaction_score');

// Usage in tests
checkoutSuccessRate.add(checkoutResponse.status === 200);
averageOrderValue.add(calculateOrderValue(order));
customerSatisfactionScore.add(calculateSatisfactionScore(userJourney));
```

## 🔍 Troubleshooting

### Common Issues

1. **Backend not responding**: Ensure the NestJS server is running on port 3000
2. **K6 test failures**: Check the BASE_URL environment variable
3. **Authentication issues**: Verify JWT secret configuration
4. **High error rates**: Check server logs for specific error messages

### Debug Mode

```bash
# Run with verbose logging
K6_LOG_LEVEL=debug k6 run tests/load/basic-load-test.js

# Run with custom environment
BASE_URL=http://localhost:3001 k6 run tests/load/basic-load-test.js
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests for new features
4. Update documentation
5. Submit a pull request

## 📚 Learning Resources

- [K6 Documentation](https://k6.io/docs/)
- [K6 Examples](https://github.com/grafana/k6/tree/master/examples)
- [Performance Testing Best Practices](https://k6.io/docs/test-types/)
- [NestJS Documentation](https://nestjs.com/)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Happy Performance Testing! 🚀**

This project demonstrates the full power of K6 for performance testing. Explore the different test types, customize them for your needs, and build comprehensive performance testing strategies for your applications.
