import { tick } from 'svelte';
import { pushState, replaceState } from '$app/navigation';
import { categories, clubByName, normalize, type TeamLabel } from './indeling';

export type View = 'indeling' | 'clubs' | 'ranglijst';
export type RankMode = 'teams' | 'poules' | 'trend';
export type Direction = 'up' | 'down';
export type TeamOrder = 'punten' | 'jong' | 'oud';
export type SortMode = 'code' | 'zwaar';
export type PouleKind = 'zwaar' | 'gelijkwaardig';

const MY_CLUB_KEY = 'mijn-club';
export const ALL_SECTIONS = 'alle';

export const slug = (s: string) =>
	normalize(s)
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

const categoryBySlug = new Map(categories.map((c) => [slug(c.name), c]));
/** Categories with points (the B-categorie sheets). */
export const rankedCategories = categories.filter((c) => c.sections.some((s) => s.hasStats));

/**
 * All view state lives here and is mirrored in the URL, so every screen can be shared or bookmarked.
 * What is shown is decided in order: ?poule, ?club, ?q, then ?v (indeling / clubs / ranglijst).
 * In the ranking, ?q filters the list instead of opening search results.
 */
class AppState {
	view = $state<View>('indeling');
	query = $state('');
	category = $state<string | null>(null);
	section = $state<string | null>(null);
	poule = $state<string | null>(null);
	club = $state<string | null>(null);
	mode = $state<RankMode>('teams');
	min = $state<number | null>(null);
	/** Ranking filters: only eindbazen/underdogs (teams), or only tough/even poules (poules). */
	label = $state<TeamLabel | null>(null);
	kind = $state<PouleKind | null>(null);
	/** Trend mode: biggest risers or fallers since the previous indeling. */
	direction = $state<Direction>('up');
	/** Teams mode: order by points, or youngest/oldest average age first. */
	order = $state<TeamOrder>('punten');
	sort = $state<SortMode>('code');
	myClub = $state<string | null>(null);

	trimmed = $derived(this.query.trim());

	/**
	 * The B-categorie and section the ranking shows. Points scales differ a lot per class, so it
	 * defaults to the first class; ALL_SECTIONS (null here) compares everything.
	 */
	rankCategory = $derived(
		rankedCategories.find((c) => c.name === this.category) ?? rankedCategories[0]
	);
	rankSection = $derived(
		this.section === ALL_SECTIONS
			? null
			: (this.rankCategory.sections.find((s) => s.name === this.section && s.hasStats) ??
					this.rankCategory.sections.find((s) => s.hasStats)!)
	);

	url() {
		const p = new URLSearchParams();
		if (this.poule) p.set('poule', this.poule);
		else if (this.club) p.set('club', this.club);
		else if (this.trimmed && this.view !== 'ranglijst') {
			p.set('q', this.trimmed);
			if (this.category) p.set('cat', slug(this.category));
		} else {
			if (this.view !== 'indeling') p.set('v', this.view);
			if (this.category) p.set('cat', slug(this.category));
			if (this.section) p.set('sectie', slug(this.section));
			if (this.view === 'ranglijst') {
				if (this.trimmed) p.set('q', this.trimmed);
				if (this.mode !== 'teams') p.set('mode', this.mode);
				if (this.mode === 'teams' && this.label) p.set('label', this.label);
				if (this.mode === 'teams' && this.order !== 'punten') p.set('volgorde', this.order);
				if (this.mode === 'poules' && this.kind) p.set('soort', this.kind);
				if (this.mode === 'trend' && this.direction === 'down') p.set('richting', 'dalers');
				if (this.min != null) p.set('min', String(this.min));
			}
			if (this.view === 'indeling' && this.sort !== 'code') p.set('sort', this.sort);
		}
		const qs = p.toString();
		return location.pathname + (qs ? `?${qs}` : '');
	}

	read() {
		const p = new URLSearchParams(location.search);
		const q = p.get('q') ?? '';
		if (q !== this.trimmed) this.query = q;
		const v = p.get('v');
		this.view = v === 'clubs' || v === 'ranglijst' ? v : 'indeling';
		const c = categoryBySlug.get(p.get('cat') ?? '');
		this.category = c?.name ?? null;
		this.section =
			p.get('sectie') === ALL_SECTIONS
				? ALL_SECTIONS
				: (c?.sections.find((s) => slug(s.name) === p.get('sectie'))?.name ?? null);
		this.poule = p.get('poule');
		this.club = p.get('club');
		const mode = p.get('mode');
		this.mode = mode === 'poules' || mode === 'trend' ? mode : 'teams';
		this.direction = p.get('richting') === 'dalers' ? 'down' : 'up';
		const order = p.get('volgorde');
		this.order = order === 'jong' || order === 'oud' ? order : 'punten';
		const label = p.get('label');
		this.label = label === 'eindbaas' || label === 'underdog' ? label : null;
		const kind = p.get('soort');
		this.kind = kind === 'zwaar' || kind === 'gelijkwaardig' ? kind : null;
		const min = Number(p.get('min'));
		this.min = p.has('min') && Number.isFinite(min) ? min : null;
		this.sort = p.get('sort') === 'zwaar' ? 'zwaar' : 'code';
	}

	/** Apply a change as a new history entry (so Back works) and scroll to the top. */
	async go(change: () => void) {
		change();
		pushState(this.url(), {});
		await tick();
		window.scrollTo({ top: 0 });
	}

	/** Apply a change in place, for typing and sliders. */
	replace() {
		replaceState(this.url(), {});
	}

	/** Clear all filters and selections (the view itself is kept). */
	reset() {
		this.query = '';
		this.category = null;
		this.section = null;
		this.poule = null;
		this.club = null;
		this.mode = 'teams';
		this.min = null;
		this.label = null;
		this.kind = null;
		this.direction = 'up';
		this.order = 'punten';
		this.sort = 'code';
	}

	openView(view: View) {
		return this.go(() => {
			// The ranking keeps the current search, or the open club, as its filter.
			const fromClub = view === 'ranglijst' ? this.club : null;
			const filter = view === 'ranglijst' ? (fromClub ?? this.trimmed) : '';
			this.reset();
			this.view = view;
			this.query = filter;
			if (fromClub) this.section = ALL_SECTIONS;
		});
	}

	openClub(name: string) {
		return this.go(() => {
			this.poule = null;
			this.club = name;
		});
	}

	openPoule(code: string) {
		return this.go(() => (this.poule = code));
	}

	openSection(category: string, section: string) {
		return this.go(() => {
			this.reset();
			this.view = 'indeling';
			this.category = category;
			this.section = section;
		});
	}

	loadMyClub() {
		try {
			const saved = localStorage.getItem(MY_CLUB_KEY);
			// A club can disappear when the data is updated for a new season.
			this.myClub = saved && clubByName.has(saved.toLowerCase()) ? saved : null;
		} catch {
			// Storage can be unavailable (private mode); the app works without it.
		}
	}

	setMyClub(name: string | null) {
		this.myClub = name;
		try {
			if (name) localStorage.setItem(MY_CLUB_KEY, name);
			else localStorage.removeItem(MY_CLUB_KEY);
		} catch {
			// See loadMyClub.
		}
	}
}

export const app = new AppState();
