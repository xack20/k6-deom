# K6 Demo Backend Server

A comprehensive NestJS backend server designed specifically for demonstrating K6 performance testing capabilities. This server provides a wide range of endpoints and scenarios to test various aspects of K6's functionality.

## 🏗️ Architecture

The backend is built with NestJS and includes:

- **Authentication Module**: JWT-based authentication with registration, login, and token refresh
- **Users Module**: Complete CRUD operations with pagination and search
- **Products Module**: Product catalog with filtering, sorting, and categories
- **Upload Module**: File upload functionality for testing multipart requests
- **WebSocket Module**: Real-time communication for WebSocket testing
- **Health Module**: Health checks and system monitoring endpoints
- **Simulation Module**: Performance testing specific endpoints

## 📋 Features

### Authentication & Security
- JWT token-based authentication
- Password hashing with bcrypt
- Rate limiting protection
- Input validation and sanitization
- CORS support

### API Endpoints
- RESTful API design
- Comprehensive CRUD operations
- Pagination and search functionality
- File upload support
- Error handling and validation

### Performance Testing Features
- Health check endpoints
- Slow response simulation
- Error simulation
- Memory-intensive operations
- CPU-intensive operations
- Network delay simulation

### Documentation
- Auto-generated Swagger/OpenAPI documentation
- Comprehensive API documentation at `/api`

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Install global NestJS CLI (optional)
npm install -g @nestjs/cli
```

### Development

```bash
# Start in development mode
npm run start:dev

# Start in production mode
npm run start:prod

# Build the application
npm run build
```

### Testing

```bash
# Unit tests
npm run test

# End-to-end tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Database (if using external database)
DATABASE_URL=postgresql://username:password@localhost:5432/k6demo

# Rate Limiting
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100
```

### Default Configuration

The server runs with these defaults:
- **Port**: 3000
- **JWT Secret**: `k6-demo-secret-key`
- **Rate Limit**: 100 requests per minute
- **CORS**: Enabled for all origins

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com", 
  "password": "securepassword123"
}
```

#### Login User
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "securepassword123"
}
```

#### Get Profile
```http
GET /api/v1/auth/profile
Authorization: Bearer <jwt-token>
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Authorization: Bearer <jwt-token>
```

### Users Endpoints

#### List Users (Protected)
```http
GET /api/v1/users?page=1&limit=10&search=john
Authorization: Bearer <jwt-token>
```

#### Get User (Protected)
```http
GET /api/v1/users/:id
Authorization: Bearer <jwt-token>
```

#### Update User (Protected)
```http
PATCH /api/v1/users/:id
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "email": "newemail@example.com"
}
```

#### Delete User (Protected)
```http
DELETE /api/v1/users/:id
Authorization: Bearer <jwt-token>
```

### Products Endpoints

#### List Products (Public)
```http
GET /api/v1/products?page=1&limit=10&search=laptop&category=Electronics&minPrice=100&maxPrice=1000&sortBy=price&sortOrder=asc
```

#### Get Product (Public)
```http
GET /api/v1/products/:id
```

#### Create Product (Protected)
```http
POST /api/v1/products
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Test Product",
  "description": "Product description",
  "price": 99.99,
  "category": "Electronics",
  "stock": 50
}
```

#### Update Product (Protected)
```http
PATCH /api/v1/products/:id
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "price": 89.99
}
```

#### Delete Product (Protected)
```http
DELETE /api/v1/products/:id
Authorization: Bearer <jwt-token>
```

#### Get Categories (Public)
```http
GET /api/v1/products/categories
```

### Health & Monitoring Endpoints

#### Basic Health Check
```http
GET /api/v1/health
```

#### Slow Response Simulation
```http
GET /api/v1/health/slow
```

#### Error Simulation
```http
GET /api/v1/health/error
```

#### Memory Intensive Operation
```http
GET /api/v1/health/memory-intensive
```

### File Upload Endpoints

#### Upload File
```http
POST /api/v1/upload/file
Content-Type: multipart/form-data

file: <binary-file-data>
```

### Simulation Endpoints

#### CPU Intensive Operation
```http
GET /api/v1/simulation/cpu-intensive?iterations=1000000
```

#### Network Delay Simulation
```http
POST /api/v1/simulation/network-simulation
Content-Type: application/json

