# Prompts triển khai Common Libraries

> 3 prompts cho Claude AI — mỗi prompt triển khai 1 common library.
> Copy từng prompt vào Claude AI conversation riêng.
> Đảm bảo đã tạo sẵn Nx library projects trước khi chạy prompt.

---

## Prompt 1: go-common

```
Tôi đang xây dựng hệ thống music streaming polyglot microservices với Nx monorepo. Tôi đã tạo sẵn Nx library project `go-common` tại `libs/go-common/`. Library này sẽ được dùng bởi 3 Go services: gateway (API Gateway), streaming-service (audio streaming), upload-service (upload + transcode).

Hãy triển khai `go-common` với cấu trúc và chức năng sau:

### Cấu trúc thư mục:

libs/go-common/
├── go.mod            # module github.com/team/music-app/libs/go-common
├── go.sum
├── rabbitmq/
│   ├── connection.go
│   ├── publisher.go
│   └── consumer.go
├── postgres/
│   └── pool.go
├── minio/
│   └── client.go
├── observability/
│   ├── logger.go
│   ├── metrics.go
│   └── health.go
├── server/
│   ├── config.go
│   └── graceful.go
└── auth/
    └── jwt.go

### Chi tiết từng module:

**1. rabbitmq/connection.go**
- Struct `Connection` wrap `amqp091-go` connection + channel.
- `NewConnection(url string) (*Connection, error)` — connect với retry (3 lần, backoff 2s).
- Auto-reconnect khi connection drop (goroutine monitor `NotifyClose`).
- `Close()` graceful cleanup.
- Thread-safe channel pool (hoặc channel-per-goroutine pattern).

**2. rabbitmq/publisher.go**
- Struct `Publisher` nhận `*Connection`.
- `Publish(exchange, routingKey string, event any) error`:
  - Marshal event sang JSON.
  - Set headers: `ContentType: application/json`, `DeliveryMode: Persistent`, `MessageId: uuid`, `Timestamp: now`.
  - Publish qua channel.
- `PublishWithCorrelation(exchange, routingKey string, event any, correlationId string) error` — thêm `CorrelationId` header cho distributed tracing.

**3. rabbitmq/consumer.go**
- `Consumer` struct.
- `NewConsumer(conn *Connection, queue string, handler func([]byte) error, opts ...ConsumerOption) *Consumer`.
- ConsumerOptions: `WithPrefetchCount(n)`, `WithRetryCount(n)`, `WithDeadLetterExchange(exchange)`.
- Consume loop: nhận message → call handler → nếu ok: ack, nếu error: nack + retry count check → nếu hết retry: reject (route to DLQ).
- Graceful stop: `Stop()` cancel context, drain in-flight messages.

**4. postgres/pool.go**
- `NewPool(connString string) (*pgxpool.Pool, error)` — tạo pgxpool.Pool với config:
  - MaxConns: 20 (configurable qua env)
  - MinConns: 5
  - HealthCheckPeriod: 30s
  - ConnectTimeout: 5s
- `Ping(ctx context.Context, pool *pgxpool.Pool) error` — health check helper.

**5. minio/client.go**
- `NewMinioClient(endpoint, accessKey, secretKey string, useSSL bool) (*minio.Client, error)`.
- `PresignedGetURL(client *minio.Client, bucket, object string, expiry time.Duration) (string, error)` — generate presigned URL cho audio streaming.
- `PresignedPutURL(client *minio.Client, bucket, object string, expiry time.Duration) (string, error)` — cho upload.

**6. observability/logger.go**
- Dùng `rs/zerolog`.
- `NewLogger(serviceName string) zerolog.Logger` — JSON output, level từ env `LOG_LEVEL`, thêm `service` field.
- `RequestLogger(logger zerolog.Logger) func(http.Handler) http.Handler` — HTTP middleware log mỗi request: method, path, status, latency, requestId.
- Request ID: đọc từ header `X-Request-Id`, nếu không có thì generate UUID.

**7. observability/metrics.go**
- Dùng `prometheus/client_golang`.
- `SetupMetrics(mux *http.ServeMux)` — register `/metrics` endpoint.
- Default metrics: `http_requests_total` (counter, labels: method, path, status), `http_request_duration_seconds` (histogram, labels: method, path).
- `MetricsMiddleware(next http.Handler) http.Handler` — auto-record metrics cho mỗi request.

**8. observability/health.go**
- `HealthChecker` struct chứa map[string]func(ctx) error (dependency checkers).
- `NewHealthChecker()` + `AddCheck(name string, checker func(ctx) error)`.
- `Handler() http.HandlerFunc` — GET /health → ping tất cả deps → trả JSON `{"status":"UP","services":{"postgres":"UP","rabbitmq":"UP"}}`. Nếu bất kỳ dep DOWN → status = "DEGRADED", HTTP 503.

**9. server/config.go**
- `Config` struct chứa tất cả env vars chung:
  - `Port`, `DatabaseURL`, `RabbitURL`, `MinioEndpoint`, `MinioAccessKey`, `MinioSecretKey`, `MinioUseSSL`, `JWTSecret`, `LogLevel`, `ServiceName`.
- `LoadConfig() (*Config, error)` — đọc từ env vars, validate required fields, return error nếu thiếu.
- Dùng struct tags hoặc manual os.Getenv (KHÔNG dùng viper — quá nặng cho Go services nhẹ).

**10. server/graceful.go**
- `GracefulShutdown(server *http.Server, cleanup func())`:
  - Listen OS signals (SIGINT, SIGTERM).
  - Khi nhận signal: log "shutting down", call `server.Shutdown(ctx)` với timeout 30s.
  - Call `cleanup()` (close DB, MQ connections).
  - Exit.

**11. auth/jwt.go**
- `ParseUserFromHeaders(r *http.Request) (userId string, role string, err error)`:
  - Đọc `X-User-Id` và `X-User-Role` từ request headers (đã được Gateway set sau khi validate JWT).
  - Dùng bởi streaming-service và upload-service (không validate JWT, chỉ đọc headers).
- `ValidateJWT(tokenString, secret string) (*Claims, error)`:
  - Parse + validate JWT token. Return claims (userId, role, exp).
  - Dùng bởi gateway (validate mỗi request).
  - Dùng library `golang-jwt/jwt/v5`.
- `Claims` struct: `UserID string`, `Role string`, `jwt.RegisteredClaims`.

### Dependencies (go.mod):
- github.com/rabbitmq/amqp091-go
- github.com/jackc/pgx/v5
- github.com/minio/minio-go/v7
- github.com/rs/zerolog
- github.com/prometheus/client_golang
- github.com/golang-jwt/jwt/v5
- github.com/google/uuid

### Yêu cầu code:
- Mỗi function/struct có godoc comment tiếng Anh.
- Error handling đầy đủ, wrap errors với context (`fmt.Errorf("failed to connect rabbitmq: %w", err)`).
- Thread-safe: tất cả shared state dùng mutex hoặc channel.
- Không dùng init() functions.
- Unit tests cho auth/jwt.go và observability/health.go (file *_test.go cùng package).

### Cách services import:
Go services dùng go.mod replace directive:
```
replace github.com/team/music-app/libs/go-common => ../../libs/go-common
```

Hãy tạo tất cả files với code hoàn chỉnh, production-ready.
```

