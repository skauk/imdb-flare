const BATCH_SIZE = 1000;

export async function getRating(env, tconst) {
	return env.imdb_ratings.prepare("SELECT averageRating, numVotes FROM title_ratings WHERE tconst = ?").bind(tconst).first();
}

export async function upsertRatings(env, rows) {
	const stmt = env.imdb_ratings.prepare(
		"INSERT INTO title_ratings (tconst, averageRating, numVotes) VALUES (?, ?, ?) " +
			"ON CONFLICT(tconst) DO UPDATE SET averageRating = excluded.averageRating, numVotes = excluded.numVotes"
	);

	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		const chunk = rows.slice(i, i + BATCH_SIZE);
		await env.imdb_ratings.batch(chunk.map((r) => stmt.bind(r.tconst, r.rating, r.votes)));
	}
}
