<script lang="ts">
	import { clubByName, homeClub, normalize, previousLabel, rankedTeamCount, type Poule, type Team } from '../indeling';
	import { ALL_SECTIONS, app, rankedCategories } from '../state.svelte';

	const PAGE_SIZE = 100;
	const nl = (n: number, decimals = 0) =>
		n.toLocaleString('nl-NL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

	let limit = $state(PAGE_SIZE);
	$effect(() => {
		app.rankCategory;
		app.rankSection;
		app.mode;
		app.min;
		app.trimmed;
		app.label;
		app.kind;
		app.direction;
		app.order;
		limit = PAGE_SIZE;
	});

	const sectionsWithStats = $derived(app.rankCategory.sections.filter((s) => s.hasStats));
	const scope = $derived(app.rankSection ? [app.rankSection] : sectionsWithStats);

	/** Competition ranking (1, 2, 2, 4) on a descending value. */
	function ranked<T>(items: T[], value: (x: T) => number) {
		const sorted = [...items].sort((a, b) => value(b) - value(a));
		let rank = 0;
		return sorted.map((item, i) => {
			if (i === 0 || value(item) !== value(sorted[i - 1])) rank = i + 1;
			return { item, rank };
		});
	}

	const rankedTeams = $derived(
		ranked(
			scope.flatMap((s) => s.poules.flatMap((p) => p.teams.filter((t) => t.points != null))),
			(t: Team) => t.points!
		)
	);
	// Optional age order for the teams list: youngest or oldest average age first.
	const rankedByAge = $derived(
		app.order === 'punten'
			? rankedTeams
			: ranked(
					rankedTeams.map((r) => r.item).filter((t) => t.age != null),
					(t: Team) => (app.order === 'jong' ? -t.age! : t.age!)
				)
	);
	const rankedPoules = $derived(
		ranked(
			scope.flatMap((s) => s.poules.filter((p) => p.stats)),
			(p: Poule) => p.stats!.avg
		)
	);

	// Point changes since the previous indeling, biggest risers (or fallers) first.
	const rankedTrend = $derived(
		ranked(
			scope.flatMap((s) => s.poules.flatMap((p) => p.teams.filter((t) => t.delta != null))),
			(t: Team) => (app.direction === 'up' ? t.delta! : -t.delta!)
		)
	);

	// The slider spans the values in the current scope (current points; poule averages for poules).
	const values = $derived(
		app.mode === 'poules'
			? rankedPoules.map((r) => r.item.stats!.avg)
			: (app.mode === 'trend' ? rankedTrend : rankedTeams).map((r) => r.item.points!)
	);
	const lo = $derived(values.length ? Math.floor(Math.min(...values)) : 0);
	const hi = $derived(values.length ? Math.ceil(Math.max(...values)) : 0);
	const min = $derived(app.min == null ? lo : Math.min(Math.max(app.min, lo), hi));

	// The header search filters the ranking on team, club or place; ranks stay the unfiltered positions.
	const words = $derived(normalize(app.trimmed).split(/\s+/).filter(Boolean));
	const teamMatches = (t: Team) =>
		words.every((w) => t.haystack.includes(w) || normalize(homeClub(t).name).includes(w));
	const pouleMatches = (p: Poule) =>
		p.teams.some(teamMatches) || words.every((w) => p.code.toLowerCase().includes(w));

	const teams = $derived(
		rankedByAge.filter(
			(r) =>
				r.item.points! >= min && (!app.label || r.item.label === app.label) && (!words.length || teamMatches(r.item))
		)
	);
	const poules = $derived(
		rankedPoules.filter(
			(r) =>
				r.item.stats!.avg >= min &&
				(app.kind !== 'zwaar' || r.item.stats!.tough) &&
				(app.kind !== 'gelijkwaardig' || r.item.stats!.tight) &&
				(!words.length || pouleMatches(r.item))
		)
	);
	const trend = $derived(
		rankedTrend.filter((r) => r.item.points! >= min && (!words.length || teamMatches(r.item)))
	);
	const highlight = $derived(
		words.length ? new Set(rankedTeams.map((r) => r.item).filter(teamMatches)) : new Set<Team>()
	);

	const myClub = $derived(app.myClub ? clubByName.get(app.myClub.toLowerCase()) : undefined);
	const myTeams = $derived(new Set(myClub?.teams.map((t) => t.team) ?? []));
	const myPoules = $derived(new Set(myClub?.teams.map((t) => t.poule) ?? []));

	// Section-wide range of poule averages, for the strength bars.
	const avgLo = $derived(rankedPoules.length ? rankedPoules[rankedPoules.length - 1].item.stats!.avg : 0);
	const avgHi = $derived(rankedPoules.length ? rankedPoules[0].item.stats!.avg : 1);
	const pct = (v: number) => (avgHi === avgLo ? 100 : 8 + (92 * (v - avgLo)) / (avgHi - avgLo));

	// Everything that narrows the list, each removable on its own.
	const activeFilters = $derived(
		[
			words.length && { key: 'q', text: `“${app.trimmed}”`, clear: () => (app.query = '') },
			app.min != null && {
				key: 'min',
				text: `${app.mode === 'poules' ? 'Min. gem.' : 'Min.'} ${min} punten`,
				clear: () => (app.min = null)
			},
			app.mode === 'teams' &&
				app.label && {
					key: 'label',
					text: app.label === 'eindbaas' ? 'Eindbazen' : 'Underdogs',
					clear: () => (app.label = null)
				},
			app.mode === 'poules' &&
				app.kind && {
					key: 'kind',
					text: app.kind === 'zwaar' ? 'Zware poules' : 'Gelijkwaardige poules',
					clear: () => (app.kind = null)
				}
		].filter((f) => !!f) as { key: string; text: string; clear: () => void }[]
	);

	function update(change: () => void) {
		change();
		app.replace();
	}

	function clearAll() {
		update(() => {
			app.query = '';
			app.min = null;
			app.label = null;
			app.kind = null;
		});
	}

	let sliderTimer: ReturnType<typeof setTimeout>;
	function onSlide(e: Event) {
		const v = Number((e.target as HTMLInputElement).value);
		app.min = v <= lo ? null : v;
		clearTimeout(sliderTimer);
		sliderTimer = setTimeout(() => app.replace(), 250);
	}
</script>

<div class="head">
	<h1>Ranglijst</h1>
	<p class="intro">
		Teams en poules in de B-categorie op indelingspunten. Hoe hoger, hoe sterker. Punten zijn per klasse
		het best te vergelijken. Bij <em>Stijgers & dalers</em> zie je wie het meest veranderd is t.o.v.
		{previousLabel}.
	</p>
</div>

<div class="controls">
	{#if rankedCategories.length > 1}
		<div class="seg" role="group" aria-label="Categorie">
			{#each rankedCategories as c (c.name)}
				<button
					type="button"
					class:on={app.rankCategory === c}
					onclick={() =>
						app.go(() => {
							app.category = c.name;
							app.section = null;
							app.min = null;
						})}>{c.name}</button
				>
			{/each}
		</div>
	{/if}

	<label class="select">
		<span class="sr">Klasse</span>
		<select
			value={app.rankSection?.name ?? ALL_SECTIONS}
			onchange={(e) =>
				app.go(() => {
					app.category = app.rankCategory.name;
					app.section = (e.target as HTMLSelectElement).value;
					app.min = null;
				})}
		>
			{#each sectionsWithStats as s (s.name)}
				<option value={s.name}>{s.name}</option>
			{/each}
			<option value={ALL_SECTIONS}>Alle klassen</option>
		</select>
	</label>

	<div class="seg" role="group" aria-label="Weergave">
		<button type="button" class:on={app.mode === 'teams'} onclick={() => app.go(() => ((app.mode = 'teams'), (app.min = null)))}
			>Sterkste teams</button
		>
		<button type="button" class:on={app.mode === 'poules'} onclick={() => app.go(() => ((app.mode = 'poules'), (app.min = null)))}
			>Zwaarste poules</button
		>
		<button type="button" class:on={app.mode === 'trend'} onclick={() => app.go(() => ((app.mode = 'trend'), (app.min = null)))}
			>Stijgers & dalers</button
		>
	</div>
</div>

<div class="controls">
	<label class="slider">
		<span>{app.mode === 'poules' ? 'Min. gemiddelde' : 'Min. punten'} <strong>{min}</strong></span>
		<input type="range" min={lo} max={hi} step="1" value={min} oninput={onSlide} />
	</label>
	{#if app.mode === 'teams'}
		<div class="seg" role="group" aria-label="Volgorde">
			<button type="button" class:on={app.order === 'punten'} onclick={() => update(() => (app.order = 'punten'))}
				>Op punten</button
			>
			<button type="button" class:on={app.order === 'jong'} onclick={() => update(() => (app.order = 'jong'))}
				>Jongste</button
			>
			<button type="button" class:on={app.order === 'oud'} onclick={() => update(() => (app.order = 'oud'))}>Oudste</button>
		</div>
		<div class="seg" role="group" aria-label="Label">
			<button type="button" class:on={!app.label} onclick={() => update(() => (app.label = null))}>Alle teams</button>
			<button type="button" class:on={app.label === 'eindbaas'} onclick={() => update(() => (app.label = 'eindbaas'))}
				>Eindbazen</button
			>
			<button type="button" class:on={app.label === 'underdog'} onclick={() => update(() => (app.label = 'underdog'))}
				>Underdogs</button
			>
		</div>
	{:else if app.mode === 'trend'}
		<div class="seg" role="group" aria-label="Richting">
			<button type="button" class:on={app.direction === 'up'} onclick={() => update(() => (app.direction = 'up'))}
				>Stijgers</button
			>
			<button type="button" class:on={app.direction === 'down'} onclick={() => update(() => (app.direction = 'down'))}
				>Dalers</button
			>
		</div>
	{:else}
		<div class="seg" role="group" aria-label="Soort poule">
			<button type="button" class:on={!app.kind} onclick={() => update(() => (app.kind = null))}>Alle poules</button>
			<button type="button" class:on={app.kind === 'zwaar'} onclick={() => update(() => (app.kind = 'zwaar'))}>Zwaar</button>
			<button type="button" class:on={app.kind === 'gelijkwaardig'} onclick={() => update(() => (app.kind = 'gelijkwaardig'))}
				>Gelijkwaardig</button
			>
		</div>
	{/if}
</div>

{#if activeFilters.length}
	<div class="active" aria-label="Actieve filters">
		<span class="muted">Actieve filters:</span>
		{#each activeFilters as f (f.key)}
			<button type="button" class="filter-chip" onclick={() => update(f.clear)} aria-label="Verwijder filter {f.text}">
				{f.text} <span aria-hidden="true">×</span>
			</button>
		{/each}
		<button type="button" class="link" onclick={clearAll}>Wis alle filters</button>
	</div>
{/if}

{#if app.mode === 'teams'}
	<p class="summary">
		<strong>{nl(teams.length)}</strong> van {nl(rankedTeams.length)} teams{#if app.order !== 'punten'},
			{app.order === 'jong' ? 'jongste' : 'oudste'} gemiddelde leeftijd eerst{/if}
		{#if app.label === 'eindbaas'}
			— {app.rankSection?.labelGaps
				? `minstens ${app.rankSection.labelGaps.eindbaas} punten meer dan de nummer 2 in hun poule`
				: 'met een van de duidelijkste voorsprongen in hun klasse'}
		{/if}
		{#if app.label === 'underdog'}
			— {app.rankSection?.labelGaps
				? `minstens ${app.rankSection.labelGaps.underdog} punten minder dan de op één na laagste in hun poule`
				: 'met een van de grootste achterstanden in hun klasse'}
		{/if}
	</p>
	<div class="table">
		<table>
			<thead>
				<tr>
					<th class="rank">#</th>
					<th>Team</th>
					<th>Poule</th>
					<th class="num" class:hide-sm={app.order === 'punten'} title="Gemiddelde leeftijd">Lftd</th>
					{#if app.rankSection}
						<th class="num" title="Plek in de hele {app.rankCategory.name} ({nl(rankedTeamCount.get(app.rankCategory.name) ?? 0)} teams)"
							>Totaal</th
						>
					{/if}
					<th class="num">Punt</th>
				</tr>
			</thead>
			<tbody>
				{#each teams.slice(0, limit) as { item: t, rank } (t)}
					{@const club = homeClub(t).name}
					<tr class:mine={!words.length && myTeams.has(t)}>
						<td class="rank">{rank}</td>
						<td>
							<button type="button" class="name" onclick={() => app.openClub(club)}>{t.name}</button>
							{#if t.label}<span class="label {t.label}">{t.label === 'eindbaas' ? 'Eindbaas' : 'Underdog'}</span>{/if}
							<span class="sub">{t.place ?? ''}</span>
						</td>
						<td>
							<button type="button" class="link code" onclick={() => app.openPoule(t.poule.code)}>{t.poule.code}</button>
							<span class="sub">{t.pointsRank}e van {t.poule.teams.filter((x) => x.points != null).length}{#if !app.rankSection} · {t.poule.section}{/if}</span>
						</td>
						<td class="num" class:hide-sm={app.order === 'punten'} class:pts={app.order !== 'punten'}
							>{t.age != null ? nl(t.age, 1) : ''}</td
						>
						{#if app.rankSection}
							<td class="num muted">#{t.overallRank}</td>
						{/if}
						<td class="num pts">{t.points}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if teams.length > limit}
		<button type="button" class="btn more" onclick={() => (limit += PAGE_SIZE)}>
			Toon meer ({nl(teams.length - limit)} resterend)
		</button>
	{/if}
{:else if app.mode === 'trend'}
	<p class="summary">
		<strong>{nl(trend.length)}</strong> van {nl(rankedTrend.length)} teams, gesorteerd op
		{app.direction === 'up' ? 'stijging' : 'daling'} in punten t.o.v. {previousLabel}.
	</p>
	<div class="table">
		<table>
			<thead>
				<tr>
					<th class="rank">#</th>
					<th>Team</th>
					<th>Poule</th>
					<th class="num" title="Gemiddelde leeftijd nu, met de verandering t.o.v. {previousLabel}">Lftd</th>
					<th class="num hide-sm" title="Punten in {previousLabel}">Veld</th>
					<th class="num hide-sm">Nu</th>
					<th class="num">Δ</th>
				</tr>
			</thead>
			<tbody>
				{#each trend.slice(0, limit) as { item: t, rank } (t)}
					{@const club = homeClub(t).name}
					{@const prev = t.previous!}
					<tr class:mine={!words.length && myTeams.has(t)}>
						<td class="rank">{rank}</td>
						<td>
							<button type="button" class="name" onclick={() => app.openClub(club)}>{t.name}</button>
							<span class="sub">{t.place ?? ''}</span>
						</td>
						<td>
							<button type="button" class="link code" onclick={() => app.openPoule(t.poule.code)}>{t.poule.code}</button>
							<span class="sub nowrap" title="{previousLabel}: {prev.section}, {prev.code}"
								>veld {prev.code}</span
							>
						</td>
						<td class="num" title={prev.age != null ? `${previousLabel}: ${nl(prev.age, 1)} jaar` : ''}>
							{t.age != null ? nl(t.age, 1) : ''}
							{#if t.ageDelta != null}
								<span class="sub age-delta">{t.ageDelta > 0 ? '+' : t.ageDelta < 0 ? '−' : '±'}{nl(Math.abs(t.ageDelta), 1)}</span>
							{/if}
						</td>
						<td class="num hide-sm muted">{prev.points}</td>
						<td class="num hide-sm">{t.points}</td>
						<td class="num pts" class:up={t.delta! > 0} class:down={t.delta! < 0}
							>{t.delta! > 0 ? '+' : t.delta! < 0 ? '−' : '±'}{Math.abs(t.delta!)}</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if trend.length > limit}
		<button type="button" class="btn more" onclick={() => (limit += PAGE_SIZE)}>
			Toon meer ({nl(trend.length - limit)} resterend)
		</button>
	{/if}
{:else}
	<p class="summary">
		<strong>{nl(poules.length)}</strong> van {nl(rankedPoules.length)} poules, gesorteerd op gemiddelde
		punten. Per klasse zijn de 10% zwaarste en de 10% meest gelijkwaardige (kleinste spreiding) gemarkeerd.
	</p>
	<div class="table">
		<table>
			<thead>
				<tr>
					<th class="rank">#</th>
					<th>Poule</th>
					<th class="bar-col">Sterkte</th>
					<th class="num hide-sm" title="Gemiddelde leeftijd van de teams">Lftd</th>
					<th class="num hide-sm" title="Laagste – hoogste punten">Spreiding</th>
					<th class="num">Ø</th>
				</tr>
			</thead>
			<tbody>
				{#each poules.slice(0, limit) as { item: p, rank } (p)}
					{@const s = p.stats!}
					{@const boss = p.teams.find((t) => t.label === 'eindbaas')}
					{@const hits = words.length ? p.teams.filter((t) => highlight.has(t)) : []}
					<tr class:mine={words.length ? hits.length > 0 : myPoules.has(p)}>
						<td class="rank">{rank}</td>
						<td>
							<button type="button" class="link code" onclick={() => app.openPoule(p.code)}>{p.code}</button>
							{#if s.tough}<span class="tough">Zwaar</span>{/if}
							{#if s.tight}<span class="tough tight">Gelijkwaardig</span>{/if}
							<span class="sub"
								>{#if hits.length}{hits.map((t) => t.name).join(', ')}{:else}{p.teams.length} teams{/if}{#if !app.rankSection} · {p.section}{/if}{#if boss} · eindbaas: {boss.name}{/if}</span
							>
						</td>
						<td class="bar-col">
							<div class="bar" aria-hidden="true">
								<div class="fill" class:hot={s.tough} style="width: {pct(s.avg)}%"></div>
							</div>
						</td>
						<td class="num hide-sm muted">{p.avgAge != null ? nl(p.avgAge, 1) : ''}</td>
						<td class="num hide-sm muted">{s.min}–{s.max}</td>
						<td class="num pts">{nl(s.avg, 1)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if poules.length > limit}
		<button type="button" class="btn more" onclick={() => (limit += PAGE_SIZE)}>
			Toon meer ({nl(poules.length - limit)} resterend)
		</button>
	{/if}
{/if}

<style>
	h1 {
		font-size: 1.25rem;
		margin: 0 0 0.25rem;
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem 0.9rem;
		margin-bottom: 0.8rem;
	}
	.controls .seg {
		max-width: 100%;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.controls .seg button {
		white-space: nowrap;
	}
	select {
		font: inherit;
		font-size: 0.9rem;
		padding: 0.4rem 0.6rem;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text);
		max-width: 100%;
	}
	.slider {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.9rem;
		color: var(--text-2);
	}
	.slider strong {
		display: inline-block;
		min-width: 2.2em;
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}
	.slider input {
		width: min(260px, 50vw);
		accent-color: var(--accent);
	}

	.table {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		overflow-x: auto;
	}
	.nowrap {
		white-space: nowrap;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.92rem;
	}
	th {
		font-size: 0.72rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-3);
		text-align: left;
		padding: 0.6rem 0.5rem 0.3rem;
	}
	td {
		padding: 0.45rem 0.5rem;
		border-top: 1px solid var(--border-soft);
		vertical-align: top;
	}
	th:first-child,
	td:first-child {
		padding-left: 1rem;
	}
	th:last-child,
	td:last-child {
		padding-right: 1rem;
	}
	tr.mine td {
		background: var(--hit);
	}

	.rank {
		width: 2.8rem;
		color: var(--text-3);
		font-variant-numeric: tabular-nums;
	}
	.name {
		all: unset;
		font-weight: 500;
		color: var(--text);
		cursor: pointer;
		overflow-wrap: anywhere;
	}
	button.name:hover {
		color: var(--accent-strong);
		text-decoration: underline;
	}
	.sub {
		display: block;
		font-size: 0.8rem;
		color: var(--text-3);
	}
	.code {
		font-weight: 600;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.pts {
		font-weight: 700;
	}

	.label,
	.tough {
		display: inline-block;
		margin-left: 0.35rem;
		font-size: 0.66rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.02rem 0.38rem;
		border-radius: 5px;
		vertical-align: 0.1em;
	}
	.label.eindbaas {
		background: var(--boss);
		color: var(--on-boss);
	}
	.label.underdog {
		background: var(--dog);
		color: var(--on-dog);
	}
	.tough {
		background: var(--hot);
		color: var(--on-hot);
	}
	.age-delta {
		font-variant-numeric: tabular-nums;
	}
	.up {
		color: var(--up);
	}
	.down {
		color: var(--down);
	}
	.tough.tight {
		background: var(--tight);
		color: var(--on-tight);
	}
	.active {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem 0.5rem;
		margin: 0 0 0.8rem;
		padding: 0.55rem 0.8rem;
		border-radius: 12px;
		background: var(--hit);
		border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border));
		font-size: 0.88rem;
	}
	.filter-chip {
		font: inherit;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		border: 1px solid var(--accent);
		background: var(--surface);
		color: var(--text);
		cursor: pointer;
	}
	.filter-chip span {
		color: var(--accent-strong);
		font-size: 1.05em;
		line-height: 1;
	}
	.filter-chip:hover {
		background: var(--chip);
	}
	.active .link {
		margin-left: auto;
	}

	.bar-col {
		width: 30%;
		vertical-align: middle;
	}
	.bar {
		height: 8px;
		border-radius: 4px;
		background: var(--chip);
		overflow: hidden;
	}
	.fill {
		height: 100%;
		border-radius: 4px;
		background: var(--accent);
	}
	.fill.hot {
		background: var(--hot);
	}

	@media (max-width: 560px) {
		.hide-sm {
			display: none;
		}
		.bar-col {
			width: 22%;
		}
	}
</style>
