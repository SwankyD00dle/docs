# Writing Adapt's docs

This repository is the single source of Adapt's public docs. adapt.com renders it: each section folder at `adapt.com/docs/<section>/<slug>`, and `changelog/` at `adapt.com/changelog`. adapt.com also serves every page as Markdown (`<url>.md`, `/docs/llms.txt`, `/docs/llms-full.txt`), so agents read the same text people do.

## 1. Place it

Pick the home before writing a word:

- **Platform** (sandboxes, storage, models, endpoints, identities, the API and `adapt` CLI): a page in `platform/`.
- **A changelog entry** for something that shipped: a file in `changelog/`, its images in `images/changelog/`.
- **A new section** (a new product): a new folder with its own `docs.json`, plus an entry in `src/lib/docs/sections.ts` in adapt/adapt.com. Ask Casey before starting one.
- **The v1 product** (the Slack agent, app.adapt.com): adapt/docs-v1, served at v1-docs.adapt.com. Maintenance only.

Then search the existing pages for the topic. Extend the page that already owns it; a second page on the same question splits search ranking and leaves two weak pages. Add a page only when no page owns the topic.

Done when you can name the file you will edit, or the slug and group of the new page and why no existing page fits.

## 2. Write the page

Read two neighbouring pages first and match them. The conventions they share:

- **Title** is the page's only `#` heading.
- **Lead** is the paragraph under it. Its first sentence defines the concept ("A sandbox is an isolated environment for running code.") because adapt.com uses it as the meta description, the hub card line and the llms.txt summary.
- **Sections** are `##` headings named for the task ("Create a sandbox"). Each becomes a linkable anchor and an "On this page" entry, so keep them stable; renaming one breaks links to it.
- **Examples** pair the CLI and the API as tabs, CLI first: ```` ```sh tab="CLI" ```` then ```` ```sh tab="API" ````. API examples use curl with `"$PLATFORM_URL"` and `$PLATFORM_API_KEY`; adapt.com replaces `$PLATFORM_URL` with `https://platform.adapt.com`. Other IDs are `$UPPER_CASE` variables; a new one needs a value in `substitute()` in `scripts/check.ts`.
- **Links**: `/docs/<slug>` (with `#anchor`) for another page in the same section; any other root path (`/sandboxes`, `/settings/api-keys`) for the dashboard. adapt.com rewrites both, so write neither with a host.
- **Limits and defaults** go in a list under the example that sets them, with units and ranges.

Every fact is traceable to code on the product's `main` branch: for Platform, limits and defaults to the API schemas in adapt/platform `packages/api`, CLI flags to the adapt/platform-cli source, dashboard steps to the current UI. Document what exists today; a planned feature waits until it ships. Keep sentences short and concrete, one idea each, and cut what the example already shows.

Done when every command and number on the page has a source you looked at.

## 3. Register and check

1. A new page gets an entry in its section's `docs.json` (`slug`, `label` for the sidebar, `group` from its `groups`), placed where a reader meets it in order. The platform dashboard links to most Platform slugs (`get-started`, `connections`, `secrets`, `identities`, `images`, `endpoints`, `models`, `volumes`), so renaming one needs a redirect in adapt.com and a dashboard change.
2. Run `npm run check`.
3. See it rendered: run `npm run preview` here, then run adapt.com locally with `DOCS_SOURCE_URL=http://localhost:4500 pnpm dev` and open `localhost:3333/docs/platform/<slug>`. Check the tabs, links and anchors.
4. In the pull request, list the source files you checked the facts against.

Done when the check passes and the page renders on a local adapt.com with working tabs, links and anchors.

## Keeping up with the product

Docs live here, so a product change doesn't update them by itself. Two things keep them current:

- **The daily check** validates every API example against the live OpenAPI spec and opens an issue here when one breaks.
- **Product pull requests** that change public behaviour (an API schema, a CLI flag, a dashboard flow) get a docs pull request here, linked from the product PR. Write it with the steps above.
