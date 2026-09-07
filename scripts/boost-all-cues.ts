import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import ffmpegPath from "ffmpeg-static";

if (!ffmpegPath) {
  console.error("ffmpeg-static not found");
  process.exit(1);
}

const SESSIONS_DIR = path.join(process.cwd(), "public", "sessions");

async function main() {
  console.log("Starting batch cue boost (+24 dB) across all sessions...");

  const dirs = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  let boostedCount = 0;

  for (const dir of dirs) {
    const sessionDir = path.join(SESSIONS_DIR, dir);
    const audioDir = path.join(sessionDir, "audio");
    const cueFile = path.join(audioDir, "cues.m4a");
    const origFile = path.join(audioDir, "cues.original.m4a");
    const sessionJsonFile = path.join(sessionDir, "session.json");

    if (!fs.existsSync(cueFile) && !fs.existsSync(origFile)) {
      continue;
    }

    // 1. Create backup if it doesn't exist
    if (!fs.existsSync(origFile)) {
      fs.copyFileSync(cueFile, origFile);
    }

    // 2. Measure max_volume of origFile
    let maxVol: number | null = null;
    try {
      const detectCmd = `"${ffmpegPath}" -i "${origFile}" -filter:a volumedetect -f null /dev/null 2>&1`;
      const out = execSync(detectCmd, { encoding: "utf8" });
      const match = out.match(/max_volume:\s+([-\d.]+)\s+dB/);
      if (match) {
        maxVol = parseFloat(match[1]);
      }
    } catch (e) {
      console.warn(`Could not detect volume for ${dir}:`, e);
      continue;
    }

    if (maxVol === null) {
      console.warn(`Could not parse volume for ${dir}`);
      continue;
    }

    // 3. Compute boost: default +24 dB, capped so peak never exceeds -2 dBFS
    const boostDb = Math.min(24.0, Math.max(0, -2.0 - maxVol));
    const formattedBoost = boostDb.toFixed(1);

    console.log(`[${dir}] orig max_volume: ${maxVol} dB -> applying +${formattedBoost} dB`);

    // 4. Run ffmpeg
    try {
      const tempDest = path.join(audioDir, "cues.temp.m4a");
      const filterStr = `volume=${formattedBoost}dB`;
      execSync(`"${ffmpegPath}" -y -i "${origFile}" -filter:a "${filterStr}" -c:a aac -b:a 64k "${tempDest}" 2>&1`);
      fs.renameSync(tempDest, cueFile);
      boostedCount++;
    } catch (e) {
      console.error(`Failed to boost cues for ${dir}:`, e);
      continue;
    }

    // 5. Update session.json to ensure cues volume is normalized to 1
    if (fs.existsSync(sessionJsonFile)) {
      try {
        const raw = fs.readFileSync(sessionJsonFile, "utf8");
        const json = JSON.parse(raw);
        let modified = false;

        if (json.audio?.cues && json.audio.cues.defaultVolume !== 1) {
          json.audio.cues.defaultVolume = 1;
          modified = true;
        }
        if (json.mix && json.mix.cuesDefaultVolume !== 1) {
          json.mix.cuesDefaultVolume = 1;
          modified = true;
        }

        if (modified) {
          fs.writeFileSync(sessionJsonFile, JSON.stringify(json, null, 2));
        }
      } catch (e) {
        console.warn(`Could not update session.json for ${dir}:`, e);
      }
    }
  }

  console.log(`\nSuccessfully boosted ${boostedCount} sessions cues!`);
}

main().catch(console.error);
