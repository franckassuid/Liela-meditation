import fs from "fs";
import path from "path";

const PUBLIC_SESSIONS_DIR = path.join(process.cwd(), "public", "sessions");
const GENERATED_FILE = path.join(process.cwd(), "src", "generated", "sessions.json");

function mapCategoryToSituation(category?: string): string {
  if (!category) return "";
  const map: Record<string, string> = {
    stress: "stress",
    sleep: "sleep",
    focus: "focus",
    relaxation: "tensions",
    tensions: "tensions",
  };
  return map[category] || "";
}

function run() {
  console.log("Syncing sessions...");
  
  if (!fs.existsSync(PUBLIC_SESSIONS_DIR)) {
    console.warn(`Directory not found: ${PUBLIC_SESSIONS_DIR}`);
    fs.writeFileSync(GENERATED_FILE, JSON.stringify([], null, 2));
    return;
  }

  const dirs = fs.readdirSync(PUBLIC_SESSIONS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const sessions = [];

  for (const dir of dirs) {
    const sessionDir = path.join(PUBLIC_SESSIONS_DIR, dir);
    const sessionJsonPath = path.join(sessionDir, "session.json");
    if (!fs.existsSync(sessionJsonPath)) continue;

    try {
      const rawData = fs.readFileSync(sessionJsonPath, "utf8");
      const session = JSON.parse(rawData);

      // Validate basic metadata
      if (!session.id || !session.metadata?.title || !session.metadata?.durationSeconds) {
        console.warn(`Skipping invalid session in ${dir}: missing id, title, or durationSeconds`);
        continue;
      }

      if (!session.audio || typeof session.audio !== "object") {
        console.warn(`Skipping invalid session in ${dir}: missing audio configuration object`);
        continue;
      }

      // 1. Check audio.voice: must be defined and point to an existing file
      if (!session.audio.voice || typeof session.audio.voice !== "string") {
        console.warn(`Skipping session in ${dir}: audio.voice is missing`);
        continue;
      }
      const voicePath = path.join(sessionDir, session.audio.voice);
      if (!fs.existsSync(voicePath)) {
        console.warn(`Skipping session in ${dir}: voice file not found on disk (${session.audio.voice})`);
        continue;
      }

      // 2. Check audio.final: if specified, verify it exists
      if (session.audio.final && typeof session.audio.final === "string") {
        const finalPath = path.join(sessionDir, session.audio.final);
        if (!fs.existsSync(finalPath)) {
          console.warn(`Skipping session in ${dir}: final file not found on disk (${session.audio.final})`);
          continue;
        }
      }

      // 3. If music != null, verify music.file exists
      if (session.audio.music && session.audio.music.file) {
        const musicPath = path.join(sessionDir, session.audio.music.file);
        if (!fs.existsSync(musicPath)) {
          console.warn(`Warning in ${dir}: music file not found on disk (${session.audio.music.file}), ignoring music track`);
          session.audio.music = null;
        }
      }

      // 4. If ambience != null, verify ambience.file exists
      if (session.audio.ambience && session.audio.ambience.file) {
        const ambiencePath = path.join(sessionDir, session.audio.ambience.file);
        if (!fs.existsSync(ambiencePath)) {
          console.warn(`Warning in ${dir}: ambience file not found on disk (${session.audio.ambience.file}), ignoring ambience track`);
          session.audio.ambience = null;
        }
      }

      // 5. If cues != null, verify cues.file exists
      if (session.audio.cues && session.audio.cues.file) {
        const cuesPath = path.join(sessionDir, session.audio.cues.file);
        if (!fs.existsSync(cuesPath)) {
          console.warn(`Warning in ${dir}: cues file not found on disk (${session.audio.cues.file}), ignoring cues track`);
          session.audio.cues = null;
        }
      }

      // Compute standard situation field if missing
      if (!session.metadata.situation) {
        session.metadata.situation = mapCategoryToSituation(session.metadata.category);
      }

      sessions.push(session);
    } catch (e) {
      console.error(`Error parsing ${sessionJsonPath}:`, e);
    }
  }

  fs.writeFileSync(GENERATED_FILE, JSON.stringify(sessions, null, 2));
  console.log(`Synced ${sessions.length} sessions.`);
}

run();
