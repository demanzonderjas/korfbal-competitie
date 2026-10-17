import raw from './data/indeling.json';

/** The same team in the previous indeling: section, poule, points, name/category when they differ, age. */
type RawPrevious = [string, string, number | null, string | null, string | null, number | null];
type RawTeam = [number, string, string | null, number | null, number | null, string | null, RawPrevious | null];
type RawData = {
	title: string;
	source: string;
	date: string | null;
	updated: string;
	previous: { title: string; source: string; date: string | null };
	categories: { name: string; sections: { name: string; poules: { code: string; teams: RawTeam[] }[] }[] }[];
};

/**
 * "Eindbaas" / "underdog": the team at the top / bottom of a poule with one of the clearest points gaps
 * to its neighbour within its class. Point scales differ a lot per class (senioren are close together,
 * the youngest youth far apart), so the threshold is per class: the smallest gap of at least
 * MIN_LABEL_GAP points that at most LABEL_SHARE of the class's poules reach.
 */
const MIN_LABEL_GAP = 3;
const LABEL_SHARE = 0.15;
/** Per class: the 10% of poules with the highest average are "zwaar", the 10% with the smallest spread "gelijkwaardig". */
const TOUGH_SHARE = 0.1;
const TIGHT_SHARE = 0.1;

export type TeamLabel = 'eindbaas' | 'underdog';

export type Team = {
	nr: number;
	name: string;
	club: string;
	day: string | null;
	age: number | null;
	points: number | null;
	place: string | null;
	haystack: string;
	poule: Poule;
	label: TeamLabel | null;
	/** For a labelled team: its points lead over the number 2, or deficit to the second-lowest. */
	gap: number | null;
	/** Rank by points within the poule, 1 = highest. */
	pointsRank: number | null;
	/** Rank by points across the whole category (e.g. all of B-categorie); ties share a rank. */
	overallRank: number | null;
	/** The same team in the previous indeling (null when the team is new). */
	previous: PreviousTeam | null;
	/** Points now minus points in the previous indeling, when both are known. */
	delta: number | null;
	/** Average age now minus in the previous indeling, when both are known. */
	ageDelta: number | null;
};

export type PreviousTeam = {
	section: string;
	code: string;
	points: number | null;
	name: string;
	category: string;
	age: number | null;
};

export type PouleStats = {
	avg: number;
	min: number;
	max: number;
	spread: number;
	/** Rank by average points within the section, 1 = toughest. */
	rank: number;
	of: number;
	tough: boolean;
	/** One of the most evenly matched poules (smallest points spread) in its section. */
	tight: boolean;
};

export type Poule = {
	code: string;
	section: string;
	category: string;
	teams: Team[];
	stats: PouleStats | null;
	haystack: string;
	/** Teams of different clubs from the same town, grouped per town. */
	derbies: Team[][];
	/** Two or more teams of the same club in this poule. */
	internal: Team[][];
	/** Average of the teams' average ages (B-categorie only). */
	avgAge: number | null;
};

export type Section = {
	name: string;
	category: string;
	poules: Poule[];
	hasStats: boolean;
	teamCount: number;
	/** Minimum points gap for the eindbaas / underdog labels in this section. */
	labelGaps: Record<TeamLabel, number> | null;
};
export type Category = { name: string; sections: Section[] };

export type ClubTeam = { team: Team; poule: Poule };
export type Club = { name: string; place: string | null; teams: ClubTeam[]; haystack: string };

const data = raw as RawData;

export const DAYS: Record<string, string> = {
	Ma: 'maandag',
	Di: 'dinsdag',
	Wo: 'woensdag',
	Do: 'donderdag',
	Vr: 'vrijdag',
	Za: 'zaterdag',
	Zo: 'zondag'
};

