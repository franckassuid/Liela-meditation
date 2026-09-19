import type { Firestore } from "firebase-admin/firestore";
import { SESSIONS_CATALOG } from "../src/config/sessionsCatalog";
import { sessions, resolveSessionAsset } from "../src/lib/sessions";

export function buildCatalogDocuments() {
  return sessions.map((session) => {
    const catalogIndex = SESSIONS_CATALOG.findIndex((item) => item.id === session.id || item.realSessionId === session.id);
    const catalog = SESSIONS_CATALOG[catalogIndex];
    const situation = session.metadata.situation || catalog?.situationId || "discovery";
    return {
      ...session,
      metadata: {
        ...session.metadata,
        situation,
        estPorteEntree: session.metadata.estPorteEntree ?? catalog?.estPorteEntree ?? false,
        shortDescription: session.metadata.shortDescription || catalog?.description || "",
        level: session.metadata.level || catalog?.level || "beginner",
      },
      published: true,
      order: catalogIndex < 0 ? SESSIONS_CATALOG.length : catalogIndex,
      artwork: catalog?.artwork || `/artwork-${situation === "discovery" ? "calmer-le-stress" : situation}.png`,
      rmsUrl: resolveSessionAsset(session.id, "audio/rms.json"),
    };
  });
}

export async function importCatalog(db: Firestore, documents = buildCatalogDocuments()) {
  let created = 0;
  for (const data of documents) {
    const ref = db.doc(`sessions/${data.id}`);
    // Count only committed creations: Firestore can retry a transaction callback.
    const wasCreated = await db.runTransaction(async (transaction) => {
      if ((await transaction.get(ref)).exists) return false;
      transaction.create(ref, JSON.parse(JSON.stringify(data)));
      return true;
    });
    if (wasCreated) created++;
  }
  await db.doc("catalog/config").set({ enabled: true, schemaVersion: 1 }, { merge: true });
  return created;
}
