import JSON5 from "json5";

// The store embeds its metadata as a JS object literal in a script tag.
// Accept data literals only. If a block changes format, skip it.
export function* webstoreEntries(html) {
	const callbacks = html.matchAll(/AF_initDataCallback\(([\s\S]*?)\);\s*<\/script>/g);
	for (const [, source] of callbacks) {
		let data;
		try {
			data = JSON5.parse(source)?.data;
		} catch {
			continue;
		}

		const pending = [data];
		while (pending.length) {
			const row = pending.pop();
			if (!Array.isArray(row)) continue;
			if (typeof row[0] === "string" && /^[a-z]{32}$/.test(row[0]) && typeof row[2] === "string") {
				yield row;
			}
			for (let i = row.length - 1; i >= 0; i--) {
				if (Array.isArray(row[i])) pending.push(row[i]);
			}
		}
	}
}
