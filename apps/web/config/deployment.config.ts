import { z } from 'zod';

// Define environment variable schema for validation
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  API_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_PUBLISHABLE_KEY: z.string(),
  WEBPUSH_PUBLIC_KEY: z.string(),
  WEBPUSH_PRIVATE_KEY: z.string(),
  // Add more as needed
  REDIS_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().optional(),
  // Security related
  HTTPS_ENABLED: z.coerce.boolean().default(true),
  CSP_REPORT_ONLY: z.coerce.boolean().default(false),
  // Monitoring
  PAGERDUTY_KEY: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().optional(),
});

export type EnvVariables = z.infer<typeof EnvSchema>;

// Production security configurations
export interface SecurityConfig {
  https: boolean;
  csp: {
    directives: Record<string, string[]>;
    reportOnly: boolean;
    reportUri: string;
  };
  rateLimiting: {
    windowMs: number; // milliseconds
    max: number; // requests
    message: string;
    standardHeaders: boolean;
    legacyHeaders: boolean;
  };
  cors: {
    origin: string[];
    credentials: boolean;
  };
}

// Deployment scripts configuration
export interface DeploymentScripts {
  build: string;
  deploy: string;
  ciCd: {
    githubActions: string;
    gitlabCi: string;
  };
  postDeploy: string[];
}

// Rollback procedures
export interface RollbackConfig {
  enabled: boolean;
  triggers: string[]; // e.g., ['health_check_failure', 'error_rate_high']
  automation: {
    script: string;
    backupRetention: number; // days
    rollbackTimeout: number; // seconds
  };
  manualProcedure: string;
}

// Health checks
export interface HealthChecks {
  endpoints: {
    liveness: string;
    readiness: string;
  };
  thresholds: {
    uptime: number; // percentage
    responseTime: number; // ms
  };
  frequency: string; // cron expression
}

// Monitoring and alerting
export interface MonitoringConfig {
  healthMonitoring: {
    uptimeCheck: boolean;
    responseTimeCheck: boolean;
    errorTracking: boolean;
  };
  alerting: {
    pagerDuty: {
      enabled: boolean;
      serviceKey: string;
      routingKey: string;
    };
    slack: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
    };
    email: {
      enabled: boolean;
      recipients: string[];
    };
  };
  metrics: {
    prometheus: boolean;
    grafana: {
      enabled: boolean;
      dashboardUrl: string;
    };
  };
}

// Main deployment configuration interface
export interface DeploymentConfig {
  environmentVariables: EnvVariables;
  productionSettings: {
    security: SecurityConfig;
    server: {
      port: number;
      host: string;
    };
  };
  deploymentScripts: DeploymentScripts;
  rollbackProcedures: RollbackConfig;
  healthChecks: HealthChecks;
  monitoring: MonitoringConfig;
}

// Default production deployment configuration
export const createDeploymentConfig = (envVars: Partial<EnvVariables> = {}): DeploymentConfig => {
  const validatedEnv = EnvSchema.parse({
    NODE_ENV: 'production',
    ...envVars,
  });

  return {
    environmentVariables: validatedEnv,
    productionSettings: {
      security: {
        https: true,
        csp: {
          directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'unsafe-eval'", 'https://cdn.tailwindcss.com'],
            'style-src': ["'self'", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:', 'https:'],
            'connect-src': ["'self'", `http://localhost:*`, `https://api.${validatedEnv.NEXTAUTH_URL?.replace('https://', '') || 'localhost'}`],
            'font-src': ["'self'"],
          },
          reportOnly: false,
          reportUri: '/api/csp-violation-report',
        },
        rateLimiting: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 100, // limit each IP to 100 requests per windowMs
          message: 'Too many requests from this IP, please try again later.',
          standardHeaders: true,
          legacyHeaders: false,
        },
        cors: {
          origin: ['https://yourdomain.com', 'https://staging.yourdomain.com'],
          credentials: true,
        },
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
    },
    deploymentScripts: {
      build: 'npm run build',
      deploy: 'npm run deploy:prod',
      ciCd: {
        githubActions: '.github/workflows/deploy.yml',
        gitlabCi: '.gitlab-ci.yml',
      },
      postDeploy: [
        'npm run db:migrate',
        'npm run seed:prod',
      ],
    },
    rollbackProcedures: {
      enabled: true,
      triggers: ['health_check_failure', 'error_rate_high', 'deployment_error'],
      automation: {
        script: 'scripts/rollback.sh',
        backupRetention: 30, // days
        rollbackTimeout: 300, // 5 minutes
      },
      manualProcedure: `
1. Stop current deployment
2. Restore from latest backup
3. Run health checks
4. Notify team via Slack
5. Monitor for 15 minutes
      `.trim(),
    },
    healthChecks: {
      endpoints: {
        liveness: '/api/health/liveness',
        readiness: '/api/health/readiness',
      },
      thresholds: {
        uptime: 99.9, // percentage
        responseTime: 500, // ms
      },
      frequency: '*/5 * * * *', // every 5 minutes
    },
    monitoring: {
      healthMonitoring: {
        uptimeCheck: true,
        responseTimeCheck: true,
        errorTracking: true,
      },
      alerting: {
        pagerDuty: {
          enabled: !!validatedEnv.PAGERDUTY_KEY,
          serviceKey: '',
          routingKey: '',
        },
        slack: {
          enabled: !!validatedEnv.SLACK_WEBHOOK_URL,
          webhookUrl: '',
          channel: '#deployments',
        },
        email: {
          enabled: true,
          recipients: ['admin@yourdomain.com', 'devops@yourdomain.com'],
        },
      },
      metrics: {
        prometheus: true,
        grafana: {
          enabled: true,
          dashboardUrl: 'https://grafana.yourdomain.com/d/deployments',
        },
      },
    },
  };
};

// Export a function to get config based on environment
export const getDeploymentConfig = () => {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    API_URL: process.env.API_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    WEBPUSH_PUBLIC_KEY: process.env.WEBPUSH_PUBLIC_KEY,
    WEBPUSH_PRIVATE_KEY: process.env.WEBPUSH_PRIVATE_KEY,
    REDIS_URL: process.env.REDIS_URL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    HTTPS_ENABLED: process.env.HTTPS_ENABLED,
    CSP_REPORT_ONLY: process.env.CSP_REPORT_ONLY,
    PAGERDUTY_KEY: process.env.PAGERDUTY_KEY,
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
  };
  return createDeploymentConfig(envVars);
};

export default getDeploymentConfig;