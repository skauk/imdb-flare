import { upsertRatings } from "./db.js";

const SOURCE_URL = "https://datasets.imdbws.com/title.ratings.tsv.gz";
const SNAPSHOT_KEY = "title.ratings.tsv.gz";
const TCONST_RE = /^tt\d+$/;

export async function syncRatings(env) {
	const res = await fetch(SOURCE_URL);
	if (!res.ok) {
		throw new Error(`download failed: ${res.status} ${res.statusText}`);
	}
	const newGzBuffer = await res.arrayBuffer();
	const newText = await gunzipToText(newGzBuffer);

	const prevObject = await env.SNAPSHOTS.get(SNAPSHOT_KEY);
	const prevText = prevObject ? await gunzipToText(await prevObject.arrayBuffer()) : "";

	const changed = diffRatings(prevText, newText);
	console.log(`imdb ratings sync: ${changed.length} changed rows`);

	await upsertRatings(env, changed);
	await env.SNAPSHOTS.put(SNAPSHOT_KEY, newGzBuffer);
}

async function gunzipToText(buffer) {
	const stream = new Response(buffer).body.pipeThrough(new DecompressionStream("gzip"));
	return new Response(stream).text();
}

// Both old and new TSVs are sorted by tconst, so a single sorted merge finds
// every added/changed row in one pass without holding a hashmap of ~1.5M rows.
function diffRatings(oldText, newText) {
	const changed = [];
	let oldLine = nextLine(oldText, skipHeader(oldText));
	let newLine = nextLine(newText, skipHeader(newText));

	while (oldLine.line !== null && newLine.line !== null) {
		if (oldLine.line === newLine.line) {
			oldLine = nextLine(oldText, oldLine.next);
			newLine = nextLine(newText, newLine.next);
			continue;
		}

		const oldRow = parseRow(oldLine.line);
		const newRow = parseRow(newLine.line);
		if (!oldRow) {
			oldLine = nextLine(oldText, oldLine.next);
			continue;
		}
		if (!newRow) {
			newLine = nextLine(newText, newLine.next);
			continue;
		}

		if (oldRow.tconst === newRow.tconst) {
			changed.push(newRow); // same id, different rating/votes
			oldLine = nextLine(oldText, oldLine.next);
			newLine = nextLine(newText, newLine.next);
		} else if (oldRow.tconst < newRow.tconst) {
			oldLine = nextLine(oldText, oldLine.next); // row dropped from new file
		} else {
			changed.push(newRow); // row added in new file
			newLine = nextLine(newText, newLine.next);
		}
	}

	while (newLine.line !== null) {
		const row = parseRow(newLine.line);
		if (row) changed.push(row);
		newLine = nextLine(newText, newLine.next);
	}

	return changed;
}

function skipHeader(text) {
	const idx = text.indexOf("\n");
	return idx === -1 ? text.length : idx + 1;
}

function nextLine(text, pos) {
	if (pos >= text.length) return { line: null, next: pos };
	let end = text.indexOf("\n", pos);
	if (end === -1) end = text.length;
	let line = text.slice(pos, end);
	if (line.endsWith("\r")) line = line.slice(0, -1);
	return { line, next: end + 1 };
}

function parseRow(line) {
	const tab1 = line.indexOf("\t");
	const tab2 = line.indexOf("\t", tab1 + 1);
	if (tab1 === -1 || tab2 === -1) return null;

	const tconst = line.slice(0, tab1);
	const rating = Number(line.slice(tab1 + 1, tab2));
	const votes = Number(line.slice(tab2 + 1));

	if (!TCONST_RE.test(tconst) || !Number.isFinite(rating) || !Number.isInteger(votes)) {
		return null;
	}
	return { tconst, rating, votes };
}
