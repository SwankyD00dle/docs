# Sandboxes

A sandbox is an isolated environment for running code. Its image, resources, network, environment,
labels, and lifetime are fixed at creation. The sandbox's writable disk is
temporary. Download files or copy them to external storage before deleting the
sandbox; [volume mounts](/docs/volumes#volumes) are not yet available.

## Create a sandbox

Choose CPU, memory, disk, and lifetime. Labels help you identify a sandbox, the
dashboard uses `labels.name` as its display name.

```sh tab="CLI"
adapt sandbox create --cpu 2 --memory 4096 --disk 8192 --ttl 3600 \
  --label name=research-worker --label project=research
```

```sh tab="API"
curl --fail-with-body -sS -X POST "$PLATFORM_URL/v1/sandboxes" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "cpu": 2,
    "memoryMiB": 4096,
    "diskMiB": 8192,
    "ttlSeconds": 3600,
    "labels": {"name": "research-worker", "project": "research"}
  }'
```

- `cpu`: 1–32 CPUs, defaults to `1`.
- `memoryMiB`: 128–65,536 MiB, defaults to `1024`.
- `diskMiB`: 64–131,072 MiB (128 GiB) of writable disk, defaults to `2048`.
- `ttlSeconds`: 1–86,400 seconds, defaults to `3600`. Use `null` to disable
  automatic expiry. The lifetime starts when creation is accepted, including
  provisioning time.
- `labels`: up to 32 string pairs. Keys beginning with `platform.` are reserved.

These are API limits, allocation also depends on available capacity. To change
an existing sandbox's configuration, create a replacement.

## Capacity and migration

Creation can return `status: "queued"` while waiting for compute capacity. The
platform retries placement automatically. The queue deadline is 30 minutes, and
the sandbox's lifetime continues while queued.

The platform can move a running sandbox to another host during maintenance or
when its host is under memory pressure. Its status becomes `migrating`; the
sandbox pauses while its memory and disks transfer. Its ID stays the same.
Commands and files remain in the guest, but network and interactive connections
may disconnect and need to reconnect. New commands, file operations and stop or
delete requests are unavailable during the handoff. Wait for `running` before
resuming work. Migration time depends on the sandbox's size and transfer speed.

## Images and networking

Omitting both `image` and `imageId` uses `ubuntu:24.04`. Set `image` to pull a
public OCI image when creating the sandbox:

```sh tab="CLI"
adapt sandbox create --image python:3.12-slim --label name=python-worker
```

```sh tab="API"
curl --fail-with-body -sS -X POST "$PLATFORM_URL/v1/sandboxes" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  --data '{"image":"python:3.12-slim","labels":{"name":"python-worker"}}'
```

The image must have a Linux variant for an available node's architecture and fit
the 32 GiB image-build limit. Use [Images](/docs/images#images-and-private-registries)
to import private images or reuse a prepared image by `imageId`. Supply either
`image` or `imageId`, not both. Start programs through [Commands](/docs/commands#commands), or
configure a [startup command](#startup-and-sandbox-lifetime) to run automatically.

Choose **Network** when creating a sandbox to configure network access:

- **Public internet** (default): outbound connections to public destinations.
  Private networks and host services are blocked. Use an [endpoint](/docs/endpoints#endpoints)
  to receive HTTP or WebSocket traffic after the sandbox starts.
- **Disabled**: no guest network interface, outbound access, or endpoints.
  Commands and file transfers still work, as does loopback within the sandbox.
- **Restricted destinations**: exact TCP/UDP public-IP and port rules. Endpoints
  stay available. Leave both destination lists empty and DNS disabled to block outbound connections.
  Enter IP rules such as `tcp 1.1.1.1 443` in **Allowed destinations**, or exact TLS
  rules such as `api.openai.com 443` in **Allowed TLS hostnames**. Private networks
  and host services cannot be granted access.

The API accepts `"network":{"egress":"open"}` for public internet access or
`"network":{"egress":"none"}` to disable networking. For restricted access:

```sh tab="CLI"
adapt sandbox create --data - <<'EOF_JSON'
{
  "network": {
    "egress": "allowlist",
    "allow": [{ "protocol": "tcp", "address": "1.1.1.1", "port": 443 }]
  }
}
EOF_JSON
```

```json tab="API"
{
  "network": {
    "egress": "allowlist",
    "allow": [{ "protocol": "tcp", "address": "1.1.1.1", "port": 443 }]
  }
}
```

Use up to 64 rules with public IPv4 or IPv6 addresses and ports 1–65535. Rules
match IP addresses, not hostnames: services sharing an allowed IP and port share
its access. Without hostname rules, DNS is disabled by default in restricted
mode. **Allow DNS lookups**
permits queries through `1.1.1.1`, including queries for names outside the rules;
connections still need an allowed destination. The API accepts a public resolver
in `network.dns`, or `null` to disable DNS. Public internet mode defaults to
`1.1.1.1`. DNS queries themselves can send data outside the sandbox.

For TLS hostnames, use `"hostnames":[{"hostname":"api.openai.com","port":443}]`
inside `network`. Up to 64 exact ASCII/punycode names are supported. Hostname
rules enable DNS for their listed names only, defaulting to `1.1.1.1`. Connections
must present an allowed TLS hostname and use an address resolved through the
sandbox DNS proxy. A hardcoded IP alone is insufficient. DNS cannot be disabled
while hostname rules are present; older compute nodes cannot run these policies.

Hostname rules support direct TLS over TCP, normally HTTPS. Wildcards, plaintext
HTTP, HTTP/3, encrypted ClientHello, and protocol-specific TLS upgrades are not
supported. TLS remains encrypted end to end; hostname rules do not inspect HTTP
paths, headers, or credentials. Explicit IP rules grant access independently.

Network settings are fixed at creation and retained across stop/start; create a
replacement to change them. Custom deny rules and rate limits are not exposed.

## Startup and sandbox lifetime

In the creation dialog, choose **Startup** to run the image's default command or
enter a custom shell command. The API supports both modes:

```sh tab="CLI"
adapt sandbox create --image nginx:alpine --run-image
```

```json tab="API"
{"image":"nginx:alpine","startup":{"mode":"image"}}
```

```sh tab="CLI"
adapt sandbox create --data - <<'EOF_JSON'
{"image":"python:3.12-slim","startup":{"mode":"command","argv":["python","-c","print('hello')"]}}
EOF_JSON
```

```json tab="API"
{"image":"python:3.12-slim","startup":{"mode":"command","argv":["python","-c","print('hello')"]}}
```

Omit `startup` for an interactive sandbox that stays alive until deletion or
expiry. Image mode runs `ENTRYPOINT` followed by `CMD`. Set `args` to replace
`CMD`, or `entrypoint` to replace `ENTRYPOINT` and clear the inherited `CMD`;
empty arrays clear values. Command mode replaces both with literal `argv`.
There is no implicit shell expansion. The dashboard's custom command explicitly
uses `/bin/sh -lc`, which must exist in the image.

Both modes inherit the image's working directory, environment and user. Set
`startup.cwd` or `startup.user` to override them. The sandbox's frozen `env` and
attached secrets override image environment values and are supplied to startup
before execution. Use the top-level `env`, not an environment map inside `startup`.
These options also work with a prepared private image selected by `imageId`.

The startup command owns the sandbox lifetime. Run servers in the foreground:
when the main process exits, remaining processes and the VM stop. Exit code zero
sets `status: "completed"`; nonzero exits, signals and launch errors set `failed`.
Other commands don't keep it alive. Retrying the same creation key returns the
same sandbox and never reruns a completed command. There are no automatic restarts.
A `running` status indicates the guest is available, not an application health check.

Inspect `startup` for `exitCode`, `signal`, `error`, timestamps, `stdout`, `stderr`
and `truncated`. The dashboard shows this result and refreshes through status
events. Output retains the latest 256 KiB or 1024 chunks combined; it is not an
unlimited log archive. `terminationReason` distinguishes `completed`, `failed`,
`cancelled` and `expired` and survives deletion. Completion releases compute and
removes endpoint bindings. Local disks remain until the original expiry or
explicit deletion; `ttlSeconds: null` requires you to delete them. Files and execs
are unavailable after completion, so export needed files before the command exits.
Final startup output remains in the sandbox record after deletion. Frozen environment
values are redacted from live and retained startup logs; binary NUL bytes are replaced
with the Unicode replacement character. Startup environments must fit the command
limit of 32 KiB after merging secrets and local variables. Before deleting an
organization, explicitly delete its sandboxes, including completed or failed ones,
so their disks are cleaned up first.

## List and inspect sandboxes

List the organization's sandboxes:

```sh tab="CLI"
adapt sandbox list --limit 50
```

```sh tab="API"
curl --fail-with-body -sS "$PLATFORM_URL/v1/sandboxes?limit=50" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

Inspect one sandbox:

```sh tab="CLI"
adapt sandbox get "$SANDBOX_ID"
```

```sh tab="API"
curl --fail-with-body -sS "$PLATFORM_URL/v1/sandboxes/$SANDBOX_ID" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

The response includes `configuration`, `status`, `createdAt`, and `expiresAt`.
Environment values are omitted, `environmentNames` and `environmentSources`
show the variable names and secret versions captured at creation.

A new sandbox moves from `provisioning` to `running`. A startup command can
finish before you observe `running`. `completed` means it exited successfully;
`failed` means creation or the startup command failed; `unresolved` means the allocation outcome needs investigation. A
`hibernated` or `unavailable` sandbox cannot be used as a running sandbox.
The API does not currently expose stop, wake, or snapshot operations.

Lists exclude `deleted` sandboxes and show the newest first. `completed`, `failed`,
and `deleting` sandboxes remain visible until deletion finishes. `query` matches
part of a sandbox's name (`labels.name`, ignoring case) or the start of its ID.
Status and other label filters are not supported; filter the returned records in
your client. Follow `nextCursor` to read additional pages, see
[pagination](/docs/api-reference#pagination).

## Delete a sandbox

Deletion stops its compute and commands, removes endpoint bindings, and deletes
its writable disk. Download any files you need first.

```sh tab="CLI"
adapt sandbox delete "$SANDBOX_ID"
```

```sh tab="API"
curl --fail-with-body -sS -X DELETE "$PLATFORM_URL/v1/sandboxes/$SANDBOX_ID" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

A `204` response means deletion is complete. A `202` means cleanup is pending,
inspect the sandbox until its status is `deleted`. Repeating a completed
deletion is safe. Once deleted, the sandbox disappears from API and dashboard
lists. Its record remains available by ID for inspection and safe retries.
Expired sandboxes are cleaned up automatically.
