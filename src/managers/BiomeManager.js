import Phaser from 'phaser';
import { BIOMES, GROUND_Y, WORLD_HEIGHT, Z } from '../constants.js';

/**
 * BiomeManager — градиент + 3 слоя мерцающих искр (ближние, средние, дальние)
 * для эффекта объёма и перспективы. Плавный кроссфейд между биомами.
 */
export class BiomeManager {
  constructor(scene) {
    this.scene = scene;
    this.W = scene.scale.width;
    this.layers = [];
    this.currentBiomeIdx = 0;
  }

  create() {
    for (let i = 0; i < BIOMES.length; i++) {
      const biome = BIOMES[i];
      const layer = {};

      // Фоновый градиент
      layer.bgImage = this._createBgTexture(biome, i);

      // 3 слоя искр: дальние (мелкие, медленные), средние, ближние (крупные, быстрые)
      layer.sparks = [
        ...this._createSparkLayer(biome, 0.25, 50, 0.5, 1.5, 0.15, 0.35), // дальние
        ...this._createSparkLayer(biome, 0.50, 40, 1.0, 2.5, 0.25, 0.55), // средние
        ...this._createSparkLayer(biome, 0.80, 25, 1.5, 4.0, 0.35, 0.75), // ближние
      ];

      this._setLayerAlpha(layer, 0);
      this.layers.push(layer);
    }

    this._createMoon();
  }

  // Создать слой искр с заданной глубиной
  _createSparkLayer(biome, scrollFactor, count, minSize, maxSize, minAlpha, maxAlpha) {
    const sparks = [];
    const yStart = (GROUND_Y - biome.endHeight * 10) * scrollFactor;
    const yEnd = (GROUND_Y - biome.startHeight * 10) * scrollFactor;
    const spanX = this.W / scrollFactor;
    const spanY = yEnd - yStart;

    for (let i = 0; i < count; i++) {
      const gfx = this.scene.add.graphics().setDepth(Z.ASH).setScrollFactor(scrollFactor);

      const size = minSize + Math.random() * (maxSize - minSize);
      const baseAlpha = minAlpha + Math.random() * (maxAlpha - minAlpha);

      // Рисуем искру — ядро + ореол
      gfx.fillStyle(biome.particleColor, baseAlpha);
      gfx.fillCircle(0, 0, size);
      // Мягкий ореол
      gfx.fillStyle(biome.particleColor, baseAlpha * 0.3);
      gfx.fillCircle(0, 0, size * 2.5);

      const x = Math.random() * spanX;
      const y = yStart + Math.random() * spanY;
      gfx.setPosition(x, y);

      // Скорость зависит от близости: ближние быстрее
      const speedScale = scrollFactor * 2;

      sparks.push({
        gfx,
        baseX: x, baseY: y,
        yStart, yEnd, sf: scrollFactor,
        size, baseAlpha,
        // Движение: вверх + дрейф по X
        speedX: (Math.random() - 0.5) * 0.4 * speedScale,
        speedY: -(0.2 + Math.random() * 0.8) * speedScale, // вверх как от костра
        // Мерцание
        flickerPhase: Math.random() * Math.PI * 2,
        flickerSpeed: 0.003 + Math.random() * 0.005,
        // Покачивание
        driftPhase: Math.random() * Math.PI * 2,
        driftAmp: 5 + Math.random() * 20,
      });
    }

    return sparks;
  }

  update(playerY) {
    const height = Math.max(0, (GROUND_Y - playerY) / 10);

    let idx = 0;
    for (let i = 0; i < BIOMES.length; i++) {
      if (height >= BIOMES[i].startHeight) idx = i;
    }
    this.currentBiomeIdx = idx;

    const BLEND = 200;

    for (let i = 0; i < this.layers.length; i++) {
      let alpha = 0;
      if (i === idx) {
        alpha = 1;
        const distToEnd = BIOMES[i].endHeight - height;
        if (distToEnd < BLEND && i < BIOMES.length - 1) {
          alpha = distToEnd / BLEND;
        }
      } else if (i === idx + 1) {
        const distToEnd = BIOMES[idx].endHeight - height;
        if (distToEnd < BLEND) {
          alpha = 1 - distToEnd / BLEND;
        }
      }
      this._setLayerAlpha(this.layers[i], alpha);
    }

    // Анимация искр
    const time = this.scene.time.now;
    for (let i = 0; i < this.layers.length; i++) {
      this._updateSparks(this.layers[i].sparks, time);
    }
  }

  _updateSparks(sparks, time) {
    for (const s of sparks) {
      if (s.gfx.alpha === 0) continue;

      // Движение
      const drift = Math.sin(time * 0.001 + s.driftPhase) * s.driftAmp * 0.008;
      s.baseX += s.speedX + drift;
      s.baseY += s.speedY;

      // Мерцание — пульсация яркости
      const flicker = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * s.flickerSpeed + s.flickerPhase));
      // Применяем мерцание через масштаб (видимость)
      s.gfx.setScale(0.6 + flicker * 0.4);

      // Wrap
      const spanX = this.W / s.sf;
      if (s.baseX < 0) s.baseX += spanX;
      if (s.baseX > spanX) s.baseX -= spanX;
      const spanY = s.yEnd - s.yStart;
      if (spanY > 0) {
        if (s.baseY < s.yStart) s.baseY += spanY;
        if (s.baseY > s.yEnd) s.baseY -= spanY;
      }

      s.gfx.setPosition(s.baseX, s.baseY);
    }
  }

  _createBgTexture(biome, index) {
    const key = `bg-biome-${index}`;
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);

    const texH = 2000;
    const tex = this.scene.textures.createCanvas(key, 1, texH);
    const ctx = tex.getContext();
    const grad = ctx.createLinearGradient(0, 0, 0, texH);
    grad.addColorStop(0, biome.bgTop);
    grad.addColorStop(0.5, biome.bgMid);
    grad.addColorStop(1, biome.bgBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1, texH);
    tex.refresh();

    return this.scene.add.image(this.W / 2, WORLD_HEIGHT / 2, key)
      .setDisplaySize(this.W * 5, WORLD_HEIGHT)
      .setDepth(Z.BG)
      .setScrollFactor(1.0);
  }

  _createMoon() {
    const moonGfx = this.scene.add.graphics().setDepth(Z.MOON);
    const moonY = 300;
    const mx = this.W * 0.72;

    moonGfx.fillStyle(0x667788, 0.08);
    moonGfx.fillCircle(mx, moonY, 90);
    moonGfx.fillStyle(0x6688AA, 0.25);
    moonGfx.fillCircle(mx, moonY, 70);
    moonGfx.fillStyle(0x7799BB, 0.18);
    moonGfx.fillCircle(mx - 10, moonY - 5, 62);
    moonGfx.fillStyle(0x5577AA, 0.10);
    moonGfx.fillCircle(mx + 18, moonY - 15, 14);
    moonGfx.fillCircle(mx - 22, moonY + 15, 9);
  }

  destroy() {
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      if (layer.bgImage) layer.bgImage.destroy();
      for (const s of layer.sparks) {
        if (s.gfx) s.gfx.destroy();
      }
      const key = `bg-biome-${i}`;
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    }
    this.layers = [];
  }

  _setLayerAlpha(layer, alpha) {
    layer.bgImage.setAlpha(alpha);
    for (const s of layer.sparks) {
      s.gfx.setAlpha(alpha > 0 ? alpha * s.baseAlpha : 0);
    }
  }
}
