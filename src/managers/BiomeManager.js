import Phaser from 'phaser';
import { BIOMES, GROUND_Y, WORLD_HEIGHT, Z } from '../constants.js';

/**
 * BiomeManager — рисует фон, параллакс-силуэты, частицы и туман
 * для каждого биома. Плавный кроссфейд при переходе между зонами.
 */
export class BiomeManager {
  constructor(scene) {
    this.scene = scene;
    this.W = scene.scale.width;
    // Слои для каждого биома: { bgImage, parallaxFar, parallaxNear, fogGfx, particles }
    this.layers = [];
    // Активный индекс биома (кеш для оптимизации)
    this.currentBiomeIdx = 0;
  }

  // ===================== CREATE =====================

  create() {
    for (let i = 0; i < BIOMES.length; i++) {
      const biome = BIOMES[i];
      const layer = {};

      // --- Фоновый градиент (canvas текстура 1x2000, тайлится) ---
      layer.bgImage = this._createBgTexture(biome, i);

      // --- Параллакс-силуэты (дальний + ближний) ---
      layer.parallaxFar = this._createParallax(biome, i, 0.3, Z.BIOME_FAR);
      layer.parallaxNear = this._createParallax(biome, i, 0.5, Z.TREE_FAR);

      // --- Туман ---
      layer.fogGfx = this._createFog(biome);

      // --- Частицы ---
      layer.particles = this._createParticles(biome, i);

      // Все слои начинают невидимыми, update покажет нужные
      this._setLayerAlpha(layer, 0);

      this.layers.push(layer);
    }

    // Луна — всегда видна наверху
    this._createMoon();
  }

  // ===================== UPDATE =====================

  update(playerY) {
    const height = Math.max(0, (GROUND_Y - playerY) / 10);

    // Определяем текущий биом и прогресс перехода
    let idx = 0;
    for (let i = 0; i < BIOMES.length; i++) {
      if (height >= BIOMES[i].startHeight) idx = i;
    }
    this.currentBiomeIdx = idx;

    // Зона перехода — 200 метров
    const BLEND = 200;

    for (let i = 0; i < this.layers.length; i++) {
      let alpha = 0;

      if (i === idx) {
        alpha = 1;
        // Затухание к верхней границе текущего биома
        const distToEnd = BIOMES[i].endHeight - height;
        if (distToEnd < BLEND && i < BIOMES.length - 1) {
          alpha = distToEnd / BLEND;
        }
      } else if (i === idx + 1) {
        // Следующий биом появляется в зоне перехода
        const distToEnd = BIOMES[idx].endHeight - height;
        if (distToEnd < BLEND) {
          alpha = 1 - distToEnd / BLEND;
        }
      }
      // Все остальные остаются alpha=0

      this._setLayerAlpha(this.layers[i], alpha);
    }

    // Обновляем частицы
    for (let i = 0; i < this.layers.length; i++) {
      this._updateParticles(this.layers[i].particles, BIOMES[i], playerY);
    }
  }

  // ===================== ФОНОВЫЙ ГРАДИЕНТ =====================

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

    // Тайлим на весь мир — шире экрана x5 для камеры
    const img = this.scene.add.image(this.W / 2, WORLD_HEIGHT / 2, key)
      .setDisplaySize(this.W * 5, WORLD_HEIGHT)
      .setDepth(Z.BG)
      .setScrollFactor(1.0);

