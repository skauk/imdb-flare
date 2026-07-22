import { ImageResponse } from "@cloudflare/pages-plugin-vercel-og/api";

import imdbLogoSvg from "../assets/IMDb_PrimaryLogo_Black.svg";

const LOGO_D = imdbLogoSvg.match(/<path[^>]*\sd="([^"]+)"/)[1];
const LOGO_VIEWBOX = imdbLogoSvg.match(/viewBox="([^"]+)"/)[1];
const LOGO_HEIGHT = 40;
const [, , vbWidth, vbHeight] = LOGO_VIEWBOX.split(" ").map(Number);
const LOGO_WIDTH = Math.round((LOGO_HEIGHT * vbWidth) / vbHeight);

export function renderBadge(row) {
	const rating = row ? row.averageRating.toFixed(1) : "N/A";
	const votes = row ? formatShort(row.numVotes) : "";

	return new ImageResponse((
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-around",
				gap: 6,
				width: "100%",
				height: "100%",
				backgroundColor: "transparent",
				fontFamily: "sans serif",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: "0 .25rem",
					backgroundColor: "#f5c518",
					borderRadius: 6,
				}}
			>
				<svg viewBox={LOGO_VIEWBOX} width={LOGO_WIDTH} height={LOGO_HEIGHT}>
					<path d={LOGO_D} fill="#000" />
				</svg>
			</div>
			<div style={{ display: "flex", alignItems: "center", gap: 4, color: "#000000", fontSize: 30, fontWeight: 700 }}>
				<span>{rating}</span>
				{votes && <span style={{ fontSize: 18, fontWeight: 400, color: "#4d4d4d" }}>({votes})</span>}
			</div>
		</div>
	), { width: 200, height: 50 });
}

function formatShort(n) {
	if (n >= 1_000_000) return `${trimTrailingZeros((n / 1_000_000).toFixed(2))}M`;
	if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
	return String(n);
}

function trimTrailingZeros(s) {
	return s.replace(/\.?0+$/, "");
}
