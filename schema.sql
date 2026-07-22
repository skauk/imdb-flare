CREATE TABLE IF NOT EXISTS title_ratings (
	tconst TEXT PRIMARY KEY,
	averageRating REAL NOT NULL,
	numVotes INTEGER NOT NULL
);
