// VÉRTICE: música y efectos de sonido, generados con código (Web Audio API).
// No hay archivos de audio: no pesan nada y no tienen problemas de derechos de autor.
//
// Uso desde script.js:
//   GameAudio.unlock()            -> arranca el audio (debe llamarse dentro de un toque del jugador)
//   GameAudio.setScene("game")    -> cambia el "ambiente" de la música (menu | game | memory | result | form)
//   GameAudio.sfx("correct")      -> efecto corto (correct | wrong | timeout | tick | select | unselect | click | finish)
//   GameAudio.toggleMute()        -> silencia o reactiva todo (se recuerda entre visitas)

const GameAudio = (() => {
  /* ---------- Música: la "partitura" ---------- */
  const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Progresión de 4 compases: C - Am - F - G (alegre, tipo concurso)
  const CHORDS = [
    { bass: 36, arp: [60, 64, 67, 72] },
    { bass: 33, arp: [57, 60, 64, 69] },
    { bass: 41, arp: [53, 57, 60, 65] },
    { bass: 43, arp: [55, 59, 62, 67] }
  ];
  const ARP_PATTERN = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 2, 1];   // 16 pasos por compás
  const LEAD = [                                                          // melodía (0 = silencio)
    [76, 0, 79, 0, 84, 0, 79, 0, 76, 0, 79, 0, 72, 0, 0, 0],
    [76, 0, 81, 0, 84, 0, 81, 0, 76, 0, 72, 0, 69, 0, 0, 0],
    [77, 0, 81, 0, 84, 0, 81, 0, 77, 0, 81, 0, 72, 0, 0, 0],
    [74, 0, 79, 0, 83, 0, 79, 0, 74, 0, 71, 0, 67, 0, 0, 0]
  ];

  // Cada escena enciende o apaga capas y cambia el tempo
  const SCENES = {
    menu:   { bpm: 104, bass: .30, arp: .030, lead: 0,    kick: 0,   clap: 0,   hat: 0 },
    game:   { bpm: 120, bass: .34, arp: .030, lead: .045, kick: .55, clap: .10, hat: .05 },
    memory: { bpm: 134, bass: .34, arp: .034, lead: .045, kick: .55, clap: .10, hat: .07 },
    result: { bpm: 96,  bass: .26, arp: .026, lead: .035, kick: 0,   clap: 0,   hat: 0 },
    form:   { bpm: 92,  bass: .22, arp: .022, lead: 0,    kick: 0,   clap: 0,   hat: 0 }
  };

  /* ---------- Sonidos básicos ---------- */
  function tone(ctx, dest, freq, t, dur, type, gain) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.linearRampToValueAtTime(gain, t + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp).connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noiseHit(ctx, dest, noiseBuffer, t, dur, gain, filterType, filterFreq) {
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    src.buffer = noiseBuffer;
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(amp).connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  function kick(ctx, dest, t, gain) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(amp).connect(dest);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  function makeNoiseBuffer(ctx) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // Programa UN paso (una semicorchea) de la música. Es una función "pura":
  // recibe el contexto de audio, el destino y la escena, así que también sirve para pruebas sin altavoz.
  function scheduleStep(ctx, dest, noiseBuffer, step, t, sceneName) {
    const sc = SCENES[sceneName] || SCENES.menu;
    const stepSec = 60 / sc.bpm / 4;
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;
    const chord = CHORDS[bar];

    if (sc.bass && s % 2 === 0) {
      const note = (s === 6 || s === 14) ? chord.bass + 12 : chord.bass;
      tone(ctx, dest, midiToHz(note), t, stepSec * 1.9, "triangle", sc.bass);
    }
    if (sc.arp) tone(ctx, dest, midiToHz(chord.arp[ARP_PATTERN[s]]), t, stepSec * 0.9, "square", sc.arp);
    const lead = LEAD[bar][s];
    if (sc.lead && lead) tone(ctx, dest, midiToHz(lead), t, stepSec * 1.8, "square", sc.lead);
    if (sc.kick && s % 4 === 0) kick(ctx, dest, t, sc.kick);
    if (sc.clap && (s === 4 || s === 12)) noiseHit(ctx, dest, noiseBuffer, t, 0.09, sc.clap, "bandpass", 1800);
    if (sc.hat && (sceneName === "memory" ? s % 2 === 0 : s % 4 === 2)) {
      noiseHit(ctx, dest, noiseBuffer, t, 0.04, sc.hat, "highpass", 7000);
    }
  }

  /* ---------- Efectos de sonido ---------- */
  const SFX = {
    correct(ctx, d, t)   { [72, 76, 79, 84].forEach((m, i) => tone(ctx, d, midiToHz(m), t + i * 0.07, 0.16, "square", 0.10)); },
    wrong(ctx, d, t)     { tone(ctx, d, 196, t, 0.16, "sawtooth", 0.12); tone(ctx, d, 147, t + 0.13, 0.28, "sawtooth", 0.12); },
    timeout(ctx, d, t)   { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "triangle";
                           o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.45);
                           g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
                           o.connect(g).connect(d); o.start(t); o.stop(t + 0.55); },
    tick(ctx, d, t)      { tone(ctx, d, 1100, t, 0.04, "square", 0.12); },
    select(ctx, d, t)    { tone(ctx, d, 700, t, 0.05, "triangle", 0.16); },
    unselect(ctx, d, t)  { tone(ctx, d, 460, t, 0.05, "triangle", 0.14); },
    click(ctx, d, t)     { tone(ctx, d, 560, t, 0.05, "triangle", 0.14); },
    finish(ctx, d, t)    { [72, 76, 79, 84, 88].forEach((m, i) => tone(ctx, d, midiToHz(m), t + i * 0.09, i === 4 ? 0.55 : 0.14, "square", 0.10)); }
  };

  /* ---------- Estado y control ---------- */
  const STORAGE_KEY = "vertice-muted";
  const MUSIC_LEVEL = 0.8;   // volumen de la música (0 a 1). Súbelo o bájalo aquí.
  const SFX_LEVEL = 3.0;     // volumen de los efectos (acierto, error, tictac...)
  let ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuffer = null;
  let schedulerId = null, nextTime = 0, step = 0, scene = "menu";
  let unlocked = false, muted = false;
  const listeners = [];

  try { muted = localStorage.getItem(STORAGE_KEY) === "1"; } catch (e) { /* sin almacenamiento: seguimos igual */ }

  function buildGraph(context) {
    const out = context.createDynamicsCompressor();       // evita saturación si suenan muchas capas
    out.threshold.value = -14;
    out.ratio.value = 6;
    out.connect(context.destination);
    const masterGain = context.createGain();
    masterGain.connect(out);
    const music = context.createGain(); music.gain.value = MUSIC_LEVEL; music.connect(masterGain);
    const sfx = context.createGain();   sfx.gain.value = SFX_LEVEL; sfx.connect(masterGain);
    return { masterGain, music, sfx };
  }

  function pump() {
    if (!ctx) return;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(ctx, musicBus, noiseBuffer, step, nextTime, scene);
      nextTime += 60 / (SCENES[scene] || SCENES.menu).bpm / 4;
      step = (step + 1) % 64;
    }
  }
  function startScheduler() { if (schedulerId === null) { nextTime = ctx.currentTime + 0.05; schedulerId = setInterval(pump, 25); } }
  function stopScheduler() { clearInterval(schedulerId); schedulerId = null; }

  function applyMute() {
    if (!ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.03);
    if (muted) { stopScheduler(); setTimeout(() => { if (muted && ctx) ctx.suspend(); }, 200); }
    else { ctx.resume(); startScheduler(); }
  }

  function notify() { listeners.forEach(fn => fn(muted)); }

  function unlock() {
    if (!unlocked) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;                                 // navegador sin audio: el juego sigue sin sonido
      ctx = new Ctor();
      const g = buildGraph(ctx);
      master = g.masterGain; musicBus = g.music; sfxBus = g.sfx;
      noiseBuffer = makeNoiseBuffer(ctx);
      unlocked = true;
      master.gain.value = muted ? 0 : 1;
    }
    if (!muted) { ctx.resume(); startScheduler(); }
  }

  function setScene(name) { if (SCENES[name]) scene = name; }

  function sfx(name) {
    if (!unlocked || muted || !SFX[name]) return;
    if (ctx.state === "suspended") ctx.resume();
    SFX[name](ctx, sfxBus, ctx.currentTime + 0.01);
  }

  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem(STORAGE_KEY, muted ? "1" : "0"); } catch (e) { /* ignorar */ }
    if (!unlocked) unlock();                            // el toque en el botón también cuenta como gesto
    else applyMute();
    notify();
    return muted;
  }

  // Si el jugador cambia de app o apaga la pantalla, el audio se detiene.
  document.addEventListener("visibilitychange", () => {
    if (!unlocked) return;
    if (document.hidden) { stopScheduler(); ctx.suspend(); }
    else if (!muted) { ctx.resume(); startScheduler(); }
  });

  return {
    unlock, setScene, sfx, toggleMute,
    isMuted: () => muted,
    onMuteChange: (fn) => listeners.push(fn),
    // Solo para pruebas automáticas (render sin altavoz)
    _test: { scheduleStep, SFX, makeNoiseBuffer, SCENES, MUSIC_LEVEL, SFX_LEVEL }
  };
})();
