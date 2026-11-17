# Connect external tools

Use **Connections** to add a remote MCP server. Enter its public HTTPS endpoint,
then choose browser sign-in, a Bearer access token, or no authentication.
Browser sign-in requires the server to support MCP OAuth discovery and dynamic
client registration. Access tokens are stored encrypted and are never shown to
agents. Private-network servers and redirects are not supported.

## Visibility and agent access

Connections start as **Just me**. Owners and admins can instead choose
**Organization** to make the connection's enabled tools available to members.
Sharing does not give agents access automatically.

For authenticated organization services, **Whose account to use** defaults to
**Each person's own account**. An admin sets up the service and enables tools;
each member connects their own account. Calls from that member and their agents
use the member's permissions in the upstream service. An admin can instead
choose **Shared organization account** when one account's access is intended
for everyone who is allowed to use the connection. The visibility and account
mode are chosen when the connection is created.

**Configured** means the connection's settings are saved. Refresh its tools to
check that the server is reachable.

1. Open the connection and connect your account if needed. For a shared
   organization account, an admin connects it for everyone.
2. Select **Refresh tools**. If you manage the connection, choose which tools
   to enable and save. On services with individual accounts, members also
   refresh their own tools after connecting. Available tools must be both
   enabled by an admin and accessible through the member's account.
3. Under **Agent access**, choose one of your connected agents or an eligible
   organization API key, select its tools, and save.

Personal accounts can only be used by you and your approved agents. Organization
API keys can only use shared organization accounts. Clear a grant's tool
selection to revoke it, or pause the connection to block new calls for everyone.
**Disconnect my account** removes only your individual account. Replacing its
token or reconnecting requires refreshing its tools again. Leaving an organization
removes your individual service accounts; rejoining requires connecting again.

## Call connected tools

Agents use `search_connected_tools`, `describe_connected_tool`, and
`call_connected_tool` through the same Platform MCP URL. Existing agents must
reconnect to approve gateway access; existing API keys need the `gateway:use`
permission. An agent's OAuth grant needs `gateway:use` (or `platform:write`) as
well as its separate tool grant. New or changed tools need review before use.
If a connection changes while you are editing, reload it to review the current
tools before saving.

## Call history

Every tool invocation creates a new call with its own ID, even with identical inputs.
Call history shows who called which tool, its outcome, and duration, without
storing its inputs, results, or credentials. **Unknown** means a call may still be
running or its result was lost: check the external service before trying again.
A failed tool may still have made changes.

## Compose tool calls

Direct calls have a 30-second deadline and results are limited to 128 KiB. Use
`execute({ code })` to compose approved tool calls in Python with `tools.search`,
`tools.describe`, and `tools.call`. Each program runs synchronously in a fresh
sandbox, which is deleted before success is returned. Do not automatically retry
a program after a timeout or lost response: earlier calls may have made changes.
Local stdio servers and custom API connectors are not available in this version.
