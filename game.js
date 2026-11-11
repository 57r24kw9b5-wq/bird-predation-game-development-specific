/**
 * Bird Predation Game
 * Cross-Platform (Smartphones & Desktop PCs)
 * HTML5 Canvas 2D Game Engine
 */

'use strict';

// ============================================================================
// CONFIGURATION & TUNING PARAMETERS
// All parameters are easily adjustable here
// ============================================================================
const CONFIG = {
  // Virtual Internal Coordinate System (Independent of screen resolution)
  virtual: {
    width: 720,
    height: 1280,
    aspectRatio: 9 / 16
  },

  // Target Goal
  targetScore: 20,

  // Bird Settings
  bird: {
    startX: 180,              // Fixed horizontal position (near left-center)
    startY: 640,              // Initial vertical center
    width: 135,               // Display width in virtual pixels (preserves 1600:1132 aspect ratio)
    height: 95,               // Display height in virtual pixels
    flapAcceleration: 2400,   // Upward acceleration while ascending (px/s^2)
    gravity: 1500,            // Downward acceleration under gravity (px/s^2)
    maxUpVelocity: -520,      // Maximum upward speed (negative px/s)
    maxDownVelocity: 650,     // Maximum downward speed (positive px/s)
    rotationSpeed: 10,        // Speed of rotation interpolation (lerp factor)
    minRotation: -0.42,       // Max upward tilt (~ -24 deg)
    maxRotation: 1.15,        // Max downward dive tilt (~ +66 deg)
    hitboxRadius: 32,         // Circular collision radius
    hitboxOffsetX: 8,         // Inset hitbox center X offset
    hitboxOffsetY: 0,         // Inset hitbox center Y offset
    flapFps: 11,              // Animation rate during active ascent (~11 fps, within 8-12 fps)
    glideFps: 9               // Animation rate during descent/glide (~9 fps, within 8-12 fps)
  },

  // Insect Settings
  insects: {
    width: 75,                // Insect visual width
    height: 55,               // Insect visual height
    hitboxRadius: 22,         // Collision radius
    minY: 100,                // Minimum spawn vertical coordinate
    maxY: 1180,               // Maximum spawn vertical coordinate
    minSpeed: 190,            // Minimum horizontal speed (px/s)
    maxSpeed: 320,            // Maximum horizontal speed (px/s)
    minInterval: 1.0,         // Minimum seconds between spawns
    maxInterval: 2.1,         // Maximum seconds between spawns
    hoverAmplitude: 16,       // Sine wave hovering height
    hoverFrequency: 3.5,      // Hovering oscillation speed
    minVerticalGap: 95        // Minimum vertical gap between newly spawned insects
  },

  // Cloud Decorations
  clouds: {
    count: 4,
    minSpeed: 25,
    maxSpeed: 60,
    minScale: 0.65,
    maxScale: 1.15
  },

  // Assets Paths
  assets: {
    video: 'assets/title.mp4',
    bird: 'assets/bird.png',
    birdFrames: [
      'assets/bird_fly_1.png',
      'assets/bird_fly_2.png',
      'assets/bird_fly_3.png'
    ],
    insect: 'assets/insect.png',
    background: 'assets/background.png',
    cloud: 'assets/cloud.png'
  }
};

// ============================================================================
// GAME STATE ENUM
// ============================================================================
const GameState = {
  TITLE: 'TITLE',
  PLAYING: 'PLAYING',
  CLEAR: 'CLEAR',
  GAME_OVER: 'GAME_OVER'
};

// ============================================================================
// AUDIO SYNTHESIZER (Web Audio API - No external sound files required)
// ============================================================================
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initialized = true;
      }
    } catch (e) {
      console.warn('Web Audio not available:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playFlap() {
    if (this.muted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, t);
      filter.frequency.exponentialRampToValueAtTime(150, t + 0.12);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.12);
    } catch (e) {}
  }

  playPredation() {
    if (this.muted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // High bright crunch & ding
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(660, t);
      osc1.frequency.exponentialRampToValueAtTime(1320, t + 0.14);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, t);
      osc2.frequency.exponentialRampToValueAtTime(1760, t + 0.14);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.18);
      osc2.stop(t + 0.18);
    } catch (e) {}
  }

  playGameOver() {
    if (this.muted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.55);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.55);
    } catch (e) {}
  }

  playGameClear() {
    if (this.muted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // Fanfare: C5, E5, G5, C6 arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const noteStart = t + idx * 0.1;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.28, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.3);
      });
    } catch (e) {}
  }
}

