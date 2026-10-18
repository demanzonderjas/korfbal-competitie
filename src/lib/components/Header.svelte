<script lang="ts">
	import { categories, meta } from '../indeling';
	import { app, type View } from '../state.svelte';

	let input = $state<HTMLInputElement>();

	const tabs: { view: View; label: string }[] = [
		{ view: 'clubs', label: 'Clubs' },
		{ view: 'indeling', label: 'Indeling' },
		{ view: 'ranglijst', label: 'Ranglijst' }
	];

	// In the ranking the search box filters the list; everywhere else it opens search results.
	const filtersRanking = $derived(app.view === 'ranglijst' && !app.poule && !app.club);
	const activeTab = $derived<View | null>(
		app.club ? 'clubs' : app.trimmed && !app.poule && !filtersRanking ? null : app.view
	);
	const showChips = $derived(
		!app.poule && !app.club && !filtersRanking && (app.trimmed || app.view === 'indeling')
	);

	function onInput() {
		if (!filtersRanking) app.section = null;
		app.poule = null;
		app.club = null;
		app.replace();
	}

	function clear() {
		app.query = '';
		onInput();
		input?.focus();
	}

	function onKeydown(e: KeyboardEvent) {
		const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
		if (e.key === '/' && !typing) {
			e.preventDefault();
			input?.focus();
			input?.select();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="top no-print">
	<div class="wrap">
		<div class="bar">
			<a
				class="brand"
				href="/"
				onclick={(e) => {
					e.preventDefault();
					app.openView('clubs');
				}}
			>
				<svg viewBox="0 0 32 32" aria-hidden="true"
					><rect width="32" height="32" rx="7" fill="var(--accent)" /><g fill="var(--on-accent)"
						><circle cx="9" cy="4.8" r="2.5" /><path d="M8 10v5.5a6.5 2.4 0 0 0 13 0V10z" /><ellipse
							cx="14.5"
							cy="10"
							rx="6.5"
							ry="2.4"
						/><ellipse cx="14.5" cy="10" rx="4.6" ry="1.3" fill="var(--accent)" /><path
							d="M20.5 10.5H24v3h-3.5z"
						/><rect x="23" y="8" width="3" height="21" rx="1.5" /></g
					></svg
				>
				<span><strong>Korfbal indelingen</strong> <small>{meta.title}</small></span>
			</a>
			{#if app.myClub && app.club !== app.myClub}
				<button type="button" class="my" onclick={() => app.openClub(app.myClub!)} title="Mijn club">
					<span aria-hidden="true">★</span>
					{app.myClub}
				</button>
			{/if}
		</div>

		<nav class="tabs" aria-label="Weergave">
			{#each tabs as t (t.view)}
				<button
					type="button"
					class:on={activeTab === t.view}
					aria-current={activeTab === t.view ? 'page' : undefined}
					onclick={() => app.openView(t.view)}>{t.label}</button
				>
			{/each}
		</nav>

		<label class="search">
			<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
			<span class="sr">Zoeken</span>
			<input
				bind:this={input}
				bind:value={app.query}
				oninput={onInput}
				onkeydown={(e) => e.key === 'Escape' && app.query && clear()}
				type="search"
				placeholder={filtersRanking ? 'Filter de ranglijst op team, club of plaats…' : 'Zoek op team, club, plaats of poule…'}
				autocomplete="off"
				spellcheck="false"
				enterkeyhint="search"
			/>
			{#if app.query}
				<button type="button" class="clear" aria-label="Wis zoekopdracht" onclick={clear}>×</button>
			{:else}
				<kbd>/</kbd>
			{/if}
		</label>

		{#if showChips}
			<div class="chips" role="group" aria-label="Categorie">
				<button
					type="button"
					class:on={!app.category}
					onclick={() =>
						app.go(() => {
							app.category = null;
							app.section = null;
						})}>Alle</button
				>
				{#each categories as c (c.name)}
					<button
						type="button"
						class:on={app.category === c.name}
						onclick={() =>
							app.go(() => {
								app.category = c.name;
								app.section = null;
							})}>{c.name}</button
					>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	/* On phones the header scrolls away so the results get the whole screen. */
	.top {
		position: relative;
		z-index: 10;
		background: color-mix(in srgb, var(--bg) 88%, transparent);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--border);
		padding: 0.75rem 0 0.6rem;
	}
	@media (min-width: 700px) {
		.top {
			position: sticky;
			top: 0;
		}
	}

	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		color: var(--text);
		text-decoration: none;
		min-width: 0;
	}
	.brand svg {
		width: 28px;
		height: 28px;
		flex: none;
	}
	.brand small {
		color: var(--text-3);
		font-size: 0.85rem;
		margin-left: 0.25rem;
	}

	.my {
		font: inherit;
		font-size: 0.85rem;
		font-weight: 600;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--accent-strong);
		border-radius: 999px;
		padding: 0.3rem 0.75rem;
		cursor: pointer;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 45%;
	}

	.tabs {
		display: flex;
		gap: 1.2rem;
		margin-top: 0.55rem;
		border-bottom: 1px solid var(--border);
	}
	.tabs button {
		font: inherit;
		font-size: 0.95rem;
		border: 0;
		background: none;
		color: var(--text-2);
		padding: 0.35rem 0 0.5rem;
		margin-bottom: -1px;
		border-bottom: 2px solid transparent;
		cursor: pointer;
	}
	.tabs button.on {
		color: var(--text);
		font-weight: 600;
		border-bottom-color: var(--accent);
	}

	.search {
		position: relative;
		display: flex;
		align-items: center;
		margin-top: 0.65rem;
	}
	.search > svg {
		position: absolute;
		left: 0.9rem;
		width: 20px;
		height: 20px;
		fill: none;
		stroke: var(--text-3);
		stroke-width: 2;
		stroke-linecap: round;
		pointer-events: none;
	}
	.search input {
		width: 100%;
		font: inherit;
		font-size: 1.05rem;
		padding: 0.75rem 2.8rem 0.75rem 2.7rem;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text);
		outline: none;
		-webkit-appearance: none;
		appearance: none;
	}
	.search input::-webkit-search-cancel-button {
		display: none;
	}
	.search input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent);
	}
	.search kbd,
	.clear {
		position: absolute;
		right: 0.7rem;
	}
	.search kbd {
		font: inherit;
		font-size: 0.75rem;
		color: var(--text-3);
		border: 1px solid var(--border);
		border-radius: 5px;
		padding: 0 0.4rem;
	}
	.clear {
		border: 0;
		background: var(--chip);
		color: var(--text-2);
		width: 1.7rem;
		height: 1.7rem;
		border-radius: 50%;
		font-size: 1.1rem;
		line-height: 1;
		cursor: pointer;
	}

	.chips {
		display: flex;
		gap: 0.4rem;
		margin-top: 0.6rem;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.chips button {
		flex: none;
		font: inherit;
		font-size: 0.85rem;
		padding: 0.35rem 0.8rem;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text-2);
		cursor: pointer;
	}
	.chips button.on {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--on-accent);
		font-weight: 600;
	}
</style>
