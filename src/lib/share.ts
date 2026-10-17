/**
 * Share a link to the current site with the given query string: the native share sheet where there is
 * one (phones), otherwise copy it to the clipboard. Resolves to true once the link was copied.
 */
export async function shareLink(search: string, title: string): Promise<boolean> {
	const url = `${location.origin}${location.pathname}${search}`;
	if (navigator.share) {
		try {
			await navigator.share({ title, url });
			return false;
		} catch (e) {
			// Cancelled by the user; anything else falls through to copying.
			if (e instanceof DOMException && e.name === 'AbortError') return false;
		}
	}
	try {
		await navigator.clipboard.writeText(url);
		return true;
	} catch {
		prompt('Kopieer deze link:', url);
		return false;
	}
}
