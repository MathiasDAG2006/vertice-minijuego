// VÉRTICE: La aventura de los 13 números
// Versión 2 (etapa 1): reglas corregidas. El formulario aún NO envía datos a ningún servidor.

/* ============================================================
   1. CONTENIDO DEL JUEGO
   ============================================================ */

const questions = [
  {
    category: "SUPERVIVENCIA UNIVERSITARIA",
    title: "Tienes 120 minutos para estudiar. Pierdes 14 buscando tus audífonos, 24 viendo memes y 23 intentando entender una diapositiva. ¿Cuánto tiempo te queda?",
    options: [49, 59, 66, 82],
    answer: 59,
    feedback: "¡Correcto! 59 minutos… que gastarás viendo TikToks."
  },
  {
    category: "CAFÉ Y FE",
    title: "Compran 5 cafés para sobrevivir al trabajo grupal y luego consiguen 9 más porque alguien dijo: «hoy sí avanzamos». ¿Cuántos cafés hay en total?",
    options: [14, 24, 44, 70],
    answer: 14,
    feedback: "¡14 cafés! Y quién sabe cuántos avances."
  },
  {
    category: "MODO INGENIERÍA",
    title: "En el laboratorio hay 7 routers con 5 antenas cada uno. ¿Cuántas antenas hay en total si nadie se lleva ninguna?",
    options: [24, 35, 38, 44],
    answer: 35,
    feedback: "¡35 antenas! Ahora solo falta que el Wi-Fi llegue al pabellón de al lado."
  },
  {
    category: "TRABAJO EN EQUIPO",
    title: "Hay 7 grupos con 7 estudiantes cada uno. Todos pusieron su nombre en la portada, pero nadie hizo las diapositivas. ¿Cuántos estudiantes hay?",
    options: [2, 49, 70, 82],
    answer: 49,
    feedback: "49 estudiantes y 0 diapositivas. Trabajo en equipo en su máxima expresión."
  },
  {
    category: "PROCRASTINACIÓN PREMIUM",
    title: "Tienes 3 cursos. En cada uno debes entregar 25 ejercicios. Has entregado 0 porque llevas dos horas organizando tu Notion. ¿Cuántos ejercicios tienes pendientes?",
    options: [5, 59, 66, 75],
    answer: 75,
    feedback: "¡75 ejercicios pendientes! Pero tu Notion tiene una portada espectacular."
  },
  {
    category: "ECONOMÍA DE ESTUDIANTE",
    title: "Tu grupo pide 3 menús de S/ 12 y una gaseosa de S/ 8 «para compartir» (nadie compartió). ¿Cuánto pagaron en total?",
    options: [38, 44, 49, 66],
    answer: 44,
    feedback: "¡S/ 44! Y la gaseosa terminó siendo solo de quien llegó primero."
  },
  {
    category: "LABORATORIO DE REDES",
    title: "El laboratorio compró 3 cajas con 22 cables de red cada una, y aun así falta justo el cable que necesitas. ¿Cuántos cables hay en total?",
    options: [38, 66, 70, 82],
    answer: 66,
    feedback: "¡66 cables! Y ninguno es el que necesitabas. Clásico."
  },
  {
    category: "MODO PARCIAL",
    title: "Un parcial dura 82 minutos. Ya pasaron 44 y sigues en la pregunta 1. ¿Cuántos minutos te quedan?",
    options: [35, 38, 44, 70],
    answer: 38,
    feedback: "¡38 minutos! Suficiente para leer la pregunta 2 con mucha calma."
  }
];

// Los 13 números a recordar son EXACTAMENTE los que aparecen como respuestas (A, B, C, D).
// Los 7 distractores nunca aparecen como respuesta ni en los enunciados.
const targetNumbers = [2, 5, 14, 24, 35, 38, 44, 49, 59, 66, 70, 75, 82];
const distractors = [11, 16, 18, 27, 41, 53, 88];

/* ============================================================
   2. REGLAS (todo lo que se puede ajustar está aquí arriba)
   ============================================================ */

