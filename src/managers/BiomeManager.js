import Phaser from 'phaser';
import { BIOMES, GROUND_Y, WORLD_HEIGHT, Z } from '../constants.js';

/**
 * BiomeManager — градиент + 3 слоя мерцающих искр (ближние, средние, дальние)
 * для эффекта объёма и перспективы. Плавный кроссфейд между биомами.
 *
 * Оптимизация: 3 Graphics на биом (по одному на слой глубины) вместо 575 отдельных.
 * 575 draw calls → 15 draw calls.
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

      // 3 Graphics объекта — по одному на слой глубины (scrollFactor)
      const scrollFactors = [0.25, 0.5, 0.8];
      layer.sparkLayers = [];
      for (const sf of scrollFactors) {
        layer.sparkLayers.push({
          gfx: this.scene.add.graphics().setDepth(Z.ASH).setScrollFactor(sf),
          sf,
          sparks: [],
        });
      }

      // Заполняем данные искр по слоям
      this._fillSparkLayer(layer.sparkLayers[0], biome, 50, 0.5, 1.5, 0.15, 0.35);  // дальние
      this._fillSparkLayer(layer.sparkLayers[1], biome, 40, 1.0, 2.5, 0.25, 0.55);  // средние
      this._fillSparkLayer(layer.sparkLayers[2], biome, 25, 1.5, 4.0, 0.35, 0.75);  // ближние

      // Цвет частиц биома — кешируем
      layer.particleColor = biome.particleColor;
      layer.alpha = 0;
      layer.bgImage.setAlpha(0);
      for (const sl of layer.sparkLayers) sl.gfx.setVisible(false);

      this.layers.push(layer);
    }

    this._createMoon();
  }

  // Заполнить данные искр для слоя (без создания Phaser объектов)
  _fillSparkLayer(sparkLayer, biome, count, minSize, maxSize, minAlpha, maxAlpha) {
    const sf = sparkLayer.sf;
    const yStart = (GROUND_Y - biome.endHeight * 10) * sf;
    const yEnd = (GROUND_Y - biome.startHeight * 10) * sf;
    const spanX = this.W / sf;
    const speedScale = sf * 2;

    for (let i = 0; i < count; i++) {
      const size = minSize + Math.random() * (maxSize - minSize);
      const baseAlpha = minAlpha + Math.random() * (maxAlpha - minAlpha);

      sparkLayer.sparks.push({
        baseX: Math.random() * spanX,
        baseY: yStart + Math.random() * (yEnd - yStart),
        yStart, yEnd,
        size, baseAlpha,
        speedX: (Math.random() - 0.5) * 0.4 * speedScale,
        speedY: -(0.2 + Math.random() * 0.8) * speedScale,
        flickerPhase: Math.random() * Math.PI * 2,
        flickerSpeed: 0.003 + Math.random() * 0.005,
        driftPhase: Math.random() * Math.PI * 2,
        driftAmp: 5 + Math.random() * 20,
      });
    }
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

    // Анимация искр — перерисовка на общих Graphics
    const time = this.scene.time.now;
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      if (layer.alpha === 0) continue;
      for (let j = 0; j < layer.sparkLayers.length; j++) {
        this._updateAndDrawSparks(layer.sparkLayers[j], layer.particleColor, layer.alpha, time);
      }
    }
  }

  // Обновить позиции и перерисовать все искры слоя на одном Graphics
  _updateAndDrawSparks(sparkLayer, color, layerAlpha, time) {
    const gfx = sparkLayer.gfx;
    const sparks = sparkLayer.sparks;
    const sf = sparkLayer.sf;
    const spanX = this.W / sf;

    gfx.clear();

    for (let i = 0; i < sparks.length; i++) {
      const s = sparks[i];

      // Движение
      const drift = Math.sin(time * 0.001 + s.driftPhase) * s.driftAmp * 0.008;
      s.baseX += s.speedX + drift;
      s.baseY += s.speedY;

      // Wrap
      if (s.baseX < 0) s.baseX += spanX;
      if (s.baseX > spanX) s.baseX -= spanX;
      const spanY = s.yEnd - s.yStart;
      if (spanY > 0) {
        if (s.baseY < s.yStart) s.baseY += spanY;
        if (s.baseY > s.yEnd) s.baseY -= spanY;
      }

      // Мерцание — пульсация яркости
      const flicker = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * s.flickerSpeed + s.flickerPhase));
      const scale = 0.6 + flicker * 0.4;
      const sz = s.size * scale;

      const alpha = layerAlpha * s.baseAlpha * flicker;

      // Ядро искры
      gfx.fillStyle(color, alpha);
      gfx.fillCircle(s.baseX, s.baseY, sz);
      // Мягкий ореол
      gfx.fillStyle(color, alpha * 0.3);
      gfx.fillCircle(s.baseX, s.baseY, sz * 2.5);
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

    // Внешнее cyan свечение
    moonGfx.fillStyle(0x00F5D4, 0.05);
    moonGfx.fillCircle(mx, moonY, 90);
    // Тело луны — стальной тон
    moonGfx.fillStyle(0x4A5580, 0.25);
    moonGfx.fillCircle(mx, moonY, 70);
    // Подсветка
    moonGfx.fillStyle(0x6688AA, 0.15);
    moonGfx.fillCircle(mx - 10, moonY - 5, 62);
    // Кратеры — тёмная сталь
    moonGfx.fillStyle(0x2A3050, 0.12);
    moonGfx.fillCircle(mx + 18, moonY - 15, 14);
    moonGfx.fillCircle(mx - 22, moonY + 15, 9);
  }

  destroy() {
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      if (layer.bgImage) layer.bgImage.destroy();
      // Уничтожаем 3 Graphics на биом (вместо ~115 на биом)
      for (const sl of layer.sparkLayers) {
        if (sl.gfx) sl.gfx.destroy();
      }
      const key = `bg-biome-${i}`;
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    }
    this.layers = [];
  }

  _setLayerAlpha(layer, alpha) {
    layer.alpha = alpha;
    layer.bgImage.setAlpha(alpha);
    // Видимость Graphics управляется здесь, альфа — через fillStyle в _updateAndDrawSparks
    for (const sl of layer.sparkLayers) {
      sl.gfx.setVisible(alpha > 0);
    }
  }
}
