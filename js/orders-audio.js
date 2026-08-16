let soundUnlocked = false;
let audioCtx = null;
let alarmIntervalId = null;
let alarmTimeoutIds = [];

// Unlock audio after a user gesture (Chrome autoplay policy)
async function unlockSound() {
  soundUnlocked = true;
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!audioCtx) audioCtx = new AudioContextCtor();
    if (audioCtx.state === "suspended") await audioCtx.resume();
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

function startContinuousAlarm() {
  if (!soundUnlocked) return;
  if (alarmIntervalId) return;
  playAlarmCycle();
  alarmIntervalId = setInterval(() => {
    playAlarmCycle();
  }, 2200);
}

async function playNewOrderSound() {
  if (!soundUnlocked) return;
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!audioCtx) audioCtx = new AudioContextCtor();
    if (audioCtx.state === "suspended") await audioCtx.resume();
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
  const today = getTodayDateString();
  sessionStorage.setItem('pos_session_started', 'true');
  sessionStorage.setItem('pos_session_date', today);
  const modal = document.getElementById("startShiftModal");
  if (modal) modal.style.display = "none";
}

function checkInitialSessionModal() {
  const isStarted = sessionStorage.getItem('pos_session_started');
  const sessionDate = sessionStorage.getItem('pos_session_date');
  const today = getTodayDateString();

  if (isStarted === 'true' && sessionDate === today) {
    soundUnlocked = true;
    const modal = document.getElementById("startShiftModal");
    if (modal) modal.style.display = "none";
  } else {
    const modal = document.getElementById("startShiftModal");
    if (modal) modal.style.display = "flex";
  }
}

async function testSound() {
  await unlockSound();
  await playNewOrderSound();
}
