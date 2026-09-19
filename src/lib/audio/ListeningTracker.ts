/** Counts playback time, excluding pauses and jumps on the timeline. */
export class ListeningTracker {
  private position = 0;
  private at = 0;
  private playing = false;
  public seconds = 0;
  start(position: number, now: number) { this.position = position; this.at = now; this.playing = true; }
  update(position: number, now: number) {
    if (this.playing) {
      const delta = position - this.position;
      const elapsed = Math.max(0, (now - this.at) / 1000);
      if (delta > 0 && delta <= elapsed + 1) this.seconds += Math.min(delta, elapsed);
    }
    this.position = position;
    this.at = now;
  }
  stop(position: number, now: number) { this.update(position, now); this.playing = false; }
}
