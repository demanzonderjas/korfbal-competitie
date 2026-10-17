// Downloads the KNKV "Indelingen zaal" spreadsheet and converts it to the JSON the app bundles.
//
//   npm run data:update                  download from SHARE_URL and convert
//   npm run data:update -- path/to.xlsx  convert a local file instead
//
// Every sheet has the same shape: a header row with one or more "Poule/Team" blocks side by side,
// section headings in column A, poule codes in the "Poule/Team" column, and team rows with their
// number one column to the left of the team name.

import ExcelJS from 'exceljs';
import { writeFile, mkdir } from 'node:fs/promises';

const SHARE_URL =
	'https://knkv.sharepoint.com/:x:/s/KNKVDownloads/IQDMRiYOtZ8dR4aaH8R9bIjuAd7ykl9TqRrWHgJHGHf3WDg';
const OUT = new URL('../src/lib/data/indeling.json', import.meta.url);

const CATEGORY_LABELS = {
	'A-cat': 'A-categorie',
	'A-cat dames': 'A-categorie dames',
	'B-cat': 'B-categorie',
	'B-cat dames': 'B-categorie dames'
};

// SharePoint share links only serve the file after a redirect dance that sets a session cookie.
async function download() {
	const cookies = new Map();
	const fetchWithCookies = async (url) => {
		for (let i = 0; i < 10; i++) {
			const res = await fetch(url, {
				redirect: 'manual',
				headers: {
					'user-agent': 'Mozilla/5.0',
					cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ')
				}
			});
			for (const c of res.headers.getSetCookie()) {
				const [pair] = c.split(';');
				const eq = pair.indexOf('=');
				cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1));
			}
			const location = res.headers.get('location');
			if (res.status >= 300 && res.status < 400 && location) {
				url = new URL(location, url).href;
				continue;
			}
			return { res, url };
		}
		throw new Error('Too many redirects');
	};

	await fetchWithCookies(SHARE_URL);
	const { res, url } = await fetchWithCookies(`${SHARE_URL}?download=1`);
	if (!res.ok || !res.headers.get('content-type')?.includes('spreadsheet')) {
		throw new Error(`Download failed: ${res.status} ${res.headers.get('content-type')}`);
	}
	const fileName = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '');
	return { buffer: Buffer.from(await res.arrayBuffer()), fileName };
}

function cellValue(v) {
	if (v == null) return null;
	if (typeof v === 'object') {
		if ('result' in v) return cellValue(v.result);
		if ('richText' in v) return v.richText.map((t) => t.text).join('');
		if ('text' in v) return v.text;
	}
	return typeof v === 'string' ? v.trim() || null : v;
}

function convert(workbook) {
	const categories = [];
	for (const ws of workbook.worksheets) {
		const rows = [];
		ws.eachRow({ includeEmpty: true }, (row, n) => {
			const values = [];
			for (let c = 1; c <= ws.columnCount; c++) values.push(cellValue(row.getCell(c).value));
			rows[n - 1] = values;
		});

		const header = rows[0];
		const blocks = header
			.map((h, i) => (h === 'Poule/Team' ? i : -1))
			.filter((i) => i >= 0)
			.map((start) => {
				const cols = [];
				for (let j = start; header[j] != null; j++) cols.push(header[j]);
				return { start, cols };
			});

		const category = { name: CATEGORY_LABELS[ws.name] ?? ws.name, sections: [] };
		let section = null;
		let current = [];

		for (let r = 1; r < rows.length; r++) {
			const row = rows[r] ?? [];
			if (typeof row[0] === 'string') {
				section = { name: row[0], poules: [] };
				category.sections.push(section);
				current = [];
				continue;
			}
			blocks.forEach(({ start, cols }, b) => {
				const nr = row[start - 1];
				const value = row[start];
				if (typeof nr === 'number') {
					const get = (col) => {
						const i = cols.indexOf(col);
						return i < 0 ? null : (row[start + i] ?? null);
					};
					if (!current[b]) throw new Error(`${ws.name} row ${r + 1}: team without poule`);
					current[b].teams.push([nr, get('Poule/Team'), get('Dg'), get('Lftd'), get('Punt'), get('Plaats')]);
				} else if (typeof value === 'string') {
					if (!section) throw new Error(`${ws.name} row ${r + 1}: poule without section`);
					current[b] = { code: value, teams: [] };
					section.poules.push(current[b]);
				}
			});
		}

		for (const s of category.sections) {
			// The source labels the U17 1e klasse poules as "U15 1e klasse"; name them after their codes.
			if (s.name.startsWith('U15') && s.poules.length && s.poules.every((p) => p.code.startsWith('U17'))) {
				s.name = s.name.replace('U15', 'U17');
			}
		}
		category.sections = category.sections.filter((s) => s.poules.length);
		categories.push(category);
	}
	return categories;
}

const localPath = process.argv[2];
const workbook = new ExcelJS.Workbook();
let fileName;
if (localPath) {
	await workbook.xlsx.readFile(localPath);
	fileName = localPath.split('/').pop();
} else {
	const dl = await download();
	await workbook.xlsx.load(dl.buffer);
	fileName = dl.fileName;
}

const categories = convert(workbook);
const data = {
	title: fileName.replace(/\.xlsx$/i, ''),
	source: SHARE_URL,
	updated: new Date().toISOString().slice(0, 10),
	categories
};

await mkdir(new URL('.', OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(data));

const poules = categories.flatMap((c) => c.sections.flatMap((s) => s.poules));
console.log(
	`${data.title}: ${categories.length} categories, ${poules.length} poules, ${poules.reduce((n, p) => n + p.teams.length, 0)} teams`
);
