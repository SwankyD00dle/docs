# Endpoints

An endpoint gives a sandbox service a stable HTTPS URL on a dedicated
application hostname. The API calls these resources `ingresses`. Reserve the URL
once, then bind it to a running sandbox
and port. You can move the binding to another sandbox without changing the URL.

## Reserve an endpoint

Set `ENDPOINT_ID` to the returned `id` and `ENDPOINT_URL` to its `url`:

```sh tab="CLI"
adapt endpoints create agent-service
```

```sh tab="API"
curl --fail-with-body -sS -X POST "$PLATFORM_URL/v1/ingresses" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  --data '{"name":"agent-service"}'
```

New endpoints are unbound and public by default. Use `"accessMode":"authenticated"`
in the creation body to protect one before it is bound. Public URLs return `404`
until connected to a sandbox; authenticated URLs check the token first.

## Publish a service

Start your service through [Commands](/docs/commands#commands). It must listen on `0.0.0.0`,
not only localhost. For example, in a sandbox whose image includes Python:

```sh tab="CLI"
adapt exec "$SANDBOX_ID" --detach --timeout-ms 3600000 \
  -- python3 -m http.server 8080 --bind 0.0.0.0 --directory /tmp
```

```sh tab="API"
curl --fail-with-body -sS -X POST "$PLATFORM_URL/v1/sandboxes/$SANDBOX_ID/exec" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "argv": ["python3", "-m", "http.server", "8080", "--bind", "0.0.0.0", "--directory", "/tmp"],
    "timeoutMs": 3600000
  }'
```

This serves `/tmp` publicly once bound. For an application, substitute your own
server command. The command timeout and sandbox lifetime still apply.

Bind the endpoint to the service's port:

```sh tab="CLI"
adapt endpoints bind "$ENDPOINT_ID" "$SANDBOX_ID" --port 8080
```

```sh tab="API"
curl --fail-with-body -sS -X PUT "$PLATFORM_URL/v1/ingresses/$ENDPOINT_ID/binding" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Content-Type: application/json" \
  --data @- <<EOF_JSON
{"sandboxId": "$SANDBOX_ID", "port": 8080}
EOF_JSON
```

Ports can be 1–65,535. The sandbox must be running and belong to the endpoint's
organization. Request the public URL:

```sh
curl --fail-with-body -sS "$ENDPOINT_URL"
```

Requests under the endpoint URL are forwarded to the service with the remaining
path and query string. Repeat the binding `PUT` with another sandbox or port to
move new traffic. Existing requests and WebSocket connections may finish on the
previous sandbox.

## HTTP, streaming, and WebSockets

Endpoints support HTTP responses, server-sent events, and WebSocket connections.
For an application that serves an event stream at `/events`:

```sh
curl --fail-with-body -sS -N "${ENDPOINT_URL}events"
```

Use the returned URL, including its trailing slash. For WebSockets, use the
same path with `wss://` in place of `https://`. Basic text and binary streams
are supported, along with subprotocol negotiation and close-code forwarding.

HTTP request bodies are limited to 16 MiB. HTTP and SSE connections have a
60-second upstream inactivity timeout, send heartbeats for quiet streams.
WebSocket setup has a ten-second timeout. Established WebSockets should use
application heartbeats and reconnect after connection loss.

Public endpoints allow anyone to reach the service, which must authenticate its
own callers or verify webhook signatures where needed. A request's `Authorization` header is forwarded to your
service, so use an application credential there, not your Platform API key.
Application cookies, scripts, and browser sessions are supported. Response
cookies are scoped to the endpoint hostname. Except for the reserved `/.adapt/`
sign-in routes, every path on that hostname belongs
to your application. Use the URL returned by the API; old Platform `/proxy/...`
URLs are no longer served.

## Authenticated endpoints

Choose **Authenticated** when creating an endpoint, or change **Access** on its
detail page. With the CLI or API:

```sh tab="CLI"
adapt endpoints access "$ENDPOINT_ID" authenticated
```

```sh tab="API"
curl --fail-with-body -sS -X PUT "$PLATFORM_URL/v1/ingresses/$ENDPOINT_ID/access" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{"accessMode":"authenticated"}'
```

Create an access token in the dashboard, or use the CLI or API:

```sh tab="CLI"
adapt endpoints token "$ENDPOINT_ID"
```

```sh tab="API"
curl --fail-with-body -sS -X POST "$PLATFORM_URL/v1/ingresses/$ENDPOINT_ID/access-tokens" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

Set `ENDPOINT_TOKEN` to `token` from the response, which also includes `expiresAt`:

```sh
curl --fail-with-body -sS "$ENDPOINT_URL" \
  -H "X-Adapt-Authorization: Bearer $ENDPOINT_TOKEN"
```

Tokens last 15 minutes and work only for the endpoint that issued them. Use the
same header for streaming requests and WebSocket handshakes. Platform removes
it before forwarding; your application's `Authorization` header remains available
for its own credentials. Never send a Platform API key to an application URL.

Creating tokens requires `ingresses:use`. Owners and admins have this permission;
read-only members do not. New default API keys include it. Update an older key's
permissions or create a new key before using it to issue endpoint tokens. MCP
connections also need the permission and `platform:write`; reconnect and approve
a new grant if an existing grant lacks it. MCP exposes `set_endpoint_access`,
`create_endpoint_token`, and `revoke_endpoint_tokens` for the same operations.

Requests without a valid token return `401`. Platform checks the token's current
organization membership or API-key/MCP grant on every request. Revoking a key or
connection, removing membership, or removing the invocation permission also
invalidates its endpoint tokens. Open streams and WebSockets check access every
15 seconds and close on expiry or invalidation; reconnect with a new token.

To revoke all browser sessions and tokens for an endpoint, use **Revoke sessions and tokens** or:

```sh tab="CLI"
adapt endpoints revoke-tokens "$ENDPOINT_ID"
```

```sh tab="API"
curl --fail-with-body -sS -X DELETE "$PLATFORM_URL/v1/ingresses/$ENDPOINT_ID/access-tokens" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

Changing access also revokes existing browser sessions, pending sign-ins, and tokens,
and interrupts open connections. Rebinding preserves access settings and credentials. Protected responses are not
cacheable; changing a previously public endpoint cannot remove copies already
cached by clients or intermediaries.

### Open in a browser

Open the endpoint URL and sign in to Platform. An existing login skips the sign-in
prompt. Owners and admins of the endpoint's organization can open it, regardless
of which organization is selected in the dashboard. Read-only members cannot.
If access is denied, use another account or ask an organization owner for access.

After sign-in you return to the original path and query; URL fragments are not
preserved. A secure browser session lasts up to eight hours, or until your Platform
login expires. Your app's same-origin requests, forms, EventSource and WebSockets
use it automatically. Reload the page when access expires; background requests
and upgrades return errors instead of redirecting to login. Signing out of Platform
or revoking the login under **Settings → Sessions** ends its endpoint access too.
Open connections close on their next access check, within 15 seconds.

The app never receives the access cookie, and its own cookies and `Authorization`
header still work. Platform reserves `/.adapt/` on endpoint hosts for sign-in.
Cookie-authenticated mutations require the endpoint's own Origin, with a
`Sec-Fetch-Site: same-origin` fallback for missing or `null` Origin headers, so
no-referrer forms work. WebSockets require the endpoint's own Origin. Cross-origin
calls, including from sibling endpoints, need machine tokens instead.
Authentication cannot replay a submitted form: open the endpoint before submitting.
Embedding a protected app in a cross-site iframe is not supported.

Platform login cookies, query parameters, and the application's `Authorization`
header do not directly grant endpoint access. Machine tokens still use
`X-Adapt-Authorization`; they cannot be exchanged for browser sessions.

## Manage endpoints

List endpoints:

```sh tab="CLI"
adapt endpoints list --limit 50
```

```sh tab="API"
curl --fail-with-body -sS "$PLATFORM_URL/v1/ingresses?limit=50" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

Inspect an endpoint's URL and current binding:

```sh tab="CLI"
adapt endpoints get "$ENDPOINT_ID"
```

```sh tab="API"
curl --fail-with-body -sS "$PLATFORM_URL/v1/ingresses/$ENDPOINT_ID" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

Disconnect it while keeping the URL:

```sh tab="CLI"
adapt endpoints unbind "$ENDPOINT_ID"
```

```sh tab="API"
curl --fail-with-body -sS -X DELETE "$PLATFORM_URL/v1/ingresses/$ENDPOINT_ID/binding" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

Delete the endpoint when you no longer need its URL:

```sh tab="CLI"
adapt endpoints delete "$ENDPOINT_ID"
```

```sh tab="API"
curl --fail-with-body -sS -X DELETE "$PLATFORM_URL/v1/ingresses/$ENDPOINT_ID" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

Deleting an endpoint leaves the sandbox running. Deleting or expiring a sandbox
removes its bindings but keeps the endpoints available for reuse.
