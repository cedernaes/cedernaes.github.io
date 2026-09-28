// Hover aura around "Cedernaes", in the spirit of edge lighting: moving the
// pointer over the word makes a ring of flowing colour glow around it,
// brightest near the cursor, and sends ripples outward. Nothing happens while
// the pointer is still. The look lives in style.css (.aura); this file only
// feeds it custom properties.

const word = document.querySelector("h1 span");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

const aura = document.createElement("span");
aura.className = "aura";
aura.setAttribute("aria-hidden", "true");
aura.innerHTML = '<span class="aura-bloom"></span>';
word.append(aura);

const ENERGY_PER_PX = 1 / 80; // how quickly movement brings the glow up
const DECAY = 0.95; // share of the glow kept per frame once the pointer stops
const MAX_PUSH_PX = 6; // how far the ring swells at full glow
const RIPPLE_EVERY_PX = 60; // pointer travel per ripple
const RIPPLE_MIN_MS = 220;

let energy = 0; // 0-1: rises with pointer movement, decays when still
let spin = 0; // degrees the colours have flowed around the ring
let lastPointer = null;
let rippleCharge = 0;
let lastRipple = 0;
let running = false;
let lastFrame = 0;

function render() {
  aura.style.setProperty("--glow", energy.toFixed(3));
  aura.style.setProperty("--push", `${(energy * MAX_PUSH_PX).toFixed(2)}px`);
  aura.style.setProperty("--spin", `${spin.toFixed(1)}deg`);
}

function tick(now) {
  // Scale by elapsed time so it runs the same at 60 Hz and 120 Hz.
  const dt = Math.min((now - lastFrame) / (1000 / 60), 3);
  lastFrame = now;
  energy *= DECAY ** dt;
  spin = (spin + dt * (0.5 + energy * 2.5)) % 360;

  if (energy > 0.005) {
    render();
    requestAnimationFrame(tick);
  } else {
    energy = 0;
    render();
    running = false;
  }
}

function start() {
  if (running) return;
  running = true;
  lastFrame = performance.now();
  requestAnimationFrame(tick);
}

function ripple() {
  const ring = document.createElement("span");
  ring.className = "aura-ripple";
  ring.addEventListener("animationend", () => ring.remove());
  aura.append(ring);
}

word.addEventListener("pointerenter", (e) => {
  lastPointer = { x: e.clientX, y: e.clientY };
});

word.addEventListener("pointerleave", () => {
  lastPointer = null;
  rippleCharge = 0;
});

// Only movement drives the aura: the further the pointer travels, the
// brighter it glows, and every RIPPLE_EVERY_PX of travel sends out a ripple.
word.addEventListener("pointermove", (e) => {
  const x = e.clientX;
  const y = e.clientY;
  const moved = lastPointer ? Math.hypot(x - lastPointer.x, y - lastPointer.y) : 0;
  lastPointer = { x, y };
  if (reduceMotion.matches || moved === 0) return;

  const box = aura.getBoundingClientRect();
  aura.style.setProperty("--x", `${x - box.left}px`);
  aura.style.setProperty("--y", `${y - box.top}px`);
  energy = Math.min(1, energy + moved * ENERGY_PER_PX);

  rippleCharge += moved;
  const now = performance.now();
  if (rippleCharge >= RIPPLE_EVERY_PX && now - lastRipple >= RIPPLE_MIN_MS) {
    ripple();
    rippleCharge = 0;
    lastRipple = now;
  }

  render();
  start();
});
