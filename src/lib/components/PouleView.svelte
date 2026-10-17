<script lang="ts">
	import { pouleByCode } from '../indeling';
	import { app } from '../state.svelte';
	import PouleCard from './PouleCard.svelte';

	let { code }: { code: string } = $props();
	const poule = $derived(pouleByCode.get(code.toLowerCase()) ?? null);
</script>

<nav class="crumbs no-print">
	<button type="button" class="btn" onclick={() => history.back()}>← Terug</button>
</nav>

{#if poule}
	<div class="single">
		<PouleCard {poule} />
		<p class="hint">
			Bekijk de hele
			<button type="button" class="link" onclick={() => app.openSection(poule.category, poule.section)}
				>{poule.section}</button
			>
			({poule.category}){#if poule.stats}
				· #{poule.stats.rank} van {poule.stats.of} op gemiddelde punten{/if}
		</p>
	</div>
{:else}
	<p>Poule <strong>{code}</strong> bestaat niet in deze indeling.</p>
{/if}

<style>
	.single {
		max-width: 560px;
	}
	.hint {
		color: var(--text-3);
		font-size: 0.9rem;
	}
</style>