const QUESTION_SECONDS = 15;
const MEMORY_SECONDS = 20;
const QUESTIONS_MAX_POINTS = 40;                                  // las preguntas valen hasta 40 puntos
const POINTS_PER_QUESTION = QUESTIONS_MAX_POINTS / questions.length; // 8 preguntas -> 5 puntos cada una
const MEMORY_MAX_POINTS = 100 - QUESTIONS_MAX_POINTS;             // la memoria vale hasta 60 (el total siempre es 100)
const MISS_PENALTY = 2;           // cada trampa resta 2 aciertos
const INPUT_LOCK_MS = 450;        // ignora toques justo al cambiar de pregunta (evita doble toque)
const TRANSITION_MS = 150;        // duración de la salida suave entre preguntas

/* ============================================================
   3. UTILIDADES
   ============================================================ */

const $ = (id) => document.getElementById(id);

// Si audio.js no cargó, el juego sigue funcionando sin sonido.
const Sound = typeof GameAudio !== "undefined" ? GameAudio : {
  unlock() {}, setScene() {}, sfx() {}, toggleMute() { return false; }, isMuted: () => false, onMuteChange() {}
};
const SCENE_BY_SCREEN = {
  "screen-start": "menu", "screen-warning": "menu", "screen-question": "game",
  "screen-memory": "memory", "screen-result": "result", "screen-contact": "form", "screen-thanks": "form"
};
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Reinicia una animación CSS: quita la clase, fuerza al navegador a "olvidarla" y la vuelve a poner.
function replay(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}
const screens = [...document.querySelectorAll(".screen")];

// Barajado correcto (Fisher-Yates): todas las combinaciones son igual de probables.
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function showScreen(id) {
  screens.forEach(screen => screen.classList.toggle("active", screen.id === id));
  document.body.dataset.screen = id;
  Sound.setScene(SCENE_BY_SCREEN[id]);
  window.scrollTo(0, 0);
  // Mueve el foco al título para que lectores de pantalla anuncien la nueva pantalla.
  const heading = $(id).querySelector("h1, h2");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
}

// Cuenta regresiva basada en el reloj (Date.now) y no en "contar ticks":
// sigue siendo exacta aunque el navegador retrase los intervalos.
// Se pausa sola si el jugador cambia de app (ver "visibilitychange" más abajo).
function createCountdown(seconds, onTick, onEnd) {
  const totalMs = seconds * 1000;
  let endAt = 0, intervalId = null, pausedLeft = null;

  function tick() {
    const left = Math.max(0, endAt - Date.now());
    onTick(left, totalMs);
    if (left <= 0) { stop(); onEnd(); }
  }
  function start() { stop(); endAt = Date.now() + totalMs; pausedLeft = null; intervalId = setInterval(tick, 200); tick(); }
  function stop() { clearInterval(intervalId); intervalId = null; }
  function pause() { if (intervalId !== null) { pausedLeft = endAt - Date.now(); stop(); } }
  function resume() { if (pausedLeft !== null) { endAt = Date.now() + pausedLeft; pausedLeft = null; intervalId = setInterval(tick, 200); } }
  return { start, stop, pause, resume };
}

/* ============================================================
   4. ESTADO DE LA PARTIDA
   ============================================================ */

let phase = "idle";            // idle | question-open | question-locked | memory-open | done
let currentQuestion = 0;
let questionScore = 0;
let selectedNumbers = new Set();
let questionShownAt = 0;
let lastTickSecond = -1;
let questionCountdown = null;
let memoryCountdown = null;

function tickSound(secondsLeft) {
  if (secondsLeft === lastTickSecond) return;
  lastTickSecond = secondsLeft;
  if (secondsLeft <= 5 && secondsLeft > 0) Sound.sfx("tick");
}

function stopAllTimers() {
  if (questionCountdown) questionCountdown.stop();
  if (memoryCountdown) memoryCountdown.stop();
}

document.addEventListener("visibilitychange", () => {
  const active = phase === "question-open" ? questionCountdown : phase === "memory-open" ? memoryCountdown : null;
  if (!active) return;
  if (document.hidden) active.pause(); else active.resume();
});

/* ============================================================
   5. BOTONES DE NAVEGACIÓN
   ============================================================ */

