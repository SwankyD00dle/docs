# Get started

Adapt gives agents compute, storage, and networking through MCP and an API. Create a
sandbox, run commands, transfer files, and give a service a public URL.
Volume management is available separately; mounting volumes in
sandboxes is not yet supported.
You can also manage these resources in the [dashboard](/sandboxes).

The easiest way to manage your infrastructure is to connect an agent over the
Model Context Protocol (MCP). Describe what you need, and your agent can create
sandboxes, run commands, manage storage, and publish services.

## Connect an agent

The hosted MCP server is at `$PLATFORM_URL/mcp`. Run the commands for your client
in your terminal.

With the [Codex CLI](https://developers.openai.com/codex/mcp):

```sh
codex mcp add adapt --url "$PLATFORM_URL/mcp"
codex mcp login adapt --scopes platform:read,platform:write,offline_access
```

With [Claude Code](https://code.claude.com/docs/en/mcp):

```sh
claude mcp add --transport http --scope user adapt "$PLATFORM_URL/mcp"
claude mcp login adapt
```

The `--scope user` option makes the connection available across your Claude Code
projects. You can also sign in from Claude Code by running `/mcp`, selecting
`adapt`, and choosing **Authenticate**.

Follow the browser sign-in with Google, GitHub, or your organization's SSO
provider. To use SSO, enter your work email and select **Continue with SSO**.
Choose or create an organization, then approve access. Start a new session in
your agent and ask it to use Adapt. For example:

> Create a sandbox, wait for it to be ready, run `uname -a`, show me the output,
> and delete the sandbox when you're done.

For other clients, add the same URL as a remote Streamable HTTP server with
OAuth. Adapt hosts the server, so there is no local server to install or run.
You can also connect with an [API key](#unattended-agents).

Each connection belongs to the organization you approved. Switching organizations
in the dashboard does not change the agent's access. The agent can only perform
actions allowed by your current organization role and the permissions you approved.
Revoke a connection at any time in
[Settings → Agent connections](/settings/agent-connections).

For team access, [configure SSO or SCIM](/docs/identity) to connect your identity
provider or manage membership from your directory.

## Available tools

The server provides tools for creating and inspecting sandboxes, running and
cancelling commands, reading and writing files, importing and pulling images,
managing volume quotas, publishing HTTP endpoints, and managing secrets
(variable sets). `whoami` identifies the connection's organization and effective
permissions. Volume mounting and deletion are not yet supported.

Commands run asynchronously. Use the returned execution ID with `get_exec` to
check progress. `read_exec_output` pages through retained logs using `nextCursor`
and `nextOffset`. File transfers through MCP are limited to 32 KiB; use the
[REST file API](/docs/files#files) for larger files. Environment variable values are write-only
and never returned by variable-set tools.

Creation tools for sandboxes, images, volumes, endpoints, and commands take a
`requestId`, as does `pull_image`. Use a fresh UUID for each operation and reuse it with identical inputs when
retrying. List tools return up to 10 items and a `nextCursor` for the next page.

## Unattended agents

Agents that support a custom authorization header can use an organization API
key instead of browser sign-in. [Create an API key](/docs/use-the-api#use-the-api), then set
`Authorization: Bearer <your API key>` when connecting to the same MCP URL.
The key's organization and permissions apply, and revoking the key stops access.
Keep keys in your agent's secret configuration.

You can inspect the available tools with curl:

```sh
curl --fail-with-body -sS -X POST "$PLATFORM_URL/mcp" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "MCP-Protocol-Version: 2025-03-26" \
  --data '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## OAuth permissions

The server supports OAuth authorization code with PKCE, refresh tokens, client ID
metadata documents, and dynamic client registration. Native clients registering
loopback callback URLs should set `application_type` to `native`.

Request `platform:read` to inspect infrastructure. Add `platform:write` to manage
resources, run commands, write files, and use secrets. Add
`offline_access` to let the agent refresh its access without signing in again.
OAuth access tokens are bound to the MCP URL; API keys work with both MCP and REST.