    return img;
  }

  // ===================== ПАРАЛЛАКС =====================

  _createParallax(biome, index, scrollFactor, depth) {
    const gfx = this.scene.add.graphics()
      .setDepth(depth)
      .setScrollFactor(scrollFactor);

    // Диапазон мира для этого биома (в пикселях)
    const yStart = GROUND_Y - biome.endHeight * 10;
    const yEnd = GROUND_Y - biome.startHeight * 10;
    const spanY = yEnd - yStart;
    const spanX = this.W / scrollFactor;

    const count = 60;

    switch (biome.name) {
      case 'foundry':
        this._drawSteelBeams(gfx, spanX, yStart, spanY, biome, count);
        break;
      case 'ironworks':
        this._drawPipes(gfx, spanX, yStart, spanY, biome, count);
        break;
      case 'furnace':
        this._drawRocks(gfx, spanX, yStart, spanY, biome, count);
        break;
      case 'storm':
        this._drawClouds(gfx, spanX, yStart, spanY, biome, count);
        break;
      case 'cosmos':
        this._drawStars(gfx, spanX, yStart, spanY, biome, count);
        break;
    }

    return gfx;
  }

  // Foundry: стальные балки и фермы
  _drawSteelBeams(gfx, width, yStart, spanY, biome, count) {
    gfx.fillStyle(biome.parallaxColor, biome.parallaxAlpha);
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = yStart + Math.random() * spanY;
      const isHorizontal = Math.random() > 0.5;
      if (isHorizontal) {
        // Горизонтальная балка
        const w = 40 + Math.random() * 120;
        gfx.fillRect(x, y, w, 4 + Math.random() * 4);
        // Фермы (диагональные распорки)
        if (Math.random() > 0.6) {
          gfx.fillRect(x + w * 0.3, y, 3, 20 + Math.random() * 30);
          gfx.fillRect(x + w * 0.7, y, 3, 20 + Math.random() * 30);
        }
      } else {
        // Вертикальная колонна
        const h = 60 + Math.random() * 200;
        gfx.fillRect(x, y, 5 + Math.random() * 4, h);
      }
    }
  }

  // Ironworks: трубы и вентили
  _drawPipes(gfx, width, yStart, spanY, biome, count) {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = yStart + Math.random() * spanY;
      const a = biome.parallaxAlpha * (0.5 + Math.random() * 0.5);
      gfx.fillStyle(biome.parallaxColor, a);

      if (Math.random() > 0.4) {
        // Горизонтальная труба
        const w = 50 + Math.random() * 150;
        const pipeH = 6 + Math.random() * 6;
        gfx.fillRect(x, y, w, pipeH);
        // Фланцы (соединения)
        gfx.fillRect(x, y - 2, 4, pipeH + 4);
        gfx.fillRect(x + w, y - 2, 4, pipeH + 4);
      } else {
        // Вентиль (кружок)
        gfx.fillCircle(x, y, 5 + Math.random() * 8);
        gfx.fillRect(x - 2, y - 15, 4, 15);
      }
    }
  }

  // Furnace: скалы и лавовые потоки
  _drawRocks(gfx, width, yStart, spanY, biome, count) {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = yStart + Math.random() * spanY;
      const a = biome.parallaxAlpha * (0.5 + Math.random() * 0.5);
      gfx.fillStyle(biome.parallaxColor, a);

      if (Math.random() > 0.3) {
        // Скала (треугольник через полигон)
        const w = 20 + Math.random() * 60;
        const h = 30 + Math.random() * 80;
        gfx.fillTriangle(x, y, x + w, y, x + w * 0.5, y - h);
      } else {
        // Лавовый поток (горизонтальная полоса с затуханием)
        const w = 40 + Math.random() * 100;
        gfx.fillStyle(0xFF4500, a * 0.5);
        gfx.fillRect(x, y, w, 3 + Math.random() * 3);
      }
    }
  }

  // Storm: облака
  _drawClouds(gfx, width, yStart, spanY, biome, count) {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = yStart + Math.random() * spanY;
      const a = biome.parallaxAlpha * (0.3 + Math.random() * 0.7);
      gfx.fillStyle(biome.parallaxColor, a);

      // Облако из нескольких кругов
      const size = 15 + Math.random() * 40;
      const puffs = 3 + Math.floor(Math.random() * 4);
      for (let p = 0; p < puffs; p++) {
        const ox = (Math.random() - 0.5) * size * 1.5;
        const oy = (Math.random() - 0.5) * size * 0.4;
        const r = size * (0.4 + Math.random() * 0.6);
        gfx.fillCircle(x + ox, y + oy, r);
      }
    }
  }

  // Cosmos: звёзды и аврора
  _drawStars(gfx, width, yStart, spanY, biome, count) {
    // Звёзды — яркие точки
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = yStart + Math.random() * spanY;
      const brightness = 0.05 + Math.random() * 0.15;
      gfx.fillStyle(0xFFFFFF, brightness);
      gfx.fillCircle(x, y, 0.5 + Math.random() * 1.5);
    }

    // Аврора — широкие полупрозрачные полосы
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * width;
      const y = yStart + Math.random() * spanY;
      const w = 80 + Math.random() * 200;
      gfx.fillStyle(biome.parallaxColor, biome.parallaxAlpha * (0.3 + Math.random() * 0.5));
      gfx.fillRect(x - w / 2, y, w, 2 + Math.random() * 4);
    }
  }

  // ===================== ТУМАН =====================

  _createFog(biome) {
    const gfx = this.scene.add.graphics()
      .setDepth(Z.FOG)
      .setScrollFactor(0.7);

    const yStart = GROUND_Y - biome.endHeight * 10;
    const yEnd = GROUND_Y - biome.startHeight * 10;

    for (let y = yStart; y < yEnd; y += 300) {
      gfx.fillStyle(biome.fogColor, biome.fogAlpha);
      gfx.fillRect(-this.W * 2, y, this.W * 6, 80);
    }

    return gfx;
  }

  // ===================== ЧАСТИЦЫ =====================

  _createParticles(biome, index) {
    const particles = [];
    const count = 35;
    const yStart = GROUND_Y - biome.endHeight * 10;
    const yEnd = GROUND_Y - biome.startHeight * 10;

    for (let i = 0; i < count; i++) {
      const gfx = this.scene.add.graphics().setDepth(Z.ASH);

      // Разный scrollFactor для глубины
      const sf = 0.4 + Math.random() * 0.5;
      gfx.setScrollFactor(sf);

      const r = 0.5 + Math.random() * 2;
      const a = biome.particleAlpha * (0.3 + Math.random() * 0.7);
      gfx.fillStyle(biome.particleColor, a);
      gfx.fillCircle(0, 0, r);

      const x = Math.random() * (this.W / sf);
      const y = yStart + Math.random() * (yEnd - yStart);
      gfx.setPosition(x, y);

      particles.push({
        gfx,
        baseX: x,
        baseY: y,
        yStart,
        yEnd,
        sf,
        radius: r,
        // Параметры движения зависят от биома
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: this._particleSpeedY(biome.name),
        driftPhase: Math.random() * Math.PI * 2,
        driftAmp: 10 + Math.random() * 30,
        biomeName: biome.name,
        twinkleSpeed: 0.002 + Math.random() * 0.004, // для cosmos
      });
    }

    return particles;
  }

  _particleSpeedY(biomeName) {
    switch (biomeName) {
      case 'foundry':  return -(0.1 + Math.random() * 0.3);  // искры вверх
      case 'ironworks': return -(0.05 + Math.random() * 0.2); // медленно вверх
      case 'furnace':  return -(0.2 + Math.random() * 0.4);   // горячие угли вверх
      case 'storm':    return 0.3 + Math.random() * 0.5;      // дождь вниз
      case 'cosmos':   return 0;                                // звёзды статичны
      default:         return 0;
    }
  }

  _updateParticles(particles, biome, playerY) {
    const time = this.scene.time.now;

    for (const p of particles) {
      if (p.gfx.alpha === 0) continue; // невидимый — не обновляем

      // Дрейф по X (синусоида)
      const drift = Math.sin(time * 0.001 + p.driftPhase) * p.driftAmp * 0.01;
      p.baseX += p.speedX + drift;
      p.baseY += p.speedY;

      // Космос — мерцание вместо движения
      if (p.biomeName === 'cosmos') {
        const twinkle = 0.5 + 0.5 * Math.sin(time * p.twinkleSpeed + p.driftPhase);
        p.gfx.setAlpha(p.gfx.alpha > 0 ? twinkle * biome.particleAlpha : 0);
      }

      // Перенос частиц в зону видимости
      const spanX = this.W / p.sf;
      if (p.baseX < 0) p.baseX += spanX;
      if (p.baseX > spanX) p.baseX -= spanX;

      const spanY = p.yEnd - p.yStart;
      if (p.baseY < p.yStart) p.baseY += spanY;
      if (p.baseY > p.yEnd) p.baseY -= spanY;

      p.gfx.setPosition(p.baseX, p.baseY);
    }
  }

  // ===================== ЛУНА =====================

  _createMoon() {
    const moonGfx = this.scene.add.graphics().setDepth(Z.MOON);
    const moonY = 300;
    const mx = this.W * 0.72;

    // Холодная стальная луна
    moonGfx.fillStyle(0x445566, 0.12);
    moonGfx.fillCircle(mx, moonY, 70);
    moonGfx.fillStyle(0x556677, 0.08);
    moonGfx.fillCircle(mx - 10, moonY - 5, 62);
    // Кратеры
    moonGfx.fillStyle(0x334455, 0.06);
    moonGfx.fillCircle(mx + 18, moonY - 15, 14);
    moonGfx.fillCircle(mx - 22, moonY + 15, 9);
  }

  // ===================== HELPERS =====================

  _setLayerAlpha(layer, alpha) {
    layer.bgImage.setAlpha(alpha);
    layer.parallaxFar.setAlpha(alpha);
    layer.parallaxNear.setAlpha(alpha);
    layer.fogGfx.setAlpha(alpha);
    for (const p of layer.particles) {
      p.gfx.setAlpha(alpha);
    }
  }
}
