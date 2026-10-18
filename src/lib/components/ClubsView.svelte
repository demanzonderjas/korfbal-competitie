<script lang="ts">
	import { clubByName, clubs, poules, searchClubs, teamCount } from '../indeling';
	import { app } from '../state.svelte';

	const nl = (n: number) => n.toLocaleString('nl-NL');

	let filter = $state('');
	const list = $derived(filter.trim() ? searchClubs(filter) : clubs);
	const myClub = $derived(app.myClub ? (clubByName.get(app.myClub.toLowerCase()) ?? null) : null);
</script>

{#if myClub}
	<button type="button" class="mine-card" onclick={() => app.openClub(myClub.name)}>
		<span class="star" aria-hidden="true">★</span>
		<span>
			<strong>{myClub.name}</strong>
			<small>Mijn club · {myClub.teams.length} teams — bekijk alle poules</small>
		</span>
		<span aria-hidden="true" class="arrow">→</span>
	</button>
{/if}

<div class="head">
	<h1>Clubs <span class="muted">({clubs.length})</span></h1>
	<label class="filter">
		<span class="sr">Filter clubs</span>
		<input bind:value={filter} type="search" placeholder="Filter op club of plaats…" autocomplete="off" />
	</label>
</div>
<p class="intro">
	Kies je club om in één overzicht de poules van al je teams te zien. In totaal {nl(teamCount)} teams in
	{nl(poules.length)} poules.
</p>

{#if list.length}
	<div class="tiles">
		{#each list as c (c.name)}
			<button type="button" class="tile" class:mine={c.name === app.myClub} onclick={() => app.openClub(c.name)}>
				<strong>{#if c.name === app.myClub}<span aria-label="Mijn club">★ </span>{/if}{c.name}</strong>
				<span>{c.place ?? ''}{c.place ? ' · ' : ''}{c.teams.length} {c.teams.length === 1 ? 'team' : 'teams'}</span>
			</button>
		{/each}
	</div>
{:else}
	<p class="muted">Geen club gevonden voor “{filter}”.</p>
{/if}

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.4rem;
	}
	h1 {
		font-size: 1.25rem;
		margin: 0;
	}
	.filter input {
		font: inherit;
		padding: 0.45rem 0.8rem;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text);
		min-width: 240px;
		outline: none;
	}
	.filter input:focus {
		border-color: var(--accent);
	}
	.mine-card {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		width: 100%;
		text-align: left;
		font: inherit;
		color: var(--text);
		background: var(--hit);
		border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--border));
		border-radius: 14px;
		padding: 0.85rem 1rem;
		margin-bottom: 1rem;
		cursor: pointer;
	}
	.mine-card small {
		display: block;
		color: var(--text-2);
	}
	.star {
		font-size: 1.4rem;
		color: var(--accent);
	}
	.arrow {
		margin-left: auto;
		color: var(--accent-strong);
		font-size: 1.2rem;
	}
	.tile.mine {
		border-color: var(--accent);
		background: var(--hit);
	}
</style>
