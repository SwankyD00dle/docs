# Single sign-on and directory provisioning

Use single sign-on (SSO) to let your team sign in through your identity provider.
Use SCIM to add and deactivate organization members from your directory. You can
configure either one on its own or use them together. SCIM works with existing
Google and GitHub sign-in and does not require SSO or domain verification.

## Before you start

- Select the organization you want to manage, then open
  [Settings → Identity](/settings/identity). You must be an owner or admin.
- Have access to your identity provider's application settings. For SSO, you also
  need access to DNS for your team's email domain.
- Each organization supports one SSO provider and one SCIM directory. SSO uses
  one email domain; a SCIM directory can provision people across email domains.
- Keep an organization owner outside directory provisioning so you can recover
  access if a directory configuration changes.

## Set up single sign-on

Under **Set up single sign-on**, choose **OpenID Connect** or **SAML 2.0** to match
your provider. Enter a **Provider ID** using lowercase letters, digits, and
hyphens, starting with a letter or digit, up to 40 characters. This ID must be
unique. For **Email domain**, enter the domain your team uses, such as
`example.com`.

### OpenID Connect

1. Create an OpenID Connect application in your identity provider. Enable the
   authorization code flow with PKCE and the `openid`, `email`, and `profile`
   scopes. The provider must return an email address in your configured domain
   and a stable `sub` identifier for each person.
2. In Platform, enter the application's **Issuer URL**, **Client ID**, and
   **Client secret**, then select **Register provider**. The issuer and its
   discovery endpoints must be reachable over public HTTPS.
3. Copy the displayed **Redirect URI** into your provider's allowed callback or
   redirect URLs. It must match exactly.
