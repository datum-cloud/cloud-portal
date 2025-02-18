# Development

Install dependencies

```shellscript
bun install
```

Before running the server you might want to check your [.env file](env.example). The environment file will automatically loaded for you.

If you need any Social Login secrets, such as those for Google or GitHub, please post a message in the [product-dev channel](https://datum-inc.slack.com/archives/C084W6XRVS7).

Datum APIs are:

- Staging: https://api.staging.env.datum.net
- Production: https://api.datum.net

Run the dev server:

```shellscript
bun run dev
```
