# Images and private registries

Use **Images** to import an OCI image once and reuse its prepared filesystem.
Private registries use saved credentials configured under **Registries**.
Wait for the image to become ready, then select it when creating a sandbox or pass
its UUID as `imageId` to `POST /v1/sandboxes`. Each sandbox has private writable
storage; registry tag changes do not change imported images.

## Import and use an image

In the dashboard, choose **Images → Import image**, or use the CLI or API.
For the curl example, use a new `IDEMPOTENCY_KEY`:

```sh tab="CLI"
adapt images import python:3.12-slim --name python-worker --architecture amd64
```

```sh tab="API"
curl --fail-with-body -sS -X POST "$PLATFORM_URL/v1/images" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  --data '{"name":"python-worker","source":"python:3.12-slim","architecture":"amd64"}'
```

`architecture` defaults to `amd64` and also accepts `arm64`. Base storage is
sized automatically for the image. The returned `baseSizeMiB` is null while
preparing and shows the resulting size once ready. Choose writable disk capacity
separately when creating a sandbox.

The response is `202`. Set `IMAGE_ID` to its `id`, then inspect import progress:

```sh tab="CLI"
adapt images get "$IMAGE_ID"
```

```sh tab="API"
curl --fail-with-body -sS "$PLATFORM_URL/v1/images/$IMAGE_ID" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

Wait for `status: "ready"`. A failed import has status `failed` and an `error`.
Imports have a two-hour deadline. Launch a ready image with the CLI or API;
use another new `IDEMPOTENCY_KEY` for the curl example:

```sh tab="CLI"
adapt sandbox create --image-id "$IMAGE_ID" --label name=python-worker
```

```sh tab="API"
curl --fail-with-body -sS -X POST "$PLATFORM_URL/v1/sandboxes" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  --data @- <<EOF_JSON
{"imageId":"$IMAGE_ID","labels":{"name":"python-worker"}}
EOF_JSON
```

## Private registry credentials

Create a credential in **Registries**, then select it when
importing. API imports accept its UUID as `registryCredentialId`. Credentials
belong to your organization; passwords and access tokens are encrypted and never
returned by the API.

Credentials are scoped to a registry HTTPS origin. If a registry uses a separate
token service, configure that trusted token origin too. For Docker Hub, use
`https://registry-1.docker.io` for the registry and `https://auth.docker.io` for the
token origin. Registries must be reachable on the public internet; private network
registries are not supported.

## Pull the latest version

Click an image in the list to see its details, digests, and import errors.
To fetch a newer version, choose **Pull latest** on its detail page.
It reuses the registry tag and import settings, with a choice of saved credential.
The pull creates a separate image; wait until it is ready, then select the new
version when creating a sandbox. Existing sandboxes keep their current version.
Digest-pinned images cannot pull a newer version.

The CLI generates a new retry key automatically. For the API call, use a new
`IDEMPOTENCY_KEY` and an empty JSON object (`{}`) as the body:

```sh tab="CLI"
adapt images pull "$IMAGE_ID"
```

```sh tab="API"
curl --fail-with-body -sS -X POST "$PLATFORM_URL/v1/images/$IMAGE_ID/pull" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  --data '{}'
```

Omit `registryCredentialId` to reuse the original saved credential,
provide another credential UUID, or set it to `null` for a public image. The 202
response contains the new image ID. MCP clients can use `pull_image` with the
original image `id` and a new `requestId`. Pulling creates a new import even when
the tag resolves to the same digest. Only ready or failed images can be pulled.

## Delete an image

```sh tab="CLI"
adapt images delete "$IMAGE_ID"
```

```sh tab="API"
curl --fail-with-body -sS -X DELETE "$PLATFORM_URL/v1/images/$IMAGE_ID" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

Deletion returns `202`, prevents new launches, and keeps the image artifact until
existing sandboxes finish. Removing or rotating a registry credential affects future
imports. Imported images remain usable without that credential.

Image history and registry credentials currently block organization deletion.
Deleting individual images retains their history and retry keys. Dockerfile builds
and sandbox snapshots are not yet supported.
