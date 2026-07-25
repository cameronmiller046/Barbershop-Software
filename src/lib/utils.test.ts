// Unit tests for the security-critical pure helpers in utils.ts.
// Run with `npm test` (Node's built-in test runner via tsx — no extra deps).

import { test } from "node:test";
import assert from "node:assert/strict";
import { jsonLdSafe, safeExternalUrl, escapeHtml, safeImageUrl } from "./utils";

const LSEP = String.fromCharCode(0x2028);
const PSEP = String.fromCharCode(0x2029);

test("jsonLdSafe: escapes </script> breakout characters", () => {
  const out = jsonLdSafe({ body: "</script><script>alert(1)</script>" });
  assert.ok(!out.includes("</script>"), "must not contain a literal </script>");
  assert.ok(!out.includes("<"), "all < must be escaped to \\u003c");
  assert.ok(out.includes("\\u003c"), "uses unicode escape for <");
  assert.doesNotThrow(() => JSON.parse(out)); // still valid JSON
});

test("jsonLdSafe: escapes & and U+2028/U+2029 line separators", () => {
  const out = jsonLdSafe({ a: "x&y", b: `line${LSEP}sep${PSEP}end` });
  assert.ok(!out.includes("&"), "& escaped");
  assert.ok(!out.includes(LSEP) && !out.includes(PSEP), "separators escaped");
});

test("safeExternalUrl: blocks script-capable schemes", () => {
  assert.equal(safeExternalUrl("javascript:alert(1)"), undefined);
  assert.equal(safeExternalUrl("JavaScript:alert(1)"), undefined);
  assert.equal(safeExternalUrl("data:text/html,<script>"), undefined);
  assert.equal(safeExternalUrl("vbscript:msgbox"), undefined);
  assert.equal(safeExternalUrl("  javascript:alert(1)  "), undefined);
});

test("safeExternalUrl: allows and normalizes real links", () => {
  assert.equal(safeExternalUrl("https://instagram.com/shop"), "https://instagram.com/shop");
  assert.equal(safeExternalUrl("//cdn.example.com/x"), "//cdn.example.com/x");
  assert.equal(safeExternalUrl("mailto:a@b.com"), "mailto:a@b.com");
  assert.equal(safeExternalUrl("instagram.com/shop"), "https://instagram.com/shop");
  assert.equal(safeExternalUrl(""), undefined);
  assert.equal(safeExternalUrl(null), undefined);
});

test("escapeHtml: neutralizes HTML metacharacters", () => {
  assert.equal(escapeHtml("<img src=x onerror=alert(1)>"), "&lt;img src=x onerror=alert(1)&gt;");
  assert.equal(escapeHtml(`"'&`), "&quot;&#39;&amp;");
  assert.equal(escapeHtml(null), "");
});

test("safeImageUrl: allows http(s) + bounded image data URLs, rejects the rest", () => {
  assert.equal(safeImageUrl("https://cdn.example.com/a.png"), "https://cdn.example.com/a.png");
  const smallData = "data:image/png;base64," + "A".repeat(100);
  assert.equal(safeImageUrl(smallData), smallData);
  const huge = "data:image/png;base64," + "A".repeat(5_000_000);
  assert.equal(safeImageUrl(huge), null); // oversized rejected
  assert.equal(safeImageUrl("data:text/html;base64,PHNjcmlwdD4="), null); // non-image rejected
  assert.equal(safeImageUrl("javascript:alert(1)"), null);
  assert.equal(safeImageUrl(""), null);
});
