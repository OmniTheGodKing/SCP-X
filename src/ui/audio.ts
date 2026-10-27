// Every sound in the game, synthesized in the browser with the Web Audio API: no sound files. Three channels
// (effects, interface, music) under a master volume, remembered per viewer. Browsers only allow sound after the
// viewer has clicked or pressed a key, so the engine starts on the first gesture and stays silent until then.
import type { WeaponType } from "../data/weapons";

export type Channel = "sfx" | "ui" | "music";
export interface AudioSettings { master: number; sfx: number; ui: number; music: number; muted: boolean }
const KEY = "site19-audio";
const DEFAULTS: AudioSettings = { master: 0.7, sfx: 0.8, ui: 0.5, music: 0.35, muted: false };

let settings: AudioSettings = (() => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return { ...DEFAULTS }; } })();
let ac: AudioContext | null = null, master: GainNode, bus: Record<Channel, GainNode>, noiseBuf: AudioBuffer;

export const audioSettings = () => settings;
export function setAudio(patch: Partial<AudioSettings>) {
  settings = { ...settings, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* private mode: settings last this visit */ }
  apply();
}
function apply() {
  if (!ac) return;
  const t = ac.currentTime;
  master.gain.setTargetAtTime(settings.muted ? 0 : settings.master, t, 0.03);
  for (const c of ["sfx", "ui", "music"] as Channel[]) bus[c].gain.setTargetAtTime(settings[c], t, 0.03);
}

function start() {
  if (ac) { if (ac.state === "suspended") void ac.resume(); return; }
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  ac = new Ctx();
  master = ac.createGain(); master.connect(ac.destination);
  // a gentle compressor so a firefight doesn't clip
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
  bus = { sfx: ac.createGain(), ui: ac.createGain(), music: ac.createGain() };
  for (const b of Object.values(bus)) b.connect(comp);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  apply();
  if (wantMusic) playMusic(wantMusic);
}
// the first click or key press anywhere unlocks sound
if (typeof window !== "undefined") for (const ev of ["pointerdown", "keydown"]) window.addEventListener(ev, start, { capture: true });
const ready = () => !!ac && ac.state === "running";

