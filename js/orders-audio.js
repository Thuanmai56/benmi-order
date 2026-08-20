// ==========================================
// Benmi POS - Module: Audio & Shift Modal
// ==========================================

let soundUnlocked = false;
let audioCtx = null;
let alarmIntervalId = null;
let alarmTimeoutIds = [];

// Unlock audio on initial user gestures (Chrome Web Audio autoplay policy)
async function unlockSound() {
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!audioCtx) audioCtx = new AudioContextCtor();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    if (audioCtx.state === "running") {
      soundUnlocked = true;
    }
  } catch (e) {
    console.error("unlockSound failed:", e);
  }
}

document.addEventListener("click", unlockSound, { once: true });
document.addEventListener("touchstart", unlockSound, { once: true });
document.addEventListener("keydown", unlockSound, { once: true });

function clearAlarmTimeouts() {
  alarmTimeoutIds.forEach(id => clearTimeout(id));
  alarmTimeoutIds = [];
}

function stopContinuousAlarm() {
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
  clearAlarmTimeouts();
}

function playTone(frequency, durationMs, type = "square", volume = 0.22) {
  if (!audioCtx || audioCtx.state !== "running") return;
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;

  oscillator.connect(gain);
  gain.connect(audioCtx.destination);

  oscillator.start();
  setTimeout(() => oscillator.stop(), durationMs);
}

function playAlarmCycle() {
  clearAlarmTimeouts();
  playTone(880, 250, "square", 0.22);
  alarmTimeoutIds.push(setTimeout(() => playTone(1040, 250, "square", 0.22), 320));
  alarmTimeoutIds.push(setTimeout(() => playTone(880, 320, "square", 0.24), 680));
}

async function startContinuousAlarm() {
  if (!soundUnlocked) {
    try {
      if (audioCtx && audioCtx.state === "suspended") await audioCtx.resume();
      if (audioCtx && audioCtx.state === "running") soundUnlocked = true;
    } catch (e) {}
  }
  if (!soundUnlocked || !audioCtx || audioCtx.state !== "running") return;
  if (alarmIntervalId) return;
  playAlarmCycle();
  alarmIntervalId = setInterval(() => {
    playAlarmCycle();
  }, 2200);
}

async function playNewOrderSound() {
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!audioCtx) audioCtx = new AudioContextCtor();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    if (audioCtx.state === "running") soundUnlocked = true;
    playAlarmCycle();
  } catch (e) {
    console.error(e);
  }
}

function getTodayDateString() {
  const now = new Date();
  const tw = new Date(now.getTime() + 8 * 3600000);
  return tw.toISOString().split('T')[0];
}

async function startOrderShift() {
  await unlockSound();
  playAlarmCycle();
  const modal = document.getElementById("startShiftModal");
  if (modal) modal.style.display = "none";
}

function checkInitialSessionModal() {
  const modal = document.getElementById("startShiftModal");
  if (modal) modal.style.display = "flex";
}

async function testSound() {
  await unlockSound();
  await playNewOrderSound();
}
