export function createPerformanceMonitor() {
  return {
    averageFrameMs: 16.7,
    quality: "high",
    frameCount: 0,
    lastFrameMs: 0,
    update(frameMs) {
      this.lastFrameMs = frameMs;
      this.frameCount += 1;
      this.averageFrameMs = this.averageFrameMs * 0.92 + frameMs * 0.08;
      if (this.frameCount < 20) return;
      if (this.quality === "high" && this.averageFrameMs > 23) {
        this.quality = "low";
      } else if (this.quality === "low" && this.averageFrameMs < 17.5) {
        this.quality = "high";
      }
    },
    shouldReduceEffects() {
      return this.quality === "low";
    },
    snapshot() {
      return {
        quality: this.quality,
        averageFrameMs: Number(this.averageFrameMs.toFixed(2)),
        lastFrameMs: Number(this.lastFrameMs.toFixed(2)),
      };
    },
  };
}

export function createSpatialIndex(cellSize) {
  const cells = new Map();

  function key(cx, cy) {
    return `${cx},${cy}`;
  }

  function cellCoord(value) {
    return Math.floor(value / cellSize);
  }

  return {
    cellSize,
    cells,
    rebuild(enemies) {
      cells.clear();
      for (const enemy of enemies) {
        if (enemy.dead || enemy.remove) continue;
        const cx = cellCoord(enemy.x);
        const cy = cellCoord(enemy.y);
        const id = key(cx, cy);
        let bucket = cells.get(id);
        if (!bucket) {
          bucket = [];
          cells.set(id, bucket);
        }
        bucket.push(enemy);
      }
    },
    queryCircle(x, y, radius) {
      const results = [];
      const minX = cellCoord(x - radius);
      const maxX = cellCoord(x + radius);
      const minY = cellCoord(y - radius);
      const maxY = cellCoord(y + radius);
      for (let cy = minY; cy <= maxY; cy += 1) {
        for (let cx = minX; cx <= maxX; cx += 1) {
          const bucket = cells.get(key(cx, cy));
          if (!bucket) continue;
          for (const enemy of bucket) {
            results.push(enemy);
          }
        }
      }
      return results;
    },
    snapshot() {
      return {
        cellSize,
        cellCount: cells.size,
      };
    },
  };
}