// ---------- building blocks ----------
function env(g: GainNode, t: number, a: number, peak: number, d: number) {
  g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function noise(ch: Channel, o: { at?: number; dur: number; peak: number; attack?: number; type?: BiquadFilterType; freq: number; freqEnd?: number; q?: number }) {
  if (!ac) return;
  const t = ac.currentTime + (o.at ?? 0);
  const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = ac.createBiquadFilter(); f.type = o.type ?? "lowpass"; f.frequency.setValueAtTime(o.freq, t); f.Q.value = o.q ?? 0.7;
  if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t + o.dur);
  const g = ac.createGain(); env(g, t, o.attack ?? 0.003, o.peak, o.dur);
  src.connect(f).connect(g).connect(bus[ch]);
  src.start(t, Math.random()); src.stop(t + (o.attack ?? 0.003) + o.dur + 0.05);
}
function tone(ch: Channel, o: { at?: number; dur: number; peak: number; freq: number; freqEnd?: number; type?: OscillatorType; attack?: number; detune?: number; lp?: number }) {
  if (!ac) return;
  const t = ac.currentTime + (o.at ?? 0);
  const osc = ac.createOscillator(); osc.type = o.type ?? "sine"; osc.frequency.setValueAtTime(o.freq, t); if (o.detune) osc.detune.value = o.detune;
  if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(o.freqEnd, t + o.dur);
  const g = ac.createGain(); env(g, t, o.attack ?? 0.005, o.peak, o.dur);
  let node: AudioNode = osc;
  if (o.lp) { const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.lp; node = osc.connect(f); }
  node.connect(g).connect(bus[ch]);
  osc.start(t); osc.stop(t + (o.attack ?? 0.005) + o.dur + 0.05);
}
const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// ---------- effects ----------
const GUN_SOUND: Record<WeaponType | "pistol", { body: number; crack: number; len: number; rounds: number; gap: number }> = {
  rifle: { body: 900, crack: 0.55, len: 0.22, rounds: 1, gap: 0 }, marksman: { body: 1100, crack: 0.7, len: 0.35, rounds: 1, gap: 0 },
  shotgun: { body: 600, crack: 0.7, len: 0.3, rounds: 1, gap: 0 }, mg: { body: 800, crack: 0.45, len: 0.12, rounds: 4, gap: 0.075 },
  carbine: { body: 1200, crack: 0.4, len: 0.16, rounds: 1, gap: 0 }, smg: { body: 1400, crack: 0.3, len: 0.08, rounds: 3, gap: 0.06 },
  pistol: { body: 1500, crack: 0.3, len: 0.12, rounds: 1, gap: 0 },
};
export const sfx = {
  shot(type: WeaponType | "pistol" | undefined, far = false) {
    if (!ready()) return;
    const g = GUN_SOUND[type ?? "rifle"] ?? GUN_SOUND.rifle, k = far ? 0.5 : 1;
    for (let r = 0; r < g.rounds; r++) {
      const at = r * g.gap;
      noise("sfx", { at, dur: 0.03, peak: g.crack * k, type: "highpass", freq: 1800 });
      noise("sfx", { at, dur: g.len, peak: 0.6 * k, freq: g.body, freqEnd: 120 });
      tone("sfx", { at, dur: 0.12, peak: 0.35 * k, freq: 110, freqEnd: 45, type: "triangle" });
    }
  },
  hit() { if (!ready()) return; noise("sfx", { dur: 0.08, peak: 0.35, type: "bandpass", freq: 700, q: 1.5 }); tone("sfx", { dur: 0.08, peak: 0.25, freq: 90, freqEnd: 50 }); },
  miss() { if (!ready()) return; tone("sfx", { at: 0.04, dur: 0.18, peak: 0.08, freq: 2600 + Math.random() * 1200, freqEnd: 900, type: "sine" }); },
  explosion() {
    if (!ready()) return;
    noise("sfx", { dur: 1.2, peak: 0.9, freq: 1400, freqEnd: 60, attack: 0.005 });
    tone("sfx", { dur: 0.7, peak: 0.7, freq: 70, freqEnd: 28, type: "sine" });
    noise("sfx", { at: 0.15, dur: 0.9, peak: 0.12, type: "highpass", freq: 3000 });   // debris
  },
  flame() { if (!ready()) return; noise("sfx", { dur: 0.7, peak: 0.45, type: "bandpass", freq: 500, freqEnd: 300, q: 0.8, attack: 0.05 }); },
  door() { if (!ready()) return; tone("sfx", { dur: 0.35, peak: 0.35, freq: 140, freqEnd: 70, type: "square", lp: 400 }); noise("sfx", { at: 0.3, dur: 0.12, peak: 0.4, freq: 600 }); },
  /** The click of someone's eyes shutting: SCP-173 may move. */
  blink() { if (!ready()) return; tone("sfx", { dur: 0.04, peak: 0.25, freq: 2200, type: "square", lp: 3000 }); tone("sfx", { at: 0.07, dur: 0.04, peak: 0.18, freq: 1800, type: "square", lp: 3000 }); },
  /** Stone dragged across concrete. */
  scrape() { if (!ready()) return; noise("sfx", { dur: 0.55, peak: 0.55, type: "bandpass", freq: 260, freqEnd: 180, q: 3, attack: 0.04 }); noise("sfx", { at: 0.05, dur: 0.4, peak: 0.25, type: "bandpass", freq: 1200, q: 4 }); },
  corrode() { if (!ready()) return; for (let i = 0; i < 6; i++) tone("sfx", { at: i * 0.07 + Math.random() * 0.04, dur: 0.12, peak: 0.12, freq: 180 + Math.random() * 160, freqEnd: 60, type: "sine" }); noise("sfx", { dur: 0.9, peak: 0.15, freq: 300, attack: 0.2 }); },
  step() { if (!ready()) return; noise("sfx", { dur: 0.05, peak: 0.08, freq: 500 + Math.random() * 200 }); },
  alarm() {
    if (!ready()) return;
    for (let i = 0; i < 3; i++) { tone("sfx", { at: i * 0.7, dur: 0.6, peak: 0.25, freq: 520, freqEnd: 820, type: "sawtooth", lp: 1800, attack: 0.05 }); }
  },
  radio() { if (!ready()) return; noise("ui", { dur: 0.12, peak: 0.12, type: "bandpass", freq: 1800, q: 2 }); tone("ui", { at: 0.1, dur: 0.06, peak: 0.12, freq: 1320, type: "square", lp: 2500 }); },
  enemyTurn() { if (!ready()) return; tone("sfx", { dur: 0.5, peak: 0.25, freq: 98, type: "sawtooth", lp: 300, attack: 0.04 }); tone("sfx", { dur: 0.5, peak: 0.18, freq: 103.8, type: "sawtooth", lp: 300, attack: 0.04 }); },
};

