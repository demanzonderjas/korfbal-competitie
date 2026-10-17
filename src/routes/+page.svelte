<script lang="ts">
	import { onMount } from 'svelte';
	import { clubByName, meta } from '#lib/indeling.ts';
	import { app } from '#lib/state.svelte.ts';
	import Header from '#lib/components/Header.svelte';
	import BrowseView from '#lib/components/BrowseView.svelte';
	import SearchView from '#lib/components/SearchView.svelte';
	import ClubsView from '#lib/components/ClubsView.svelte';
	import ClubView from '#lib/components/ClubView.svelte';
	import RankingView from '#lib/components/RankingView.svelte';
	import PouleView from '#lib/components/PouleView.svelte';

	const club = $derived(app.club ? (clubByName.get(app.club.toLowerCase()) ?? null) : null);

	const title = $derived(
		app.poule
			? app.poule
			: app.club
				? app.club
				: app.trimmed
					? app.trimmed
					: app.view === 'clubs'
						? 'Clubs'
						: app.view === 'ranglijst'
							? 'Ranglijst'
							: null
	);

	onMount(() => {
		app.loadMyClub();
		app.read();
	});
</script>

<svelte:window onpopstate={() => app.read()} />

<svelte:head>
	<title>{title ? `${title} · ` : ''}Korfbal indelingen</title>
	<meta name="description" content="Zoek snel je team, club of poule in de KNKV-indeling ({meta.title})." />
</svelte:head>

<Header />

<main class="wrap">
	{#if app.poule}
		<PouleView code={app.poule} />
	{:else if app.club}
		{#if club}
			<ClubView {club} />
		{:else}
			<p>Club <strong>{app.club}</strong> niet gevonden.</p>
		{/if}
	{:else if app.trimmed}
		<SearchView />
	{:else if app.view === 'clubs'}
		<ClubsView />
	{:else if app.view === 'ranglijst'}
		<RankingView />
	{:else}
		<BrowseView />
	{/if}
</main>

<footer class="wrap">
	Bron: <a href={meta.source} rel="noopener" target="_blank">KNKV – {meta.title}</a>, opgehaald op
	{new Date(meta.updated).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}.
	Geen officiële KNKV-app; controleer bij twijfel de bron. Labels als “eindbaas”, “underdog” en “zware poule”
	zijn afgeleid van de indelingspunten.
</footer>

<style>
	main {
		padding-top: 1.1rem;
		padding-bottom: 2rem;
		min-height: 60vh;
	}

	footer {
		color: var(--text-3);
		font-size: 0.8rem;
		padding-top: 1rem;
		padding-bottom: 2rem;
		border-top: 1px solid var(--border);
	}
	footer a {
		color: inherit;
	}
</style>
