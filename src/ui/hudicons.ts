// Tactical HUD icons: one simple line glyph per kind of action, drawn at 20px. Temporary art: these are hand-written
// SVG paths kept in one table so a later art pass can replace them (or point them at image files) in one place.
const P: Record<string, string> = {
  face: "M12 3v4M12 17v4M3 12h4M17 12h4M12 9l3 3-3 3-3-3z",
  overwatch: "M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  eyes: "M3 14c3 3 15 3 18 0M7 17l-1 2M12 18v2M17 17l1 2",
  reload: "M4 12a8 8 0 0 1 14-5l2-2v6h-6l2-2a5 5 0 1 0 1 6",
  throw: "M12 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 2v2M14 3l2-1M7 18l-3 3M17 18l3 3",
  fire: "M3 12h13M16 9l5 3-5 3M6 9v6",
  smoke: "M6 15a4 4 0 0 1 2-7 5 5 0 0 1 9 2 3 3 0 0 1 1 6H7",
  charge: "M5 9h11v8H5zM16 13h4M9 9V6h3M18 11l2-2M18 15l2 2",
  barrier: "M3 18h18M5 18V9l3-2 3 2v9M13 18V9l3-2 3 2v9",
  sandbags: "M3 18c0-2 3-3 6-3s6 1 6 3M9 18c0-2 3-3 6-3s6 1 6 3M6 15c0-2 3-3 6-3s6 1 6 3",
  stretcher: "M3 14h18M5 14v3M19 14v3M7 11h7a2 2 0 0 1 0 3",
  cordon: "M3 8l18 8M3 16l18-8M5 6v12M19 6v12",
  flame: "M12 3c3 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 1 3 3 4 0-3-1-5 0-8z",
  decon: "M8 3h8M10 3v5l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8",
  sample: "M9 3h6M10 3v12a2 2 0 0 0 4 0V3M8 21h8",
  anchor: "M12 5v15M7 9h10M5 14a7 7 0 0 0 14 0M12 3a2 2 0 1 0 0 4",
  emplace: "M3 11h14M17 9h3v4h-3M8 11l-3 8M12 11l3 8",
  wrench: "M14 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 1-2-2z",
  silent: "M5 19c0-3 2-4 2-7a3 3 0 0 1 6 0M13 14c0 2 1 3 1 5M3 3l18 18",
  door: "M5 21V4h11v17M16 12h-2M3 21h18",
  binoculars: "M6 8a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0v-6a3 3 0 0 1 3-3zM18 8a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0v-6a3 3 0 0 1 3-3zM9 12h6M7 4h3v4M14 4h3v4",
  target: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 1v5M12 18v5M1 12h5M18 12h5",
  tracks: "M7 4c2 0 2 4 0 5-2-1-2-5 0-5zM6 11h2M16 11c2 0 2 4 0 5-2-1-2-5 0-5zM15 18h2",
  flag: "M5 21V4M5 4h12l-3 4 3 4H5",
  map: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14",
  stare: "M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12zM12 10v4",
  blink: "M3 12c3 4 15 4 18 0M6 15l-1 2M12 16v2M18 15l1 2",
  drag: "M12 3v12M7 10l5 5 5-5M5 20h14",
  seal: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5zM12 15v2",
  medkit: "M4 7h16v13H4zM9 7V4h6v3M12 10v7M8.5 13.5h7",
  carry: "M8 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 9v7l-2 5M8 16l3 5M8 11l7-2 4 3",
  exit: "M14 4h6v16h-6M3 12h12M11 8l4 4-4 4",
  hunker: "M4 20h16M6 20v-6h12v6M12 14V8M9 11l3-3 3 3",
  suppress: "M3 8h10M3 12h14M3 16h10M17 10l4 2-4 2",
  talk: "M4 5h16v10H9l-5 4z",
  next: "M5 5l8 7-8 7zM15 5h3v14h-3z",
  end: "M5 12l5 5 9-11",
  abort: "M6 6l12 12M18 6L6 18",
  zoomin: "M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM15 15l5 5M10 7v6M7 10h6",
  zoomout: "M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM15 15l5 5M7 10h6",
  overview: "M3 3h6M3 3v6M21 3h-6M21 3v6M3 21h6M3 21v-6M21 21h-6M21 21v-6",
  centre: "M12 2v5M12 17v5M2 12h5M17 12h5M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  generic: "M12 4l8 8-8 8-8-8z",
};
export function icon(name: string) {
  return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[name] ?? P.generic}"/></svg>`;
}
/** Which icon an action shows. */
export function iconFor(id: string): string {
  const map: Record<string, string> = {
    faceBtn: "face", owBtn: "overwatch", eyesBtn: "eyes", reloadBtn: "reload", stareBtn: "stare", callBtn: "blink", dragBtn: "drag", sealBtn: "seal", nextBtn: "next", endBtn: "end", evacBtn: "abort",
    medkit: "medkit", stabilize: "medkit", calm_words: "talk", sedative: "medkit", shake: "talk", suppression: "suppress", mark_target: "target", run_and_gun: "fire",
    secure: "seal", restrain: "seal", pickup: "carry", drop: "carry", exfil: "exit", hunker: "hunker", calm: "talk", doors: "door", siren: "talk", lockdown: "seal",
    cutradio: "wrench", recover: "flag", restore: "wrench", scan: "binoculars", dose: "medkit", hood: "seal", lead096: "drag", score: "flag", casemask: "seal",
    sq_coordinated_entry: "door", sq_hold_line: "barrier", sq_two_person_evac: "stretcher", sq_secure_transfer: "exit", sq_covering_lane: "overwatch", sq_suppression_shift: "suppress",
    sq_controlled_crossing: "cordon", sq_equipment_isolation: "decon", sq_anchor: "anchor", sq_protected_advance: "barrier", sq_safe_clearance: "wrench", sq_emplace: "emplace",
    sq_pack: "emplace", sq_interdiction: "suppress", sq_restore: "wrench", sq_silent_approach: "silent", sq_covert_access: "door", sq_observation_post: "binoculars",
    sq_confirm_target: "target", sq_read_sign: "tracks", sq_mark_trail: "flag", sq_route_recon: "map",
    breach_charge: "charge", demo_charge: "charge", barricade: "barrier", sandbags: "sandbags", cordon_kit: "cordon", firebreak_kit: "flame", decon_agent: "decon", sample_case: "sample",
    field_tags: "flag", frag: "throw", flashbang: "throw", smoke: "smoke", incendiary: "flame", flare: "throw", noisemaker: "throw", bazooka: "fire", law: "fire", flamer: "flame", camera: "binoculars",
  };
  return icon(map[id] ?? "generic");
}
