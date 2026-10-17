import raw from './data/indeling.json';

type RawTeam = [number, string, string | null, number | null, number | null, string | null];
type RawData = {
	title: string;
	source: string;
	updated: string;
	categories: { name: string; sections: { name: string; poules: { code: string; teams: RawTeam[] }[] }[] }[];
};

/** A team is "eindbaas" (or "underdog") when it is this many points clear of the next team in its poule. */
export const LABEL_GAP = 7;
/** The top 10% of poules in a section by average points are marked as tough. */
const TOUGH_SHARE = 0.1;

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
	/** Rank by points within the poule, 1 = highest. */
	pointsRank: number | null;
};

export type PouleStats = {
	avg: number;
	min: number;
	max: number;
	/** Rank by average points within the section, 1 = toughest. */
	rank: number;
	of: number;
	tough: boolean;
};

export type Poule = {
	code: string;
	section: string;
	category: string;
	teams: Team[];
	stats: PouleStats | null;
	haystack: string;
};

export type Section = { name: string; category: string; poules: Poule[]; hasStats: boolean; teamCount: number };
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
			poules: s.poules.map((p) => {
				const poule: Poule = {
					code: p.code,
					section: s.name,
					category: c.name,
					stats: null,
					haystack: wordHaystack(`${p.code} ${s.name} ${c.name}`),
					teams: []
				};
				poule.teams = p.teams.map(([nr, name, day, age, points, place]) => ({
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
					pointsRank: null
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
export const meta = { title: data.title, source: data.source, updated: data.updated };

// Points (B-categorie only): per-team rank and labels, per-poule averages ranked within the section.
for (const section of sections) {
	const rated: Poule[] = [];
	for (const poule of section.poules) {
		const ranked = poule.teams.filter((t) => t.points != null).sort((a, b) => b.points! - a.points!);
		if (ranked.length < 2) continue;
		ranked.forEach((t, i) => (t.pointsRank = i + 1));
		const pts = ranked.map((t) => t.points!);
		const n = pts.length;
		if (n >= 3 && pts[0] - pts[1] >= LABEL_GAP) ranked[0].label = 'eindbaas';
		if (n >= 3 && pts[n - 2] - pts[n - 1] >= LABEL_GAP) ranked[n - 1].label = 'underdog';
		poule.stats = {
			avg: pts.reduce((a, b) => a + b, 0) / n,
			min: pts[n - 1],
			max: pts[0],
			rank: 0,
			of: 0,
			tough: false
		};
		rated.push(poule);
	}
	rated.sort((a, b) => b.stats!.avg - a.stats!.avg);
	const toughCount = Math.max(1, Math.round(rated.length * TOUGH_SHARE));
	rated.forEach((p, i) => {
		p.stats!.rank = i + 1;
		p.stats!.of = rated.length;
		p.stats!.tough = rated.length > 1 && i < toughCount;
	});
	section.hasStats = rated.length > 0;
}

// Clubs: a team belongs to the club before the first "/", and also to any other "/"-part that is itself
// a club, so combination teams like "Nic./Hoogkerk" show up under both. Sponsor names never become clubs.
const LABEL_ORDER = [/^\d+$/, /^MW\d+$/, /^U\d+-\d+$/, /^J\d+$/, /^G\d+$/];
function teamSortKey(name: string): [number, number, number] {
	const label = name.slice(name.lastIndexOf(' ') + 1);
	const type = LABEL_ORDER.findIndex((re) => re.test(label));
	const nums = label.match(/\d+/g)?.map(Number) ?? [0];
	// U19 before U17 before U15, then by team number.
	return type === 2 ? [type, -nums[0], nums[1]] : [type < 0 ? 9 : type, nums[0], 0];
}

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
	const categoryOrder = new Map(categories.map((c, i) => [c.name, i]));
	return [...byName]
		.map(([name, list]) => {
			const sorted = [...list].sort((a, b) => {
				const c = categoryOrder.get(a.poule.category)! - categoryOrder.get(b.poule.category)!;
				if (c) return c;
				const ka = teamSortKey(a.name);
				const kb = teamSortKey(b.name);
				return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2] || a.name.localeCompare(b.name);
			});
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

/**
 * Every query word must appear in the team's name/place, or start a word of its poule's
 * code/section/category.
 * Returns poules in competition order, with an exact poule-code match first.
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

	if (exact) {
		const i = results.findIndex((r) => r.poule === exact);
		if (i > 0) results.unshift(...results.splice(i, 1));
	}
	return results;
}
