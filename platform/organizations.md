# Organizations and access

An organization owns its sandboxes, images, registry credentials, volumes,
endpoints, secrets, model providers, connections, identities, and API keys.
Create or switch organizations with the organization menu in the dashboard. Resource IDs and API keys from one organization cannot access another
organization's resources.

## Members and invitations

In [Settings → Members](/settings/members), view members and invitations.
Owners and admins can invite someone as a member or admin. Enter their email and
role, choose **Share a link**, then **Create link** to copy and share a personal
invitation. You can also choose **Send an email** when email delivery is configured.
Pending invitations have **Copy link** and **Send email** actions; expired
invitations have **Renew link**. Canceling an invitation stops its link from working.
Invitations expire after 48 hours. Only someone signed in with the invited email
address can accept, and each invitation can be accepted once.

- **Owners** can manage resources, API keys, invitations, and members,
  including other owners. Only owners can delete the organization, with the
  API or `adapt org delete`.
- **Admins** can manage resources, API keys, invitations, and members other
  than owners.
- **Members** have read access to resources and key metadata. They cannot
  create resources, run commands, or use saved environment values.

To change someone's role or remove them, open their **Actions** menu in
[Settings → Members](/settings/members). Only owners can make someone an owner
or change an owner's role. You can't change your own role or remove yourself.

To leave an organization, choose **Leave organization** in
[Settings → General](/settings/general). An owner can leave only after another
member is an owner. Deleting an organization fails while it still has
sandboxes or volumes.

## API keys and account sessions

In [Settings → API keys](/settings/api-keys), create a named key for each
application or agent. Keys created in the dashboard can read and manage all
resources in that organization. The full key is shown only once. You can view
its status and last-used time, or revoke it to stop subsequent API requests.

Keep keys in your application's environment or secret store. Revoking a key
does not delete the resources it created or stop work it already started.

In [Settings → Sessions](/settings/sessions), view your signed-in browsers and
CLIs. You can revoke one session or all other sessions.
Account sessions and organization API keys are managed separately.

## Single sign-on and provisioning

Owners and admins can independently configure an OIDC or SAML provider and a
SCIM directory in [Settings → Identity](/settings/identity). Use SSO to let your
team sign in through your identity provider, and SCIM to keep membership in sync
with your directory. SCIM also works with Google and GitHub sign-in.

See [SSO and SCIM](/docs/identity) for setup, user mappings, sign-in expectations,
and what happens to members and agent access when you deactivate someone.
