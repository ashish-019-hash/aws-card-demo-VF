# CardDemo Backend

This module contains the Spring Boot backend for the CardDemo migration.

## Requirements

- Java 21
- Maven 3.8 or later

## Verify the project foundation

```bash
mvn clean verify
```

## Run the application

```bash
mvn spring-boot:run
```

The application listens on `http://localhost:8080`.

OpenAPI JSON is available at `http://localhost:8080/v3/api-docs`.

Swagger UI is available at `http://localhost:8080/swagger-ui/index.html`.

## Authenticate from a browser client

1. Send `GET /api/auth/csrf` with credentials enabled.
2. Read the returned token and the `XSRF-TOKEN` cookie.
3. Send `POST /api/auth/login` with the user ID and password.
4. Keep the `JSESSIONID` cookie for later requests.
5. Send the CSRF token in the `X-XSRF-TOKEN` header for `POST`, `PUT`, and `DELETE` requests.

Example login body:

```json
{
  "userId": "ADMIN001",
  "password": "PASSWORD"
}
```

## Main API resources

| Resource | Path |
|---|---|
| Authentication | `/api/auth` |
| Account profiles | `/api/account-profiles` |
| Accounts | `/api/accounts` |
| Customers | `/api/customers` |
| Credit cards | `/api/cards` |
| Transactions | `/api/transactions` |
| Bill payment | `/api/bill-payments` |
| Transaction reports | `/api/reports/transactions` |
| User administration | `/api/users` |

Only administrators can use `/api/users`.

## Demo data

The application creates an in-memory H2 database on each start. It loads the fixed-width main-branch CardDemo data:

- 50 accounts, customers, cards, and card cross-references
- 300 transactions in both the online and daily-feed tables
- 7 transaction types and 18 transaction categories
- 51 disclosure rates and 50 category balances
- 10 BCrypt-protected demo users

Use one of these credentials:

| Role | User ID | Password |
|---|---|---|
| Administrator | `ADMIN001` | `PASSWORD` |
| Regular user | `USER0001` | `PASSWORD` |

The other seeded users are `ADMIN002` through `ADMIN005` and `USER0002` through `USER0005`. All seeded users use `PASSWORD`.

The database resets when the backend process stops. Restart the backend to restore the original demo data.

## Reset

Stop the backend and start it again. The application recreates the H2 schema and reloads all seed records.

## Troubleshooting

- Use Java 21. Older Java versions cannot build this project.
- Check that port `8080` is free before startup.
- Set `CARDDEMO_ALLOWED_ORIGINS` to a comma-separated frontend origin list when the frontend does not use `http://localhost:5173`.
- Fetch a new CSRF token after a session expires.
- Run `mvn clean verify` when generated classes or test results appear stale.
