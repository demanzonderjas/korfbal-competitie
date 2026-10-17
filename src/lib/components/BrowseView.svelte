<script lang="ts">
	import { categories, clubByName, poules, teamCount } from '../indeling';
	import { app } from '../state.svelte';
	import PouleCard from './PouleCard.svelte';

	const nl = (n: number) => n.toLocaleString('nl-NL');

	const activeCategory = $derived(categories.find((c) => c.name === app.category) ?? null);
	const activeSection = $derived(activeCategory?.sections.find((s) => s.name === app.section) ?? null);
	const sorted = $derived.by(() => {
		if (!activeSection) return [];
		if (app.sort !== 'zwaar' || !activeSection.hasStats) return activeSection.poules;
		return [...activeSection.poules].sort((a, b) => (b.stats?.avg ?? -1) - (a.stats?.avg ?? -1));
	});
	const myClub = $derived(app.myClub ? (clubByName.get(app.myClub.toLowerCase()) ?? null) : null);
</script>

{#if activeSection && activeCategory}
	<nav class="crumbs">
		<button type="button" class="link" onclick={() => app.go(() => (app.section = null))}
			>{activeCategory.name}</button
		>
		<span aria-hidden="true">›</span>
		<h1>{activeSection.name}</h1>
		<span class="count">{nl(activeSection.poules.length)} poules · {nl(activeSection.teamCount)} teams</span>
		{#if activeSection.hasStats}
			<div class="seg sort" role="group" aria-label="Sortering">
				<button type="button" class:on={app.sort === 'code'} onclick={() => app.go(() => (app.sort = 'code'))}
					>Op code</button
				>
				<button type="button" class:on={app.sort === 'zwaar'} onclick={() => app.go(() => (app.sort = 'zwaar'))}
					>Zwaarste eerst</button
				>
			</div>
		{/if}
	</nav>
	<div class="grid">
		{#each sorted as p (p.code)}
			<PouleCard poule={p} showSection={false} />
		{/each}
	</div>
{:else}
	{#if !activeCategory}
		{#if myClub}
			<button type="button" class="mine" onclick={() => app.openClub(myClub.name)}>
				<span class="star" aria-hidden="true">★</span>
				<span>
					<strong>{myClub.name}</strong>
					<small>Mijn club · {myClub.teams.length} teams — bekijk alle poules</small>
				</span>
				<span aria-hidden="true" class="arrow">→</span>
			</button>
		{/if}
		<p class="intro">
			{nl(teamCount)} teams in {nl(poules.length)} poules. Zoek hierboven, kies een klasse of
			<button type="button" class="link" onclick={() => app.openView('clubs')}>kies je club</button>.
		</p>
	{/if}
	{#each activeCategory ? [activeCategory] : categories as c (c.name)}
		<section class="category">
			<h2>{c.name}</h2>
			<div class="tiles">
				{#each c.sections as s (s.name)}
					<button type="button" class="tile" onclick={() => app.openSection(c.name, s.name)}>
						<strong>{s.name}</strong>
						<span>{nl(s.poules.length)} {s.poules.length === 1 ? 'poule' : 'poules'} · {nl(s.teamCount)} teams</span>
					</button>
				{/each}
			</div>
		</section>
	{/each}
{/if}

<style>
	.sort {
		margin-left: auto;
	}

	.category + .category {
		margin-top: 2rem;
	}
	h2 {
		font-size: 1.1rem;
		margin: 0 0 0.7rem;
	}

	.mine {
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
	.mine small {
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
</style>
