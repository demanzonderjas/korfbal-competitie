# Korfbal indelingen

A small SvelteKit app for searching and browsing the KNKV competition indeling (zaal 2026–'27),
compared with the indeling before it (veld najaar 2026). All data is bundled into the app as static
JSON, so there is no database or API.

## Features

- **Search** for a team, club, place or poule code. Poules with matching teams come in team order (club, then 1, 2, 3, …, then youth).
- **Indeling:** browse by category and class. B-categorie classes can be sorted with the toughest poules first.
- **Clubs** (the start page): pick a club to see all its teams, seniors first (1, 2, 3, …), then midweek, youth and G-korfbal. Each team shows its poule, its position in the poule and its rank in the whole B-categorie. Filter by category or day, share or print the page, and star it as *Mijn club*.
- **Ranglijst:** B-categorie teams ranked by indelingspunten (per class or all of them), and poules ranked by average points.
  - The search box filters the list by team, club or place.
  - Filters: minimum points, eindbazen/underdogs, zware/gelijkwaardige poules. Active filters show as chips, each removable on its own.
- **Changes since the previous indeling:** each team's point change shows on poule cards, and the club page lists its veld poule. The Ranglijst has a *Stijgers & dalers* view. Teams are matched by name, or by club + team label when a sponsor name changed; about 95% match.
- **Labels,** derived from the points and relative to each class, because point scales differ a lot between levels:
  - *Eindbaas* / *Underdog*: the top / bottom team of a poule, with one of the clearest gaps to its neighbour in its class. The gap is the smallest of at least 3 points that at most 15% of poules reach.
  - *Zware poule* / *Gelijkwaardig*: the 10% of poules per class with the highest average or the smallest spread.
  - *Derby* (clubs from the same town) and *Onderling* (two teams of the same club) in one poule.
- Every view has a shareable URL, for example `?club=MIA`, `?poule=R2A` or `?v=ranglijst&q=MIA`.

## Development

```bash
npm install
npm run dev
```

## Updating the data

```bash
npm run data:update
```

This downloads both spreadsheets (the current indeling and the previous one to compare with) from the
KNKV SharePoint links and rewrites `src/lib/data/indeling.json`. To use local files instead, run
`npm run data:update -- current.xlsx previous.xlsx`. For a new season, update `SOURCES` in
`scripts/update-data.mjs`: the old current link becomes `previous`.

## Deploying to Vercel

Import the repository in Vercel; the default SvelteKit settings work as-is (`adapter-auto` selects the
Vercel adapter). The page is prerendered, so it is served as static HTML.