/** Lowercase, strip accents and apostrophes so "walden" finds "De Wâlden" and "dos 46" finds "DOS '46". */
export function normalize(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/['’`]/g, '');
}

/** Poule fields are matched on word starts, so "kl" finds poule KL but not every "klasse". */
function wordHaystack(s: string): string {
	const n = normalize(s);
	return ` ${n} ${n.replace(/[-()/]/g, ' ')}`;
}

/** "Telstar/RJJ Keukens J2" -> "Telstar/RJJ Keukens"; the last word is always the team number. */
function clubName(team: string): string {
	const i = team.lastIndexOf(' ');
	return i > 0 ? team.slice(0, i) : team;
}

export const categories: Category[] = data.categories.map((c) => ({
	name: c.name,
	sections: c.sections.map((s) => {
		const section: Section = {
			name: s.name,
			category: c.name,
			hasStats: false,
			teamCount: 0,
			labelGaps: null,
			poules: s.poules.map((p) => {
				const poule: Poule = {
					code: p.code,
					section: s.name,
					category: c.name,
					stats: null,
					haystack: wordHaystack(`${p.code} ${s.name} ${c.name}`),
					teams: [],
					derbies: [],
					internal: [],
					avgAge: null
				};
				poule.teams = p.teams.map(([nr, name, day, age, points, place, prev]) => ({
					nr,
					name,
					club: clubName(name),
					day,
					age,
					points,
					place,
					haystack: normalize(`${name} ${place ?? ''}`),
					poule,
					label: null,
					gap: null,
					pointsRank: null,
					overallRank: null,
					previous: prev && {
						section: prev[0],
						code: prev[1],
						points: prev[2],
						name: prev[3] ?? name,
						category: prev[4] ?? c.name,
						age: prev[5]
					},
					delta: prev && points != null && prev[2] != null ? points - prev[2] : null,
					// Rounded to one decimal, like the ages themselves, to avoid float noise.
					ageDelta: prev && age != null && prev[5] != null ? Math.round((age - prev[5]) * 10) / 10 : null
				}));
				return poule;
			})
		};
		section.teamCount = section.poules.reduce((n, p) => n + p.teams.length, 0);
		return section;
	})
}));

export const sections: Section[] = categories.flatMap((c) => c.sections);
export const poules: Poule[] = sections.flatMap((s) => s.poules);
export const teams: Team[] = poules.flatMap((p) => p.teams);
export const pouleByCode = new Map(poules.map((p) => [p.code.toLowerCase(), p]));
export const teamCount = teams.length;
export const meta = {
	title: data.title,
	source: data.source,
	date: data.date,
	updated: data.updated,
	previous: data.previous
};

/** "Indelingen veld najaar 2026" -> "veld najaar 2026", for "t.o.v. veld najaar 2026". */
export const previousLabel = data.previous.title.replace(/^indelingen?\s+/i, '');

// Points (B-categorie only): per-team rank and labels, per-poule averages ranked within the section.
function labelThreshold(gaps: number[]): number {
	const allowed = Math.max(1, Math.round(gaps.length * LABEL_SHARE));
	let threshold = MIN_LABEL_GAP;
	while (gaps.filter((g) => g >= threshold).length > allowed) threshold++;
	return threshold;
}

for (const section of sections) {
	const rated: { poule: Poule; ranked: Team[] }[] = [];
	for (const poule of section.poules) {
		const ranked = poule.teams.filter((t) => t.points != null).sort((a, b) => b.points! - a.points!);
		if (ranked.length < 2) continue;
		ranked.forEach((t, i) => (t.pointsRank = i + 1));
		const pts = ranked.map((t) => t.points!);
		const n = pts.length;
		poule.stats = {
			avg: pts.reduce((a, b) => a + b, 0) / n,
			min: pts[n - 1],
			max: pts[0],
			spread: pts[0] - pts[n - 1],
			rank: 0,
			of: 0,
			tough: false,
			tight: false
		};
		rated.push({ poule, ranked });
	}
	if (!rated.length) continue;
	section.hasStats = true;

	// Labels need at least three rated teams, otherwise "clear of the rest" means nothing.
	const labelled = rated.filter((r) => r.ranked.length >= 3);
	const lead = ({ ranked }: (typeof rated)[number]) => ranked[0].points! - ranked[1].points!;
	const trail = ({ ranked }: (typeof rated)[number]) =>
		ranked[ranked.length - 2].points! - ranked[ranked.length - 1].points!;
	const labelGaps = { eindbaas: labelThreshold(labelled.map(lead)), underdog: labelThreshold(labelled.map(trail)) };
	section.labelGaps = labelGaps;
	for (const r of labelled) {
		const top = r.ranked[0];
		const bottom = r.ranked[r.ranked.length - 1];
		if (lead(r) >= labelGaps.eindbaas) [top.label, top.gap] = ['eindbaas', lead(r)];
		if (trail(r) >= labelGaps.underdog) [bottom.label, bottom.gap] = ['underdog', trail(r)];
	}

	const byAvg = rated.map((r) => r.poule).sort((a, b) => b.stats!.avg - a.stats!.avg);
	const toughCount = Math.max(1, Math.round(byAvg.length * TOUGH_SHARE));
	byAvg.forEach((p, i) => {
		p.stats!.rank = i + 1;
		p.stats!.of = byAvg.length;
		p.stats!.tough = byAvg.length > 1 && i < toughCount;
	});

	const bySpread = labelled.map((r) => r.poule).sort((a, b) => a.stats!.spread - b.stats!.spread);
	const tightCount = Math.max(1, Math.round(bySpread.length * TIGHT_SHARE));
	if (bySpread.length > 1) bySpread.slice(0, tightCount).forEach((p) => (p.stats!.tight = true));
}

/** Number of teams with points per category, i.e. the length of its complete ranking. */
export const rankedTeamCount = new Map<string, number>();
for (const category of categories) {
	const rated = category.sections
		.flatMap((s) => s.poules.flatMap((p) => p.teams))
		.filter((t) => t.points != null)
		.sort((a, b) => b.points! - a.points!);
	rated.forEach((t, i) => {
		t.overallRank = i > 0 && t.points === rated[i - 1].points ? rated[i - 1].overallRank : i + 1;
	});
	if (rated.length) rankedTeamCount.set(category.name, rated.length);
}

// Team order: seniors by number (MIA 1, MIA 2, …), then midweek, youth (U19, U17, U15, then J1, J2, …)
// and G-korfbal. Categories only break ties, so A- and B-categorie seniors are listed together.
const LABEL_TYPES = [/^\d+$/, /^MW\d+$/, /^U\d+-\d+$/, /^J\d+$/, /^G\d+$/];
const TEAM_GROUPS = ['Senioren', 'Midweek', 'Jeugd', 'Jeugd', 'G-korfbal', 'Overig'] as const;
const categoryOrder = new Map(categories.map((c, i) => [c.name, i]));

function teamSortKey(team: Team): [number, number, number] {
	const label = team.name.slice(team.name.lastIndexOf(' ') + 1);
	const type = LABEL_TYPES.findIndex((re) => re.test(label));
	const nums = label.match(/\d+/g)?.map(Number) ?? [0];
	// U19 before U17 before U15, then by team number.
	return type === 2 ? [type, -nums[0], nums[1]] : [type < 0 ? LABEL_TYPES.length : type, nums[0], 0];
}

export function teamGroup(team: Team): (typeof TEAM_GROUPS)[number] {
	return TEAM_GROUPS[teamSortKey(team)[0]];
}

export function compareTeams(a: Team, b: Team): number {
	const ka = teamSortKey(a);
	const kb = teamSortKey(b);
	return (
		ka[0] - kb[0] ||
		ka[1] - kb[1] ||
		ka[2] - kb[2] ||
		categoryOrder.get(a.poule.category)! - categoryOrder.get(b.poule.category)! ||
		a.name.localeCompare(b.name)
	);
}

// Clubs: a team belongs to the club before the first "/", and also to any other "/"-part that is itself
// a club, so combination teams like "Nic./Hoogkerk" show up under both. Sponsor names never become clubs.
/** "/" separates clubs and sponsors; a few names use "_" for the same ("Pallas '08_thebagstore.nl"). */
const clubParts = (team: Team) => [...new Set(team.club.split(/[/_]/).map((s) => s.trim()))];

export const clubs: Club[] = (() => {
	const byName = new Map<string, Team[]>();
	for (const t of teams) {
		const base = clubParts(t)[0];
		if (!byName.has(base)) byName.set(base, []);
	}
	for (const t of teams) {
		for (const part of clubParts(t)) byName.get(part)?.push(t);
	}
	return [...byName]
		.map(([name, list]) => {
			const sorted = [...list].sort(compareTeams);
			const places = new Map<string, number>();
			for (const t of list) {
				if (t.place && clubParts(t)[0] === name) places.set(t.place, (places.get(t.place) ?? 0) + 1);
			}
			const place = [...places].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
			return {
				name,
				place,
				teams: sorted.map((team) => ({ team, poule: team.poule })),
				haystack: normalize(`${name} ${place ?? ''}`)
			};
		})
		.sort((a, b) => normalize(a.name).localeCompare(normalize(b.name), 'nl'));
})();

export const clubByName = new Map(clubs.map((c) => [c.name.toLowerCase(), c]));

/** The club a team is listed under first (combination teams also appear under their partner clubs). */
export const homeClub = (team: Team): Club => clubByName.get(clubParts(team)[0].toLowerCase())!;

for (const poule of poules) {
	const ages = poule.teams.map((t) => t.age).filter((a) => a != null);
	if (ages.length) poule.avgAge = ages.reduce((a, b) => a + b, 0) / ages.length;
}

// Derbies (different clubs from the same town) and club-internal duels, per poule.
for (const poule of poules) {
	const byPlace = new Map<string, Team[]>();
	const byClub = new Map<Club, Team[]>();
	for (const t of poule.teams) {
		if (t.place) byPlace.set(t.place, [...(byPlace.get(t.place) ?? []), t]);
		byClub.set(homeClub(t), [...(byClub.get(homeClub(t)) ?? []), t]);
	}
	poule.derbies = [...byPlace.values()].filter((ts) => new Set(ts.map(homeClub)).size > 1);
	poule.internal = [...byClub.values()].filter((ts) => ts.length > 1);
}

/** Clubs whose name (or home town) contains every query word; name-prefix matches first. */
export function searchClubs(query: string): Club[] {
	const q = normalize(query.trim());
	const words = q.split(/\s+/).filter(Boolean);
	if (!words.length) return clubs;
	return clubs
		.filter((c) => words.every((w) => c.haystack.includes(w)))
		.sort((a, b) => {
			const pa = normalize(a.name).startsWith(q) ? 0 : 1;
			const pb = normalize(b.name).startsWith(q) ? 0 : 1;
			return pa - pb || b.teams.length - a.teams.length;
		});
}

export type SearchResult = { poule: Poule; matches: Set<Team> };

const compareByClub = (a: Team, b: Team) =>
	normalize(homeClub(a).name).localeCompare(normalize(homeClub(b).name), 'nl') || compareTeams(a, b);

/**
 * Every query word must appear in the team's name/place, or start a word of its poule's
 * code/section/category.
 */
export function search(query: string, category: string | null): SearchResult[] {
	const words = normalize(query).split(/\s+/).filter(Boolean);
	if (!words.length) return [];

	const exact = pouleByCode.get(query.trim().toLowerCase());
	const results: SearchResult[] = [];

	for (const poule of poules) {
		if (category && poule.category !== category && poule !== exact) continue;
		const matches = new Set<Team>();
		for (const team of poule.teams) {
			let inTeam = false;
			const all = words.every((w) => {
				if (team.haystack.includes(w)) return (inTeam = true);
				return poule.haystack.includes(` ${w}`);
			});
			if (all && inTeam) matches.add(team);
		}
		const pouleMatch = words.every((w) => poule.haystack.includes(` ${w}`));
		if (matches.size || pouleMatch || poule === exact) results.push({ poule, matches });
	}

	// Exact poule code first, then poules with matching teams in team order (club, then MIA 1, MIA 2, …,
	// then youth), then poules that only match on code/class, in competition order.
	const firstMatch = new Map(results.map((r) => [r, [...r.matches].sort(compareByClub)[0]]));
	return results.sort((a, b) => {
		if (a.poule === exact || b.poule === exact) return a.poule === exact ? -1 : 1;
		const ta = firstMatch.get(a);
		const tb = firstMatch.get(b);
		if (!ta || !tb) return (ta ? 0 : 1) - (tb ? 0 : 1);
		return compareByClub(ta, tb);
	});
}
