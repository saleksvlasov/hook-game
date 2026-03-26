import { BIOMES, GROUND_Y, WORLD_HEIGHT } from '../constants.js';

// Хелпер: Phaser hex → CSS строка
function hexCSS(hex) {
  return '#' + hex.toString(16).padStart(6, '0');
}

/**
 * BiomeManager — градиент + 3 слоя мерцающих искр
 * Canvas 2D API вместо Phaser Graphics + Image + scrollFactor
 *
 * Фон рисуется ДО camera.applyTransform (parallax scrollFactor=0..1).
 * Искры рисуются с ручным parallax offset.
 */
export class BiomeManager {
  constructor(scene) {
    this.scene = scene;
    this.W = scene.W;
    this.layers = [];
    this.currentBiomeIdx = 0;
    // Кешированный offscreen canvas для фоновых градиентов
    this._bgCanvases = [];
  }

  create() {
    for (let i = 0; i < BIOMES.length; i++) {
      const biome = BIOMES[i];
      const layer = {};

      // Создаём offscreen canvas с градиентом биома
      layer.bgCanvas = this._createBgCanvas(biome);

      // 3 слоя искр с разным parallax
      const scrollFactors = [0.25, 0.5, 0.8];
      layer.sparkLayers = [];
      for (const sf of scrollFactors) {
        const sparkLayer = { sf, sparks: [] };
        layer.sparkLayers.push(sparkLayer);
      }

      // Заполняем данные искр по слоям
      this._fillSparkLayer(layer.sparkLayers[0], biome, 50, 0.5, 1.5, 0.15, 0.35);  // дальние
      this._fillSparkLayer(layer.sparkLayers[1], biome, 40, 1.0, 2.5, 0.25, 0.55);  // средние
      this._fillSparkLayer(layer.sparkLayers[2], biome, 25, 1.5, 4.0, 0.35, 0.75);  // ближние

      layer.particleColor = hexCSS(biome.particleColor);
      layer.alpha = 0;

      this.layers.push(layer);
    }

    // Луна — правый верхний угол экрана
    this._moonX = this.W * 0.78;
    this._moonY = 120;
  }

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
      this.layers[i].alpha = alpha;
    }
  }

  // Отрисовка фона — вызывается ДО camera.applyTransform
  draw(ctx) {
    const camera = this.scene.camera;
    const time = this.scene.time.now;
    const W = this.W;
    const H = this.scene.H;

    // Рисуем фоновые градиенты (scrollFactor=1, но рисуем как полноэкранный фон)
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      if (layer.alpha === 0) continue;

      ctx.globalAlpha = layer.alpha;
      // Рисуем offscreen canvas как фон, масштабируя на весь экран
      ctx.drawImage(layer.bgCanvas, 0, 0, W, H);
    }

    // Луна (scrollFactor=0 — всегда на экране)
    this._drawMoon(ctx);

    // Искры с parallax — рисуем с ручным scroll offset
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      if (layer.alpha === 0) continue;

      for (let j = 0; j < layer.sparkLayers.length; j++) {
        this._updateAndDrawSparks(ctx, layer.sparkLayers[j], layer.particleColor, layer.alpha, time, camera);
      }
    }

    ctx.globalAlpha = 1;
  }

  _updateAndDrawSparks(ctx, sparkLayer, color, layerAlpha, time, camera) {
    const sparks = sparkLayer.sparks;
    const sf = sparkLayer.sf;
    const spanX = this.W / sf;
    const W = this.W;
    const H = this.scene.H;
    // Viewport culling с запасом
    const margin = 30;

    for (let i = 0; i < sparks.length; i++) {
      const s = sparks[i];

      // Движение (всегда обновляем позицию)
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

      // Экранные координаты с parallax
      const screenX = s.baseX - camera.scrollX * sf;
      const screenY = s.baseY - camera.scrollY * sf;

      // Viewport culling — пропускаем невидимые искры
      if (screenX < -margin || screenX > W + margin ||
          screenY < -margin || screenY > H + margin) continue;

      // Мерцание
      const flicker = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * s.flickerSpeed + s.flickerPhase));
      const scale = 0.6 + flicker * 0.4;
      const sz = s.size * scale;

      const alpha = layerAlpha * s.baseAlpha * flicker;

      // Ядро искры
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, sz, 0, Math.PI * 2);
      ctx.fill();
      // Мягкий ореол
      ctx.globalAlpha = alpha * 0.3;
      ctx.beginPath();
      ctx.arc(screenX, screenY, sz * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _createBgCanvas(biome) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 200; // Маленький — будет растянут
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, biome.bgTop);
    grad.addColorStop(0.5, biome.bgMid);
    grad.addColorStop(1, biome.bgBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1, 200);
    return canvas;
  }

  _drawMoon(ctx) {
    // Луна — далёкий объект, слабый параллакс (scrollFactor 0.02)
    // Чем выше игрок поднимается, тем чуть выше сдвигается луна
    const camera = this.scene.camera;
    const parallax = 0.02;
    const mx = this._moonX - camera.scrollX * parallax;
    const my = this._moonY - camera.scrollY * parallax;
    const R = 65;

    // Neon Western луна — тёмная стальная с мягким cyan свечением

    // Внешнее cyan свечение (аура) — мягкое, не яркое
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = '#00F5D4';
    ctx.beginPath(); ctx.arc(mx, my, R + 25, 0, Math.PI * 2); ctx.fill();

    // Тело — тёмная сталь
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#4A5580';
    ctx.beginPath(); ctx.arc(mx, my, R, 0, Math.PI * 2); ctx.fill();

    // Подсветка слева-сверху — чуть светлее
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#4A5580';
    ctx.beginPath(); ctx.arc(mx - 6, my - 4, R - 5, 0, Math.PI * 2); ctx.fill();

    // Кратеры
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = '#2A3050';
    ctx.beginPath(); ctx.arc(mx + 15, my - 14, 11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx - 18, my + 10, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + 4, my + 20, 5, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 1;
  }

  destroy() {
    this.layers = [];
    this._bgCanvases = [];
  }
}