// ============================================================================
// ASSET MANAGER (With robust fallback placeholder shapes)
// ============================================================================
class AssetManager {
  constructor() {
    this.images = {};
    this.status = {};
  }

  loadImage(name, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        this.images[name] = img;
        this.status[name] = true;
        resolve(true);
      };
      img.onerror = () => {
        console.warn(`[AssetManager] Asset failed to load: ${src}. Using procedural fallback.`);
        this.images[name] = null;
        this.status[name] = false;
        resolve(false);
      };
    });
  }

  async loadAll() {
    const promises = [
      this.loadImage('bird_fly_1', CONFIG.assets.birdFrames[0]),
      this.loadImage('bird_fly_2', CONFIG.assets.birdFrames[1]),
      this.loadImage('bird_fly_3', CONFIG.assets.birdFrames[2]),
      this.loadImage('bird', CONFIG.assets.bird),
      this.loadImage('insect', CONFIG.assets.insect),
      this.loadImage('background', CONFIG.assets.background),
      this.loadImage('cloud', CONFIG.assets.cloud)
    ];
    await Promise.all(promises);
  }

  isAvailable(name) {
    return this.status[name] === true && this.images[name] !== null;
  }

  hasBirdFrames() {
    return this.isAvailable('bird_fly_1') &&
           this.isAvailable('bird_fly_2') &&
           this.isAvailable('bird_fly_3');
  }

  getBirdFrame(index) {
    const frameNames = ['bird_fly_1', 'bird_fly_2', 'bird_fly_3'];
    const name = frameNames[index] || 'bird_fly_2';
    return this.images[name] || this.images['bird'];
  }

  getImage(name) {
    return this.images[name];
  }
}

// ============================================================================
// PARTICLE SYSTEM (Predation effects and celebration sparkles)
// ============================================================================
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.indicators = [];
  }

  reset() {
    this.particles = [];
    this.indicators = [];
  }

  spawnPredationBurst(x, y) {
    // 1. Particle burst
    const count = 22;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 120 + Math.random() * 260;
      const colors = ['#ffe066', '#00ffcc', '#ff9900', '#ffffff', '#70ffb0'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3.5 + Math.random() * 4.5,
        alpha: 1,
        color: color,
        gravity: 300,
        decay: 1.8 + Math.random() * 1.2
      });
    }

    // 2. Shockwave ring
    this.particles.push({
      x: x,
      y: y,
      isRing: true,
      radius: 10,
      maxRadius: 65,
      alpha: 1,
      color: 'rgba(255, 230, 100, 0.85)',
      decay: 2.5
    });

    // 3. Floating Score Indicator (+1)
    this.indicators.push({
      text: '+1',
      x: x,
      y: y - 10,
      vy: -110,
      alpha: 1,
      decay: 1.4
    });
  }

  update(dt) {
    // Update burst particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      if (p.isRing) {
        p.radius += (p.maxRadius - p.radius) * 12 * dt;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.gravity * dt;
      }
    }

    // Update floating +1 text
    for (let i = this.indicators.length - 1; i >= 0; i--) {
      const ind = this.indicators[i];
      ind.alpha -= ind.decay * dt;
      ind.y += ind.vy * dt;
      if (ind.alpha <= 0) {
        this.indicators.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      if (p.isRing) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw floating indicators
    for (const ind of this.indicators) {
      ctx.globalAlpha = Math.max(0, ind.alpha);
      ctx.font = '900 32px ui-monospace, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(ind.text, ind.x, ind.y);
      ctx.fillText(ind.text, ind.x, ind.y);
    }
    ctx.restore();
  }
}

