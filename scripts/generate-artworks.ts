import { Jimp, rgbaToInt } from "jimp";
import fs from "fs/promises";
import path from "path";
import { situations } from "../src/config/situations";

async function generateArtworks() {
  const publicDir = path.join(process.cwd(), "public");

  for (const [id, sit] of Object.entries(situations)) {
    const filePath = path.join(publicDir, `artwork-${sit.slug}.png`);
    
    // Check if it already exists to not overwrite the ones the user provided
    try {
      await fs.access(filePath);
      console.log(`Skipping: artwork-${sit.slug}.png (already exists)`);
      continue;
    } catch (e) {
      // Doesn't exist, we generate it
    }

    const hex = sit.color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    try {
      // Generate a new 1024x1024 image filled with the color
      const image = new Jimp({ width: 1024, height: 1024, color: rgbaToInt(r, g, b, 255) });
      await image.write(filePath as any);
      console.log(`Generated: artwork-${sit.slug}.png with color ${sit.color}`);
    } catch (e) {
      console.error(`Failed to generate artwork for ${sit.slug}:`, e);
    }
  }
}

generateArtworks();
