import 'reflect-metadata';
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../src/common/auth/jwt-auth.guard';
import { AccountsController } from '../src/modules/accounts/accounts.controller';
import { AccountsService } from '../src/modules/accounts/accounts.service';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { CardsController } from '../src/modules/cards/cards.controller';
import { CardsService } from '../src/modules/cards/cards.service';
import { CustomersController } from '../src/modules/customers/customers.controller';
import { CustomersService } from '../src/modules/customers/customers.service';
import { HealthController } from '../src/modules/health/health.controller';
import { PaymentsController } from '../src/modules/payments/payments.controller';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { ReportsController } from '../src/modules/reports/reports.controller';
import { ReportsService } from '../src/modules/reports/reports.service';
import { TransactionsController } from '../src/modules/transactions/transactions.controller';
import { TransactionsService } from '../src/modules/transactions/transactions.service';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { createOpenApiDocument, JWT_BEARER_SCHEME } from '../src/openapi';

const controllers = [
  AuthController,
  AccountsController,
  CardsController,
  CustomersController,
  PaymentsController,
  ReportsController,
  TransactionsController,
  UsersController,
  HealthController,
];
const publicOperations = new Set([
  'POST /api/v1/auth/login',
  'GET /api/v1/health/live',
  'GET /api/v1/health/ready',
]);
const userPath = '/api/v1/users';

async function openApiApp(): Promise<INestApplication> {
  const module = await Test.createTestingModule({
    controllers,
    providers: [
      { provide: AuthService, useValue: {} },
      { provide: AccountsService, useValue: {} },
      { provide: CardsService, useValue: {} },
      { provide: CustomersService, useValue: {} },
      { provide: PaymentsService, useValue: {} },
      { provide: ReportsService, useValue: {} },
      { provide: TransactionsService, useValue: {} },
      { provide: UsersService, useValue: {} },
      { provide: DataSource, useValue: { query: () => Promise.resolve([]) } },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .compile();
  const app = module.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  await app.init();
  return app;
}

type DocumentOperation = {
  security?: unknown;
  responses?: Record<string, unknown>;
};

function operations(
  document: ReturnType<typeof createOpenApiDocument>,
): Array<[string, string, DocumentOperation]> {
  const result: Array<[string, string, DocumentOperation]> = [];
  for (const [path, pathItem] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (['get', 'post', 'patch', 'put', 'delete'].includes(method))
        result.push([path, method.toUpperCase(), operation as DocumentOperation]);
    }
  }
  return result;
}

describe('OpenAPI authentication contract', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await openApiApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('requires named JWT security and RFC 9457 401 responses on every non-public operation', () => {
    const document = createOpenApiDocument(app);
    expect(document.components?.securitySchemes?.[JWT_BEARER_SCHEME]).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });

    for (const [path, method, operation] of operations(document)) {
      const key = `${method} ${path}`;
      if (publicOperations.has(key)) {
        expect(operation.security).toBeUndefined();
        continue;
      }
      expect(operation.security).toEqual([{ [JWT_BEARER_SCHEME]: [] }]);
      expect(operation.responses).toHaveProperty('401');
      expect(JSON.stringify(operation.responses?.['401'])).toContain('application/problem+json');
    }
  });

  it('documents administrator authorization failures for every user operation', () => {
    const document = createOpenApiDocument(app);
    for (const [path, , operation] of operations(document)) {
      if (path === userPath || path.startsWith(`${userPath}/`)) {
        expect(operation.responses).toHaveProperty('403');
        expect(JSON.stringify(operation.responses?.['403'])).toContain('application/problem+json');
      }
    }
  });

  it('documents public login success and generic authentication failure without password fields', () => {
    const document = createOpenApiDocument(app);
    const login = document.paths['/api/v1/auth/login']?.post as DocumentOperation;
    expect(login.responses).toHaveProperty('200');
    expect(JSON.stringify(login.responses?.['200'])).toContain('accessToken');
    expect(JSON.stringify(login.responses?.['200'])).not.toMatch(/password/i);
    expect(login.security).toBeUndefined();
    expect(login.responses).toHaveProperty('401');
    expect(JSON.stringify(login.responses?.['401'])).toContain('application/problem+json');
  });
});
