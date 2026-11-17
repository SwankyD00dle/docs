# API reference

Resource routes live under `/v1`. Send your organization key in the
`Authorization: Bearer` header. JSON requests use `Content-Type: application/json`,
file uploads use `application/octet-stream`.

API keys select their own organization. User sessions use the active
organization, `X-Organization-Id` can select another organization the user belongs
to for one request. With an API key, that header must match the key's organization.

## Permissions

`GET /v1/whoami` reports the caller's effective permissions. The examples assume
a key with the dashboard's default grants:

- Sandbox creation and deletion require `sandboxes:write`, listing and
  inspection require `sandboxes:read`.
- File uploads require `sandboxes:write`, downloads require `sandboxes:read`.
- Starting or cancelling a command requires `execs:write`, reading its status
  or output requires `execs:read`.
- Volume creation and quota changes require `volumes:write`, reads require
  `volumes:read`.
- Importing, pulling, or deleting an image requires `images:write`, reads require
  `images:read`, and launching a sandbox from one requires `images:use`.
- Registry credentials use `registryCredentials:read`, `write`, and `use`.
  Importing or pulling a private image requires `use` for its credential.
- Endpoint changes require `ingresses:write`, reads require `ingresses:read`, and
  creating endpoint access tokens requires `ingresses:use`.
  Binding also requires `sandboxes:write`.
- Secrets use `environmentVariables:read`, `write`, and `use`.
  Attaching a secret, running new commands in a sandbox that uses one, or accessing
  that sandbox's files requires `use` in addition to the operation's permission.

Older API keys and MCP connections keep their original grants. If image or
credential permissions are missing, create a new key or authorize a new connection.

## Pagination

Sandbox, image, registry-credential, volume, endpoint, and secret lists
accept `limit` from 1 to 100, with a default of 50. Responses contain `sandboxes`,
`images`, `credentials`, `volumes`, `ingresses`, or `sets`, respectively, and a
`nextCursor`.

When `nextCursor` is not `null`, set `NEXT_CURSOR` to that value and request the
next page:

```sh tab="CLI"
adapt sandbox list --limit 50 --cursor "$NEXT_CURSOR"
```

```sh tab="API"
curl --fail-with-body -sS --get "$PLATFORM_URL/v1/sandboxes" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  --data-urlencode "limit=50" \
  --data-urlencode "cursor=$NEXT_CURSOR"
```

Sandbox, image, volume, and endpoint lists are newest first; other lists are
ordered by resource ID. A `null` cursor means there are no more results.

## Retries

Create requests for sandboxes, images, volumes, endpoints, and commands, plus
image pulls, use UUID idempotency keys scoped to the organization. Reuse the same key and inputs after
a timeout or lost response. Reusing a key with different inputs returns `409`.

The CLI generates and prints a key automatically for these operations. Use
`--idempotency-key KEY` with the printed key to retry the same operation.
The curl examples send the key explicitly in the `Idempotency-Key` header.

A replay returns the existing resource or execution. It does not repeat the
work. Sandbox, image, and execution keys remain in their retained history, including
after failure or deletion. Endpoint keys are retained while the endpoint
exists. Use a fresh key for an intentionally new operation.

A `202` response means the operation is still active, inspect the returned
resource. If a resource is `unresolved`, or an error includes a `resourceId`,
inspect that ID before trying again. An unresolved allocation needs support to
reconcile its outcome, a new retry key could allocate a second resource.

## Errors and limits

Resource errors contain `error.code` and `error.message`, and may include
`error.resourceId`. The examples use `--fail-with-body` so curl reports HTTP
errors while keeping the response body visible.

- `400`: invalid input, or a user session without an organization selected.
- `401`: missing, invalid, expired, or revoked credentials.
- `403`: insufficient permissions or an organization the caller cannot access.
- `404`: the resource does not exist in the selected organization.
- `409`: a conflicting retry key, stale secret version, resource still in
  use, or a sandbox that is not running.
- `413`: the request or file exceeds its size limit.
- `429`: the API key's rate or usage limit was exceeded, or compute capacity is
  unavailable. Respect `Retry-After` when supplied.
- `500`: an internal failure. Check the resource before repeating a create.
- `501`: an unsupported operation, such as volume mounts, volume deletion, or
  allowlist egress.
- `502` or `503`: a backing service failed or is unavailable.

API keys currently allow 600 requests before requiring a 60-second gap since the
last accepted request to reset the allowance. Sustained traffic can exhaust it
even below 600 requests per minute. Pause requests after `429` and respect
`Retry-After` when supplied. Auth routes under `/v1/auth/` use their own error format.

## API schemas

The [OpenAPI specification](/openapi.json) describes resource routes, fields,
and limits. Download it without authentication. The CLI uses the
[configured Platform origin](/docs/use-the-api#set-up-the-cli):

```sh tab="CLI"
adapt api GET /openapi.json > ./platform-openapi.json
```

```sh tab="API"
curl --fail-with-body -sS "$PLATFORM_URL/openapi.json" \
  --output ./platform-openapi.json
```

The [authentication schema](/v1/auth/open-api/generate-schema) covers sign-in,
organization management, and key management.
