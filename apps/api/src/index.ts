import './types.d.ts';
import { getEnv } from './env';
import './tracing';
import { initializeTracing } from './tracing';

// Validate environment variables before anything else starts
getEnv();
import { initializeSentry, Sentry } from './sentry';
import { startMetricsServer } from './metrics-server';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rawBody from 'fastify-raw-body';
import { Pool } from 'pg';
import { register, httpRequestsTotal, httpRequestDuration, activeConnections } from './metrics';
import { registerProfileRoutes } from './routes/profiles';
import { registerMaskRoutes } from './routes/masks';
import { registerCvRoutes } from './routes/cv';
import { registerCurriculumVitaeMultiplexRoutes } from './routes/curriculum-vitae-multiplex';
import { registerNarrativeRoutes } from './routes/narratives';
import { registerAetasRoutes } from './routes/aetas';
import { registerExportRoutes } from './routes/exports';
import { registerBackupRoutes } from './routes/backups';
import { registerAgentRoutes } from './routes/agent-interface';
import { registerAttestationBlockRoutes } from './routes/attestation-blocks';
import { jobRoutes } from './routes/jobs';
import { interviewRoutes } from './routes/interviews';
import { registerHunterProtocolRoutes } from './routes/hunter-protocol';
import { registerArtifactRoutes } from './routes/artifacts';
import { registerIntegrationRoutes } from './routes/integrations';
import type { ProfileRepo } from './repositories/profiles';
import type { MaskRepo, EpochRepo, StageRepo } from './repositories/masks';
import { createMaskRepo } from './repositories/masks';
import { profileRepo } from './repositories/profiles';
import type { CvRepos } from './repositories/cv';
import { cvRepos } from './repositories/cv';
import type { BackupRepo } from './repositories/backups';
import type { JobRepo } from './repositories/jobs';
import { jobRepo as defaultJobRepo } from './repositories/jobs';
import { registerBillingRoutes } from './routes/billing';
import { registerAdminLicensingRoutes } from './routes/admin-licensing';
import {
  subscriptionRepo as defaultSubscriptionRepo,
  type SubscriptionRepo,
} from './repositories/subscriptions';
import {
  PostgresRateLimitStore,
  InMemoryRateLimitStore as LocalInMemoryRateLimitStore,
} from './repositories/rate-limits';
import { BillingService, LicensingService, type RateLimitStore } from '@in-midst-my-life/core';
import { versionPrefix } from './middleware/versioning';

initializeTracing();
initializeSentry();
startMetricsServer();

export interface ApiServerOptions {
  profileRepo?: ProfileRepo;
  maskRepo?: MaskRepo;
  epochRepo?: EpochRepo;
  stageRepo?: StageRepo;
  cvRepos?: CvRepos;
  backupRepo?: BackupRepo;
  jobRepo?: JobRepo;
  subscriptionRepo?: SubscriptionRepo;
  rateLimitStore?: RateLimitStore;
  billingService?: BillingService;
  licensingService?: LicensingService;
}

