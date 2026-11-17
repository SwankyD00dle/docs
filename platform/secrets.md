# Secrets

Save reusable environment variables in an organization-owned secret. Values are
encrypted at rest. Read responses contain names, versions, and usage metadata,
they never return the stored values. The API calls secrets variable sets, so
routes and fields use `environment-variable-sets` and `variableSetIds`.

## Create a secret

Set `VARIABLE_SET_ID` to the returned `id`:

```sh tab="CLI"
adapt env create --data '{
  "name": "agent-config",
  "env": {"APP_ENV": "production", "LOG_LEVEL": "info"}
}'
```

```sh tab="API"
curl --fail-with-body -sS -X POST "$PLATFORM_URL/v1/environment-variable-sets" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "agent-config",
    "env": {"APP_ENV": "production", "LOG_LEVEL": "info"}
  }'
```

Names are unique within an organization. This create route does not use an
idempotency key, after an uncertain response, list the secrets and check for the
name before retrying.

## Use secrets in a sandbox

Attach secrets with `variableSetIds`. Add or override values with `env`:

```sh tab="CLI"
adapt sandbox create --variable-set "$VARIABLE_SET_ID" --env LOG_LEVEL=debug \
  --label name=configured-worker
```

```sh tab="API"
curl --fail-with-body -sS -X POST "$PLATFORM_URL/v1/sandboxes" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  --data @- <<EOF_JSON
{
  "variableSetIds": ["$VARIABLE_SET_ID"],
  "env": {"LOG_LEVEL": "debug"},
  "labels": {"name": "configured-worker"}
}
EOF_JSON
```

You can attach up to 16 secrets. If multiple secrets define the same variable, supply
an explicit `env` override for that name or remove the conflict. The merged
sandbox environment is limited to 64 variables and 64 KiB of JSON, with at most
8,192 characters per value.

The sandbox captures the secrets' values and versions at creation. Updating a
secret does not change existing sandboxes. Commands inherit that captured environment
and can override individual values with their own `env`.

## Inspect and update secrets

List secrets, including their names, variable names, and versions:

```sh tab="CLI"
adapt env list --limit 50
```

```sh tab="API"
curl --fail-with-body -sS "$PLATFORM_URL/v1/environment-variable-sets?limit=50" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

Inspect a secret and the sandboxes using it:

```sh tab="CLI"
adapt env get "$VARIABLE_SET_ID"
```

```sh tab="API"
curl --fail-with-body -sS "$PLATFORM_URL/v1/environment-variable-sets/$VARIABLE_SET_ID" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

Set `VARIABLE_SET_VERSION` to the current `version` from that response. An
update must include that version and the secret's name. Entries omitted from `env`
are kept, a `null` value removes an entry:

```sh tab="CLI"
adapt env update "$VARIABLE_SET_ID" --data - <<EOF_JSON
{
  "name": "agent-config",
  "version": $VARIABLE_SET_VERSION,
  "env": {"LOG_LEVEL": "warn", "APP_ENV": null}
}
EOF_JSON
```

```sh tab="API"
curl --fail-with-body -sS -X PUT "$PLATFORM_URL/v1/environment-variable-sets/$VARIABLE_SET_ID" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Content-Type: application/json" \
  --data @- <<EOF_JSON
{
  "name": "agent-config",
  "version": $VARIABLE_SET_VERSION,
  "env": {"LOG_LEVEL": "warn", "APP_ENV": null}
}
EOF_JSON
```

The response returns the next version. A stale version returns `409`, fetch the
secret again before applying your changes. Changing `name` renames the secret.

## Delete a secret

Delete the sandboxes attached to the secret before deleting it. A secret still
in use returns `409`:

```sh tab="CLI"
adapt env delete "$VARIABLE_SET_ID"
```

```sh tab="API"
curl --fail-with-body -sS -X DELETE "$PLATFORM_URL/v1/environment-variable-sets/$VARIABLE_SET_ID" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```