// ---------- interface ----------
export const ui = {
  click() { if (!ready()) return; tone("ui", { dur: 0.03, peak: 0.12, freq: 1600, type: "triangle" }); },
  tab() { if (!ready()) return; noise("ui", { dur: 0.06, peak: 0.12, type: "highpass", freq: 2500 }); tone("ui", { dur: 0.05, peak: 0.08, freq: 900, type: "triangle" }); },
  /** A typewriter strike and a bell: news on the board. */
  notice() { if (!ready()) return; noise("ui", { dur: 0.04, peak: 0.25, type: "bandpass", freq: 2000, q: 2 }); tone("ui", { at: 0.08, dur: 0.6, peak: 0.12, freq: NOTE(84), type: "sine" }); },
  month() { if (!ready()) return; for (let i = 0; i < 4; i++) noise("ui", { at: i * 0.07, dur: 0.03, peak: 0.2, type: "bandpass", freq: 1900 + i * 80, q: 2 }); tone("ui", { at: 0.32, dur: 0.9, peak: 0.12, freq: NOTE(79), type: "sine" }); },
  deny() { if (!ready()) return; tone("ui", { dur: 0.12, peak: 0.12, freq: 220, type: "square", lp: 800 }); },
};

// ---------- transitions ----------
export const transition = {
  /** The squad's plane takes off: engines swell and fade. */
  takeoff() { if (!ready()) return; noise("sfx", { dur: 2.2, peak: 0.35, freq: 300, freqEnd: 900, attack: 0.6 }); tone("sfx", { dur: 2.2, peak: 0.18, freq: 70, freqEnd: 120, type: "sawtooth", lp: 300, attack: 0.6 }); },
  landing() { if (!ready()) return; noise("sfx", { dur: 1.2, peak: 0.3, freq: 800, freqEnd: 200 }); tone("sfx", { at: 0.9, dur: 0.25, peak: 0.4, freq: 60, freqEnd: 35 }); },
  /** A low brass stab as a mission opens. */
  missionStart() { if (!ready()) return; for (const n of [38, 45, 50]) tone("music", { dur: 1.6, peak: 0.22, freq: NOTE(n), type: "sawtooth", lp: 700, attack: 0.03 }); noise("sfx", { dur: 0.5, peak: 0.25, freq: 200 }); },
  victory() { if (!ready()) return; [60, 64, 67, 72].forEach((n, i) => tone("music", { at: i * 0.16, dur: 1.4 - i * 0.2, peak: 0.2, freq: NOTE(n), type: "triangle", attack: 0.02 })); },
  defeat() { if (!ready()) return; [57, 53, 50, 45].forEach((n, i) => tone("music", { at: i * 0.35, dur: 1.2, peak: 0.2, freq: NOTE(n), type: "sawtooth", lp: 600, attack: 0.05 })); },
  /** Back down the lift to Site-19. */
  returnHome() { if (!ready()) return; noise("sfx", { dur: 1.0, peak: 0.25, type: "bandpass", freq: 400, freqEnd: 1500, q: 1, attack: 0.3 }); tone("sfx", { at: 0.9, dur: 0.3, peak: 0.2, freq: 110, freqEnd: 70, type: "square", lp: 300 }); },
  breach() { sfx.alarm(); },
};

