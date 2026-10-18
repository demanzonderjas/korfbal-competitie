<script lang="ts">
	import { categories, poules, teamCount } from '../indeling';
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
		<p class="intro">{nl(teamCount)} teams in {nl(poules.length)} poules. Kies een klasse om alle poules te zien.</p>
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

</style>