---

## Prompt 2: libs-java-common

```
Tôi đang xây dựng hệ thống music streaming polyglot microservices với Nx monorepo. Tôi đã tạo sẵn Nx library project `libs-java-common` tại `libs/libs-java-common/`. Đây là một Gradle module (Kotlin DSL), được dùng bởi 3 Java services chạy Spring Boot 3.3+: user-service, catalog-service, playlist-service. Toàn bộ project dùng Gradle, KHÔNG dùng Maven.

Hãy triển khai `libs-java-common` với cấu trúc và chức năng sau:

### Cấu trúc thư mục:

libs/libs-java-common/
├── build.gradle.kts
├── project.json
└── src/main/java/com/musicapp/common/
    ├── security/
    │   ├── JwtAuthFilter.java
    │   ├── JwtUtil.java
    │   ├── SecurityConfig.java
    │   └── CurrentUser.java
    ├── web/
    │   ├── GlobalExceptionHandler.java
    │   ├── ErrorResponse.java
    │   ├── ValidationErrorResponse.java
    │   ├── PaginatedResponse.java
    │   └── PaginationMapper.java
    ├── messaging/
    │   ├── RabbitConfig.java
    │   ├── EventPublisher.java
    │   ├── EventHeader.java
    │   └── EventSerializer.java
    ├── persistence/
    │   ├── BaseEntity.java
    │   └── AuditConfig.java
    └── config/
        ├── CorsConfig.java
        └── ActuatorConfig.java

### Chi tiết từng class:

**1. security/JwtAuthFilter.java**
- Extends `OncePerRequestFilter`.
- Đọc header `Authorization: Bearer {token}`.
- Nếu có token: parse bằng `JwtUtil.validateToken()` → extract userId, role.
- Set `UsernamePasswordAuthenticationToken` vào `SecurityContextHolder` với authorities từ role.
- Set headers `X-User-Id` và `X-User-Role` vào request (cho downstream code đọc).
- Nếu không có token hoặc invalid: skip filter (cho endpoint public qua).
- Skip filter cho paths: `/actuator/**`, `/swagger-ui/**`, `/v3/api-docs/**`.

**2. security/JwtUtil.java**
- `@Component`.
- `@Value("${jwt.secret}")` inject secret từ application.yml.
- `@Value("${jwt.access-token-expiration:3600000}")` — 1 giờ default.
- `@Value("${jwt.refresh-token-expiration:604800000}")` — 7 ngày default.
- `generateAccessToken(String userId, String role) → String` — tạo JWT với claims: sub=userId, role=role, iat, exp.
- `generateRefreshToken(String userId) → String` — JWT đơn giản, exp dài hơn.
- `validateToken(String token) → Claims` — parse + validate. Throw `JwtException` nếu invalid/expired.
- `getUserIdFromToken(String token) → String`.
- `getRoleFromToken(String token) → String`.
- Dùng library `io.jsonwebtoken:jjwt-api` + `jjwt-impl` + `jjwt-jackson`.

**3. security/SecurityConfig.java**
- `@Configuration` + `@EnableWebSecurity`.
- `@Bean SecurityFilterChain` configure:
  - `csrf().disable()` (stateless API).
  - `sessionManagement().sessionCreationPolicy(STATELESS)`.
  - `authorizeHttpRequests`: permit `/api/v1/auth/**`, `/actuator/**`, `/swagger-ui/**`, `/v3/api-docs/**`. Tất cả khác require authenticated.
  - Add `JwtAuthFilter` before `UsernamePasswordAuthenticationFilter`.
- Đây là default config — mỗi service có thể override bằng cách define `SecurityFilterChain` bean riêng với `@Order` thấp hơn.
- Class này là `@ConditionalOnMissingBean(SecurityFilterChain.class)` để service có thể override hoàn toàn.

**4. security/CurrentUser.java**
- Utility class `public final class CurrentUser` (không instantiate).
- `static String getUserId()` — lấy userId từ SecurityContext.
- `static String getRole()` — lấy role từ SecurityContext.
- `static boolean isAdmin()` — role == "ADMIN".
- `static boolean isArtist()` — role == "ARTIST".
- Throw `UnauthorizedException` nếu chưa authenticated.

**5. web/GlobalExceptionHandler.java**
- `@RestControllerAdvice`.
- Handle exceptions:
  - `EntityNotFoundException` → 404 `ErrorResponse`.
  - `AccessDeniedException` → 403 `ErrorResponse`.
  - `MethodArgumentNotValidException` → 400 `ValidationErrorResponse` (list field errors).
  - `ConstraintViolationException` → 400.
  - `HttpMessageNotReadableException` → 400 "Malformed JSON".
  - `DataIntegrityViolationException` → 409 "Conflict" (unique constraint violation).
  - `JwtException` (từ JwtUtil) → 401.
  - `Exception` → 500 "Internal Server Error" (log full stack trace, trả generic message).
- Tất cả trả `ErrorResponse` hoặc `ValidationErrorResponse` format thống nhất.

**6. web/ErrorResponse.java**
- Java record: `ErrorResponse(int status, String error, String message, Instant timestamp, String path)`.
- Factory method `of(int status, String message, String path)` — auto-set error name từ status, timestamp = now.

**7. web/ValidationErrorResponse.java**
- Java record: `ValidationErrorResponse(int status, String error, List<FieldError> errors, Instant timestamp)`.
- Nested record: `FieldError(String field, String message)`.

**8. web/PaginatedResponse.java**
- Generic record: `PaginatedResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages)`.

**9. web/PaginationMapper.java**
- Utility class.
- `static <T, R> PaginatedResponse<R> toResponse(Page<T> page, Function<T, R> mapper)`:
  - Map mỗi entity sang DTO bằng function.
  - Return `PaginatedResponse` với pagination metadata từ Spring `Page`.

**10. messaging/RabbitConfig.java**
- `@Configuration`.
- Declare exchanges (TopicExchange):
  - `events.upload`, `events.catalog`, `events.streaming`, `events.user`, `events.playlist`.
- `@Bean MessageConverter` — `Jackson2JsonMessageConverter` cho JSON serialization.
- `@Bean RabbitTemplate` — set message converter.
- Mỗi service tự declare queues và bindings riêng (không declare ở common).

**11. messaging/EventPublisher.java**
- `@Component`, inject `RabbitTemplate`.
- `publishEvent(String exchange, String routingKey, Object event)`:
  - Wrap event trong envelope: set `eventId` (UUID), `timestamp` (now), `sourceService` (từ `spring.application.name`).
  - Send qua `RabbitTemplate.convertAndSend(exchange, routingKey, event)`.
- `publishEventWithCorrelation(String exchange, String routingKey, Object event, String correlationId)`.

**12. messaging/EventHeader.java**
- Java record: `EventHeader(String eventId, String eventType, Instant timestamp, String sourceService, String correlationId)`.
- Factory method `EventHeader.create(String eventType, String sourceService)` — auto-generate eventId + timestamp.

**13. messaging/EventSerializer.java**
- Custom `Jackson2JsonMessageConverter` configuration:
  - Register `JavaTimeModule` cho Instant/LocalDate serialization.
  - Set `WRITE_DATES_AS_TIMESTAMPS = false` (ISO-8601 format).
  - Set `FAIL_ON_UNKNOWN_PROPERTIES = false` (backward compatible — new fields don't break old consumers).

**14. persistence/BaseEntity.java**
- `@MappedSuperclass` + `@EntityListeners(AuditingEntityListener.class)`.
- Fields:
  - `@Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id`.
  - `@CreatedDate @Column(updatable = false) private Instant createdAt`.
  - `@LastModifiedDate private Instant updatedAt`.
- Getter only cho id (immutable). Getter/setter cho timestamps (managed by JPA auditing).

**15. persistence/AuditConfig.java**
- `@Configuration` + `@EnableJpaAuditing`.
- Enable `@CreatedDate`, `@LastModifiedDate` auto-population.

**16. config/CorsConfig.java**
- `@Configuration`.
- `@Bean WebMvcConfigurer` — addCorsMappings:
  - allowedOrigins từ `${cors.allowed-origins:http://localhost:3000}`.
  - allowedMethods: GET, POST, PUT, PATCH, DELETE, OPTIONS.
  - allowedHeaders: *.
  - allowCredentials: true.

**17. config/ActuatorConfig.java**
- Properties class `@ConfigurationProperties(prefix = "management")`.
- Mục đích: document rằng mỗi service cần set trong application.yml:
  ```yaml
  management:
    endpoints:
      web:
        exposure:
          include: health,prometheus,info
    endpoint:
      health:
        show-details: always
  ```

### build.gradle.kts:
```kotlin
plugins {
    `java-library`
    id("io.spring.dependency-management") version "1.1.6"
}

group = "com.musicapp"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

dependencyManagement {
    imports {
        mavenBom("org.springframework.boot:spring-boot-dependencies:3.3.5")
    }
}

dependencies {
    // Spring Boot starters — compileOnly vì service sẽ cung cấp (tránh conflict version)
    compileOnly("org.springframework.boot:spring-boot-starter-web")
    compileOnly("org.springframework.boot:spring-boot-starter-security")
    compileOnly("org.springframework.boot:spring-boot-starter-data-jpa")
    compileOnly("org.springframework.boot:spring-boot-starter-amqp")
    compileOnly("org.springframework.boot:spring-boot-starter-actuator")

    // JWT
    api("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

    // OpenAPI docs
    compileOnly("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0")

    // Micrometer Prometheus
    compileOnly("io.micrometer:micrometer-registry-prometheus")

    // Annotation processors
    annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")

    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

### Lưu ý build.gradle.kts:
- Plugin `java-library` — đây là library, KHÔNG dùng `org.springframework.boot` plugin (không build fat jar).
- `compileOnly` cho Spring starters — service cung cấp version thực tế, library chỉ compile against API.
- `api` cho jjwt — transitive dependency, service không cần khai báo lại.
- `dependencyManagement` import Spring Boot BOM để align versions.
- Root project `settings.gradle.kts` phải include module này: `include("libs:libs-java-common")`.

### Yêu cầu code:
- Java 21, dùng records cho DTOs và Value Objects.
- Javadoc comment cho mỗi public class/method.
- `@ConditionalOnMissingBean` cho configs mà service có thể override (SecurityFilterChain, CorsConfigurer).
- Không có `@SpringBootApplication` — đây là library.
- Dùng `@AutoConfiguration` hoặc `spring.factories` / `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` để Spring Boot auto-detect configs khi service import dependency.
- Unit tests cho JwtUtil (generate + validate + expired token).

### Cách services import:
Gradle dependency trong service `build.gradle.kts`:
```kotlin
dependencies {
    implementation(project(":libs:libs-java-common"))
}
```

Root `settings.gradle.kts` phải include:
```kotlin
include("libs:libs-java-common")
include("services:user-service")
include("services:catalog-service")
include("services:playlist-service")
```

Service chỉ cần set `jwt.secret` và `spring.application.name` trong application.yml — tất cả security, exception handling, pagination, messaging, auditing tự động hoạt động.

Hãy tạo tất cả files với code hoàn chỉnh, production-ready.
```

---

## Prompt 3: ts-common (NestJS)

```
Tôi đang xây dựng hệ thống music streaming polyglot microservices với Nx monorepo. Tôi đã tạo sẵn Nx library project `ts-common` tại `libs/ts-common/`. Library này sẽ được dùng bởi 2 TypeScript services chạy NestJS: notification-service (WebSocket + MongoDB) và search-service (Elasticsearch). Lưu ý: dùng NestJS, KHÔNG phải Fastify.

Hãy triển khai `ts-common` với cấu trúc và chức năng sau:

### Cấu trúc thư mục:

libs/ts-common/
├── project.json
├── package.json          # @music-app/ts-common
├── tsconfig.json
├── tsconfig.lib.json
├── jest.config.ts
└── src/
    ├── index.ts          # Re-export tất cả modules
    ├── rabbitmq/
    │   ├── rabbitmq.module.ts
    │   ├── rabbitmq.service.ts
    │   ├── rabbitmq.constants.ts
    │   ├── consumer.decorator.ts
    │   └── rabbitmq.interfaces.ts
    ├── redis/
    │   ├── redis.module.ts
    │   └── redis.service.ts
    ├── health/
    │   ├── health.module.ts
    │   └── health.controller.ts
    ├── metrics/
    │   ├── metrics.module.ts
    │   ├── metrics.service.ts
    │   └── metrics.interceptor.ts
    ├── auth/
    │   ├── auth.guard.ts
    │   ├── auth.decorator.ts
    │   └── auth.interfaces.ts
    ├── logging/
    │   ├── logging.module.ts
    │   └── logging.interceptor.ts
    └── exceptions/
        ├── exception.filter.ts
        └── error-response.interface.ts

### Chi tiết từng module:

**1. rabbitmq/rabbitmq.module.ts**
- `@Module` dynamic module: `RabbitMQModule.forRoot(options: RabbitMQModuleOptions)`.
- Options interface:
  ```typescript
  interface RabbitMQModuleOptions {
    url: string;                          // amqp://localhost:5672
    exchanges?: ExchangeConfig[];         // exchanges to assert
    queues?: QueueConfig[];               // queues to assert + bind
    prefetchCount?: number;               // default 10
    retryAttempts?: number;               // default 3
    retryDelay?: number;                  // default 5000ms
  }
  interface ExchangeConfig {
    name: string;
    type: 'topic' | 'direct' | 'fanout';
    durable?: boolean;
  }
  interface QueueConfig {
    name: string;
    exchange: string;
    routingKey: string;
    deadLetterExchange?: string;
  }
  ```
- OnModuleInit: connect amqplib, assert exchanges, assert queues, bind queues.
- OnModuleDestroy: close connection gracefully.

**2. rabbitmq/rabbitmq.service.ts**
- `@Injectable()` `RabbitMQService`.
- `publish(exchange: string, routingKey: string, event: any, correlationId?: string): Promise<void>`:
  - JSON.stringify event.
  - Set properties: contentType, persistent, messageId (uuid), timestamp, correlationId.
  - channel.publish().
- `subscribe(queue: string, handler: (msg: ConsumeMessage) => Promise<void>): Promise<void>`:
  - channel.consume(queue, ...).
  - Auto-ack on success, nack + requeue on failure.
  - Retry logic: check `x-retry-count` header, nếu >= maxRetries → reject (route to DLQ).
- `getChannel(): Channel` — expose channel cho advanced use cases.

**3. rabbitmq/consumer.decorator.ts**
- Custom decorator `@RabbitConsumer(queue: string)` để dùng declarative:
  ```typescript
  @Injectable()
  export class TrackSyncConsumer {
    @RabbitConsumer('search.track-sync')
    async handleTrackPublished(event: TrackPublishedEvent) {
      // re-index ES
    }
  }
  ```
- Implement bằng cách register metadata → RabbitMQModule scan và auto-subscribe on bootstrap.

**4. redis/redis.module.ts**
- `@Module` dynamic module: `RedisModule.forRoot(options: RedisModuleOptions)`.
- Options: `{ url: string, keyPrefix?: string }`.
- Provide `RedisService` as singleton.

**5. redis/redis.service.ts**
- `@Injectable()` `RedisService`, wrap `ioredis`.
- Methods:
  - `get(key: string): Promise<string | null>`
  - `set(key: string, value: string, ttlSeconds?: number): Promise<void>`
  - `del(key: string): Promise<void>`
  - `incr(key: string): Promise<number>`
  - `decr(key: string): Promise<number>`
  - `exists(key: string): Promise<boolean>`
  - `getClient(): Redis` — expose raw ioredis client cho advanced (pub/sub, etc).
- OnModuleDestroy: disconnect.

**6. health/health.module.ts**
- `@Module` import `TerminusModule` (NestJS built-in health checks).
- Cung cấp `HealthController`.

**7. health/health.controller.ts**
- `@Controller('health')`.
- `@Get()` — dùng `@nestjs/terminus`:
  - Check custom health indicators: RabbitMQ ping, Redis ping.
  - Service-specific checks (MongoDB, Elasticsearch) register bởi service tự thêm.
  - Return: `{ status: "ok" | "error", info: { rabbitmq: { status: "up" }, redis: { status: "up" } } }`.

**8. metrics/metrics.module.ts**
- `@Module` cung cấp `MetricsService` + `MetricsInterceptor`.
- Register `/metrics` route serve Prometheus text format.

**9. metrics/metrics.service.ts**
- `@Injectable()` `MetricsService`.
- Dùng `prom-client`.
- OnModuleInit: `collectDefaultMetrics()`.
- Custom metrics:
  - `httpRequestsTotal`: Counter — labels: method, path, statusCode.
  - `httpRequestDuration`: Histogram — labels: method, path.
- `getMetrics(): Promise<string>` — `register.metrics()` trả Prometheus text.

**10. metrics/metrics.interceptor.ts**
- `@Injectable()` implements `NestInterceptor`.
- Intercept mọi HTTP request:
  - Record start time.
  - `tap()` on response: increment counter, observe duration.
  - Label: method, route path (không phải full URL để tránh cardinality explosion), status code.

**11. auth/auth.guard.ts**
- `@Injectable()` implements `CanActivate`.
- Đọc headers `X-User-Id` và `X-User-Role` (đã set bởi API Gateway sau JWT validation).
- Nếu `X-User-Id` tồn tại: set user info vào request object, return true.
- Nếu không: throw `UnauthorizedException`.
- KHÔNG validate JWT — Gateway đã làm. Guard chỉ kiểm tra header presence.

**12. auth/auth.decorator.ts**
- `@CurrentUser()` parameter decorator:
  ```typescript
  @Get('notifications')
  async getNotifications(@CurrentUser() user: AuthUser) {
    // user.userId, user.role
  }
  ```
- `@Roles(...roles: string[])` decorator + `RolesGuard`:
  ```typescript
  @Roles('ARTIST', 'ADMIN')
  @Post('upload')
  async upload() { ... }
  ```
- `@Public()` decorator — mark endpoint không cần auth (skip AuthGuard).
- Interface `AuthUser { userId: string; role: string }`.

**13. logging/logging.module.ts**
- `@Module` provide `LoggingInterceptor` as APP_INTERCEPTOR (global).
- Dùng NestJS built-in `Logger` hoặc `pino` qua `nestjs-pino`.

**14. logging/logging.interceptor.ts**
- `@Injectable()` implements `NestInterceptor`.
- Log mỗi request: method, URL, userId (nếu có), response status, duration (ms).
- Log format: JSON structured.
- Không log body (security — có thể chứa password).

**15. exceptions/exception.filter.ts**
- `@Catch()` implements `ExceptionFilter`.
- Handle:
  - `HttpException` (NestJS built-in) → trả format chuẩn.
  - `Error` (unknown) → 500 Internal Server Error, log full stack.
- Response format thống nhất: `ErrorResponse { status, error, message, timestamp, path }`.

**16. exceptions/error-response.interface.ts**
- Interface `ErrorResponse`:
  ```typescript
  interface ErrorResponse {
    status: number;
    error: string;
    message: string;
    timestamp: string;  // ISO-8601
    path: string;
  }
  ```

### index.ts re-exports:
```typescript
// Modules
export { RabbitMQModule } from './rabbitmq/rabbitmq.module';
export { RedisModule } from './redis/redis.module';
export { HealthModule } from './health/health.module';
export { MetricsModule } from './metrics/metrics.module';
export { LoggingModule } from './logging/logging.module';

// Services
export { RabbitMQService } from './rabbitmq/rabbitmq.service';
export { RedisService } from './redis/redis.service';
export { MetricsService } from './metrics/metrics.service';

// Guards & Decorators
export { AuthGuard } from './auth/auth.guard';
export { CurrentUser, Roles, Public } from './auth/auth.decorator';

// Filters & Interceptors
export { AllExceptionsFilter } from './exceptions/exception.filter';
export { LoggingInterceptor } from './logging/logging.interceptor';
export { MetricsInterceptor } from './metrics/metrics.interceptor';

// Decorators
export { RabbitConsumer } from './rabbitmq/consumer.decorator';

// Interfaces
export type { AuthUser } from './auth/auth.interfaces';
export type { RabbitMQModuleOptions, ExchangeConfig, QueueConfig } from './rabbitmq/rabbitmq.interfaces';
export type { ErrorResponse } from './exceptions/error-response.interface';
```

### Dependencies (package.json):
- @nestjs/common, @nestjs/core (peerDependencies — service cung cấp)
- @nestjs/terminus (health checks)
- amqplib + @types/amqplib
- ioredis
- prom-client
- uuid
- rxjs (peer)

### Cách service import:

notification-service app.module.ts:
```typescript
import {
  RabbitMQModule,
  RedisModule,
  HealthModule,
  MetricsModule,
  LoggingModule,
  AllExceptionsFilter,
  AuthGuard,
} from '@music-app/ts-common';

@Module({
  imports: [
    RabbitMQModule.forRoot({
      url: process.env.RABBIT_URL,
      exchanges: [
        { name: 'events.user', type: 'topic' },
        { name: 'events.playlist', type: 'topic' },
        { name: 'events.catalog', type: 'topic' },
        { name: 'events.upload', type: 'topic' },
      ],
      queues: [
        { name: 'notification.all', exchange: 'events.user', routingKey: 'user.#' },
        { name: 'notification.all', exchange: 'events.playlist', routingKey: 'playlist.#' },
        { name: 'notification.all', exchange: 'events.catalog', routingKey: 'catalog.track.published' },
        { name: 'notification.all', exchange: 'events.upload', routingKey: 'upload.transcode.failed' },
      ],
    }),
    RedisModule.forRoot({ url: process.env.REDIS_URL }),
    HealthModule,
    MetricsModule,
    LoggingModule,
    MongooseModule.forRoot(process.env.MONGO_URL),  // service-specific
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
```

### Yêu cầu code:
- TypeScript strict mode.
- Mỗi module là self-contained NestJS dynamic module.
- JSDoc comments cho public APIs.
- NestJS conventions: @Injectable, @Module, forRoot pattern.
- Unit tests cho: auth.guard.ts, redis.service.ts, metrics.interceptor.ts.
- Export types cùng với implementations.
- Tất cả NestJS core packages là peerDependencies.

Hãy tạo tất cả files với code hoàn chỉnh, production-ready.
```

---

## Ghi chú quan trọng khi chạy prompts

1. **Thứ tự thực hiện:** Chạy prompt 1, 2, 3 song song được — các common libraries độc lập nhau.

2. **Sau khi tạo xong common:** cập nhật mỗi service import common tương ứng, xóa code duplicate đã có trong service.

3. **Nx dependency graph:** sau khi import, chạy `nx graph` để verify services depend on common đúng cách.

4. **Tên library thực tế:**
   - Go: `go-common` → import path `github.com/team/music-app/libs/go-common`
   - Java: `libs-java-common` → Gradle project `:libs:libs-java-common`
   - TypeScript: `ts-common` → npm package `@music-app/ts-common`

5. **NestJS thay Fastify:** `ts-common` dùng NestJS patterns (Module, Injectable, Interceptor, Guard, Decorator) thay vì Fastify plugins. Services import NestJS modules qua `imports: [...]` trong `@Module`.
