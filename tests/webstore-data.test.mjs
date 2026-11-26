import assert from "node:assert/strict";
import test from "node:test";
import { webstoreEntries } from "../lib/webstore-data.mjs";

const id = "abcdefghijklmnopabcdefghijklmnop";

test("reads nested extension metadata in display order", () => {
	const html = `<script>AF_initDataCallback({key:'ds:1',data:[[['${id}',null,'First'],['${id}',null,'Second']]],sideChannel:{}});</script>`;
	assert.deepEqual([...webstoreEntries(html)].map(row => row[2]), ["First", "Second"]);
});

test("skips expressions and malformed rows, then reads the next data block", () => {
	const html = `<script>AF_initDataCallback({data:[['${id}',null,'Computed' + ' name']]});</script>
	<script>AF_initDataCallback({data:[[12],['short', null, 'Invalid'],['${id}',null,'Literal']]});</script>`;
	assert.deepEqual([...webstoreEntries(html)], [[id, null, "Literal"]]);
});
