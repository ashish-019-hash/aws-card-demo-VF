# API Contract

Full request/response DTOs are authoritative in Swagger UI (`/swagger-ui.html`) and the
generated OpenAPI document (`/v3/api-docs`) once the app is running — this document covers
the cross-cutting conventions that apply to every endpoint.

## Base URL

`http://localhost:8080` (dev). All endpoints are under `/api`.

## Authentication & session

`POST /api/session` — body `{"userId": "...", "password": "..."}`.

- Success: `200` with `SessionResponse` (`{"authenticated":true,"userId":...,"firstName":...,"lastName":...,"userType":"A"|"U"}`),
  sets `JSESSIONID` (HttpOnly) and `XSRF-TOKEN` cookies.
- Bad credentials / unknown user: `401` (see error envelope below).

`GET /api/session` — current session status (`authenticated:false` and null fields if
anonymous). `DELETE /api/session` — signs off (invalidates the session), `204`-style empty
body.

### CSRF

Every mutating request (`POST`/`PUT`/`DELETE`) other than `POST /api/session` itself must
echo the `XSRF-TOKEN` cookie value in an `X-XSRF-TOKEN` request header, or the request is
rejected with `403` before it reaches the controller.

### Authorization

`/api/users/**` requires `ROLE_ADMIN` (i.e. the signed-in user's `userType == "A"`). All
other endpoints only require an authenticated session (no per-resource ownership check —
see README "Known gaps", BR-005).

## Error envelope

All error responses share this shape:

```json
{
  "code": "VALIDATION_FAILED | NOT_FOUND | CONFLICT | UNAUTHORIZED | FORBIDDEN",
  "message": "human-readable summary",
  "errors": [ { "field": "...", "rule": "VR-###", "message": "..." } ]
}
```

`errors` is present only for `VALIDATION_FAILED` (400). Status code mapping:

| `code` | HTTP status | Thrown by |
|---|---|---|
| `VALIDATION_FAILED` | 400 | `ValidationFailedException` (validators in `com.carddemo.backend.validation`) |
| `UNAUTHORIZED` | 401 | `BadCredentialsException` (bad sign-on) |
| `FORBIDDEN` | 403 | `AccessDeniedException` (non-admin hitting `/api/users/**`) |
| `NOT_FOUND` | 404 | `NotFoundException` (unknown account/card/transaction/user id) |
| `CONFLICT` | 409 | `ConflictException` — message is prefixed `DATA_CHANGED:` (stale optimistic-lock snapshot) or `UPDATE_FAILED:` (downstream write failure), or is a plain message for user-id-already-exists / bill-payment allocator issues |

## Optimistic concurrency (accounts, cards)

`PUT /api/accounts/{id}` and `PUT /api/cards/{cardNumber}` both take
`{"expected": <fields-as-last-read>, "updated": <fields-to-save>}`:

- `updated` field-for-field equal to `expected` → `200 {"changed": false, ...}`, nothing
  written (BR-006).
- Live record no longer matches `expected` → `409 CONFLICT` (`DATA_CHANGED: ...`); client
  must re-`GET` for a fresh snapshot before retrying.
- Live record matches `expected` → applies `updated`, saves, returns `200 {"changed": true, ...}`.

## Confirm-gated actions (transactions, bill payments, reports)

`POST /api/transactions`, `POST /api/bill-payments`, `POST /api/reports` all require a
`confirm` field equal to `"Y"` (case-insensitive) to actually commit; `"N"` or blank returns
a `200` with an explanatory `message` and no write, and any other value is a
`VALIDATION_FAILED`/error response — mirroring the legacy screens' Y/N confirmation gates.

## Pagination

List endpoints (`GET /api/cards`, `GET /api/transactions`, `GET /api/users`) take a
zero-based `page` query parameter and return `hasNext`/`hasPrevious` (or an equivalent
boolean pair) alongside the page of items, using the legacy page sizes: cards 7,
transactions 10, users 10 (BR-015).