$("start-button").addEventListener("click", () => { Sound.unlock(); Sound.sfx("click"); showScreen("screen-warning"); });
$("warning-button").addEventListener("click", () => { Sound.sfx("click"); startGame(); });
$("next-question-button").addEventListener("click", nextQuestion);
$("submit-memory-button").addEventListener("click", () => { Sound.sfx("click"); finishMemory(false); });
$("contact-button").addEventListener("click", () => showScreen("screen-contact"));
$("skip-contact-button").addEventListener("click", () => { stopAllTimers(); phase = "done"; showScreen("screen-thanks"); });
$("replay-button").addEventListener("click", startGame);
$("thanks-replay-button").addEventListener("click", startGame);
$("back-result-button").addEventListener("click", () => showScreen("screen-result"));

/* ============================================================
   6. PREGUNTAS
   ============================================================ */

function startGame() {
  stopAllTimers();
  $("contact-form").reset();
  $("contact-status").textContent = "";
  updateContactLabel();
  currentQuestion = 0;
  questionScore = 0;
  selectedNumbers = new Set();
  showQuestion();
}

function showQuestion() {
  const q = questions[currentQuestion];
  $("question-counter").textContent = `PREGUNTA ${currentQuestion + 1} DE ${questions.length}`;
  $("question-category").textContent = q.category;
  $("question-title").textContent = q.title;
  $("question-feedback").textContent = "";
  $("question-feedback").className = "feedback";
  $("question-timer-box").classList.remove("urgent");
  $("next-question-button").classList.add("hidden");

  $("screen-question").classList.remove("leaving");
  replay(document.querySelector("#screen-question .question-card"), "enter");
  const options = $("question-options");
  options.innerHTML = "";
  shuffle(q.options).forEach((value, index) => {
    const button = document.createElement("button");
    button.className = "option-button enter";
    button.style.setProperty("--i", index);                // retraso escalonado de la animación
    button.type = "button";
    button.dataset.value = value;
    button.dataset.letter = String.fromCharCode(65 + index);
    button.setAttribute("aria-label", `Opción ${button.dataset.letter}: ${value}`);
    button.innerHTML = `<span class="option-letter" aria-hidden="true">${button.dataset.letter}</span><span class="option-value">${value}</span><span class="option-mark" aria-hidden="true"></span>`;
    button.addEventListener("click", () => answerQuestion(value));
    options.appendChild(button);
  });

  phase = "question-open";
  questionShownAt = Date.now();
  showScreen("screen-question");

  if (questionCountdown) questionCountdown.stop();
  lastTickSecond = -1;
  questionCountdown = createCountdown(QUESTION_SECONDS, (left, total) => {
    $("question-timer").textContent = Math.ceil(left / 1000);
    tickSound(Math.ceil(left / 1000));
    $("question-progress").style.width = `${(left / total) * 100}%`;
    $("question-timer-box").classList.toggle("urgent", left <= 5000);
  }, () => lockQuestion(null));
  questionCountdown.start();
}

function answerQuestion(value) {
  if (phase !== "question-open") return;                       // ya respondida o fuera de tiempo
  if (Date.now() - questionShownAt < INPUT_LOCK_MS) return;    // toque accidental al cambiar de pregunta
  questionCountdown.stop();
  lockQuestion(value);
}

