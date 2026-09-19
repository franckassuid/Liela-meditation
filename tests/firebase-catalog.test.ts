import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { buildCatalogDocuments } from "../scripts/firebase-catalog";

test("catalogue import preserves situations, entry sessions and order from the editorial catalogue", () => {
  const documents = buildCatalogDocuments();
  assert.equal(documents.length, 38);
  const stress = documents.find((item) => item.id === "une-pause-pour-souffler-3min")!;
  assert.equal(stress.metadata.situation, "calmer-le-stress");
  assert.equal(stress.metadata.estPorteEntree, true);
  assert.equal(stress.order, 0);
  const sleep = documents.find((item) => item.id === "preparer-le-sommeil-3min")!;
  assert.equal(sleep.metadata.situation, "trouver-le-sommeil");
  assert.equal(sleep.artwork, "/artwork-trouver-le-sommeil.png");
  const discovery = documents.find((item) => item.id === "premiers-pas-en-meditation-3min")!;
  assert.equal(discovery.metadata.situation, "discovery");
  assert.equal(new Set(documents.map((item) => item.metadata.situation)).size, 7);
  for (const document of documents) {
    assert.ok(existsSync(`public${document.artwork}`), document.artwork);
    assert.ok(document.metadata.shortDescription, document.id);
  }
});