export function buildServer(options: ApiServerOptions = {}) {
  const fastify = Fastify({
    logger: process.env['NODE_ENV'] === 'test' ? false : true,
  });
  const metrics = { requests: 0, errors: 0 };

  const maskRepoDefaults = createMaskRepo();
  const maskRepo = options.maskRepo ?? maskRepoDefaults.masks;
  const epochRepo = options.epochRepo ?? maskRepoDefaults.epochs;
  const stageRepo = options.stageRepo ?? maskRepoDefaults.stages;

  const subRepo = options.subscriptionRepo ?? defaultSubscriptionRepo;

  const defaultRateLimitStore =
    process.env['NODE_ENV'] === 'test'
      ? new LocalInMemoryRateLimitStore()
      : new PostgresRateLimitStore(
          new Pool({
            connectionString: process.env['DATABASE_URL'] ?? process.env['POSTGRES_URL'],
          }),
        );

  // Initialize services if not provided
  const licensingService =
    options.licensingService ??
    new LicensingService(async (profileId) => {
      const sub = await subRepo.getByProfileId(profileId);
      return sub?.tier ?? 'FREE';
    }, options.rateLimitStore ?? defaultRateLimitStore);

  const billingService =
    options.billingService ??
    new BillingService({
      stripeSecretKey: process.env['STRIPE_SECRET_KEY'] || 'sk_test_mock',
      stripePriceIds: {
        FREE: { monthly: 'free', yearly: 'free' },
        PRO: {
          monthly: process.env['STRIPE_PRO_MONTHLY'] || 'price_pro_monthly',
          yearly: process.env['STRIPE_PRO_YEARLY'] || 'price_pro_yearly',
        },
        ENTERPRISE: {
          monthly: process.env['STRIPE_ENTERPRISE_MONTHLY'] || 'price_enterprise_custom',
          yearly: process.env['STRIPE_ENTERPRISE_YEARLY'] || 'price_enterprise_custom',
        },
      },
      webhookSecret: process.env['STRIPE_WEBHOOK_SECRET'] || 'whsec_test_mock',
    });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any -- Fastify plugin type mismatch
  fastify.register(rawBody as any, {
    global: false, // Only for specific routes
    runFirst: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any -- Fastify plugin type mismatch
  fastify.register(cors as any, {
    origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
      // Development: allow localhost
      const allowed = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'https://yourdomain.com',
        'https://app.yourdomain.com',
      ];

      const allowedOrigins = process.env['ALLOWED_ORIGINS']
        ? process.env['ALLOWED_ORIGINS'].split(',')
        : allowed;

      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept-Version'],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page-Count',
      'X-API-Version',
      'Deprecation',
      'Sunset',
      'Link',
    ],
    maxAge: 86400, // 24 hours
  });

  const requestStartTimes = new WeakMap<object, number>();

  fastify.addHook('onRequest', (request, _reply, done) => {
    metrics.requests += 1;
    requestStartTimes.set(request, Date.now());
    activeConnections.inc({ type: 'http' });
    done();
  });

  fastify.addHook('onResponse', (request, reply, done) => {
    const duration = (Date.now() - (requestStartTimes.get(request) ?? Date.now())) / 1000;
    const route = request.routeOptions?.url || request.url;
    const statusCode = reply.statusCode.toString();

    httpRequestsTotal.inc({
      method: request.method,
      route,
      status_code: statusCode,
    });

    httpRequestDuration.observe(
      { method: request.method, route, status_code: statusCode },
      duration,
    );

    activeConnections.dec({ type: 'http' });
    done();
  });

  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error({ err: error, url: request.url }, 'request_error');
    metrics.errors += 1;

    if (process.env['SENTRY_DSN']) {
      Sentry.captureException(error, {
        contexts: {
          request: {
            method: request.method,
            url: request.url,
            headers: request.headers,
          },
        },
      });
    }

    const fastifyError = error as Error & { statusCode?: number; code?: string };
    const status = fastifyError.statusCode ?? 500;
    return reply.status(status).send({
      ok: false,
      error: fastifyError.code ?? 'internal_error',
      message: error.message,
    });
  });

  // Note: Versioning middleware is registered per-scope in registerApiRoutes
  // System endpoints (/health, /ready, /metrics) intentionally don't have version headers

  fastify.get('/health', () => ({ status: 'ok' }));

  fastify.get('/ready', async (request, reply) => {
    try {
      await (options.profileRepo ?? profileRepo).list(0, 1);
      return { status: 'ready' };
    } catch (err) {
      request.log.error({ err }, 'readiness_failed');
      return reply.code(503).send({ status: 'degraded' });
    }
  });

  fastify.get('/metrics', async (_request, reply) => {
    reply.header('Content-Type', register.contentType);
    const legacyMetrics = [
      '# HELP api_requests_total Total API requests processed (legacy).',
      '# TYPE api_requests_total counter',
      `api_requests_total ${metrics.requests}`,
      '# HELP api_errors_total Total API requests resulting in error (legacy).',
      '# TYPE api_errors_total counter',
      `api_errors_total ${metrics.errors}`,
    ].join('\n');
    return (await register.metrics()) + '\n' + legacyMetrics;
  });

  /**
   * Register all API routes under a given scope.
   * This helper allows registering routes at both /v1/ (canonical) and root (deprecated).
   *
   * @param scope Fastify instance (scoped or root)
   * @param isDeprecated Whether this scope is deprecated (adds deprecation headers)
   */
  const registerApiRoutes = (scope: FastifyInstance, isDeprecated: boolean) => {
    // Add X-API-Version header to all responses in this scope
    // Using preHandler ensures headers are set before any response processing
    scope.addHook('preHandler', (_request, reply, done) => {
      reply.header('X-API-Version', '1');
      done();
    });

    // Add deprecation headers for deprecated scope (root routes)
    if (isDeprecated) {
      const deprecationDate = new Date();
      deprecationDate.setDate(deprecationDate.getDate() + 90); // 90-day deprecation window

      scope.addHook('preHandler', (_request, reply, done) => {
        reply.header('Deprecation', 'true');
        reply.header('Sunset', deprecationDate.toUTCString());
        reply.header('Link', `</v1${_request.url}>; rel="successor-version"`);
        done();
      });
    }

    scope.register(registerProfileRoutes, {
      prefix: '/profiles',
      repo: options.profileRepo,
      maskRepo,
      epochRepo,
      stageRepo,
    });
    scope.register(registerCvRoutes, { prefix: '/profiles', repos: options.cvRepos ?? cvRepos });
    scope.register(registerCurriculumVitaeMultiplexRoutes, { prefix: '/profiles' });
    scope.register(registerNarrativeRoutes, { prefix: '/profiles' });
    scope.register(registerAetasRoutes, { prefix: '/profiles' });
    scope.register(registerExportRoutes, {
      prefix: '/profiles',
      profileRepo: options.profileRepo ?? profileRepo,
      cvRepos: options.cvRepos ?? cvRepos,
      backupRepo: options.backupRepo,
      maskRepo,
      epochRepo,
      stageRepo,
    });
    scope.register(registerBackupRoutes, {
      prefix: '/profiles',
      profileRepo: options.profileRepo ?? profileRepo,
      cvRepos: options.cvRepos ?? cvRepos,
      backupRepo: options.backupRepo,
    });
    scope.register(registerAgentRoutes, { prefix: '/agent' });
    scope.register(registerMaskRoutes, {
      prefix: '/taxonomy',
      masks: maskRepo,
      epochs: epochRepo,
      stages: stageRepo,
    });
    scope.register(registerAttestationBlockRoutes);
    scope.register(jobRoutes);
    scope.register(interviewRoutes);
    scope.register(registerHunterProtocolRoutes, {
      prefix: '/profiles',
      repo: options.profileRepo ?? profileRepo,
      jobRepo: options.jobRepo ?? defaultJobRepo,
      licensingService,
    });
    scope.register(registerBillingRoutes, {
      prefix: '/billing',
      billingService,
      subscriptionRepo: subRepo,
      licensingService,
    });
    scope.register(registerAdminLicensingRoutes, licensingService);
    scope.register(registerArtifactRoutes);
    scope.register(registerIntegrationRoutes);
  };

  // Register v1 API routes (canonical)
  fastify.register(
    (v1Scope, _opts, done) => {
      registerApiRoutes(v1Scope, false);
      done();
    },
    { prefix: versionPrefix(1) },
  );

  // Register root API routes (deprecated - 90-day sunset)
  // These are backward-compatible aliases that will be removed after v1 adoption
  fastify.register((rootScope, _opts, done) => {
    registerApiRoutes(rootScope, true);
    done();
  });

  return fastify;
}

export async function start() {
  const fastify = buildServer();
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

if (process.env['NODE_ENV'] !== 'test') {
  void start();
}