{
  "delay": 1000,
  "shouldFail": false
}
```

#### Random Response Generation
```http
GET /api/v1/simulation/random-response?size=100
```

## 🎯 Testing Scenarios

The backend is designed to support various K6 testing scenarios:

### Load Testing
- Standard CRUD operations
- Pagination and search
- Authentication flows
- File operations

### Stress Testing
- High-frequency requests
- Memory-intensive operations
- CPU-intensive operations
- Resource exhaustion scenarios

### Spike Testing
- Rate limiting validation
- Circuit breaker testing
- Sudden load increases
- Error handling under load

### API Testing
- Response validation
- Schema compliance
- Error handling
- Data consistency

### Security Testing
- Authentication bypass attempts
- SQL injection protection
- XSS protection
- Rate limiting effectiveness

## 🔍 Monitoring & Observability

### Health Checks
The server provides multiple health check endpoints:

- **Basic Health**: System status and uptime
- **Slow Health**: Simulates slow responses (1-5 seconds)
- **Error Health**: Random error simulation
- **Memory Health**: Memory-intensive operations

### Logging
Comprehensive logging for:
- Request/response cycles
- Authentication events
- Error conditions
- Performance metrics

### Rate Limiting
Built-in rate limiting with:
- Configurable limits per endpoint
- IP-based tracking
- 429 status code responses
- Bypass for health checks

## 🛠️ Development

### Project Structure

```
src/
├── auth/                   # Authentication module
│   ├── auth.controller.ts  # Auth endpoints
│   ├── auth.service.ts     # Auth business logic
│   ├── auth.module.ts      # Auth module definition
│   └── strategies/         # Passport strategies
├── users/                  # Users module
│   ├── users.controller.ts # User endpoints
│   ├── users.service.ts    # User business logic
│   └── users.module.ts     # User module definition
├── products/               # Products module
├── upload/                 # File upload module
├── websocket/              # WebSocket module
├── health/                 # Health check module
├── simulation/             # Testing simulation module
├── app.module.ts           # Main app module
└── main.ts                 # Application entry point
```

### Adding New Endpoints

1. **Create Controller**:
```typescript
@Controller('example')
export class ExampleController {
  @Get()
  findAll() {
    return { message: 'Hello K6!' };
  }
}
```

2. **Create Service** (if needed):
```typescript
@Injectable()
export class ExampleService {
  findAll() {
    return 'This action returns all examples';
  }
}
```

3. **Create Module**:
```typescript
@Module({
  controllers: [ExampleController],
  providers: [ExampleService],
})
export class ExampleModule {}
```

4. **Register in App Module**:
```typescript
@Module({
  imports: [
    // ... other modules
    ExampleModule,
  ],
})
export class AppModule {}
```

### Custom Testing Endpoints

To add endpoints specifically for K6 testing:

```typescript
@Controller('testing')
export class TestingController {
  @Get('delay/:ms')
  async customDelay(@Param('ms') ms: number) {
    await new Promise(resolve => setTimeout(resolve, ms));
    return { delayed: ms };
  }

  @Get('memory-load/:size')
  memoryLoad(@Param('size') size: number) {
    const data = new Array(size).fill('test-data');
    return { 
      generated: data.length,
      memory: process.memoryUsage()
    };
  }
}
```

## 🔐 Security Considerations

### Authentication
- JWT tokens with configurable expiration
- Password hashing with bcrypt
- Token refresh mechanism
- Protected route validation

### Input Validation
- Class-validator for request validation
- Whitelist unknown properties
- Transform and sanitize inputs
- Custom validation pipes

### Rate Limiting
- Throttling guard implementation
- Configurable limits per route
- IP-based rate limiting
- Graceful handling of limit exceeded

### CORS Configuration
- Configurable origin allowlist
- Credential support
- Method and header restrictions
- Pre-flight request handling

## 📊 Performance Considerations

### In-Memory Storage
The server uses in-memory storage for simplicity:
- Fast read/write operations
- No database dependencies
- Automatic data generation
- Reset on server restart

### Optimizations
- Efficient pagination implementation
- Optimized search algorithms
- Minimal dependency footprint
- Production-ready configurations

### Scaling Considerations
For production-like testing:
- Replace in-memory storage with real database
- Add connection pooling
- Implement caching layers
- Add horizontal scaling support

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**:
```bash
# Kill process using port 3000
sudo lsof -t -i tcp:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run start:dev
```

2. **JWT token issues**:
- Check JWT_SECRET environment variable
- Verify token format in requests
- Check token expiration

3. **Rate limiting too strict**:
- Adjust rate limit configuration
- Check IP address for testing
- Use different test users

4. **Memory issues during stress testing**:
- Monitor server memory usage
- Adjust memory-intensive operation limits
- Restart server between heavy tests

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run start:dev

# Enable NestJS debug mode
NODE_ENV=development npm run start:dev
```

### Health Check

```bash
# Quick health check
curl http://localhost:3000/api/v1/health

# Check specific endpoint
curl http://localhost:3000/api/v1/products
```

## 🤝 Contributing

1. Follow NestJS conventions
2. Add comprehensive error handling
3. Include proper input validation
4. Add Swagger documentation
5. Write unit tests for new features
6. Update this README for new endpoints

## 📝 License

This project is licensed under the MIT License.

---

This backend server provides a robust foundation for comprehensive K6 performance testing. It includes all the necessary endpoints and scenarios to demonstrate K6's full capabilities while maintaining production-ready code quality and security practices.
