import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { buildCatalogDocuments, importCatalog } from "./firebase-catalog";

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID || "liela-9426c";
  const documents = buildCatalogDocuments();
  console.log(`${documents.length} séances prêtes pour ${projectId}. Les pistes audio ne sont pas envoyées.`);
  if (!process.argv.includes("--write")) {
    console.log("Simulation uniquement. Ajouter --write pour créer les documents absents (les documents existants sont préservés).");
    return;
  }
  initializeApp({ projectId, ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: applicationDefault() }) });
  const db = getFirestore();
  const created = await importCatalog(db, documents);
  console.log(`${created} séances créées. Catalogue Firestore activé.`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
