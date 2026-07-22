/**
 * Daily sync of IMDB's title.ratings.tsv.gz into D1.
 *
 * - Run `npm run dev` to start a local dev server
 * - Run `curl "http://localhost:8787/__scheduled?cron=0+5+*+*+*"` to trigger the sync locally
 * - Run `npm run deploy` to publish
 */

import { getRating } from "./db.js";
import { syncRatings } from "./cron.js";
import { renderBadge } from "./image.jsx";

const TCONST_ROUTE_RE = /^\/(tt\d+)\.(png|json)$/;
const CACHE_TTL_SECONDS = 3_600;
const HEADERS = {
	"content-type": "image/png",
	"cache-control": "public, max-age=86400",
};

export default {
	async fetch(req, env, ctx) {
		const url = new URL(req.url);
		const match = url.pathname.match(TCONST_ROUTE_RE);
		const [, tconst, ext] = match ?? [];

		if (match && ext === "json") {
			const row = await getRating(env, tconst);
			if (!row) return Response.json({ error: "not found" }, { status: 404 });
			return Response.json({ tconst, averageRating: row.averageRating, numVotes: row.numVotes });
		}

		if (match) {
			let buffer = await env.CACHE.get(tconst, "arrayBuffer");

			if (!buffer) {
				const row = await getRating(env, tconst);
				buffer = await renderBadge(row).arrayBuffer();
			}
			ctx.waitUntil(env.CACHE.put(tconst, buffer, { expirationTtl: CACHE_TTL_SECONDS }));

			return new Response(buffer, { headers: HEADERS });
		}

		url.pathname = "/__scheduled";
		url.searchParams.append("cron", "0 5 * * *");
		return new Response(`To test the scheduled handler, ensure you have used the "--test-scheduled" then try running "curl ${url.href}".`);
	},

	async scheduled(event, env, ctx) {
		ctx.waitUntil(syncRatings(env));
	},
};