function lockQuestion(value) {
  if (phase !== "question-open") return;
  phase = "question-locked";
  const q = questions[currentQuestion];
  const timedOut = value === null;

  [...$("question-options").querySelectorAll("button")].forEach(button => {
    const number = Number(button.dataset.value);
    button.disabled = true;
    if (number === q.answer) {
      button.classList.add("correct");
      button.setAttribute("aria-label", `Opción ${button.dataset.letter}: ${number}, correcta`);
    } else if (number === value) {
      button.classList.add("incorrect");
      button.setAttribute("aria-label", `Opción ${button.dataset.letter}: ${number}, incorrecta`);
    } else {
      button.classList.add("dimmed");
    }
  });

  const feedback = $("question-feedback");
  if (value === q.answer) {
    questionScore += POINTS_PER_QUESTION;
    feedback.textContent = q.feedback;
    feedback.className = "feedback good";
    Sound.sfx("correct");
    $("score-pop").textContent = `+${POINTS_PER_QUESTION}`;
    replay($("score-pop"), "run");
  } else if (timedOut) {
    feedback.textContent = `⏰ ¡Se acabó el tiempo! La respuesta era ${q.answer}.`;
    feedback.className = "feedback bad";
    $("question-timer-box").classList.add("urgent");
    $("question-timer").textContent = "0";
    Sound.sfx("timeout");
  } else {
    feedback.textContent = `Casi 😅 La respuesta era ${q.answer}.`;
    feedback.className = "feedback bad";
    Sound.sfx("wrong");
  }

  const next = $("next-question-button");
  next.innerHTML = currentQuestion === questions.length - 1 ? "Al desafío final <span>→</span>" : "Siguiente <span>→</span>";
  next.classList.remove("hidden");
  // Red de seguridad: en pantallas muy bajas, asegura que el botón quede a la vista.
  next.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function nextQuestion() {
  if (phase !== "question-locked") return;                     // evita doble clic en "Siguiente"
  phase = "transition";                                         // ignora toques mientras la pantalla sale
  Sound.sfx("click");
  const wasLast = currentQuestion === questions.length - 1;
  $("screen-question").classList.add("leaving");
  setTimeout(() => {
    if (wasLast) {
      startMemoryChallenge();
    } else {
      currentQuestion++;
      showQuestion();
    }
  }, TRANSITION_MS);
}

/* ============================================================
   7. DESAFÍO FINAL DE MEMORIA
   ============================================================ */

function startMemoryChallenge() {
  selectedNumbers = new Set();
  $("memory-count").textContent = "0 marcados · buscas 13";
  $("memory-timer-box").classList.remove("urgent");
  renderMemoryOptions();
  phase = "memory-open";
  showScreen("screen-memory");

  if (memoryCountdown) memoryCountdown.stop();
  lastTickSecond = -1;
  memoryCountdown = createCountdown(MEMORY_SECONDS, (left, total) => {
    $("memory-timer").textContent = Math.ceil(left / 1000);
    tickSound(Math.ceil(left / 1000));
    $("memory-progress").style.width = `${(left / total) * 100}%`;
    $("memory-timer-box").classList.toggle("urgent", left <= 5000);
  }, () => finishMemory(true));
  memoryCountdown.start();
}

function renderMemoryOptions() {
  const grid = $("memory-options");
  grid.innerHTML = "";
  shuffle([...targetNumbers, ...distractors]).forEach(number => {   // orden nuevo en cada partida
    const button = document.createElement("button");
    button.type = "button";
    button.className = "memory-option";
    button.textContent = number;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      if (phase !== "memory-open") return;
      const isSelected = selectedNumbers.has(number);
      if (isSelected) selectedNumbers.delete(number); else selectedNumbers.add(number);
      Sound.sfx(isSelected ? "unselect" : "select");
      button.classList.toggle("selected", !isSelected);
      button.setAttribute("aria-pressed", String(!isSelected));
      const n = selectedNumbers.size;
      $("memory-count").textContent = `${n} marcado${n === 1 ? "" : "s"} · buscas 13`;
    });
    grid.appendChild(button);
  });
}

// Puntaje de memoria (0 a 50): cada acierto suma 1, cada trampa resta 2, nunca baja de 0.
// Con esto, marcar los 20 números da 13 - 2x7 = -1 -> 0 puntos: ya no conviene adivinar a ciegas.
function calcMemoryScore(hits, misses) {
  const net = Math.max(0, hits - MISS_PENALTY * misses);
  return Math.round((net / targetNumbers.length) * MEMORY_MAX_POINTS);
}

function resultTier(score) {
  if (score >= 90) return { emoji: "⚡", title: "¡Mente de rayo!" };
  if (score >= 70) return { emoji: "🧠", title: "¡Muy ágil!" };
  if (score >= 45) return { emoji: "😎", title: "¡Nada mal!" };
  return { emoji: "🫠", title: "¡Hora de entrenar!" };
}

// Cuenta de 0 al puntaje final en menos de 1 segundo (o directo si el usuario prefiere menos movimiento).
function animateScore(target) {
  const el = $("final-score");
  const paint = (value) => { el.innerHTML = `${value} <small>/ 100</small>`; };
  if (prefersReducedMotion() || target === 0) { paint(target); return; }
  const start = performance.now(), duration = 900;
  paint(0);
  (function frame(now) {
    const k = Math.min(1, (now - start) / duration);
    paint(Math.round(target * (1 - Math.pow(1 - k, 3))));
    if (k < 1) requestAnimationFrame(frame);
  })(start);
}

