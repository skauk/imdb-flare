# imdb-flare

A Cloudflare Worker that mirrors [IMDb's `title.ratings.tsv.gz` dataset](https://datasets.imdbws.com/) into D1 and serves per-title ratings as JSON or as a PNG badge.

## How it works

- **Daily sync** (`src/cron.js`): a cron trigger downloads the dataset, diffs it line-by-line against the previous run's copy (kept in R2, since both files are sorted by `tconst`), and only upserts rows whose rating or vote count actually changed.
- **D1** (`src/db.js`, `schema.sql`): stores `title_ratings(tconst, averageRating, numVotes)` — the same columns as the source TSV.
- **HTTP routes** (`src/index.js`):
  - `GET /tt<id>.json` → `{"tconst": "tt0111161", "averageRating": 9.3, "numVotes": 3209672}`, `404` if unknown.
  - `GET /tt<id>.png` → a rating badge image (`src/image.jsx`), rendered with [`@cloudflare/pages-plugin-vercel-og`](https://developers.cloudflare.com/pages/platform/functions/plugins/vercel-og/). Rendered badges are cached in KV for an hour so repeat requests skip the D1 query and re-render.

## Setup

```sh
npm install

# D1
npx wrangler d1 create imdb-ratings
npx wrangler d1 execute imdb-ratings --remote --file=schema.sql

# R2 (previous-run snapshot for diffing)
npx wrangler r2 bucket create imdb-ratings-snapshots

# KV (rendered badge cache)
npx wrangler kv namespace create CACHE
```

Copy the resulting IDs into `wrangler.jsonc` (`d1_databases`, `r2_buckets`, `kv_namespaces`).

## Development

```sh
npm run dev
curl "http://localhost:8787/tt0111161.json"
curl "http://localhost:8787/tt0111161.png" -o badge.png

# manually trigger the sync cron locally
curl "http://localhost:8787/__scheduled?cron=0+5+*+*+*"
```

## Deploy

```sh
npm run deploy
```

The cron is set to run daily at 05:00 UTC (`wrangler.jsonc`), a few hours after IMDb refreshes the dataset.

## Notes

- IMDb's datasets are for personal/non-commercial use — see [imdb.com/interfaces](https://www.imdb.com/interfaces/) before any commercial use.
- The first sync has no previous snapshot to diff against, so it imports the full dataset (~1.7M rows); subsequent runs only touch changed rows.
