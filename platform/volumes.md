# Volumes

A volume is storage owned by your organization. Volume creation, inspection,
and quota management are available independently of compute. Sandboxes cannot
mount volumes yet; sandbox creation with a nonempty `mounts` array returns
`501`. Use file downloads or external storage for sandbox data you need to keep.

## Create a volume

This creates a volume with a 10 GiB quota. Set `VOLUME_ID` to the returned `id`:

```sh tab="CLI"
adapt volumes create --quota-bytes 10737418240
```

```sh tab="API"
curl --fail-with-body -sS -X POST "$PLATFORM_URL/v1/volumes" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  --data '{"quotaBytes":10737418240}'
```

`quotaBytes` is a positive integer in bytes. Use `null`, or send `{}`, for no
quota. A completed volume has status `ready`. If creation is `unresolved`, the
allocation needs investigation, creating
again with a new retry key may allocate another volume.

## Inspect usage and change quotas

List volumes:

```sh tab="CLI"
adapt volumes list --limit 50
```

```sh tab="API"
curl --fail-with-body -sS "$PLATFORM_URL/v1/volumes?limit=50" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

Read one volume's status, quota, and `usedBytes`:

```sh tab="CLI"
adapt volumes get "$VOLUME_ID"
```

```sh tab="API"
curl --fail-with-body -sS "$PLATFORM_URL/v1/volumes/$VOLUME_ID" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

An unknown usage value is `null`, rather than zero. Increase or change the quota
with a `PUT`, repeating the same update is safe:

```sh tab="CLI"
adapt volumes quota "$VOLUME_ID" --bytes 21474836480
```

```sh tab="API"
curl --fail-with-body -sS -X PUT "$PLATFORM_URL/v1/volumes/$VOLUME_ID/quota" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{"quotaBytes":21474836480}'
```

Set `quotaBytes` to `null` to remove the quota. Volume deletion is currently
unsupported. The delete API returns `501` for an unattached, ready volume and
leaves its data intact.
