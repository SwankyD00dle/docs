# Identities

An identity defines the tools, secrets, and Platform permissions a person or agent
can use for a task. For example, a Coding identity might allow sandbox creation,
command execution, and selected tools from your issue tracker.

Assuming an identity creates a session with its own expiring credential. Requests
use the identity's permissions, and retain the person who started the session.
You can use the same identity with different clients without sharing their tokens.

## Create an identity

1. Open [Identities](/identities) and select **Create identity**. You must be an
   organization owner or admin.
2. Give it a name, then choose its **Platform permissions** and maximum session
   duration. New identities start with no resource permissions.
3. Add **MCP connections** and select the tools it can use. Connections must be
   shared with the organization, and tools must already be enabled on them.
4. Select any **Secrets** to attach when the identity creates a sandbox.
5. Under **Access**, add the members who can use it and choose what each can do.
   The identity and its member access are saved together, so either all of it
   is saved or none of it is.

The creator receives permission to assume and manage the identity. Other members,
including organization admins, need an explicit assume grant before starting a
session. Organization owners and admins can always manage identities.

**Assume** allows a member to start sessions. **Manage** allows configuration
changes and granting access, including assume access. A manager can delegate the
identity's existing authority; adding permissions beyond that requires the
manager to hold those permissions themselves.

Through the API, `POST /v1/identities` and `PUT /v1/identities/{id}` accept
`grants`, a list of `memberId`, `canAssume`, and `canManage`. It sets every
other member's access in the same change: members left out lose their access.
Your own access can't change this way; leave yourself out or repeat your current
access. Omit `grants` on update to keep member access as it is.
`PUT /v1/identities/{id}/grants` still changes one member's access.

## Choose accounts for MCP tools

Each connection binding uses one of two account modes:

- **Shared organization account** uses the account authorized on the organization
  connection.
- **Each person's own account** requires each member to choose a personal
  connection under **Your accounts**. Create a **Just me** connection to the same
  server with the same authentication method in [Connections](/connections),
  authorize it, refresh its tools, and enable the tools you want to use.

Personal bindings use only the session owner's chosen account. A missing,
disconnected, or unauthorized account never falls back to shared credentials.
Tools must be enabled on both the organization connection and the selected
personal connection, and included in the identity's tool selection. Their tool
definitions must also match. If a server changes a tool, refresh and review both
connections before using it.

Changing your selected account ends your existing sessions for that identity.
Upstream credentials remain encrypted in Platform and are not included in the
session token.

## Start a session

Under **Sessions**, select **Start session**, enter a name that identifies your
client or task, and choose a duration. Sessions last between five minutes and the
identity's configured maximum, up to 24 hours.

Copy the token when it is shown. Use it as `ADAPT_TOKEN` for the CLI or in the
`Authorization: Bearer <token>` header for Platform API and MCP requests. MCP
clients connect to `/mcp` on your Platform URL.

```sh
export ADAPT_TOKEN='<identity-session-token>'
```

```sh tab="CLI"
adapt whoami
```

```sh tab="API"
curl --fail-with-body "$PLATFORM_URL/v1/whoami" \
  -H "Authorization: Bearer $ADAPT_TOKEN"
```

The response identifies the organization, identity, session, authorizing user,
and effective permissions. Gateway call history records the user and identity
session that made each tool call.

You can also start sessions through `POST /v1/identities/{id}/sessions`, using
your signed-in user credential and a body containing `label` and optional
`durationSeconds`. An organization API key or another identity session cannot
create identity sessions.

## Permissions and secrets

Resource permissions apply to resources throughout the organization. For example,
command and file permissions can allow access to existing organization sandboxes;
they are not limited to sandboxes created by this identity.

MCP tool access is restricted to the selected connections and tools. Secret-set
access is restricted to the selected sets. An identity's page names its secrets;
their variable names, never their values, appear only to members who can read
secrets. Attached sets are resolved when a
sandbox is created, and local environment values override matching names. Secret
values already delivered to a sandbox remain there until that sandbox is removed.

Identity sessions cannot administer identities, change organization membership,
or manage MCP accounts. Use your signed-in account for those actions.

## End access

Revoke an individual session under **Sessions**. Members see their own sessions;
identity managers can see and revoke all sessions for the identity.

Saving identity configuration, disabling or deleting an identity, or changing a
member's grant ends all of its sessions. Removing a member also removes their
grants. Adding them back does not restore previous access or tokens.

Tokens stop authorizing subsequent requests when revoked or expired. This does
not undo completed tool calls, stop work already in progress, or delete existing
sandboxes. Start a new session after an access change if you still have permission.

Identity sessions currently start from a signed-in member account. Delegation
from other applications, unattended machine principals, and team-based access
are not yet supported.