function finishMemory(timedOut) {
  if (phase !== "memory-open") return;
  phase = "done";
  memoryCountdown.stop();

  const picked = [...selectedNumbers];
  const hits = picked.filter(n => targetNumbers.includes(n)).length;
  const misses = picked.length - hits;
  const memoryScore = calcMemoryScore(hits, misses);
  const totalScore = Math.round(questionScore + memoryScore);  // máximo 40 + 60 = 100
  const tier = resultTier(totalScore);

  $("final-score").dataset.score = totalScore;
  animateScore(totalScore);
  Sound.sfx("finish");
  $("result-title").textContent = tier.title;
  $("result-emoji").textContent = tier.emoji;
  $("result-message").textContent = `${hits} de 13 números correctos · ${misses} trampa${misses === 1 ? "" : "s"}${timedOut ? " · se acabó el tiempo" : ""}`;
  $("result-breakdown").textContent = `Preguntas: ${questionScore}/${QUESTIONS_MAX_POINTS} · Memoria: ${memoryScore}/${MEMORY_MAX_POINTS}`;
  showScreen("screen-result");
}

/* ============================================================
   8. FORMULARIO DE CONTACTO Y ENVÍO A GOOGLE SHEETS
   ============================================================ */

$("contact-channel").addEventListener("change", () => { 
  $("contact-handle").value = ""; 
  updateContactLabel(); 
});

function updateContactLabel() {
  const labels = {
    WhatsApp: ["Tu número de WhatsApp", "Ej. 999 999 999", "tel", "tel"],
    Instagram: ["Tu usuario de Instagram", "Ej. @tuusuario", "text", "off"],
    Correo: ["Tu correo electrónico", "Ej. tunombre@correo.com", "email", "email"]
  };
  const [label, placeholder, type, autocomplete] = labels[$("contact-channel").value];
  $("contact-handle-label").textContent = label;
  $("contact-handle").placeholder = placeholder;
  $("contact-handle").type = type;
  $("contact-handle").autocomplete = autocomplete;
}
updateContactLabel();

// URL de tu API de Google Apps Script
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbxHJ0dU9QUAHE8P8tcWyRnrcXsdMGKd6PG7-iIPwo_NacRY9YKU7OytJQIoweCAlvQFjQ/exec";

$("contact-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const statusEl = $("contact-status");
  statusEl.textContent = "Guardando tus datos...";
  statusEl.className = "feedback";

  // Capturar los valores exactos de tus inputs del HTML
  const nombre = $("contact-name").value;
  const carrera = $("contact-career").value;
  const ciclo = $("current-cycle") ? $("current-cycle").value : $("contact-cycle").value;
  const contacto = $("contact-handle").value;

  const submitBtn = $("contact-form").querySelector("button[type='submit']");
  if (submitBtn) submitBtn.disabled = true;

  const formData = new URLSearchParams();
  formData.append("nombre", nombre);
  formData.append("carrera", carrera);
  formData.append("ciclo", ciclo);
  formData.append("contacto", contacto);

  // Petición POST con no-cors para evitar bloqueos del navegador
  fetch(URL_APPS_SCRIPT, {
    method: "POST",
    mode: "no-cors",
    body: formData
  })
  .then(() => {
    statusEl.textContent = "¡Datos guardados con éxito!";
    statusEl.className = "feedback good";
    if (submitBtn) submitBtn.disabled = false;
    
    // Cambiar a la pantalla de agradecimiento después de 1.5 segundos
    setTimeout(() => {
      stopAllTimers();
      phase = "done";
      showScreen("screen-thanks");
    }, 1500);
  })
  .catch(error => {
    console.error("Error al guardar:", error);
    statusEl.textContent = "Hubo un error al guardar tus datos. Inténtalo de nuevo.";
    statusEl.className = "feedback bad";
    if (submitBtn) submitBtn.disabled = false;
  });
});

/* ============================================================
   9. BOTÓN DE SILENCIAR
   ============================================================ */

const muteButton = $("mute-button");
function renderMute(muted) {
  muteButton.textContent = muted ? "🔇" : "🔊";
  muteButton.setAttribute("aria-pressed", String(muted));   // "pulsado" = silenciado
}
Sound.onMuteChange(renderMute);
renderMute(Sound.isMuted());
muteButton.addEventListener("click", () => Sound.toggleMute());
