<script lang="ts">
	import { DAYS, type Club, type Poule, type Team } from '../indeling';
	import { app } from '../state.svelte';
	import PouleCard from './PouleCard.svelte';

	let { club }: { club: Club } = $props();

	let category = $state<string | null>(null);
	let day = $state<string | null>(null);
	$effect(() => {
		club;
		category = null;
		day = null;
	});

	const categoriesPresent = $derived([...new Set(club.teams.map((t) => t.poule.category))]);
	const daysPresent = $derived([...new Set(club.teams.map((t) => t.team.day).filter((d) => d != null))]);
	const visible = $derived(
		club.teams.filter(
			(t) => (!category || t.poule.category === category) && (!day || t.team.day === day)
		)
	);
	const highlight = $derived(new Set<Team>(club.teams.map((t) => t.team)));

	// One card per poule (two teams of a club can share a poule), grouped by category.
	const groups = $derived.by(() => {
		const out: { category: string; poules: Poule[] }[] = [];
		const seen = new Set<Poule>();
		for (const { poule } of visible) {
			if (seen.has(poule)) continue;
			seen.add(poule);
			let g = out.find((x) => x.category === poule.category);
			if (!g) out.push((g = { category: poule.category, poules: [] }));
			g.poules.push(poule);
		}
		return out;
	});

	const stats = $derived({
		poules: new Set(club.teams.map((t) => t.poule)).size,
		bosses: club.teams.filter((t) => t.team.label === 'eindbaas').length,
		underdogs: club.teams.filter((t) => t.team.label === 'underdog').length,
		tough: club.teams.filter((t) => t.poule.stats?.tough).length
	});

	const isMine = $derived(app.myClub === club.name);

	function scrollTo(code: string) {
		document.getElementById(`poule-${code}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<nav class="crumbs no-print">
	<button type="button" class="link" onclick={() => app.openView('clubs')}>← Alle clubs</button>
</nav>

<div class="head">
	<div>
		<h1>{club.name}</h1>
		{#if club.place}<p class="muted">{club.place}</p>{/if}
	</div>
	<div class="actions no-print">
		<button type="button" class="btn" class:on={isMine} onclick={() => app.setMyClub(isMine ? null : club.name)}>
			{isMine ? '★ Mijn club' : '☆ Maak mijn club'}
		</button>
		<button type="button" class="btn" onclick={() => window.print()}>Afdrukken</button>
	</div>
</div>

<div class="stats">
	<div><strong>{club.teams.length}</strong><span>teams</span></div>
	<div><strong>{stats.poules}</strong><span>poules</span></div>
	{#if stats.bosses}
		<div title="Teams die duidelijk de sterkste van hun poule zijn">
			<strong class="boss">{stats.bosses}</strong><span>eindbaas</span>
		</div>
	{/if}
	{#if stats.underdogs}
		<div title="Teams die duidelijk de zwakste van hun poule zijn">
			<strong class="dog">{stats.underdogs}</strong><span>underdog</span>
		</div>
	{/if}
	{#if stats.tough}
		<div title="Teams in een van de zwaarste poules van hun klasse">
			<strong class="hot">{stats.tough}</strong><span>in zware poule</span>
		</div>
	{/if}
</div>

{#if categoriesPresent.length > 1 || daysPresent.length > 1}
	<div class="filters no-print">
		{#if categoriesPresent.length > 1}
			<div class="seg" role="group" aria-label="Categorie">
				<button type="button" class:on={!category} onclick={() => (category = null)}>Alle</button>
				{#each categoriesPresent as c (c)}
					<button type="button" class:on={category === c} onclick={() => (category = c)}>{c}</button>
				{/each}
			</div>
		{/if}
		{#if daysPresent.length > 1}
			<div class="seg" role="group" aria-label="Speeldag">
				<button type="button" class:on={!day} onclick={() => (day = null)}>Elke dag</button>
				{#each daysPresent as d (d)}
					<button type="button" class:on={day === d} onclick={() => (day = d)}>{DAYS[d] ?? d}</button>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<div class="overview">
	<table>
		<thead>
			<tr>
				<th>Team</th>
				<th>Poule</th>
				<th class="hide-sm">Klasse</th>
				<th>Dag</th>
				<th class="num" title="Plek op punten binnen de poule (alleen B-categorie)">Pos.</th>
			</tr>
		</thead>
		<tbody>
			{#each visible as { team, poule } (team)}
				<tr>
					<td class="team">
						{team.name}
						{#if team.label}<span class="label {team.label}">{team.label === 'eindbaas' ? 'Eindbaas' : 'Underdog'}</span>{/if}
					</td>
					<td>
						<button type="button" class="link code" onclick={() => scrollTo(poule.code)}>{poule.code}</button>
						{#if poule.stats?.tough}<span class="hot-dot" title="Zware poule">●</span>{/if}
					</td>
					<td class="hide-sm muted">{poule.section}</td>
					<td><span title={team.day ? DAYS[team.day] : ''}>{team.day ?? '–'}</span></td>
					<td class="num">
						{#if team.pointsRank}{team.pointsRank}/{poule.teams.filter((t) => t.points != null).length}{:else}<span class="muted">–</span>{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#each groups as g (g.category)}
	<section>
		<h2>{g.category}</h2>
		<div class="grid">
			{#each g.poules as p (p.code)}
				<PouleCard poule={p} {highlight} />
			{/each}
		</div>
	</section>
{/each}

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.75rem;
	}
	h1 {
		font-size: 1.6rem;
		margin: 0;
	}
	.head p {
		margin: 0.1rem 0 0;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
	}
	.btn.on {
		color: var(--accent-strong);
		border-color: var(--accent);
		background: var(--hit);
		font-weight: 600;
	}

	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin: 1rem 0;
	}
	.stats div {
		display: flex;
		flex-direction: column;
		min-width: 5.5rem;
		padding: 0.55rem 0.8rem;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--surface);
	}
	.stats strong {
		font-size: 1.35rem;
		font-variant-numeric: tabular-nums;
	}
	.stats span {
		font-size: 0.78rem;
		color: var(--text-3);
	}
	.boss {
		color: var(--boss);
	}
	.dog {
		color: var(--dog);
	}
	.hot {
		color: var(--hot);
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.filters .seg {
		overflow-x: auto;
		max-width: 100%;
		scrollbar-width: none;
	}
	.filters .seg button {
		white-space: nowrap;
	}

	.overview {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		overflow: hidden;
		margin-bottom: 1.75rem;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
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
		padding: 0.4rem 0.5rem;
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
	.team {
		font-weight: 500;
	}
	.code {
		font-weight: 600;
		white-space: nowrap;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.hot-dot {
		color: var(--hot);
		font-size: 0.7rem;
		margin-left: 0.2rem;
	}
	.label {
		display: inline-block;
		margin-left: 0.3rem;
		font-size: 0.66rem;
		font-weight: 700;
		text-transform: uppercase;
		padding: 0.02rem 0.35rem;
		border-radius: 5px;
	}
	.label.eindbaas {
		background: var(--boss);
		color: var(--on-boss);
	}
	.label.underdog {
		background: var(--dog);
		color: var(--on-dog);
	}
	@media (max-width: 560px) {
		.hide-sm {
			display: none;
		}
	}

	section + section {
		margin-top: 2rem;
	}
	h2 {
		font-size: 1.1rem;
		margin: 0 0 0.7rem;
	}
</style>
