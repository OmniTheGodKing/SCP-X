// A small 3D scene for the facility rooms, rendered with CSS 3D transforms: a camera (yaw, pitch, distance and a
// focus point) looks at a room built from planes, with entities standing in it as billboards that always face the
// camera. Positions are world units (about 150 to the metre, y up is negative, the floor is y 0, the room centre is
// x 0 z 0). The hub redraws its whole page on every change, so camera state lives here between renders, and moving
// to a new target animates from where the camera was. Swapping this renderer for WebGL later keeps the same world
// positions, camera numbers and picking by data attributes.

export interface Cam { yaw: number; pitch: number; dist: number; fx: number; fy: number; fz: number; }
export interface RoomDims { w: number; d: number; h: number; }

const cams = new Map<string, Cam>();
// one pair of window listeners for whichever stage is on screen (the hub redraws the page on every change)
let moveFn: ((e: PointerEvent) => void) | null = null, upFn: (() => void) | null = null;
let installed = false;
function install() {
  if (installed) return; installed = true;
  window.addEventListener("pointermove", e => moveFn?.(e));
  window.addEventListener("pointerup", () => upFn?.());
}
const userMoved = new Map<string, boolean>();

export const camCss = (c: Cam) => `translateZ(${-c.dist}px) rotateX(${c.pitch}deg) rotateY(${c.yaw}deg) translate3d(${-c.fx}px, ${-c.fy}px, ${-c.fz}px)`;

/** The camera as it was last drawn for a scene (or the target, the first time). */
export function camNow(key: string, target: Cam): Cam { return cams.get(key) ?? target; }

/** Room shell: floor, back wall and side walls, each a plane whose inner markup is supplied. */
export function roomShell(r: RoomDims, parts: { floor: string; back: string; left?: string; right?: string; ceiling?: string; cls?: string }) {
  return `<div class="plane floor ${parts.cls ?? ""}" style="width:${r.w}px;height:${r.d}px;left:${-r.w / 2}px;top:${-r.d / 2}px;transform:rotateX(90deg)">${parts.floor}</div>
    <div class="plane wall back" style="width:${r.w}px;height:${r.h}px;left:${-r.w / 2}px;top:${-r.h}px;transform:translateZ(${-r.d / 2}px)">${parts.back}</div>
    <div class="plane wall side" style="width:${r.d}px;height:${r.h}px;left:${-r.d / 2}px;top:${-r.h}px;transform:translateX(${-r.w / 2}px) rotateY(90deg)">${parts.left ?? ""}</div>
    <div class="plane wall side" style="width:${r.d}px;height:${r.h}px;left:${-r.d / 2}px;top:${-r.h}px;transform:translateX(${r.w / 2}px) rotateY(-90deg)">${parts.right ?? ""}</div>
    ${parts.ceiling !== undefined ? `<div class="plane ceiling" style="width:${r.w}px;height:${r.d}px;left:${-r.w / 2}px;top:${-r.d / 2}px;transform:translateY(${-r.h}px) rotateX(90deg)">${parts.ceiling}</div>` : ""}`;
}

/** Something standing in the room, facing the camera. Its box is w × h with its feet at (x, z). */
export function billboard(x: number, z: number, w: number, h: number, inner: string, attrs = "", yaw = 0) {
  return `<div class="ent" ${attrs} style="width:${w}px;height:${h}px;left:${-w / 2}px;top:${-h}px;transform:translate3d(${x}px,0,${z}px) rotateY(${-yaw}deg)">${inner}</div>`;
}
/** A shadow (or anything else) lying on the floor at (x, z). */
export function onFloor(x: number, z: number, w: number, d: number, cls: string) {
  return `<div class="${cls}" style="width:${w}px;height:${d}px;left:${-w / 2}px;top:${-d / 2}px;transform:translate3d(${x}px,-1px,${z}px) rotateX(90deg)"></div>`;
}
/** Something fixed to the back wall at x along it and y height above the floor (positive up). */
export function onBackWall(r: RoomDims, x: number, y: number, w: number, h: number, inner: string, attrs = "") {
  return `<div class="fixture" ${attrs} style="width:${w}px;height:${h}px;left:${-w / 2}px;top:${-h}px;transform:translate3d(${x}px,${-y}px,${-r.d / 2 + 2}px)">${inner}</div>`;
}

