# Files

Upload and download files through a running sandbox. Paths must be absolute,
normalized file paths, such as `/work/input.txt`, without `..` components or a
trailing slash. Each upload or download is limited to 16 MiB.

## Upload a file

Send a local file as raw bytes. The parent directory must already exist; create
it first with a [command](#work-with-directories):

```sh tab="CLI"
adapt files put "$SANDBOX_ID" ./input.txt /work/input.txt
```

```sh tab="API"
curl --fail-with-body -sS -X PUT \
  "$PLATFORM_URL/v1/sandboxes/$SANDBOX_ID/files?path=/work/input.txt" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @./input.txt
```

A successful upload returns `204` after the guest verifies the data and atomically
replaces the file with mode `0644`. Symlinks and special files are rejected.
An interrupted upload before commit leaves the old file intact. A lost response
after commit can leave a completed write; retrying replaces the whole file.

## Download a file

The CLI encodes file paths for you. With curl, use `--data-urlencode` for paths
that may contain spaces or punctuation:

```sh tab="CLI"
adapt files get "$SANDBOX_ID" /work/input.txt ./downloaded-input.txt
```

```sh tab="API"
curl --fail-with-body -sS --get "$PLATFORM_URL/v1/sandboxes/$SANDBOX_ID/files" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  --data-urlencode "path=/work/input.txt" \
  --output ./downloaded-input.txt
```

To read the response in your terminal, use `-` as the CLI's local destination
or omit curl's `--output`. The CLI refuses to overwrite an existing local file;
add `--force` to replace it.

## Work with directories

Use commands to create or list directories, move files, or remove files:

```sh tab="CLI"
adapt exec "$SANDBOX_ID" --detach \
  -- /bin/sh -lc 'mkdir -p /work/results && ls -la /work'
```

```sh tab="API"
curl --fail-with-body -sS -X POST "$PLATFORM_URL/v1/sandboxes/$SANDBOX_ID/exec" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  --data '{"argv":["/bin/sh","-lc","mkdir -p /work/results && ls -la /work"]}'
```