// ============================================================================
// MAIN GAME CONTROLLER
// ============================================================================
class BirdPredationGame {
  constructor() {
    // DOM Elements
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.container = document.getElementById('game-container');
    this.hud = document.getElementById('hud');
    this.scoreText = document.getElementById('score-text');
    this.soundBtn = document.getElementById('sound-btn');
    this.soundIcon = document.getElementById('sound-icon');
    this.titleScreen = document.getElementById('title-screen');
    this.titleVideo = document.getElementById('title-video');
    this.startBtn = document.getElementById('start-btn');
    this.skipBtn = document.getElementById('skip-btn');
    this.gameOverScreen = document.getElementById('game-over-screen');
    this.gameClearScreen = document.getElementById('game-clear-screen');
    this.retryBtnOver = document.getElementById('retry-btn-over');
    this.retryBtnClear = document.getElementById('retry-btn-clear');
    this.gameOverScore = document.getElementById('game-over-score');
    this.controlsHint = document.getElementById('controls-hint');

    // Modules
    this.sounds = new SoundManager();
    this.assets = new AssetManager();
    this.particles = new ParticleSystem();

    // Game State
    this.state = GameState.TITLE;
    this.score = 0;
    this.isAscending = false;
    this.hasInteracted = false;
    this.controlsHintTimeout = null;

    // Bird Entity
    this.bird = {
      x: CONFIG.bird.startX,
      y: CONFIG.bird.startY,
      width: CONFIG.bird.width,
      height: CONFIG.bird.height,
      vy: 0,
      rotation: 0,
      wingTimer: 0,
      animTimer: 0,
      frameIndex: 1
    };

    // Insects Entity Pool
    this.insects = [];
    this.nextSpawnTimer = 0.8;

    // Clouds Pool
    this.clouds = [];
    this.initClouds();

    // Time Tracking
    this.lastTime = 0;
    this.gameTime = 0;

    // Viewport & Scale
    this.scale = 1;
    this.dpr = 1;

    // Initialize systems
    this.bindEvents();
    this.handleResize();
    this.initTitleVideo();
    this.assets.loadAll();

    // Start Animation Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  // ==========================================================================
  // CLOUDS SYSTEM (Parallax decorative scenery)
  // ==========================================================================
  initClouds() {
    this.clouds = [];
    const count = CONFIG.clouds.count;
    for (let i = 0; i < count; i++) {
      this.clouds.push({
        x: Math.random() * CONFIG.virtual.width,
        y: 80 + Math.random() * 500,
        speed: CONFIG.clouds.minSpeed + Math.random() * (CONFIG.clouds.maxSpeed - CONFIG.clouds.minSpeed),
        scale: CONFIG.clouds.minScale + Math.random() * (CONFIG.clouds.maxScale - CONFIG.clouds.minScale),
        alpha: 0.55 + Math.random() * 0.35
      });
    }
  }

  updateClouds(dt) {
    for (const c of this.clouds) {
      c.x -= c.speed * dt;
      // Loop cloud to the right when offscreen
      if (c.x < -350 * c.scale) {
        c.x = CONFIG.virtual.width + 100;
        c.y = 60 + Math.random() * 520;
        c.speed = CONFIG.clouds.minSpeed + Math.random() * (CONFIG.clouds.maxSpeed - CONFIG.clouds.minSpeed);
        c.scale = CONFIG.clouds.minScale + Math.random() * (CONFIG.clouds.maxScale - CONFIG.clouds.minScale);
      }
    }
  }

  // ==========================================================================
  // TITLE VIDEO & OPENING SCREEN
  // ==========================================================================
  initTitleVideo() {
    const video = this.titleVideo;
    let buttonRevealed = false;

    const revealStartButton = () => {
      if (buttonRevealed) return;
      buttonRevealed = true;
      this.startBtn.classList.remove('hidden');
      if (this.skipBtn) {
        this.skipBtn.style.display = 'none';
      }
    };

    // Video end event
    video.addEventListener('ended', revealStartButton);

    // Error or stall fallbacks (spec requires START button if video fails)
    video.addEventListener('error', revealStartButton);
    video.addEventListener('stalled', revealStartButton);

    // Skip button
    this.skipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      try { video.pause(); } catch (err) {}
      revealStartButton();
    });