/**
 * Wire a drawn scene: animate the camera from where it was to `target`, and let the player drag to look around,
 * scroll to zoom and use the on-screen camera buttons. Calls `onMove` with the camera during a drag (to turn the
 * billboards). Clicks after a drag are swallowed so looking around doesn't select things.
 */
export function wireStage(stage: HTMLElement, key: string, target: Cam, limits: { yaw: number; minDist: number; maxDist: number }, retarget: boolean) {
  const cam = stage.querySelector<HTMLElement>(".cam");
  if (!cam) return;
  const prev = cams.get(key);
  let cur: Cam = { ...(retarget || !prev || !userMoved.get(key) ? target : prev) };
  const ents = () => stage.querySelectorAll<HTMLElement>(".ent");
  const apply = (c: Cam, animate: boolean) => {
    cam.classList.toggle("glide", animate);
    cam.style.transform = camCss(c);
    ents().forEach(e => { e.style.transform = e.style.transform.replace(/rotateY\([^)]*\)/, `rotateY(${-c.yaw}deg)`); });
    cams.set(key, { ...c });
  };
  if (retarget) userMoved.set(key, false);
  if (prev && (retarget || !userMoved.get(key)) && JSON.stringify(prev) !== JSON.stringify(cur)) {
    apply(prev, false);
    requestAnimationFrame(() => requestAnimationFrame(() => apply(cur, true)));
  } else apply(cur, false);

  let drag: { x: number; y: number; yaw: number; pitch: number; moved: boolean } | null = null;
  stage.addEventListener("pointerdown", e => {
    if ((e.target as HTMLElement).closest(".stagehud, .pfile, .armroom, button, input, select, summary")) return;
    drag = { x: e.clientX, y: e.clientY, yaw: cur.yaw, pitch: cur.pitch, moved: false };
  });
  install();
  moveFn = e => {
    if (!drag || !stage.isConnected) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true; stage.classList.add("dragging");
    cur = { ...cur, yaw: Math.max(-limits.yaw, Math.min(limits.yaw, drag.yaw + dx * 0.15)), pitch: Math.max(-22, Math.min(-2, drag.pitch - dy * 0.08)) };
    userMoved.set(key, true); apply(cur, false);
  };
  upFn = () => {
    if (!drag) return;
    if (drag.moved) { stage.addEventListener("click", ev => { ev.stopPropagation(); ev.preventDefault(); }, { capture: true, once: true }); setTimeout(() => stage.classList.remove("dragging"), 0); }
    drag = null;
  };
  stage.addEventListener("wheel", e => {
    if (!(e.target as HTMLElement).closest(".viewport")) return;
    e.preventDefault();
    cur = { ...cur, dist: Math.max(limits.minDist, Math.min(limits.maxDist, cur.dist + e.deltaY * 0.6)) };
    userMoved.set(key, true); apply(cur, false);
  }, { passive: false });
  stage.querySelectorAll<HTMLElement>("[data-cam]").forEach(b => b.onclick = () => {
    const k = b.dataset.cam;
    if (k === "reset") { cur = { ...target }; userMoved.set(key, false); apply(cur, true); return; }
    cur = k === "left" ? { ...cur, yaw: Math.max(-limits.yaw, cur.yaw - 12) } : k === "right" ? { ...cur, yaw: Math.min(limits.yaw, cur.yaw + 12) }
      : k === "in" ? { ...cur, dist: Math.max(limits.minDist, cur.dist - 140) } : { ...cur, dist: Math.min(limits.maxDist, cur.dist + 140) };
    userMoved.set(key, true); apply(cur, true);
  });
}

/** Glide the camera toward a point before leaving the room (a door), then run `then`. */
export function leaveToward(stage: HTMLElement, key: string, x: number, z: number, then: () => void) {
  const cam = stage.querySelector<HTMLElement>(".cam"), c = cams.get(key);
  if (!cam || !c || matchMedia("(prefers-reduced-motion: reduce)").matches) { then(); return; }
  const to = { ...c, fx: x, fz: z, dist: Math.max(-200, c.dist - 520), yaw: 0 };
  cam.classList.add("glide"); cam.style.transform = camCss(to); stage.classList.add("leaving");
  setTimeout(then, 380);
}
