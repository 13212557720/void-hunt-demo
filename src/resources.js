export function createSpriteSheets() {
  return {
    storm: createSpriteSheet("assets/hero.png", true, {
      idle: [
        { x: 180, y: 145, w: 75, h: 141, anchorX: 0.5, anchorY: 0.88 },
        { x: 275, y: 145, w: 75, h: 141, anchorX: 0.5, anchorY: 0.88 },
      ],
      move: [
        { x: 180, y: 145, w: 75, h: 141, anchorX: 0.5, anchorY: 0.88 },
        { x: 275, y: 145, w: 75, h: 141, anchorX: 0.5, anchorY: 0.88 },
        { x: 275, y: 145, w: 75, h: 141, anchorX: 0.5, anchorY: 0.88 },
        { x: 180, y: 145, w: 75, h: 141, anchorX: 0.5, anchorY: 0.88 },
      ],
    }),
    windman: createSpriteSheet("assets/windman.png", false, {
      idle: [
        { x: 176, y: 512, w: 508, h: 440, anchorX: 0.5, anchorY: 0.84 },
        { x: 608, y: 584, w: 360, h: 356, anchorX: 0.5, anchorY: 0.85 },
      ],
      move: [
        { x: 176, y: 512, w: 508, h: 440, anchorX: 0.5, anchorY: 0.84 },
        { x: 608, y: 584, w: 360, h: 356, anchorX: 0.5, anchorY: 0.85 },
      ],
      slash: [
        { x: 608, y: 584, w: 360, h: 356, anchorX: 0.5, anchorY: 0.85 },
        { x: 176, y: 512, w: 508, h: 440, anchorX: 0.5, anchorY: 0.84 },
      ],
      tornado: [
        { x: 1040, y: 156, w: 460, h: 416 },
        { x: 1168, y: 572, w: 340, h: 380 },
      ],
    }),
  };
}

function createSpriteSheet(src, chromaKey, frames) {
  const image = new Image();
  const sprite = {
    image,
    source: null,
    loaded: false,
    failed: false,
    frames,
  };

  image.onload = () => {
    sprite.source = chromaKey ? createChromaKeyedHeroSheet(image) : image;
    sprite.loaded = true;
  };
  image.onerror = () => {
    sprite.failed = true;
  };
  image.src = src;

  return sprite;
}

function createChromaKeyedHeroSheet(image) {
  const sheet = document.createElement("canvas");
  sheet.width = image.naturalWidth || image.width;
  sheet.height = image.naturalHeight || image.height;
  const sheetCtx = sheet.getContext("2d");
  sheetCtx.drawImage(image, 0, 0);

  try {
    const pixels = sheetCtx.getImageData(0, 0, sheet.width, sheet.height);
    const data = pixels.data;
    for (let i = 0; i < data.length; i += 4) {
      const red = data[i];
      const green = data[i + 1];
      const blue = data[i + 2];
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);

      if (max < 14) {
        data[i + 3] = 0;
      } else if (max < 30 && max - min < 10) {
        data[i + 3] = Math.round(((max - 14) / 16) * 190);
      }
    }
    sheetCtx.putImageData(pixels, 0, 0);
    return sheet;
  } catch (error) {
    return image;
  }
}