    // Start video playback muted & playsinline
    video.muted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Video autoplay inhibited or failed:', err);
        // Fallback: show START button immediately so player is never blocked
        revealStartButton();
      });
    }

    // Backup safety timeout: in case video triggers no events within 4.5s
    setTimeout(revealStartButton, 4500);
  }

  // ==========================================================================
  // INPUT HANDLING (Mobile Touch, Desktop Mouse & Keyboard)
  // ==========================================================================
  bindEvents() {
    // Window Resize & Orientation Change
    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('orientationchange', () => this.handleResize());

    // Context Menu Prevention (Right-click block as per spec)
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // 1. Pointer Events on Game Container (Unified Touch & Mouse)
    const onAscentStart = (e) => {
      if (this.state !== GameState.PLAYING) return;
      e.preventDefault();
      this.isAscending = true;
      this.sounds.playFlap();
      this.dismissHint();
    };

    const onAscentEnd = (e) => {
      if (this.state !== GameState.PLAYING) return;
      this.isAscending = false;
    };

    this.container.addEventListener('pointerdown', onAscentStart, { passive: false });
    this.container.addEventListener('pointerup', onAscentEnd);
    this.container.addEventListener('pointercancel', onAscentEnd);

    // Anti-Stuck Input Protection (Window-level release handlers)
    window.addEventListener('mouseup', () => { this.isAscending = false; });
    window.addEventListener('pointerup', () => { this.isAscending = false; });
    window.addEventListener('blur', () => { this.isAscending = false; });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.isAscending = false;
    });

    // 2. Keyboard Controls (Space key for Desktop)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scrolling
        if (this.state === GameState.PLAYING && !this.isAscending) {
          this.isAscending = true;
          this.sounds.playFlap();
          this.dismissHint();
        }
      }
    }, { passive: false });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.state === GameState.PLAYING) {
          this.isAscending = false;
        }
      }
    }, { passive: false });

    // 3. UI Buttons
    const stopPropagationAll = (el) => {
      if (!el) return;
      ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(evt => {
        el.addEventListener(evt, (e) => e.stopPropagation());
      });
    };

    [this.startBtn, this.skipBtn, this.retryBtnOver, this.retryBtnClear, this.soundBtn].forEach(stopPropagationAll);

    this.startBtn.addEventListener('click', (e) => {
      this.startGame();
    });

    this.retryBtnOver.addEventListener('click', (e) => {
      this.restartGame();
    });

    this.retryBtnClear.addEventListener('click', (e) => {
      this.restartGame();
    });

    // Sound toggle button
    this.soundBtn.addEventListener('click', (e) => {
      this.sounds.init();
      const isMuted = this.sounds.toggleMute();
      this.soundIcon.textContent = isMuted ? '🔇' : '🔊';
    });
  }

  dismissHint() {
    if (this.controlsHint && !this.controlsHint.classList.contains('hidden')) {
      this.controlsHint.classList.add('hidden');
    }
  }

  showHint() {
    if (!this.controlsHint) return;
    this.controlsHint.classList.remove('hidden');
    clearTimeout(this.controlsHintTimeout);
    this.controlsHintTimeout = setTimeout(() => {
      this.dismissHint();
    }, 3800);
  }

  // ==========================================================================
  // RESPONSIVE RESIZE & HIGH-DPI CANVAS SCALING
  // ==========================================================================
  handleResize() {
    const rect = this.container.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5); // Cap DPR at 2.5 for balanced performance

    // Set canvas internal pixel dimensions
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);

    // Virtual coordinate scale factor
    this.scale = rect.width / CONFIG.virtual.width;

    // Reset 2D context transform to virtual coordinate space
    this.ctx.setTransform(
      this.dpr * this.scale,
      0,
      0,
      this.dpr * this.scale,
      0,
      0
    );
  }

  // ==========================================================================
  // GAME LIFECYCLE & STATE TRANSITIONS
  // ==========================================================================
  startGame() {
    this.sounds.init();
    this.sounds.resume();

    // Hide opening screen
    this.titleScreen.classList.add('hidden');
    try {
      this.titleVideo.pause();
    } catch (e) {}

    // Show HUD
    this.hud.classList.remove('hidden');
    this.showHint();

    // Start playing
    this.resetGameplay();
    this.state = GameState.PLAYING;
  }

  restartGame() {
    this.sounds.init();
    this.sounds.resume();

    // Hide modals
    this.gameOverScreen.classList.add('hidden');
    this.gameClearScreen.classList.add('hidden');

    // Reset & restart directly to PLAYING (do NOT replay video)
    this.resetGameplay();
    this.state = GameState.PLAYING;
    this.showHint();
  }

  resetGameplay() {
    // 1. Reset Predation count
    this.score = 0;
    this.updateScoreDisplay();

    // 2. Reset Bird position, velocity, and rotation
    this.bird.x = CONFIG.bird.startX;
    this.bird.y = CONFIG.bird.startY;
    this.bird.vy = 0;
    this.bird.rotation = 0;
    this.bird.wingTimer = 0;
    this.bird.animTimer = 0;
    this.bird.frameIndex = 1;

    // 3. Reset Insects and spawn timer
    this.insects = [];
    this.nextSpawnTimer = 0.8;

    // 4. Reset Particle effects & inputs
    this.particles.reset();
    this.isAscending = false;
  }

  updateScoreDisplay() {
    const formatted = String(this.score).padStart(2, '0');
    const target = String(CONFIG.targetScore).padStart(2, '0');
    this.scoreText.textContent = `INSECTS : ${formatted} / ${target}`;
  }

  triggerGameOver(reason) {
    if (this.state !== GameState.PLAYING) return;
    this.state = GameState.GAME_OVER;
    this.isAscending = false;

    // Preserves final score
    const formatted = String(this.score).padStart(2, '0');
    this.gameOverScore.textContent = `INSECTS : ${formatted} / 20`;
    this.sounds.playGameOver();

    // Display GAME OVER screen
    setTimeout(() => {
      this.gameOverScreen.classList.remove('hidden');
    }, 450);
  }

  triggerGameClear() {
    if (this.state !== GameState.PLAYING) return;
    this.state = GameState.CLEAR;
    this.isAscending = false;

    this.sounds.playGameClear();

    // Display GAME CLEAR screen
    setTimeout(() => {
      this.gameClearScreen.classList.remove('hidden');
    }, 350);
  }

  // ==========================================================================
  // INSECT SPAWNING & UPDATE
  // ==========================================================================
  spawnInsect() {
    const conf = CONFIG.insects;
    const spawnX = CONFIG.virtual.width + 60;

    // Select vertical spawn position avoiding unnatural overlap
    let bestY = conf.minY + Math.random() * (conf.maxY - conf.minY);
    let attempts = 0;
    const maxAttempts = 8;

    while (attempts < maxAttempts) {
      let overlap = false;
      for (const other of this.insects) {
        if (other.x > CONFIG.virtual.width - 150) {
          if (Math.abs(bestY - other.baseY) < conf.minVerticalGap) {
            overlap = true;
            break;
          }
        }
      }
      if (!overlap) break;
      bestY = conf.minY + Math.random() * (conf.maxY - conf.minY);
      attempts++;
    }

    const speed = conf.minSpeed + Math.random() * (conf.maxSpeed - conf.minSpeed);

    this.insects.push({
      x: spawnX,
      y: bestY,
      baseY: bestY,
      width: conf.width,
      height: conf.height,
      speed: speed,
      phase: Math.random() * Math.PI * 2,
      wingTimer: 0
    });
  }

  updateInsects(dt) {
    const conf = CONFIG.insects;

    // Spawn timer management
    this.nextSpawnTimer -= dt;
    if (this.nextSpawnTimer <= 0) {
      this.spawnInsect();
      // Schedule next spawn with randomized interval
      this.nextSpawnTimer = conf.minInterval + Math.random() * (conf.maxInterval - conf.minInterval);
    }

    // Move insects horizontally left and apply organic hovering
    for (let i = this.insects.length - 1; i >= 0; i--) {
      const ins = this.insects[i];
      ins.x -= ins.speed * dt;
      ins.wingTimer += dt * 25;
      ins.y = ins.baseY + Math.sin(this.gameTime * conf.hoverFrequency + ins.phase) * conf.hoverAmplitude;

      // Remove off-screen insects
      if (ins.x < -80) {
        this.insects.splice(i, 1);
      }
    }
  }

  // ==========================================================================
  // PHYSICS & COLLISION DETECTION
  // ==========================================================================
  updateBird(dt) {
    const birdConf = CONFIG.bird;

    // Apply upward force when active, gravity when released
    if (this.isAscending) {
      this.bird.vy -= birdConf.flapAcceleration * dt;
      if (this.bird.vy < birdConf.maxUpVelocity) {
        this.bird.vy = birdConf.maxUpVelocity;
      }
      this.bird.wingTimer += dt * 18;
    } else {
      this.bird.vy += birdConf.gravity * dt;
      if (this.bird.vy > birdConf.maxDownVelocity) {
        this.bird.vy = birdConf.maxDownVelocity;
      }
      this.bird.wingTimer += dt * 6;
    }

    // Apply vertical displacement
    this.bird.y += this.bird.vy * dt;

    // Smooth rotation interpolation
    // Ascent -> tilts upward; Descent -> tilts downward
    let targetRotation = 0;
    if (this.bird.vy < 0) {
      const ratio = this.bird.vy / birdConf.maxUpVelocity; // 0 to 1
      targetRotation = birdConf.minRotation * ratio;
    } else {
      const ratio = this.bird.vy / birdConf.maxDownVelocity; // 0 to 1
      targetRotation = birdConf.maxRotation * ratio;
    }

    const rotLerp = 1 - Math.exp(-birdConf.rotationSpeed * dt);
    this.bird.rotation += (targetRotation - this.bird.rotation) * rotLerp;
  }

  checkCollisions() {
    const birdHitX = this.bird.x + CONFIG.bird.hitboxOffsetX;
    const birdHitY = this.bird.y + CONFIG.bird.hitboxOffsetY;
    const birdRadius = CONFIG.bird.hitboxRadius;
    const insectRadius = CONFIG.insects.hitboxRadius;
    const hitDistSq = (birdRadius + insectRadius) * (birdRadius + insectRadius);

    for (let i = this.insects.length - 1; i >= 0; i--) {
      const ins = this.insects[i];
      const dx = birdHitX - ins.x;
      const dy = birdHitY - ins.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < hitDistSq) {
        // Predation success!
        const hitX = ins.x;
        const hitY = ins.y;

        // Remove insect
        this.insects.splice(i, 1);

        // Increment predation count
        this.score++;
        this.updateScoreDisplay();

        // Predation effect & sound
        this.particles.spawnPredationBurst(hitX, hitY);
        this.sounds.playPredation();

        // Priority rule check: Check Clear immediately
        if (this.score >= CONFIG.targetScore) {
          this.triggerGameClear();
          return true; // Predation triggered clear
        }
      }
    }
    return false;
  }

  checkBoundaries() {
    // The game ends when the bird completely crosses either top or bottom boundary
    const halfH = this.bird.height / 2;
    const topOut = (this.bird.y + halfH) < 0;
    const bottomOut = (this.bird.y - halfH) > CONFIG.virtual.height;

    if (topOut || bottomOut) {
      this.triggerGameOver(topOut ? 'Flew above screen!' : 'Fell below screen!');
    }
  }

  // ==========================================================================
  // MAIN GAME LOOP (requestAnimationFrame)
  // ==========================================================================
  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    let dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // Clamp dt to avoid huge jumps on tab switch / window pause
    if (dt > 0.1) dt = 0.1;

    this.gameTime += dt;

    // Update Phase
    if (this.state === GameState.PLAYING) {
      this.updateBird(dt);
      this.updateInsects(dt);
      this.updateClouds(dt);
      this.particles.update(dt);

      // Collision detection every frame
      const cleared = this.checkCollisions();

      // Boundary check (Priority rule: if cleared on same frame, clear takes priority!)
      if (!cleared && this.state === GameState.PLAYING) {
        this.checkBoundaries();
      }
    } else {
      // Passive animations when not actively playing (clouds & ambient particles continue)
      this.updateClouds(dt);
      this.particles.update(dt);
    }

    // Render Phase
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  // ==========================================================================
  // RENDERING ENGINE
  // ==========================================================================
  render() {
    const ctx = this.ctx;
    const vw = CONFIG.virtual.width;
    const vh = CONFIG.virtual.height;

    ctx.clearRect(0, 0, vw, vh);

    // 1. Draw Background
    this.drawBackground(ctx, vw, vh);

    // 2. Draw Clouds
    this.drawClouds(ctx);

    // 3. Draw Insects
    this.drawInsects(ctx);

    // 4. Draw Bird
    this.drawBird(ctx);

    // 5. Draw Predation Effects & Particle overlays
    this.particles.draw(ctx);
  }

  // Background Rendering (Image or Procedural Fallback)
  drawBackground(ctx, w, h) {
    if (this.assets.isAvailable('background')) {
      ctx.drawImage(this.assets.getImage('background'), 0, 0, w, h);
    } else {
      // Procedural Fallback Sky & Scenery
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#0a2342');
      skyGrad.addColorStop(0.4, '#1e4873');
      skyGrad.addColorStop(0.7, '#e89e5a');
      skyGrad.addColorStop(1, '#2c1e38');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Sun
      ctx.fillStyle = 'rgba(255, 235, 170, 0.4)';
      ctx.beginPath();
      ctx.arc(540, 720, 180, 0, Math.PI * 2);
      ctx.fill();

      // Mountains
      ctx.fillStyle = 'rgba(48, 28, 56, 0.7)';
      ctx.beginPath();
      ctx.moveTo(0, 930);
      ctx.lineTo(150, 870);
      ctx.lineTo(350, 930);
      ctx.lineTo(550, 860);
      ctx.lineTo(w, 910);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();
    }
  }

  // Cloud Rendering (Image or Procedural Fallback)
  drawClouds(ctx) {
    const hasCloudImg = this.assets.isAvailable('cloud');
    const cloudImg = this.assets.getImage('cloud');

    for (const c of this.clouds) {
      ctx.save();
      ctx.globalAlpha = c.alpha;
      const cw = 320 * c.scale;
      const ch = 180 * c.scale;

      if (hasCloudImg) {
        ctx.drawImage(cloudImg, c.x, c.y, cw, ch);
      } else {
        // Procedural cloud shape
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(c.x + cw * 0.5, c.y + ch * 0.5, ch * 0.35, 0, Math.PI * 2);
        ctx.arc(c.x + cw * 0.35, c.y + ch * 0.55, ch * 0.28, 0, Math.PI * 2);
        ctx.arc(c.x + cw * 0.65, c.y + ch * 0.55, ch * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Insect Rendering (Image or Procedural Fallback)
  drawInsects(ctx) {
    const hasInsectImg = this.assets.isAvailable('insect');
    const insectImg = this.assets.getImage('insect');

    for (const ins of this.insects) {
      ctx.save();
      ctx.translate(ins.x, ins.y);

      // Subtle body hover oscillation
      const flapTilt = Math.sin(ins.wingTimer) * 0.12;
      ctx.rotate(flapTilt);

      if (hasInsectImg) {
        ctx.drawImage(
          insectImg,
          -ins.width / 2,
          -ins.height / 2,
          ins.width,
          ins.height
        );
      } else {
        // Procedural Dragonfly/Bug Fallback
        // Wings
        ctx.fillStyle = 'rgba(120, 255, 230, 0.7)';
        ctx.beginPath();
        ctx.ellipse(0, -18 + Math.sin(ins.wingTimer) * 5, 26, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = '#00cc66';
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#ff2b66';
        ctx.beginPath();
        ctx.arc(-14, -2, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // Bird Rendering (Image or Procedural Fallback)
  drawBird(ctx) {
    ctx.save();
    ctx.translate(this.bird.x, this.bird.y);
    ctx.rotate(this.bird.rotation);

    if (this.assets.isAvailable('bird')) {
      const birdImg = this.assets.getImage('bird');
      // Subtle wing flapping oscillation
      const flapScaleY = this.isAscending ? (1 + Math.sin(this.bird.wingTimer) * 0.15) : 1;
      ctx.scale(1, flapScaleY);

      ctx.drawImage(
        birdImg,
        -this.bird.width / 2,
        -this.bird.height / 2,
        this.bird.width,
        this.bird.height
      );
    } else {
      // Procedural Falcon/Raptor Fallback
      ctx.fillStyle = '#c97a32';
      ctx.beginPath();
      ctx.ellipse(0, 0, 42, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wing
      const wingFlap = Math.sin(this.bird.wingTimer) * 15;
      ctx.fillStyle = '#8e4b20';
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(15, -35 - wingFlap);
      ctx.lineTo(25, 0);
      ctx.closePath();
      ctx.fill();

      // Golden Beak
      ctx.fillStyle = '#ffb300';
      ctx.beginPath();
      ctx.moveTo(38, -6);
      ctx.lineTo(54, 0);
      ctx.lineTo(38, 8);
      ctx.closePath();
      ctx.fill();

      // Eye
      ctx.fillStyle = '#ffd152';
      ctx.beginPath();
      ctx.arc(28, -6, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(29, -6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ============================================================================
// BOOTSTRAP WHEN DOM IS READY
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
  window.game = new BirdPredationGame();
});