// ---------- music ----------
// A slow generative score: a drone and sparse notes from a scale, different for each scene.
type Scene = "world" | "site" | "mission" | "tense";
const SCENES: Record<Scene, { root: number; scale: number[]; every: number; wave: OscillatorType; lp: number }> = {
  world: { root: 45, scale: [0, 3, 5, 7, 10, 12, 15], every: 3.2, wave: "triangle", lp: 1200 },
  site: { root: 43, scale: [0, 2, 3, 7, 8, 12], every: 4.2, wave: "sine", lp: 900 },
  mission: { root: 40, scale: [0, 1, 5, 7, 8, 12], every: 2.6, wave: "triangle", lp: 900 },
  tense: { root: 40, scale: [0, 1, 6, 7, 13], every: 1.6, wave: "sawtooth", lp: 600 },
};
let wantMusic: Scene | null = null, playing: { scene: Scene; drone: OscillatorNode[]; gain: GainNode; timer: number } | null = null;
export function playMusic(scene: Scene | null) {
  wantMusic = scene;
  if (!ac) return;
  if (playing?.scene === scene) return;
  if (playing) { const p = playing; p.gain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.6); clearInterval(p.timer); setTimeout(() => p.drone.forEach(o => { try { o.stop(); } catch { /* already stopped */ } }), 3000); playing = null; }
  if (!scene) return;
  const sc = SCENES[scene], g = ac.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(0.5, ac.currentTime, 1.5); g.connect(bus.music);
  const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = sc.lp; lp.connect(g);
  const lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.frequency.value = 0.07; lfoG.gain.value = sc.lp * 0.3; lfo.connect(lfoG).connect(lp.frequency); lfo.start();
  const drone = [0, 7, 12].map((iv, i) => { const o = ac!.createOscillator(); o.type = i ? "sine" : sc.wave; o.frequency.value = NOTE(sc.root + iv); o.detune.value = (i - 1) * 6; const og = ac!.createGain(); og.gain.value = i ? 0.06 : 0.1; o.connect(og).connect(lp); o.start(); return o; });
  drone.push(lfo);
  const timer = window.setInterval(() => {
    if (!ac || Math.random() < 0.3) return;
    const n = sc.root + 12 + sc.scale[Math.floor(Math.random() * sc.scale.length)];
    const t = ac.currentTime, o = ac.createOscillator(), og = ac.createGain();
    o.type = "sine"; o.frequency.value = NOTE(n);
    og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.08, t + 0.4); og.gain.exponentialRampToValueAtTime(0.0001, t + sc.every * 1.6);
    o.connect(og).connect(lp); o.start(t); o.stop(t + sc.every * 1.7);
  }, sc.every * 1000);
  playing = { scene, drone, gain: g, timer };
}

// ---------- the volume panel ----------
/** A small "Sound" button with a popover of sliders, for either screen's header. */
export function soundControl(): string {
  const s = settings, row = (k: keyof AudioSettings, label: string) => `<label class="sndrow"><span>${label}</span><input type="range" min="0" max="100" step="5" value="${Math.round((s[k] as number) * 100)}" data-snd="${k}" aria-label="${label} volume"></label>`;
  return `<details class="sound"><summary class="act" title="Sound">${s.muted ? "Sound off" : "Sound"}</summary>
    <div class="sndpanel">
      <label class="sndrow"><input type="checkbox" data-sndmute ${s.muted ? "checked" : ""}> Mute everything</label>
      ${row("master", "Master")}${row("sfx", "Effects")}${row("ui", "Interface")}${row("music", "Music")}
    </div></details>`;
}
export function wireSound(root: ParentNode) {
  root.querySelectorAll<HTMLInputElement>("[data-snd]").forEach(i => i.oninput = () => { setAudio({ [i.dataset.snd!]: Number(i.value) / 100 } as Partial<AudioSettings>); if (i.dataset.snd === "sfx") sfx.shot("rifle"); else if (i.dataset.snd === "ui") ui.click(); });
  root.querySelectorAll<HTMLInputElement>("[data-sndmute]").forEach(i => i.onchange = () => { setAudio({ muted: i.checked }); const s = i.closest("details")?.querySelector("summary"); if (s) s.textContent = i.checked ? "Sound off" : "Sound"; });
}
