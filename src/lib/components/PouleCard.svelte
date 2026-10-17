<script lang="ts">
	import { DAYS, LABEL_GAP, homeClub, type Poule, type Team } from '../indeling';
	import { app } from '../state.svelte';

	let {
		poule,
		highlight,
		showSection = true
	}: {
		poule: Poule;
		highlight?: Set<Team>;
		showSection?: boolean;
	} = $props();

	const days = $derived(new Set(poule.teams.map((t) => t.day).filter(Boolean)));
	const sharedDay = $derived(days.size === 1 ? [...days][0] : null);
	const hasStats = $derived(poule.stats != null);

	const fmt = (n: number | null, decimals = 0) =>
		n == null
			? ''
			: n.toLocaleString('nl-NL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });


	const LABELS = {
		eindbaas: { text: 'Eindbaas', title: `Minstens ${LABEL_GAP} punten meer dan de nummer 2 in deze poule` },
		underdog: { text: 'Underdog', title: `Minstens ${LABEL_GAP} punten minder dan de op één na laagste in deze poule` }
	};
</script>

<article class="card" class:tough={poule.stats?.tough} id="poule-{poule.code}">
	<header>
		<a
			class="code"
			href="?poule={encodeURIComponent(poule.code)}"
			title="Toon alleen deze poule"
			onclick={(e) => {
				e.preventDefault();
				app.openPoule(poule.code);
			}}>{poule.code}</a
		>
		<div class="meta">
			{#if showSection}<span>{poule.section}</span>{/if}
			{#if showSection}<span class="muted">{poule.category}</span>{/if}
			{#if sharedDay}<span class="muted">{DAYS[sharedDay] ?? sharedDay}</span>{/if}
		</div>
		{#if poule.stats}
			<div
				class="strength"
				title="Gemiddeld {fmt(poule.stats.avg, 1)} punten · #{poule.stats.rank} van {poule.stats
					.of} poules in {poule.section}"
			>
				{#if poule.stats.tough}<span class="tough-badge">Zware poule</span>{/if}
				<span class="avg">Ø {fmt(poule.stats.avg)}</span>
			</div>
		{/if}
	</header>

	<table>
		{#if hasStats}
			<thead>
				<tr>
					<th class="nr"><span class="sr">Nummer</span></th>
					<th>Team</th>
					{#if !sharedDay}<th class="col-day">Dag</th>{/if}
					<th class="num" title="Gemiddelde leeftijd">Lftd</th>
					<th class="num" title="Punten">Punt</th>
				</tr>
			</thead>
		{/if}
		<tbody>
			{#each poule.teams as team (team.nr)}
				{@const club = homeClub(team).name}
				<tr class:hit={highlight?.has(team)}>
					<td class="nr">{team.nr}</td>
					<td class="team">
						<button type="button" title="Alle teams van {club}" onclick={() => app.openClub(club)}>
							{team.name}
						</button>
						{#if team.label}
							<span class="label {team.label}" title={LABELS[team.label].title}
								>{LABELS[team.label].text}</span
							>
						{/if}
						{#if team.place}<span class="place">{team.place}</span>{/if}
					</td>
					{#if !sharedDay}
						<td class="col-day"
							><span class="badge" title={team.day ? DAYS[team.day] : ''}>{team.day ?? '–'}</span></td
						>
					{/if}
					{#if hasStats}
						<td class="num">{fmt(team.age, 1)}</td>
						<td class="num pts">{fmt(team.points)}</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>
</article>

<style>
	.card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		overflow: hidden;
		scroll-margin-top: 190px;
	}
	.card.tough {
		border-color: color-mix(in srgb, var(--hot) 55%, var(--border));
	}

	header {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		padding: 0.8rem 1rem 0.6rem;
		border-bottom: 1px solid var(--border);
	}

	.code {
		font-weight: 700;
		font-size: 1.05rem;
		color: var(--accent-strong);
		text-decoration: none;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.code:hover {
		text-decoration: underline;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.15rem 0.6rem;
		font-size: 0.82rem;
		color: var(--text-2);
		min-width: 0;
		flex: 1;
	}
	.muted {
		color: var(--text-3);
	}

	.strength {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		white-space: nowrap;
		margin-left: auto;
	}
	.avg {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--text-2);
		font-variant-numeric: tabular-nums;
	}
	.tough-badge {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.1rem 0.45rem;
		border-radius: 6px;
		background: var(--hot);
		color: var(--on-hot);
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
		padding: 0.5rem 0.4rem 0.2rem;
	}

	td {
		padding: 0.4rem;
		vertical-align: top;
		border-top: 1px solid var(--border-soft);
	}
	tbody tr:first-child td {
		border-top: 0;
	}

	.nr {
		width: 2.2rem;
		padding-left: 1rem;
		color: var(--text-3);
		font-variant-numeric: tabular-nums;
	}

	.team button {
		all: unset;
		color: var(--text);
		font-weight: 500;
	}
	.team button {
		cursor: pointer;
	}
	.team button:hover {
		color: var(--accent-strong);
		text-decoration: underline;
	}
	.team button:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
		border-radius: 3px;
	}

	.label {
		display: inline-block;
		margin-left: 0.35rem;
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.05rem 0.4rem;
		border-radius: 5px;
		vertical-align: 0.1em;
		cursor: help;
	}
	.label.eindbaas {
		background: var(--boss);
		color: var(--on-boss);
	}
	.label.underdog {
		background: var(--dog);
		color: var(--on-dog);
	}

	.place {
		display: block;
		font-size: 0.8rem;
		color: var(--text-3);
	}

	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: var(--text-2);
		width: 3rem;
	}
	.pts {
		font-weight: 600;
		color: var(--text);
	}
	th.num:last-child,
	td.num:last-child {
		padding-right: 1rem;
	}

	.col-day {
		width: 2.6rem;
	}
	tr td.col-day:last-child,
	tr th.col-day:last-child {
		padding-right: 1rem;
	}

	.badge {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.05rem 0.4rem;
		border-radius: 6px;
		background: var(--chip);
		color: var(--text-2);
	}

	tr.hit td {
		background: var(--hit);
	}
	tr.hit .team button {
		font-weight: 700;
	}

	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
</style>
