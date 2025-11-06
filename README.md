# Chatbot Backend

Backend API for Chatbot system built with NestJS, TypeORM.

## Table of Contents

- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Scripts](#scripts)

## Project Structure

The project follows a modular architecture with clear separation of concerns:

### Root Directory
```
chatbot-be/
├── config/                 # Configuration files (YAML)
├── src/                    # Source code
├── test/                   # End-to-end tests
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── nest-cli.json           # NestJS CLI configuration
└── eslint.config.mjs       # ESLint configuration
```

### Source Directory (`src/`)

#### Application Entry
- `main.ts` - Bootstrap application, configure middleware, validation pipes, CORS, Swagger, and start server
- `app.module.ts` - Root module that imports all feature modules

#### Common Directory (`src/common/`)
Shared utilities and resources used across the application:

- **constrains/** - Application constants
  - `crypto.ts` - Cryptography related constants
  - `token.ts` - Token related constants

- **decorators/** - Custom decorators
  - `api-http-exception.decorator.ts` - Swagger exception documentation decorator
  - `get-many-query.decorator.ts` - Query parameters decorator for list endpoints
  - `json-column.decorator.ts` - JSON column transformation decorator
  - `role.decorator.ts` - Role metadata decorator

- **dtos/** - Base data transfer objects
  - `base-entity.dto.ts` - Base DTO with common fields
  - `pagination.dto.ts` - Pagination query parameters

- **entities/** - Base entity classes
  - `base-entity.ts` - Base entity with id, createdAt, updatedAt
  - `soft-delete-entity.ts` - Base entity with soft delete support

- **exceptions/** - Custom exception classes
  - `module-config.exception.ts` - Configuration related exceptions

- **filters/** - Global exception filters
  - `query-failed-error.filter.ts` - Handle TypeORM query errors

- **interceptors/** - Request/Response interceptors
  - `crud-pagination.interceptor.ts` - Transform paginated responses

- **middlewares/** - Custom middlewares
  - `http-logger.middleware.ts` - HTTP request/response logging

- **pipes/** - Custom validation/transformation pipes
  - `parse-image.pipe.ts` - Image upload validation and transformation

- **proxies/** - Proxy classes for error handling
  - `create-config-error.proxy.ts` - Configuration error proxy

- **validators/** - Custom validation decorators
  - `is-unique.validator.ts` - Database uniqueness validation

#### Configs Directory (`src/configs/`)
Application configuration and setup:

- `app-config.module.ts` - Global configuration module that loads YAML config files, sets up database connection, and mailer service
- `cors.ts` - CORS configuration and setup
- `swagger.ts` - Swagger/OpenAPI documentation setup
- `vars.ts` - Environment variables and global variables initialization

#### Modules Directory (`src/modules/`)

##### Auth Module (`src/modules/auth/`)
Complete authentication and authorization system:

**Controllers** (`controllers/`)
- `account.controller.ts` - User account management endpoints
- `base-oauth.controller.ts` - Base OAuth controller with common logic
- `github-oauth.controller.ts` - GitHub OAuth authentication endpoints
- `google-oauth.controller.ts` - Google OAuth authentication endpoints
- `magic-link.controller.ts` - Magic link authentication endpoints
- `otp.controller.ts` - OTP (One-Time Password) authentication endpoints

**Services** (`services/`)
- `account.service.ts` - User account business logic
- `base-oauth.service.ts` - Base OAuth service with common functionality
- `cookie.service.ts` - Cookie management (set, clear, validate)
- `github-oauth.service.ts` - GitHub OAuth integration
- `google-oauth.service.ts` - Google OAuth integration
- `jwt-auth.service.ts` - JWT token generation and verification
- `magic-link.service.ts` - Magic link generation and validation
- `otp.service.ts` - OTP generation and verification

**Entities** (`entities/`)
- `user.entity.ts` - User account information
- `account.entity.ts` - OAuth provider accounts linked to users
- `password.entity.ts` - User password credentials (hashed)
- `token.entity.ts` - Refresh tokens for JWT authentication
- `magic-link.entity.ts` - Magic link tokens for passwordless login
- `otp.entity.ts` - One-time password codes
- `security-log.entity.ts` - Security audit logs (login attempts, failures)

**Repositories** (`repositories/`)
- Custom TypeORM repositories for each entity with specialized query methods

**Guards** (`guards/`)
- `jwt-auth.guard.ts` - Protect routes requiring authentication
- `roles.guard.ts` - Protect routes requiring specific roles

**Decorators** (`decorators/`)
- `get-user.decorator.ts` - Extract authenticated user from request
- `get-user-id.decorator.ts` - Extract user ID from request
- `roles.decorator.ts` - Set required roles for endpoints

**DTOs** (`dtos/`)
- `auth.dto.ts` - Authentication request/response DTOs
- `jwt-payload.dto.ts` - JWT token payload structure
- `magic-link.dto.ts` - Magic link request/response DTOs
- `oauth-auth.dto.ts` - OAuth authentication DTOs
- `oauth-callback.dto.ts` - OAuth callback DTOs
- `otp.dto.ts` - OTP request/response DTOs
- `password.dto.ts` - Password management DTOs
- `user.dto.ts` - User data DTOs
- `username.dto.ts` - Username related DTOs

**Interceptors** (`interceptors/`)
- `auth-cookie.interceptor.ts` - Automatically set authentication cookies on successful login

**Models** (`models/`)
- `authenticated-user.model.ts` - Authenticated user model attached to requests

**Constants** (`constants/`)
- `cookie.constant.ts` - Cookie configuration constants
- `strategy.constant.ts` - Authentication strategy constants

**Utils** (`utils/`)
- JWT configuration helpers and utility functions

##### Health Module (`src/modules/health/`)
Health check endpoints for monitoring:
- `health.controller.ts` - Health check endpoints
- `health.service.ts` - Health check logic (database, memory, disk)
- `health.module.ts` - Health module configuration

#### Scripts Directory (`src/scripts/`)
- `generate-rsa-keys.ts` - Generate RSA private/public key pair for JWT signing

#### Templates Directory (`src/templates/`)
Handlebars email templates:
- `magic-link.hbs` - Magic link email template
- `otp.hbs` - OTP code email template
- `password-reset.hbs` - Password reset email template

### Test Directory (`test/`)
- `app.e2e-spec.ts` - End-to-end integration tests
- `jest-e2e.json` - Jest configuration for E2E tests

## Configuration

### Configuration Files

The project uses YAML configuration files located in the `config/` directory:

- `default.yml` - Default configuration for all environments
- `development.yml` - Development-specific configuration (optional)
- `production.yml` - Production-specific configuration (optional)

Configuration files are automatically loaded based on `NODE_ENV`:
```bash
# Development
NODE_ENV=development pnpm start:dev

# Production
NODE_ENV=production pnpm start:prod
```

### Setup Instructions

1. Copy the example configuration file:
```bash
cp config/example.yml config/default.yml
```

2. Edit `config/default.yml` with your configuration values

3. (Optional) Create environment-specific configuration files:
   - `config/development.yml` for development
   - `config/production.yml` for production

4. Set the `NODE_ENV` environment variable when running the application

## Development

### Code Structure Guidelines

#### Controllers
- Handle HTTP requests and responses
- Validate input data using DTOs
- Use decorators for authentication and authorization
- Delegate business logic to services
- Keep controllers thin and focused on HTTP concerns

Example:
```typescript
@Controller('auth')
@ApiTags('Authentication')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  async login(@Body() loginDto: LoginDto) {
    return this.accountService.login(loginDto);
  }
}
```

#### Services
- Contain business logic
- Interact with repositories for data access
- Should be reusable and testable
- Handle complex operations and workflows

Example:
```typescript
@Injectable()
export class AccountService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordRepository: PasswordRepository,
  ) {}

  async login(loginDto: LoginDto) {
    // Business logic here
  }
}
```

#### Repositories
- Database access layer
- Extend TypeORM Repository
- Contain custom query methods
- Encapsulate database-specific logic

Example:
```typescript
@Injectable()
export class UserRepository extends Repository<UserEntity> {
  constructor(private dataSource: DataSource) {
    super(UserEntity, dataSource.createEntityManager());
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.findOne({ where: { email } });
  }
}
```

#### Entities
- TypeORM entities that map to database tables
- Define database schema and relationships
- Include validation decorators
- Extend base entities for common fields

Example:
```typescript
@Entity('users')
export class UserEntity extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  username: string;

  @OneToMany(() => AccountEntity, account => account.user)
  accounts: AccountEntity[];
}
```

#### DTOs (Data Transfer Objects)
- Input validation using class-validator
- Data transformation and serialization
- API documentation with Swagger decorators
- Separate DTOs for requests and responses

Example:
```typescript
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @IsString()
  @MinLength(8)
  @ApiProperty({ example: 'Password123!' })
  password: string;
}
```

### Common Decorators

#### Authentication Decorators
```typescript
@UseGuards(JwtAuthGuard)          // Require JWT token
@Roles('admin', 'user')           // Role-based access control
```

#### Parameter Decorators
```typescript
@GetUser() user: AuthenticatedUser    // Get authenticated user
@GetUserId() userId: string           // Get user ID from token
```

#### Validation Decorators
```typescript
@IsEmail()                       // Validate email format
@IsString()                      // Validate string type
@IsOptional()                    // Mark field as optional
@MinLength(8)                    // Minimum string length
@IsNotEmpty()                    // Field cannot be empty
```

#### Swagger Documentation Decorators
```typescript
@ApiTags('auth')                                    // Group endpoints
@ApiOperation({ summary: 'Login user' })            // Describe operation
@ApiResponse({ status: 200, description: 'Success' }) // Document response
@ApiProperty({ example: 'value' })                  // Document DTO fields
```

### Database Management

#### TypeORM Synchronization
In development, TypeORM can automatically synchronize database schema:
```yaml
db:
  synchronize: true  # Auto-sync in development
```

**Warning**: In production, set `synchronize: false` and use migrations instead.

#### Migrations
For production environments, use TypeORM migrations:
```bash
# Generate migration
pnpm typeorm migration:generate -n MigrationName

# Run migrations
pnpm typeorm migration:run

# Revert migration
pnpm typeorm migration:revert
```

### Validation

The project uses `class-validator` for automatic input validation. Global validation is configured in `main.ts`:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,              // Automatically transform payloads to DTO instances
    whitelist: true,              // Strip properties not in DTO
    forbidNonWhitelisted: false,  // Don't throw error for extra properties
    transformOptions: {
      enableImplicitConversion: true, // Automatically convert types
    },
  }),
);
```

Example validation in DTOs:
```typescript
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and numbers',
  })
  password: string;

  @IsOptional()
  @IsString()
  username?: string;
}
```

### Error Handling

#### Custom Exception Filters
- `QueryFailedErrorFilter` - Handles TypeORM database errors and returns appropriate HTTP responses

#### Global Error Handling
All unhandled exceptions are caught and transformed into proper HTTP responses with appropriate status codes and error messages.

### Logging

#### HTTP Request Logging
The `HttpLoggerMiddleware` logs all incoming HTTP requests with:
- Request method and URL
- Request headers
- Request body
- Response status code
- Response time

### Hot Module Replacement (HMR)

HMR is enabled in development mode for faster development cycles. The application automatically reloads when code changes are detected without losing application state.

### Code Quality

#### Linting
```bash
# Run ESLint
pnpm lint

# Fix linting errors automatically
pnpm lint --fix
```

#### Code Formatting
```bash
# Format code with Prettier
pnpm format
```

#### Pre-commit Hooks
Consider setting up pre-commit hooks to automatically:
- Run linting
- Format code
- Run tests

## Testing

### Test Commands

```bash
# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate test coverage report
pnpm test:cov

# Run end-to-end tests
pnpm test:e2e

# Run tests in debug mode
pnpm test:debug
```

### Test Structure

```
test/
├── app.e2e-spec.ts        # End-to-end integration tests
└── jest-e2e.json          # Jest configuration for E2E tests

src/
└── **/*.spec.ts           # Unit tests (co-located with source files)
```

### Writing Tests

#### Unit Tests
Unit tests should be placed next to the file being tested with the `.spec.ts` extension:

```typescript
// user.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should return a user when email exists', async () => {
      // Test implementation
    });
  });
});
```

#### E2E Tests
End-to-end tests are located in the `test/` directory:

```typescript
// app.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200);
  });
});
```

### Test Coverage

Test coverage reports are generated in the `coverage/` directory when running `pnpm test:cov`. Open `coverage/lcov-report/index.html` in a browser to view detailed coverage information.

## Scripts

### Development Scripts

```bash
# Start development server with hot reload
pnpm start:dev

# Start development server in debug mode
# Allows attaching debugger on port 9229
pnpm start:debug

# Start production server
pnpm start

# Watch mode (alias for start:dev)
pnpm start --watch
```

### Build Scripts

```bash
# Build for production
# Compiles TypeScript to JavaScript in dist/ directory
pnpm build

# Start production build
pnpm start:prod
```

### Code Quality Scripts

```bash
# Run ESLint to check for code issues
pnpm lint

# Run ESLint and automatically fix issues
pnpm lint --fix

# Format code with Prettier
pnpm format
```

### Testing Scripts

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode (re-runs on file changes)
pnpm test:watch

# Generate test coverage report
pnpm test:cov

# Run end-to-end tests
pnpm test:e2e

# Run tests in debug mode
pnpm test:debug
```

### Utility Scripts

```bash
# Generate RSA key pair for JWT signing
pnpm tsx src/scripts/generate-rsa-keys.ts

# Run TypeORM CLI commands
pnpm typeorm [command]
```
