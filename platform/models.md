# Model providers

Save API keys for OpenAI, Anthropic, Google, and TypeSafe in your organization. Owners and admins can manage keys; members can see provider names and metadata, but never the saved keys.

## Add a provider

Open **Models**, choose **Add provider**, and select your provider. Paste the API key from your provider account, and choose **Add provider** to save it.

Each organization can save one key per provider. Keys are encrypted and are never displayed after saving. New and replacement keys are checked against the provider’s model-list endpoint before saving. If the provider rejects the key or cannot be reached, nothing is saved. OpenAI and TypeSafe connections can make requests through the model gateway.

## Key validation

Saving a new or replacement key checks whether the provider accepts a models-list request. A successful response saves the key immediately; no model list is displayed or stored. This checks authentication and model-list permissions, not billing credit or permission to run every model.

If the provider rejects the key, the API key field turns red and its error icon shows **API key is invalid** on hover or keyboard focus. The key is focused and selected so you can paste a replacement. Existing saved keys are retained when a replacement fails validation.

Permission restrictions, rate limits, and provider outages show separate messages. Review your account permissions or retry later as directed; these failures do not mark the key invalid.

## Replace a key

Choose **Edit** from the provider’s action menu. Enter a replacement key and choose **Save provider**. Leave the key field blank to keep the existing key.

If someone else changes the provider while you are editing, reload the page and reopen the editor to load the latest settings before saving again.

## Delete a provider

Choose **Delete** from the provider’s action menu and confirm. This removes the saved key from your organization; it does not revoke the key in your provider account.


## Manage models

Choose **Manage models** from a provider’s action menu. The dialog loads the provider’s current model catalog using its saved key. All models are enabled by default; uncheck any models you want to disable, then choose **Save models**. New models added by the provider are automatically allowed unless explicitly disabled.

OpenAI and Anthropic models are shown newest first using their creation or release dates; models with unknown dates appear last in alphabetical order. Google models use reverse natural ordering by model ID, so higher version numbers appear first. Dates are used only for sorting and are not added to the management response.

Disabled models appear above the available models. Check a disabled model to enable it again.

Your disabled choices remain saved even if a model temporarily disappears from the provider’s catalog. Cancel discards changes. Choose **Edit** from the provider’s **⋯** menu, set **Provider status** to **Disabled**, and choose **Save provider** to hide all its models while keeping its key and choices saved. Set the status to **Enabled** to restore access. Leave the replacement key blank to change status without contacting the provider. If loading fails, retry or edit the provider’s key; settings cannot be saved until loading succeeds.

Model discovery uses the providers’ model-list APIs: [OpenAI](https://developers.openai.com/api/reference/resources/models/methods/list), [Anthropic](https://platform.claude.com/docs/en/api/typescript/models/list), and [Google](https://ai.google.dev/api/models). Google results include models supporting content generation. Availability in a catalog does not guarantee billing credit or permission for every inference operation.

## List available models

`GET /v1/models` returns the organization’s current provider models, excluding disabled providers and explicitly disabled model IDs in an OpenAI-compatible list. It requires `modelGateway.use` permission and accepts a session or bearer API key. Provider metadata read permission alone does not grant model access.

```json
{
  "object": "list",
  "data": [
    {
      "id": "openai/example-model",
      "object": "model",
      "created": 1794355200,
      "owned_by": "openai"
    }
  ]
}
```

Returned IDs include the provider prefix. The creation time is when the provider connection was saved. Listing models contacts enabled providers using the saved encrypted credentials. If a provider cannot be reached, the request returns an error instead of a partial catalog. OpenAI supports `POST /v1/chat/completions`, `/v1/responses`, and `/v1/decisions`. TypeSafe supports native JSON `POST /v1/systemone` requests with `state`, `model`, and `questions`. Use a Platform bearer key with model access; provider keys stay on the server. TypeSafe accepts native model names or matching `typesafe/` prefixes. Its SDK base URL should be the Platform origin, since it appends `/v1/systemone`. Multipart uploads are unsupported; the JSON request limit is 1 MiB.


`GET /v1/model-gateway/providers/{id}/models` is the management endpoint used by the dialog. It returns the complete provider catalog, including disabled models, and the provider version. It requires an owner or admin session; saved keys never leave the server.
