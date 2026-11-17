# CLI reference

`adapt` manages Platform from a terminal. This page lists every command, flag,
and environment variable. For walkthroughs, follow the links to each concept
page. To install the CLI, see [Install the CLI](/docs/use-the-api#install-the-cli).

Run `adapt --help` or `adapt COMMAND --help` for the same details offline.
Every `list` subcommand also accepts `ls`.

## Sign in

Sign in through your browser:

```sh
adapt auth login
```

Login shows a short code and opens Platform's approval page. Approve access in
the browser, and the CLI saves a session. With one organization, the CLI
selects it. With several, it asks you to choose one in a terminal. Otherwise,
pass `--org ORGANIZATION_ID` or run `adapt org use` afterward.

To use an organization API key instead, set `ADAPT_TOKEN`:

```sh
export ADAPT_TOKEN="$PLATFORM_API_KEY"
```

`ADAPT_TOKEN` overrides any saved credential and is never written to disk. To
save a key instead, pipe it to `adapt auth login --token-stdin`. The key selects
its own organization.

Choose a default organization by ID or exact slug:

```sh
adapt org use ORGANIZATION_ID_OR_SLUG
```

`--org` or `ADAPT_ORG_ID` overrides it for one command.

## Global options

These flags work with every command:

- `--json`: print JSON. This is also the default when stdout is not a terminal.
- `--profile NAME`: use a saved profile. Defaults to `default`.
- `--org ID`: send requests for this organization ID.
- `--api-url URL`: use another Platform origin, without `/v1`. Defaults to
  `$PLATFORM_URL`.
- `--config-dir PATH`: read and save configuration in this directory.
- `--timeout SECONDS`: HTTP request timeout, 1–3,600 seconds. Defaults to `60`.
  Read retries share this budget. Streams use an inactivity timeout instead.
- `--help` on any command. `adapt --version` prints the CLI version; it works
  only on `adapt` itself.

## Environment variables

- `ADAPT_TOKEN`: an organization API key to use instead of the saved credential.
- `ADAPT_PROFILE`: the profile name. `--profile` takes precedence.
- `ADAPT_ORG_ID`: the organization ID. `--org` takes precedence.
- `ADAPT_API_URL`: the Platform origin. `--api-url` takes precedence.
- `ADAPT_CONFIG_DIR`: the configuration directory. `--config-dir` takes precedence.
- `ADAPT_INSTALL_DIR`: where the installer puts `adapt`. Defaults to `~/.local/bin`.
- `CODEX_HOME` and `CLAUDE_CONFIG_DIR`: where `adapt skill` installs for Codex and
  Claude Code. Both must be absolute paths.

## Configuration and profiles

The CLI saves profiles in `config.json`, in the first of these directories:

- `--config-dir` or `ADAPT_CONFIG_DIR`
- `$XDG_CONFIG_HOME/adapt`
- `%APPDATA%\adapt` on Windows
- `~/.config/adapt`

Each profile stores an API origin, a default organization, and a credential.
Credentials are stored as plain JSON, not in an OS keychain. On Unix, the CLI
creates the file with mode `600` and refuses to read it if other users can
access it. Use `ADAPT_TOKEN` in CI instead of saving a key.

Saved credentials and organizations belong to their origin. A different
`--api-url` does not reuse them. HTTPS is required, except for `localhost` and
loopback addresses.

Keep a separate profile for each origin or account:

```sh
adapt --profile staging --api-url https://platform.example.com auth login
adapt --profile staging sandbox list
```

`adapt profiles` lists saved profiles without their credentials. Using an unsaved
profile name prints a warning and continues with defaults.

## Output

On a terminal, list commands print a table and other commands print formatted
JSON. When stdout is piped, or with `--json`, every command prints compact JSON.
Progress, prompts, sign-in links, and idempotency keys go to stderr.

`exec`, `execs logs`, `execs attach`, and `sandbox sh` write the remote output
as-is. With `--json`, they print one JSON event per line. `events` always prints
one JSON event per line. `files get ... -` writes raw bytes.

Deletions and other empty responses print their HTTP status, such as
`{"status":202}` for an accepted asynchronous deletion.

## Pagination

Sandbox, volume, endpoint, image, secret, and registry credential lists accept:

- `--limit N`: 1–100 results per page. Defaults to `50`.
- `--cursor CURSOR`: start after a previous page's `nextCursor`.
- `--all`: follow every page and print one combined list.

`connections list` and `connections calls` accept `--cursor` and `--all`, but
the server sets their page size. `org members list` and `keys list` use
`--offset N` in pages of 50. See [Pagination](/docs/api-reference#pagination).

## Request data

Flags named `--data` (or `-d`) take a JSON object in one of three forms:

- Inline JSON, such as `--data '{"name":"production"}'`.
- `@file.json` to read a file.
- `-` to read stdin.

`--env`, `--label`, and `--query` take `NAME=VALUE` and can be repeated. Files
and stdin inputs are limited to 16 MiB.

## Retries and idempotency

Creating a sandbox, volume, endpoint, image, or command, and pulling an image,
send an idempotency key. The CLI generates one and prints it to stderr. After a
timeout or lost response, retry with the same inputs and
`--idempotency-key KEY`. See [Retries](/docs/api-reference#retries).

Reads (`GET` and `HEAD`) retry connection failures and `408`, `429`, `500`,
`502`, `503`, and `504` responses within `--timeout`. Other requests are not
retried, and neither is `files get`: a failed download needs running again.

`--wait` on `create`, `start`, `stop`, `import`, and `pull` polls every two
seconds for up to ten minutes. It fails early if the resource reaches `failed`,
`deleted`, `unresolved`, or `completed`. Timing out stops the wait, not the
operation.

## Exit codes

- `0`: success.
- `1`: a CLI or API error, or a remote command that failed, was cancelled, or
  was interrupted.
- `2`: invalid arguments.
- `0`–`255`: the remote command's exit code, for `exec`, `execs logs`,
  `execs attach`, and `sandbox sh`. Codes outside this range return `1`.
- `124`: the remote command timed out.
- `128` plus the signal number: a live command was killed by a signal.
- `130`: you pressed Ctrl-C. Remote commands keep running, except under
  `sandbox sh`, whose sandbox is temporary: Ctrl-C while it starts, or while
  `sandbox sh -- COMMAND` runs, deletes the sandbox and its files. `sandbox sh`
  also returns `143` for `SIGTERM` and `129` for `SIGHUP`.

## Commands

### auth

```sh
adapt auth login [--no-browser | --token-stdin]
adapt auth status
adapt auth logout [--local]
```

- `login`: sign in through your browser and save the session in the profile.
  Signing in again revokes the profile's previous CLI session.
- `--no-browser`: print the approval link instead of opening a browser.
- `--token-stdin`: save an organization API key read from stdin.
- `status`: check the saved or `ADAPT_TOKEN` credential without printing it.
- `logout`: revoke the saved CLI session and remove it from the profile. For a
  saved API key, it removes the key locally; revoke it with `adapt keys delete`.
  Logout never affects `ADAPT_TOKEN`.
- `--local`: remove the credential without contacting Platform.

### whoami

```sh
adapt whoami
```

Prints your identity, organization, and permissions.

### org

Alias: `orgs`. See [Organizations and access](/docs/organizations).

```sh
adapt org list
adapt org use ORGANIZATION_ID_OR_SLUG
adapt org current
adapt org create NAME --slug SLUG
adapt org update --data JSON
adapt org delete
adapt org members list [--offset N]
adapt org members role MEMBER_ID owner|admin|member
adapt org members remove MEMBER_ID_OR_EMAIL
adapt org invitations list
adapt org invitations create EMAIL [--role owner|admin|member] [--link] [--resend]
adapt org invitations cancel INVITATION_ID
adapt org invitations accept INVITATION_ID
adapt org invitations reject INVITATION_ID
```

- `use`: save the default organization for the profile.
- `current`: print the organization this command would use.
- `update` and `delete`: act on the current organization.
- `invitations create --role`: defaults to `member`.
- `--link`: create an invitation link without sending email.
- `--resend`: send the invitation again.

### sandbox

Alias: `sandboxes`. See [Sandboxes](/docs/sandboxes).

```sh
adapt sandbox list [--limit N] [--cursor CURSOR] [--all]
adapt sandbox get SANDBOX_ID
adapt sandbox create [OPTIONS]
adapt sandbox sh [OPTIONS] [-- COMMAND...]
adapt sandbox start SANDBOX_ID [--wait]
adapt sandbox stop SANDBOX_ID [--wait]
adapt sandbox delete SANDBOX_ID
adapt sandbox wait SANDBOX_ID [--status STATUS] [--wait-timeout SECONDS]
```

`create` options:

- `--image IMAGE`: an image reference. Conflicts with `--image-id`.
- `--image-id IMAGE_ID`: an imported image.
- `--cpu N`: 1–32 CPUs.
- `--memory MIB`: 128–65,536 MiB.
- `--disk MIB`: 64–131,072 MiB.
- `--ttl SECONDS`: 1–86,400 seconds until expiry.
- `--no-expiry`: disable automatic expiry. Conflicts with `--ttl`.
- `--env NAME=VALUE`, `-e`: set an environment variable. Repeatable.
- `--label NAME=VALUE`: set a label. Repeatable.
- `--variable-set VARIABLE_SET_ID`: attach a secret. Repeatable.
- `--run-image`: run the image's `ENTRYPOINT` and `CMD` at startup.
- `--data JSON`: the full request body. Flags override its fields; `--env` and
  `--label` add entries.
- `--wait`: wait until the sandbox is `running`.
- `--idempotency-key KEY`: retry an earlier creation.

Omitted options use the API defaults.

`sh` creates a temporary sandbox with the same options, waits for it to run,
and deletes it when you exit. Without a command, it opens a login shell and
needs a terminal; Ctrl-] also exits. With a command after `--`, it forwards
stdin, streams output, and returns the command's exit code. Commands in `sh`
can run for up to 24 hours, within the sandbox's lifetime.

`wait` waits for `--status` (default `running`) for up to `--wait-timeout`
seconds (default `600`, at most 86,400).

### exec

See [Commands](/docs/commands).

```sh
adapt exec SANDBOX_ID [OPTIONS] -- COMMAND [ARGS...]
```

Arguments after `--` are passed literally. Use `/bin/sh -lc '...'` for shell
syntax. By default, `exec` streams output and returns the command's exit code.

- `--cwd PATH`: the working directory.
- `--env NAME=VALUE`, `-e`: set an environment variable. Repeatable.
- `--timeout-ms MS`: 1 ms to one day. Defaults to the API's ten minutes.
- `--detach`: return the execution record immediately.
- `--stdin`, `-i`: forward stdin over a WebSocket.
- `--tty`, `-t`: allocate a terminal. Implies `--stdin`. Needs a terminal and
  cannot be combined with `--json`. Ctrl-] detaches; Ctrl-C goes to the
  remote command.
- `--idempotency-key KEY`: retry an earlier request.

`--detach` cannot be combined with `--stdin` or `--tty`.

### execs

See [Commands](/docs/commands#inspect-and-cancel-commands).

```sh
adapt execs get EXEC_ID
adapt execs cancel EXEC_ID
adapt execs logs EXEC_ID [--cursor N]
adapt execs attach EXEC_ID [--after N] [--stdin] [--tty]
```

- `logs`: stream retained, redacted output until the command finishes, then
  return its exit code. Reconnects after interruptions.
- `--cursor N`: resume after this event cursor, 0–4,096. Defaults to `0`.
- `attach`: attach to live, unredacted output. Read-only unless you pass
  `--stdin` (`-i`) or `--tty` (`-t`).
- `--after N`: resume after this output sequence. Defaults to `0`. Input is
  never replayed.

### files

See [Files](/docs/files).

```sh
adapt files put SANDBOX_ID LOCAL_PATH REMOTE_PATH
adapt files get SANDBOX_ID REMOTE_PATH LOCAL_PATH [--force]
```

- `put`: upload a local file. Use `-` as `LOCAL_PATH` to read stdin.
- `get`: download a file. Use `-` as `LOCAL_PATH` to write stdout.
- `--force`: replace an existing local file.

Files are limited to 16 MiB.

### volumes

Alias: `volume`. See [Volumes](/docs/volumes).

```sh
adapt volumes list [--limit N] [--cursor CURSOR] [--all]
adapt volumes get VOLUME_ID
adapt volumes create [--quota-bytes BYTES] [--idempotency-key KEY]
adapt volumes quota VOLUME_ID (--bytes BYTES | --unlimited)
adapt volumes delete VOLUME_ID
```

### endpoints

Alias: `endpoint`. See [Endpoints](/docs/endpoints).

```sh
adapt endpoints list [--limit N] [--cursor CURSOR] [--all]
adapt endpoints get ENDPOINT_ID
adapt endpoints create NAME [--access public|authenticated] [--idempotency-key KEY]
adapt endpoints access ENDPOINT_ID public|authenticated
adapt endpoints bind ENDPOINT_ID SANDBOX_ID --port PORT
adapt endpoints unbind ENDPOINT_ID
adapt endpoints token ENDPOINT_ID
adapt endpoints revoke-tokens ENDPOINT_ID
adapt endpoints delete ENDPOINT_ID
```

- `create --access`: defaults to `public`.
- `bind --port`: the sandbox port, 1–65,535.
- `token`: create an access token for an authenticated endpoint.
- `revoke-tokens`: revoke the endpoint's access tokens.

### images

Alias: `image`. See [Images and private registries](/docs/images).

```sh
adapt images list [--limit N] [--cursor CURSOR] [--all]
adapt images get IMAGE_ID
adapt images import SOURCE --name NAME [--architecture amd64|arm64] [--credential REGISTRY_CREDENTIAL_ID] [--wait] [--idempotency-key KEY]
adapt images pull IMAGE_ID [--credential REGISTRY_CREDENTIAL_ID | --public] [--wait] [--idempotency-key KEY]
adapt images wait IMAGE_ID [--wait-timeout SECONDS]
adapt images delete IMAGE_ID
```

- `import --architecture`: defaults to `amd64`.
- `--credential`: pull with a private registry credential.
- `pull --public`: pull without a registry credential.
- `--wait`: wait until the image is `ready`.
- `wait --wait-timeout`: defaults to `600`, at most 86,400.

### env

Manages secrets (environment variable sets). See [Secrets](/docs/secrets).

```sh
adapt env list [--limit N] [--cursor CURSOR] [--all]
adapt env get VARIABLE_SET_ID
adapt env create --data JSON
adapt env update VARIABLE_SET_ID --data JSON
adapt env delete VARIABLE_SET_ID
```

- `create`: `{"name":"production","env":{"KEY":"value"}}`.
- `update`: `name`, the current `version`, and `env`. A `null` value deletes
  that variable.

### registry

Manages private registry credentials. See
[Private registry credentials](/docs/images#private-registry-credentials).

```sh
adapt registry list [--limit N] [--cursor CURSOR] [--all]
adapt registry create --data JSON
adapt registry update REGISTRY_CREDENTIAL_ID --data JSON
adapt registry delete REGISTRY_CREDENTIAL_ID
```

- `create`: `name`, `registry` (an HTTPS origin), `username`, `password`, and
  optional `tokenOrigin`.
- `update`: the same fields plus the current `version`.

### connections

Manages upstream MCP connections and calls their tools. See
[Connect external tools](/docs/connections).

```sh
adapt connections list [--cursor CURSOR] [--all]
adapt connections get CONNECTION_ID
adapt connections create --data JSON
adapt connections update CONNECTION_ID --data JSON
adapt connections delete CONNECTION_ID
adapt connections refresh CONNECTION_ID
adapt connections grant CONNECTION_ID --data JSON
adapt connections oauth CONNECTION_ID [--no-browser]
adapt connections oauth-complete CONNECTION_ID --data JSON
adapt connections calls CONNECTION_ID [--cursor CURSOR] [--all]
adapt connections principals
adapt connections search [QUERY] [--offset N]
adapt connections describe CONNECTION_ID TOOL
adapt connections call CONNECTION_ID TOOL [--arguments JSON]
```

- `create`: `name`, `url`, `authType` (`none`, `bearer`, or `oauth`), and
  optional `token` and `visibility`.
- `update`: `version`, `name`, `enabled`, `allowedTools`, and optional `token`.
- `grant`: `principalType` (`mcp` or `apiKey`), `principalId`, and `tools`.
- `oauth`: open the upstream authorization page. `--no-browser` prints the link.
- `oauth-complete`: `code`, `state`, and optional `iss`.
- `calls`: list the connection's call history.
- `search --offset`: start at this result. Defaults to `0`; use the returned
  `nextOffset` for the next page.
- `call --arguments`: the tool's arguments as a JSON object, `@file`, or `-`.
  Defaults to `{}`.

### keys

Manages organization API keys. See
[API keys and account sessions](/docs/organizations#api-keys-and-account-sessions).

```sh
adapt keys list [--offset N]
adapt keys create NAME [--expires-in VALUE] [--permissions JSON]
adapt keys delete KEY_ID
```

- `create`: prints the key once.
- `--expires-in`: sent as the key's `expiresIn`.
- `--permissions`: a permission object as JSON, `@file`, or `-`.

### sessions

Manages your browser and CLI sessions.

```sh
adapt sessions list
adapt sessions revoke SESSION_ID
adapt sessions revoke-others
```

### mcp

Manages MCP clients connected to Platform, such as coding agents. See
[Connect an agent](/docs/get-started#connect-an-agent).

```sh
adapt mcp list
adapt mcp revoke ID
```

### events

```sh
adapt events [--personal]
```

Streams the organization's resource changes, one JSON event per line.
`--personal` streams your account's changes instead. The command exits with an
error if the stream disconnects or is idle for 90 seconds. Run it again and
refresh any snapshots you keep.

### health

```sh
adapt health [--ready]
```

Checks that the API is up, without signing in. `--ready` also checks the
database.

### profiles

```sh
adapt profiles
```

Lists saved profiles with their origin, organization, and whether they hold a
credential.

### api

```sh
adapt api METHOD PATH [--data JSON] [--query NAME=VALUE] [--idempotency-key KEY]
```

Sends an authenticated request to the current origin. `METHOD` is `GET`,
`POST`, `PUT`, `PATCH`, `DELETE`, or `HEAD`. `PATH` must start with `/`, such
as `/v1/whoami`; full URLs are refused.

- `--data`, `-d`: the request body as JSON, `@file`, or `-`.
- `--query`, `-q`: add a query parameter. Repeatable.
- `--idempotency-key KEY`: send an `Idempotency-Key` header.

### skill

Installs a guide that teaches coding agents to use `adapt`. Works offline.

```sh
adapt skill show
adapt skill install [codex|claude|pi|opencode|all]
adapt skill uninstall [codex|claude|pi|opencode|all]
```

- `show`: print the guide as Markdown, even with `--json`.
- `install`: install or update the guide. Defaults to `all`. `claude-code` is
  an alias for `claude`.
- `uninstall`: remove the guide's `SKILL.md`. Codex, Pi, and OpenCode share
  `~/.agents/skills/adapt`, so removing it for one removes it for all three.

The guide is installed at `skills/adapt/SKILL.md` under `$CODEX_HOME` (Codex),
`$CLAUDE_CONFIG_DIR` (Claude Code), or by default `~/.agents` (Codex, Pi, and
OpenCode) and `~/.claude` (Claude Code).
