# Use the API

Manage infrastructure with the `adapt` CLI or the REST API. Each example has
**CLI** and **API** tabs for the same operation. The API examples use curl.

## Install the CLI

On macOS or Linux, download and install the latest `adapt` build:

```sh
curl -fsSL "$PLATFORM_URL/install.sh" | sh
```

The installer selects the binary for your system, verifies its checksum, and
installs it in `~/.local/bin`. Follow the printed instructions if that directory
is not on your `PATH`. Run the same command again to update. To choose another
directory, pass `ADAPT_INSTALL_DIR` to the installer:

```sh
curl -fsSL "$PLATFORM_URL/install.sh" | ADAPT_INSTALL_DIR="$HOME/bin" sh
```

## Create an API key

Sign in to the [dashboard](/sandboxes) with Google or GitHub, then create or select
an organization. In [Settings → API keys](/settings/api-keys), create a key and
copy it. You must be an organization owner or admin to create keys.

Set `PLATFORM_API_KEY` in your shell to that key.

## Set up the CLI

With `adapt` installed, use the same API key as the curl examples:

```sh
export ADAPT_TOKEN="$PLATFORM_API_KEY"
```

You can also sign in with `adapt auth login` and use the saved session instead
of setting `ADAPT_TOKEN`. If you belong to multiple organizations, select one
with `adapt org use ORGANIZATION_ID_OR_SLUG`. An API key already selects its
organization.

Check which organization and permissions your credential grants:

```sh tab="CLI"
adapt whoami
```

```sh tab="API"
curl --fail-with-body -sS "$PLATFORM_URL/v1/whoami" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

The response includes your `organizationId` and permissions. Add `--json` to a
CLI command for structured output; it also emits JSON when piped.

## Create your first sandbox

**Retry keys.** The CLI automatically generates and prints an idempotency key
when creating a sandbox, image, volume, endpoint, or command, or pulling an
image. After a timeout or lost response, retry the same arguments with
`--idempotency-key KEY`, using the printed key. Running the command again
without that flag starts a new operation.

For the curl examples, set `IDEMPOTENCY_KEY` to a fresh UUID before each new
operation, for example with `export IDEMPOTENCY_KEY="$(uuidgen)"`. Reuse that
value and the same inputs when retrying. The API requires the
`Idempotency-Key` header.

Create a sandbox with the default image and resources:

```sh tab="CLI"
adapt sandbox create --label name=first-agent
```

```sh tab="API"
curl --fail-with-body -sS -X POST "$PLATFORM_URL/v1/sandboxes" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  --data '{"labels":{"name":"first-agent"}}'
```

Set `SANDBOX_ID` to the response's `id`. Check its status, and wait for `running`
before using it:

```sh tab="CLI"
adapt sandbox get "$SANDBOX_ID"
```

```sh tab="API"
curl --fail-with-body -sS "$PLATFORM_URL/v1/sandboxes/$SANDBOX_ID" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

## Run your first command

Run your first command. For the curl example, set `IDEMPOTENCY_KEY` to a new
UUID first:

```sh tab="CLI"
adapt exec "$SANDBOX_ID" --detach -- uname -a
```

```sh tab="API"
curl --fail-with-body -sS -X POST "$PLATFORM_URL/v1/sandboxes/$SANDBOX_ID/exec" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  --data '{"argv":["uname","-a"]}'
```

Commands return immediately with an execution record. Set `EXEC_ID` to its `id`,
then read its status and output:

```sh tab="CLI"
adapt execs get "$EXEC_ID"
```

```sh tab="API"
curl --fail-with-body -sS "$PLATFORM_URL/v1/execs/$EXEC_ID" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

Wait for a final status such as `exited`, then check `stdout`, `stderr`, and
`exitCode`. You can also [follow output](/docs/commands#follow-output) until the command finishes.
Omit `--detach` from `adapt exec` to stream output and return the command's exit
code directly.
The sandbox expires after one hour by default. [Delete it](/docs/sandboxes#delete-a-sandbox) when
you finish, or choose a different lifetime when creating it.

## Use the examples

The examples on these pages use shell variables such as `SANDBOX_ID`, `EXEC_ID`,
`IMAGE_ID`, `VOLUME_ID`, `VARIABLE_SET_ID`, and `ENDPOINT_ID`. Set each to the `id` returned by
the corresponding create request. For curl examples with an `Idempotency-Key`
header, use a fresh `IDEMPOTENCY_KEY` for each new operation. The matching CLI
commands generate one for you.
