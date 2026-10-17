# Korfbal indelingen

A small SvelteKit app for searching and browsing the KNKV competition indeling (zaal 2026–'27).
All data is bundled into the app as static JSON, so there is no database or API.

## Features

- **Search** for a team, club, place or poule code, with every matching poule shown in full.
- **Indeling:** browse by category and class. B-categorie classes can be sorted with the toughest poules first.
- **Clubs:** pick a club to see an overview of all its teams and their poules, with category and day filters and a print button. Star it as *Mijn club* to keep it on the start page.
- **Ranglijst:** B-categorie teams ranked by indelingspunten, with a minimum-points slider, plus poules ranked by average points.
- **Labels:**
  - *Eindbaas*: at least 7 points more than the number 2 in its poule.
  - *Underdog*: at least 7 points fewer than the second-lowest team in its poule.
  - *Zware poule*: in the top 10% of its class by average points.
- Every view has a shareable URL, for example `?club=Fortuna` or `?poule=R2A`.

## Development

```bash
npm install
npm run dev
```

## Updating the data

```bash
npm run data:update
```

This downloads the spreadsheet from the KNKV SharePoint link and rewrites `src/lib/data/indeling.json`.
To use a local file instead, run `npm run data:update -- path/to/file.xlsx`. For a new season, update
`SHARE_URL` in `scripts/update-data.mjs`.

## Deploying to Vercel

Import the repository in Vercel; the default SvelteKit settings work as-is (`adapter-auto` selects the
Vercel adapter). The page is prerendered, so it is served as static HTML.
