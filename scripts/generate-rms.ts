import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs/promises';
import path from 'path';
import { PassThrough } from 'stream';

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

const SESSIONS_DIR = path.join(process.cwd(), 'public', 'sessions');
const HZ = 10;
const SAMPLE_RATE = 1000;
const SAMPLES_PER_TICK = SAMPLE_RATE / HZ; // 100

async function processFile(inputFile: string, outputFile: string) {
  return new Promise<void>((resolve, reject) => {
    const stream = new PassThrough();
    const rmsValues: number[] = [];
    
    let buffer = Buffer.alloc(0);

    stream.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      
      while (buffer.length >= SAMPLES_PER_TICK * 4) { // 4 bytes per Float32
        const chunkBuf = buffer.subarray(0, SAMPLES_PER_TICK * 4);
        buffer = buffer.subarray(SAMPLES_PER_TICK * 4);
        
        let sumSq = 0;
        for (let i = 0; i < SAMPLES_PER_TICK; i++) {
          const val = chunkBuf.readFloatLE(i * 4);
          sumSq += val * val;
        }
        const rms = Math.sqrt(sumSq / SAMPLES_PER_TICK);
        rmsValues.push(rms);
      }
    });

    stream.on('end', async () => {
      // Process remaining buffer if any
      if (buffer.length > 0) {
        const remainingSamples = buffer.length / 4;
        let sumSq = 0;
        for (let i = 0; i < remainingSamples; i++) {
          const val = buffer.readFloatLE(i * 4);
          sumSq += val * val;
        }
        const rms = Math.sqrt(sumSq / remainingSamples);
        rmsValues.push(rms);
      }

      // Smooth the envelope to avoid too abrupt changes
      const smoothed = [];
      const smoothingFactor = 0.3;
      let prev = 0;
      for (const v of rmsValues) {
        prev = prev + smoothingFactor * (v - prev);
        smoothed.push(prev);
      }

      // Normalize values between 0 and 1
      const max = Math.max(...smoothed, 0.001);
      const normalized = smoothed.map(v => Number((v / max).toFixed(3)));
      
      // Write to JSON
      await fs.writeFile(outputFile, JSON.stringify(normalized));
      resolve();
    });

    stream.on('error', reject);

    ffmpeg(inputFile)
      .noVideo()
      .audioChannels(1)
      .audioFrequency(SAMPLE_RATE)
      .format('f32le')
      .on('error', (err) => {
        reject(err);
      })
      .pipe(stream);
  });
}

async function run() {
  const dirs = await fs.readdir(SESSIONS_DIR, { withFileTypes: true });
  const sessions = dirs.filter(d => d.isDirectory());
  
  for (const session of sessions) {
    const audioDir = path.join(SESSIONS_DIR, session.name, 'audio');
    const voiceFile = path.join(audioDir, 'voice.m4a');
    const rmsFile = path.join(audioDir, 'rms.json');
    
    try {
      await fs.access(voiceFile);
    } catch {
      continue; // No voice file
    }
    
    console.log(`Processing ${session.name}...`);
    try {
      await processFile(voiceFile, rmsFile);
      console.log(`  -> Generated rms.json (${session.name})`);
    } catch (e) {
      console.error(`  -> Failed for ${session.name}`, e);
    }
  }
}

run();
