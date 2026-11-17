# Commands

Commands run in a running, unexpired sandbox. Each command creates an execution
record with its own ID, status, and output. Pass an `argv` array containing the
program and its literal arguments. For shell syntax, explicitly run a shell
available in the image, such as `["/bin/sh", "-lc", "sleep 1 && uname -a"]`.

## Run a command

Creation returns immediately with `202` and an execution ID. Set `EXEC_ID` to
that `id` so you can inspect, follow, or cancel the command. Use `cwd` for an
absolute working directory and `env` for command-specific variables.

The CLI examples use `--detach` to return the same execution record as the API.
Omit it to stream output and return the command's exit code directly.

```sh tab="CLI"
adapt exec "$SANDBOX_ID" --detach --cwd /tmp --env APP_ENV=development \
  --timeout-ms 60000 -- printenv APP_ENV
```

```sh tab="API"
curl --fail-with-body -sS -X POST "$PLATFORM_URL/v1/sandboxes/$SANDBOX_ID/exec" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "argv": ["printenv", "APP_ENV"],
    "cwd": "/tmp",
    "env": {"APP_ENV": "development"},
    "timeoutMs": 60000
  }'
```

Commands inherit image defaults and the sandbox's captured environment. Values in
`env` override them for that command. An HTTP success does not mean the command succeeded: check
`status` and `exitCode`. A normal shell exit has status `exited`, including
nonzero exit codes.

`timeoutMs` defaults to ten minutes and accepts 1 millisecond through one day.
A command's deadline is also bounded by the sandbox's expiry. Every command has
a deadline, even when the sandbox has no expiry. Requests allow up to 128 arguments
and 16 KiB of argument bytes. The combined sandbox and command environment is
limited to 128 variables and 32 KiB of keys and values. The encoded execution
request must fit in 65,000 bytes.

## Run in the background

All commands run asynchronously. A long-running command uses the same API:

```sh tab="CLI"
adapt exec "$SANDBOX_ID" --detach --timeout-ms 60000 \
  -- /bin/sh -lc 'sleep 30 && uname -a'
```

```sh tab="API"
curl --fail-with-body -sS -X POST "$PLATFORM_URL/v1/sandboxes/$SANDBOX_ID/exec" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "argv": ["/bin/sh", "-lc", "sleep 30 && uname -a"],
    "timeoutMs": 60000
  }'
```

Accepted commands continue if your HTTP connection closes or Platform restarts.
They run inside the sandbox, and Platform resumes collecting output
after a restart. Commands are not restarted on a replacement VM after node or
guest failure. Deleting or expiring the sandbox also stops its commands.

## Interactive commands

Stdin is closed by default. Set `stdin: true` to accept input over a WebSocket.
Add `terminal` to allocate a terminal:

```sh tab="CLI"
adapt exec "$SANDBOX_ID" -it -- /bin/sh
```

```sh tab="API"
curl --fail-with-body -sS -X POST "$PLATFORM_URL/v1/sandboxes/$SANDBOX_ID/exec" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  --data '{"argv":["/bin/sh"],"stdin":true,"terminal":{"rows":24,"cols":80}}'
```

The CLI attaches automatically and uses your terminal's dimensions. For the API,
connect a WebSocket client to `/v1/execs/$EXEC_ID/stream?after=0&readOnly=false`
using the same authorization header and `wss://` for HTTPS. One client can write
input; other clients can observe with `readOnly=true` (the default). Send input
as binary frames of up to 32 KiB. JSON controls include `{"kind":"stdin_eof"}`,
`{"kind":"resize","rows":24,"cols":80}`, and `{"kind":"signal","signal":2}`
(signals 2 and 15 are supported).

Output frames contain `sequence` and `data_base64`; reconnect with `after` set
to the last consumed sequence. Input is not replayed. Disconnecting only
detaches the client. Live WebSocket output is unredacted; retained HTTP and SSE
logs redact known environment values.

## Inspect and cancel commands

Read the execution's status and retained output:

```sh tab="CLI"
adapt execs get "$EXEC_ID"
```

```sh tab="API"
curl --fail-with-body -sS "$PLATFORM_URL/v1/execs/$EXEC_ID" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

Active statuses are `starting`, `running`, and `cancelling`. Final statuses are
`exited`, `timed_out`, `cancelled`, `failed`, and `interrupted`. An interrupted
command may already have performed some work, inspect the result before
starting it again with a new retry key.

Request cancellation:

```sh tab="CLI"
adapt execs cancel "$EXEC_ID"
```

```sh tab="API"
curl --fail-with-body -sS -X POST "$PLATFORM_URL/v1/execs/$EXEC_ID/cancel" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

A `202` acknowledges the request. Keep reading the execution until it reaches a
final status, cancellation can race with a command finishing normally.

## Follow output

Stream retained and new output. The CLI's `--json` option emits one event per
line; omit it for plain command output. The API uses server-sent events, and
`-N` disables curl's output buffering:

```sh tab="CLI"
adapt execs logs "$EXEC_ID" --json
```

```sh tab="API"
curl --fail-with-body -sS -N "$PLATFORM_URL/v1/execs/$EXEC_ID/events" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

`stdout` and `stderr` events carry `sequence`, `stream`, and `data`. The final
`exit` event includes the status, exit code, duration, and truncation flag,
then closes the stream.

To reconnect, set `EVENT_CURSOR` to the last event ID you received. The server
resumes after that event:

```sh tab="CLI"
adapt execs logs "$EXEC_ID" --cursor "$EVENT_CURSOR" --json
```

```sh tab="API"
curl --fail-with-body -sS -N "$PLATFORM_URL/v1/execs/$EXEC_ID/events" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Last-Event-ID: $EVENT_CURSOR"
```

You can also pass `?cursor=` with that sequence number. Disconnecting the log
stream does not cancel the command. Retained output is limited to 1 MiB per
stream and 4,096 events, `truncated` indicates output was dropped.

Known environment values are redacted from retained output, but transformed
values and other credentials may still appear. Avoid printing secrets. Retained
logs remain available after sandbox deletion, until the organization is deleted.
Disabling output retention and deleting individual execution logs are not
currently supported.
