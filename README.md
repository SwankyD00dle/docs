# Adapt docs

The source of Adapt's documentation. Read it at **[adapt.com/docs](https://adapt.com/docs)**; this repository is where it's written.

Each top-level folder with a `docs.json` is a section of the docs: `platform/` is published at [adapt.com/docs/platform](https://adapt.com/docs/platform). `changelog/` is published at [adapt.com/changelog](https://adapt.com/changelog).

Every page is also served as Markdown for agents, at `<page URL>.md`, with indexes at [/docs/llms.txt](https://adapt.com/docs/llms.txt) and [/docs/llms-full.txt](https://adapt.com/docs/llms-full.txt).

## Contributing

Fixes are welcome. Open a pull request against `main`; a merged change appears on adapt.com within a few minutes.

```sh
npm install
npm run check
```

`npm run check` validates each section's `docs.json` against its pages, every link between pages and its `#anchor`, the changelog's frontmatter and images, and every API example against the live API's [OpenAPI spec](https://platform.adapt.com/openapi.json). It runs on every pull request and once a day, so a change to the API that breaks an example is caught even when nobody touched the docs.

[AGENTS.md](AGENTS.md) has the conventions pages follow, for people and coding agents alike.

## License

The docs are licensed in two parts:

- Pages, changelog entries and images: [Creative Commons Attribution 4.0](LICENSE). Reuse them with credit to Adapt.
- Code, in `scripts/` and in the examples on each page: [MIT](LICENSE-CODE).

Neither license grants rights to the Adapt name or logo.
