import { ImageResponse } from "@cloudflare/pages-plugin-vercel-og/api";

import imdbLogoSvg from "../assets/IMDb_PrimaryLogo_Black.svg";

const LOGO_D = imdbLogoSvg.match(/<path[^>]*\sd="([^"]+)"/)[1];
const LOGO_VIEWBOX = imdbLogoSvg.match(/viewBox="([^"]+)"/)[1];
const [, , vbWidth, vbHeight] = LOGO_VIEWBOX.split(" ").map(Number);

// wrangler.jsonc sets jsx_factory to "h" — esbuild compiles JSX below into
// calls to this, so it must stay in scope even though nothing calls it directly.
function h(type, props, ...children) {
	return { type, props: { ...props, children: children.flat().filter((c) => c !== null && c !== false && c !== undefined) } };
}

export function renderBadge(row) {
	const rating = row ? row.averageRating.toFixed(1) : "N/A";
	const votes = row ? formatShort(row.numVotes) : "";
	const height = 25;
	const width = 100;
	const logoHeight = height - height / 5;
	const logoWidth = Math.round((logoHeight * vbWidth) / vbHeight);

	return new ImageResponse((
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-around",
				gap: 4,
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
					padding: "0",
					backgroundColor: "#f5c518",
					borderRadius: 4,
				}}
			>
				<svg viewBox={LOGO_VIEWBOX} width={logoWidth} height={logoHeight}>
					<path d={LOGO_D} fill="#000" />
				</svg>
			</div>
			<div style={{ display: "flex", alignItems: "center", gap: 3, color: "#000000", fontSize: 12, fontWeight: 700 }}>
				<span>{rating}</span>
				{votes && <span style={{ fontSize: 9, fontWeight: 400, color: "#4d4d4d" }}>({votes})</span>}
			</div>
		</div>
	), { width, height });
}

function formatShort(n) {
	if (n >= 1_000_000) return `${trimTrailingZeros((n / 1_000_000).toFixed(2))}M`;
	if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
	return String(n);
}

function trimTrailingZeros(s) {
	return s.replace(/\.?0+$/, "");
}
