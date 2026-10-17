<script lang="ts">
	import { search, searchClubs } from '../indeling';
	import { app } from '../state.svelte';
	import PouleCard from './PouleCard.svelte';

	const PAGE_SIZE = 30;
	const MAX_CLUBS = 6;
	const nl = (n: number) => n.toLocaleString('nl-NL');

	let limit = $state(PAGE_SIZE);
	$effect(() => {
		app.trimmed;
		app.category;
		limit = PAGE_SIZE;
	});

	const results = $derived(search(app.trimmed, app.category));
	const hitCount = $derived(results.reduce((n, r) => n + r.matches.size, 0));
	const clubs = $derived(searchClubs(app.trimmed).slice(0, MAX_CLUBS));
</script>

{#if clubs.length}
	<div class="clubs">
		<span class="muted">Clubs:</span>
		{#each clubs as c (c.name)}
			<button type="button" class="club" onclick={() => app.openClub(c.name)}>
				<strong>{c.name}</strong>
				<small>{c.teams.length} teams</small>
			</button>
		{/each}
	</div>
{/if}

<p class="summary" aria-live="polite">
	{#if results.length === 0}
		Geen poules voor <strong>“{app.trimmed}”</strong>{app.category ? ` in ${app.category}` : ''}.
	{:else if hitCount}
		<strong>{nl(hitCount)}</strong>
		{hitCount === 1 ? 'team' : 'teams'} in <strong>{nl(results.length)}</strong>
		{results.length === 1 ? 'poule' : 'poules'}
	{:else}
		<strong>{nl(results.length)}</strong> {results.length === 1 ? 'poule' : 'poules'}
	{/if}
</p>

{#if results.length === 0}
	<div class="empty">
		<p>
			Tips: zoek op een deel van de clubnaam (bijv. <em>fortuna</em>), een plaats (<em>delft</em>) of
			een poulecode (<em>R2A</em>, <em>Ro-041</em>).
		</p>
		{#if app.category}
			<button type="button" class="link" onclick={() => app.go(() => (app.category = null))}
				>Zoek in alle categorieën</button
			>
		{/if}
	</div>
{:else}
	<div class="grid">
		{#each results.slice(0, limit) as r (r.poule.code)}
			<PouleCard poule={r.poule} highlight={r.matches} />
		{/each}
	</div>
	{#if results.length > limit}
		<button type="button" class="btn more" onclick={() => (limit += PAGE_SIZE * 2)}>
			Toon meer ({nl(results.length - limit)} resterend)
		</button>
	{/if}
{/if}

<style>
	.clubs {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.45rem;
		margin-bottom: 0.9rem;
		font-size: 0.9rem;
	}
	.club {
		font: inherit;
		display: inline-flex;
		align-items: baseline;
		gap: 0.4rem;
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--border));
		background: var(--surface);
		color: var(--text);
		cursor: pointer;
	}
	.club:hover {
		background: var(--hit);
	}
	.club small {
		color: var(--text-3);
	}
	.empty {
		color: var(--text-2);
	}
</style>