4. [Verify your domain and test sign-in](#verify-your-domain-and-test-sign-in).

### SAML 2.0

1. Create a SAML application in your identity provider. Choose a URL for its
   audience or entity ID, and enter the same value in Platform's **Service
   provider entity ID** field.
2. Copy your provider's sign-in URL into **Identity provider sign-in URL**, paste
   its metadata into **Identity provider metadata XML**, then select
   **Register provider**.
3. Configure your provider with the displayed **Assertion consumer service
   URL**. You can use the **Service provider metadata URL** to obtain Platform's
   service provider configuration.
4. Configure signed assertions with a stable NameID and an `email` attribute in
   your configured domain. You can also send `displayName`, or `givenName` and
   `surname`, for the person's name.
5. [Verify your domain and test sign-in](#verify-your-domain-and-test-sign-in).

Start SAML sign-in from Platform. Launching the application directly from an
identity provider's app launcher is not supported.

### Verify your domain and test sign-in

1. Copy the displayed **TXT record name** and **TXT record value** into your
   domain's DNS. If the value is hidden, select **Show verification record**.
2. After the record is available in DNS, select **Verify domain**. The provider
   must show **Verified** before anyone can use it to sign in.
3. In a separate browser session, open the sign-in page, enter a work email in
   that domain, and select **Continue with SSO**.
4. Confirm that the person can sign in and see the organization. New users join
   as members; existing members keep their roles.

Successful SSO sign-in can add a member without a prior invitation or SCIM
assignment. A person whose access has been deactivated through SCIM must be
reactivated in the directory first.

SSO adds a sign-in option. It does not enforce SSO for everyone or disable Google,
GitHub, or existing sessions.

## Set up SCIM

1. In **Directory provisioning**, select **Enable SCIM**, then **Issue token**.
2. Copy the **SCIM base URL** and **SCIM bearer token**. The token is shown only
   once, so save it in your directory's provisioning settings before dismissing
   it.
3. In your directory's application settings, enable **SCIM 2.0** provisioning.
   Use the copied base URL and choose **Bearer Token** authentication with the
   token you just issued. Use the URL as shown; it already identifies the
   service, and the token selects the organization.
4. Configure the user mappings below. Enable pagination if your directory offers
   that setting. Disable temporary-password generation: provisioning does not
   create a password for the person.
5. Assign one test person to the application and sync them. Confirm they appear
   in [Settings → Members](/settings/members) and can sign in. Test deactivation
   and reactivation before assigning the rest of your team.

### Map user attributes

- **`userName`**: the person's work email address.
- **Primary `emails.value`**: the same work email, with `emails.primary` set to
  `true`.
- **`externalId`**: your directory's stable user ID. This is optional but
  recommended so deleting and reprovisioning a person preserves their identity.
  Keep it unchanged for that person; it does not need to match an SSO identifier.
- **`active`**: whether the person should have organization access. Set it to
  `false` to deactivate them.
- **`displayName`**, **`name.givenName`**, and **`name.familyName`**: optional name
  attributes.

Users and Groups support filtered lists, pagination, creation, updates, and
deletion, including PUT and PATCH. Group sync is optional. Group membership and
incoming role attributes do not grant admin, owner, or tool permissions.

Your directory can import existing organization members with verified email
addresses and match them to its users. These accounts keep their existing
Platform roles and sign-in profiles. Pending invitations are not members and do
not appear in SCIM. Accounts created through SCIM appear immediately, before
their first sign-in.

## How provisioned people sign in

Provisioning adds organization membership without sending an invitation or
creating a password. People sign in with Google or GitHub using the same verified
email address supplied when they were first provisioned. They can also use your
organization's SSO provider if you have configured one.

If the person already has a verified Platform account with that email,
provisioning adds it to the organization. An existing account with an unverified
email must be verified before provisioning can link it. For a new person, their
first verified sign-in connects them to their provisioned membership.

Newly provisioned people join as members. Existing members keep their roles when
first linked to the directory. See [Organizations and access](/docs/organizations#members-and-invitations)
for what each role can do. Updating a person's email or name in the directory
does not change their Platform sign-in email or account profile.

## Deactivation and recovery

Setting `active` to `false` or deleting a directory user removes their membership
in that organization and revokes their existing agent connections for it.
Subsequent agent requests and token refreshes fail. Invitations and SSO cannot
restore that access while the directory user is inactive.

If the person has no other active directory memberships, their browser and CLI
sessions are revoked too. They can sign in again with Google or GitHub, but
signing in does not restore the deactivated membership. Their memberships in
other organizations remain in place.

Reactivating a person restores membership with the member role. Previous admin or
owner roles are not restored, and the person must reconnect their agents and
approve access again. Deprovisioning the last organization owner is blocked;
make sure another owner has access first.

Organization API keys remain valid and need separate revocation in
[Settings → API keys](/settings/api-keys). Deactivation does not stop running
sandboxes or work already in progress.

## Maintain your connections

### Rotate or revoke a SCIM token

Tokens expire after one year; **Directory provisioning** shows the expiration
date. To replace a token, select **Rotate SCIM token**, then **Issue token**, and
copy the new token into your directory's settings. The old token stops working
immediately. Run a sync to confirm the replacement works.

If you lose the token, rotate it to get a new one. **Revoke SCIM token** stops
future provisioning requests without removing existing members. To resume,
issue a new token and update your directory. Token rotation and revocation do
not affect SSO.

### Update or remove an SSO provider

To rotate an OpenID Connect client secret, enter the **New client secret** and
select **Update credentials**.

Once people have signed in through a provider, changes to its identity settings,
including SAML signing certificates, require replacing the provider. Arrange
another way for people to sign in before selecting **Remove SSO provider**. Then
register the replacement, verify its domain, and test sign-in again.

Removing an SSO provider stops sign-in through it. It does not remove provisioned
members, change the SCIM token, or stop directory syncing.

## Troubleshooting

- **Domain verification fails:** check that the TXT record's full name and value
  match the values shown in Platform. Some DNS services append the domain to
  record names automatically. Wait for the record to become available, then
  select **Verify domain** again.
- **SSO sign-in fails:** confirm the provider is verified, the user's email
  matches the configured domain, and callback or SAML URLs match exactly. Start
  SAML sign-in from Platform. If the person was deactivated through SCIM,
  reactivate them in the directory first.
- **Provisioning returns an authentication error:** check the copied base URL
  and bearer token. If the token is expired, revoked, or lost, rotate it and
  update the directory's settings.
- **An existing account cannot be provisioned:** have the person sign in and
  verify the email address you are provisioning, then retry the sync.
- **A provisioned person can sign in but cannot create resources:** new members
  have read access. Check their [organization role](/docs/organizations#members-and-invitations);
  directory groups do not grant elevated permissions.
