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

## Billing

Billing belongs to the organization. In [Settings → Billing](/settings/billing),
view credit balance availability, payment methods, purchase requests, payments,
and usage statements. Owners and admins can update the payment method and buy
credits. Members can read billing information.

Sandbox usage consumes organization credits; model usage is not billed. There are
no subscriptions or automatic credit purchases. Saving a card does not enable
automatic collection of usage payments. Sandboxes continue running when credits
run out.

### Buy credits

1. Choose **Update payment method** and follow the hosted setup link to save a
   card and billing address.
2. Enter an amount in USD and choose **Buy credits**. Purchases accept $0.50 to
   $100,000, with up to two decimal places.
3. Follow **Continue payment** if authentication or another payment action is
   required. Keep the request until payment and credit availability are confirmed.

The dashboard saves the request before sending it. Reloading checks that same
request; it does not create another purchase. If submission was interrupted, use
**Resume saved request**. It keeps the original request ID and amount. Use a
current browser with browser storage and Web Locks support.

**Pending** means the outcome is still being checked. **Needs review** means the
request requires support review; do not make a replacement payment. After a
confirmed failure, a new purchase requires another explicit action. Returning from
a hosted page does not confirm payment. If a returned request is missing, select
the organization where it started.

### Read balances and documents

An unavailable balance appears as **—**, never zero. Signed balances remain
unavailable while credit and outstanding usage accounting are verified. The
observation time describes when billing information was retrieved; provider
updates can arrive later. Stale information retains the last observation and says
that an update could not be confirmed.

Payments show settlement outcomes, refunded amounts, and dispute flags. Statement
and invoice state describes the document: finalization does not prove payment.
Available receipt and document links open the provider's document. **Download**
retrieves a statement PDF through the organization API when no hosted link is
available. A completed
purchase can appear before an updated balance or statement.

Applications with `billing:read` can read `/v1/billing/overview`,
`/v1/billing/history?offset=0`, and `/v1/billing/operations/{id}`. Starting setup or a
purchase requires `billing:write` and a UUID `Idempotency-Key`. Reuse the original
key and inputs after an uncertain response; a changed amount needs a new explicit
purchase after the previous request is resolved.

The overview includes separate `observations.metering`,
`observations.paymentMethod`, and `observations.payments` freshness and observation
times. A failed payment-history refresh can leave fresh card and statement data.
Check each observation before treating a null card or empty list as confirmed.
Payment history is synchronized in bounded steps: `observations.payments.complete`
is false until the first full scan finishes, and `syncing` indicates another scan
is underway. Do not describe partial rows as complete history. The payment
observation time is the start of the last completed scan; older records can change
later after refunds or disputes.
