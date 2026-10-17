<script lang="ts">
	import { clubs, searchClubs } from '../indeling';
	import { app } from '../state.svelte';

	let filter = $state('');
	const list = $derived(filter.trim() ? searchClubs(filter) : clubs);
</script>

<div class="head">
	<h1>Clubs <span class="muted">({clubs.length})</span></h1>
	<label class="filter">
		<span class="sr">Filter clubs</span>
		<input bind:value={filter} type="search" placeholder="Filter op club of plaats…" autocomplete="off" />
	</label>
</div>
<p class="intro">Kies je club om in één overzicht de poules van al je teams te zien.</p>

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
	.tile.mine {
		border-color: var(--accent);
		background: var(--hit);
	}
</style>
