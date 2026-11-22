// Version 12: MTF specializations, squad specialties and their equipment (design section 26).
// Strategic checks run on the campaign; tactical checks run every specialty's techniques in a live mission, on a
// small test yard cleared in the map so each technique has the doors, walls, drums and growth it needs.
const { chromium } = require('playwright');
const L = require('./lib.cjs');
(async () => {
  const b = await chromium.launch();
  const { p, errs, E } = await L.fresh(b, { width: 1440, height: 900 });
  const R = L.reporter(), check = (ok, name, d) => R.check(name, !!ok, ok ? undefined : d);
  await p.waitForTimeout(300);

  // ---------------------------------------------------------------- strategic layer
  const st = await E(() => {
    const A = window.__site19, c = A.campaign, o = A.org, out = {};
    while (c.roster.length < 10) { const n = JSON.parse(JSON.stringify(c.roster[c.roster.length % 6])); n.id = 'tx' + c.roster.length; n.name = 'Test ' + c.roster.length; n.call = 'T' + c.roster.length; n.squad = undefined; n.quals = []; c.roster.push(n); }
    const ids = c.roster.map(x => x.id);
    // give the first squad mixed soldier classes: class and specialty are separate layers
    c.roster[0].cls = 'rifleman'; c.roster[1].cls = 'medic'; c.roster[2].cls = 'recon';
    const draft = spec => ({ designation: 'X-1', name: 'Test Force', spec, squads: [{ name: 'Alpha', specialty: 'breach', members: ids.slice(0, 4) }, { name: 'Bravo', specialty: 'security', members: ids.slice(4, 8) }] });
    out.firstBio = o.foundMtf(c, draft('bio'), true);
    const f0 = c.funds;
    out.firstGc = o.foundMtf(c, draft('general'), true);
    out.cost = o.requisitionCost(draft('general')); out.paid = f0 - c.funds; out.stock = { ...c.inventory };
    const m = c.mtfs[0], [s1, s2] = m.squads, a = c.roster[0], bra = c.roster[4], res = c.roster[8];
    out.sameSpec = o.squadMembers(c, s1.id).every(x => x.quals.includes('breach'));
    out.classes = o.squadMembers(c, s1.id).map(x => x.cls);
    out.restrict = { aCharge: o.qualifiedFor(c, a, 'breach_charge'), aBarrier: o.equipStatus(c, a, 'barricade').kind, bBarrier: o.qualifiedFor(c, bra, 'barricade'), reserve: o.equipStatus(c, res, 'breach_charge').kind, cordon: o.equipStatus(c, a, 'cordon_kit').kind, frag: o.qualifiedFor(c, res, 'frag') };
    // history: a 1963 launcher and a 1966 sensor aren't issued in 1951
    s1.specialty = 'heavyweapons'; out.law = o.equipStatus(c, a, 'law'); s1.specialty = 'breach';
    out.tracker = o.equipStatus(c, a, 'tracker').reason;
    out.workshop = A.research.unlockedItems(c).includes('breach_charge') && !A.research.unlockedItems(c).includes('cordon_kit');
    // training: no range, no drill; with one, the stage lands when the drill finishes and certifies newcomers
    out.noRange = o.canDrill(c, s1);
    const fb = c.base.facilities[0], range = { ...JSON.parse(JSON.stringify(fb)), id: 'fac-range-test', type: 'training', daysLeft: 0, disabled: false, slot: Math.max(...c.base.facilities.filter(f => f.level === fb.level).map(f => f.slot)) + 1 }; c.base.facilities.push(range);
    o.assignToSquad(c, res, s1.id);
    out.newcomer = o.equipStatus(c, res, 'breach_charge').kind;
    c.funds += 500;
    out.drill = o.drillSquad(c, s1); out.stageDuring = o.squadStage(s1);
    c.day = s1.drillUntil; o.tickOrg(c);
    out.stageAfter = o.squadStage(s1); out.newcomerAfter = o.qualifiedFor(c, res, 'breach_charge');
    for (const x of o.squadMembers(c, s1.id)) x.busy = undefined;
    // further stages come from field operations, and Veteran opens a branch choice
    out.drillCap = (() => { s1.drilled = 2; const w = o.canDrill(c, s1); return w; })();
    s1.mastery = 15; out.vet = o.squadStage(s1); o.chooseBranch(s1, 'speed'); out.branch = s1.branch; s1.mastery = 0; s1.drilled = 1; s1.branch = undefined;
    // retraining keeps certifications, archives mastery and takes time
    s2.mastery = 4; out.retrain = o.retrainSquad(c, s2, 'recovery'); out.retrainDays = s2.retrainUntil - c.day; out.archived = s2.archived?.security;
    out.retrainKit = o.equipStatus(c, bra, 'stretcher').kind;
    c.day = s2.retrainUntil; o.tickOrg(c); out.afterRetrain = o.qualifiedFor(c, bra, 'stretcher');
    o.retrainSquad(c, s2, 'security'); c.day = s2.retrainUntil; o.tickOrg(c);
    for (const x of c.roster) x.busy = undefined;
    out.backTo = { spec: s2.specialty, mastery: s2.mastery };
    return out;
  });
  check(st.firstBio && !st.firstGc, '1. the first MTF must be General Containment', st);
  check(st.cost > 0 && st.paid === st.cost && st.stock.breach_charge === 2 && st.stock.barricade >= 1, '1b. the starter requisition is bought from funds, not conjured', st);
  check(st.sameSpec, '4. every member of a squad shares its specialty', st);
  check(new Set(st.classes.filter(Boolean)).size === 3 && st.sameSpec, '3. soldier class is independent of squad specialty', st.classes);
  check(!st.restrict.aCharge && st.restrict.aBarrier === 'certification' && !st.restrict.bBarrier && st.restrict.reserve === 'certification' && st.restrict.cordon === 'authorization' && !st.restrict.frag, '2/5. specialist kit follows MTF authorization and squad certification; ordinary kit stays open', st.restrict);
  check(st.law.kind === 'year' && /1963/.test(st.law.reason) && /1966/.test(st.tracker) && st.workshop, '6. equipment respects historical dates and only certified kit can be built', st);
  check(st.noRange && st.newcomer === 'qualification' && !st.drill && st.stageDuring === 0 && st.stageAfter === 1 && !st.newcomerAfter, '8. a drill at the range certifies newcomers and the stage lands when it finishes', st);
  check(st.drillCap && st.vet === 3 && st.branch === 'speed', '8b. Proficient is the drill cap; Veteran comes from operations and opens a branch', st);
  check(!st.retrain && st.retrainDays >= 2 && st.archived === 4 && st.retrainKit === 'training' && !st.afterRetrain && st.backTo.spec === 'security' && st.backTo.mastery === 2, '8c. retraining takes time, certifies at the end and keeps half the old mastery on return', st);

  // ---------------------------------------------------------------- autonomous operations use capabilities
  const au = await E(() => {
    const A = window.__site19, c = A.campaign, at = A.autoteam, [s1] = c.mtfs[0].squads;
    const team = c.roster.filter(x => x.squad === s1.id).slice(0, 4);
    const base = { id: 'tAuto', kind: 'outbreak', scpId: '610', title: 'Incident 990: test', appeared: c.day, expires: c.day + 5, insurgents: 0, region: 'east_us' };
    const strike = { ...base, id: 'tAuto2', kind: 'strike', insurgents: 2 };
    const caps0 = at.capabilities(c, s1, team);
    const stock = c.inventory.breach_charge; c.inventory.breach_charge = 0; const capsNo = at.capabilities(c, s1, team); c.inventory.breach_charge = stock;
    const outBreach = at.assessTeam(c, base, team).primary;
    const strikeBreach = at.assessTeam(c, strike, team).primary;
    s1.specialty = 'incendiary'; team.forEach(x => x.quals.push('incendiary')); c.inventory.flamer = 1;
    const outFire = at.assessTeam(c, base, team).primary;
    s1.specialty = 'breach'; delete c.inventory.flamer;
    s1.retrainUntil = c.day + 3; const capsTraining = at.capabilities(c, s1, team); s1.retrainUntil = undefined;
    return { caps0, capsNo, outBreach, strikeBreach, outFire, capsTraining };
  });
  check(au.caps0.includes('can_breach_door') && !au.capsNo.includes('can_breach_door') && au.capsTraining.length === 0, '13. autonomous capability tags need stock, certification and a squad not in training', au);
  check(au.outBreach <= 0.15 && au.outFire > au.outBreach + 0.2 && au.strikeBreach > au.outBreach, '13b. an outbreak without burn or containment capability is capped; the right capability opens it', au);

  // ---------------------------------------------------------------- the planning screen and a mission
  await E(() => { const c = window.__site19.campaign; c.inventory.barricade = 2; c.scps[0].status = 'breach'; c.incidents.push({ id: 'incS', kind: 'breach', scpId: '173', title: 'Incident 901: SCP-173 breach, test', appeared: c.day, expires: c.day, insurgents: 3, region: 'east_us', map: 'wingC' }); window.__site19.save(); });
  await p.click('[data-tab=site]'); await p.click('[data-tab=command]');
  await L.planIncident(p, 'incS'); await p.waitForTimeout(200);
  await p.click('#launchBtn'); await p.waitForTimeout(400);
  await L.dbg(p, 'arrive'); await L.dbg(p, 'freeze');
  const ms = await E(() => { const S = window.__site19.mission, mtf = S.units.filter(u => u.side === 'mtf' && !u.guard && u.squadId);
    return { n: mtf.length, specs: [...new Set(mtf.map(u => u.specialty))], kit: S.setup.kit, shared: mtf.length > 1 && mtf.every(u => u.items.some(i => i.shared && i === mtf[0].items.find(j => j.shared))), mtfRules: S.setup.mtfRules };
  });
  check(ms.n >= 2 && ms.mtfRules && ms.kit?.breach_charge >= 1 && ms.shared, '4b. a deployed squad carries its specialty and one shared kit pool', ms);

  // the test yard: a 9×7 floor clearing around (cx, cy), with every other unit moved out of the way
  const results = await E(() => {
    const A = window.__site19, S = A.mission, G = A.gridMod, T = A.squadtech, Lv = A.grid, out = {};
    const W = Lv.W, idx = (x, y) => y * W + x;
    const team = S.units.filter(u => u.side === 'mtf' && !u.guard && u.alive);
    const foes = S.units.filter(u => u.side === 'raider');
    const cx = Math.floor(W / 2), cy = Math.floor(Lv.H / 2);
    const yard = () => {
      for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 5; x <= cx + 5; x++) {
        const edge = y === cy - 4 || y === cy + 4 || x === cx - 5 || x === cx + 5;
        Lv.grid[y][x] = edge ? G.WALL : G.FLOOR; Lv.door.delete(idx(x, y)); Lv.doors.delete(idx(x, y)); Lv.exitMap[idx(x, y)] = 99;
        S.flesh.delete(idx(x, y)); S.fires.delete(idx(x, y)); S.corroded.delete(idx(x, y));
      }
      S.cordon = new Set(); S.firebreak = new Map(); S.trails = new Map(); S.squadCd = {}; S.silent = {};
      // everyone else out of the yard
      S.units.filter(u => !team.slice(0, 3).includes(u) && !foes.includes(u)).forEach((u, i) => { u.x = 1 + (i % 4); u.y = 1 + Math.floor(i / 4); });
      foes.forEach((f, i) => { f.x = 2 + i; f.y = Lv.H - 2; f.alive = true; f.downed = false; f.hp = f.maxHp; f.suppressedUntil = undefined; f.suppressedBy = undefined; });
      G.bump(); A.computeVis();
    };
    const as = (spec, stage = 1, extra = {}) => {
      yard();
      team.slice(0, 3).forEach((u, i) => Object.assign(u, { specialty: spec, stage, qualified: true, squadId: 'TEST', mtfSpec: 'general', branch: undefined, ap: 2, x: cx - 1 + i, y: cy, overwatch: false, overwatchShots: 0, emplaced: false, observing: false, carrying: undefined, anchoredUntil: undefined, evacTurn: undefined, laneTurn: undefined, items: [] }, extra));
      return team.slice(0, 3);
    };
    const setDoor = (x, y, state) => { Lv.grid[y][x] = G.FLOOR; Lv.doors.add(idx(x, y)); Lv.door.set(idx(x, y), { kind: 'standard', state }); G.bump(); };
    const kit = (id, uses = 1) => ({ id, uses, shared: true });
    const foe = (x, y) => { const f = foes[0]; f.x = x; f.y = y; A.computeVis(); return f; };
    const why = (u, id) => T.techWhy(u, id);

    // Breach Response: a charge takes a door; coordinated entry opens one with cover, cheaper when drilled
    { const [u, v] = as('breach'); setDoor(u.x, u.y - 1, 'closed'); const c = kit('breach_charge'); u.items = [c];
      const placed = T.place(u, c, u.x, u.y - 1); const door = Lv.door.get(idx(u.x, u.y - 1)).state;
      as('breach'); setDoor(u.x, u.y - 1, 'closed'); v.gun.ammo = Math.max(1, v.gun.ammo); const costDrilled = T.techCost(u, 'sq_coordinated_entry');
      T.runTech(u, 'sq_coordinated_entry', u); const again = why(u, 'sq_coordinated_entry');
      out.breach = { placed, door, uses: c.uses, open: Lv.door.get(idx(u.x, u.y - 1)).state, cover: v.overwatch, costDrilled, cost0: (u.stage = 0, T.techCost(u, 'sq_coordinated_entry')), again };
    }
    // Security: a barrier is half cover; hold the line adds reaction shots to a watching neighbour
    { const [u, v] = as('security'); const c = kit('barricade'); u.items = [c]; const exitBlocked = (Lv.exitMap[idx(u.x, u.y + 1)] = 0, T.placeOptions(u, 'barricade').has(idx(u.x, u.y + 1))); Lv.exitMap[idx(u.x, u.y + 1)] = 99;
      T.place(u, c, u.x, u.y - 1); const tile = Lv.grid[u.y - 1][u.x];
      v.overwatch = true; v.overwatchShots = 1; u.ap = 2; const t = T.techTargets(u, 'sq_hold_line').length; T.runTech(u, 'sq_hold_line', u);
      out.security = { tile, half: G.HALF, exitBlocked, t, shots: v.overwatchShots };
    }
    // Recovery: the stretcher team doesn't slow; a transfer at an exit saves the carried; drilled grace on bleed-out
    { const [u, v, w] = as('recovery'); u.items = [kit('stretcher')]; w.downed = true; w.alive = true; u.carrying = w.id; w.carriedBy = u.id;
      const before = T.moveAdjust(u); T.runTech(u, 'sq_two_person_evac', u); const after = T.moveAdjust(u);
      Lv.exitMap[idx(u.x, u.y)] = 0; u.ap = 2; const tt = T.techTargets(u, 'sq_secure_transfer').length; T.runTech(u, 'sq_secure_transfer', u);
      const saved = w.saved; w.saved = false; w.downed = false; w.carriedBy = undefined;
      const [a, x] = as('recovery'); x.downed = true; x.graceUsed = false; const g1 = T.bleedGrace(x), g2 = T.bleedGrace(x); x.downed = false; x.graceUsed = false;
      out.recovery = { before, after, tt, saved, g1, g2 };
    }
    // Fire Support: drilled suppression spends one round; covering lane gives two pinning reaction shots; the shift moves suppression
    { const [u] = as('fire'); const r1 = T.suppressRounds(u); u.stage = 0; const r0 = T.suppressRounds(u); u.stage = 1; u.gun.ammo = u.gun.mag;
      T.runTech(u, 'sq_covering_lane', u); const shots = u.overwatchShots, ap = u.ap;
      const f = foe(u.x + 2, u.y); T.afterReaction(u, f); const pinned = (f.suppressedUntil ?? -1) >= S.turn;
      const g = foes[1]; g.x = u.x + 3; g.y = u.y + 1; A.computeVis(); f.suppressedBy = u.id; u.ap = 2;
      const tg = T.techTargets(u, 'sq_suppression_shift'); if (tg.length) T.runTech(u, 'sq_suppression_shift', tg[0]);
      out.fire = { r1, r0, shots, ap, pinned, shift: tg.length > 0 && tg[0].suppressedBy === u.id && f.suppressedBy === undefined };
    }
    // Quarantine: a cordon line of three tiles stops growth; controlled crossing is marked incomplete
    { const [u] = as('quarantine'); const c = kit('cordon_kit'); u.items = [c]; T.place(u, c, u.x, u.y - 1);
      out.quarantine = { line: S.cordon.size, blocks: T.blocksFlesh(idx(u.x, u.y - 1)), crossing: why(u, 'sq_controlled_crossing'), fireBurns: (T.burnCordon(idx(u.x, u.y - 1)), !S.cordon.has(idx(u.x, u.y - 1))) };
      u.armorKind = 'contsuit'; u.suitTorn = false; out.quarantine.zone = T.fleshSafe(u); u.stage = 0; out.quarantine.zone0 = T.fleshSafe(u); u.armorKind = undefined;
    }
    // Incendiary: a firebreak puts out and keeps out fire, and growth
    { const [u] = as('incendiary'); const c = kit('firebreak_kit'); u.items = [c]; S.fires.set(idx(u.x, u.y - 1), 3); T.place(u, c, u.x, u.y - 1);
      out.incendiary = { out: !S.fires.has(idx(u.x, u.y - 1)), blocksFire: T.blocksFire(idx(u.x, u.y - 1)), blocksFlesh: T.blocksFlesh(idx(u.x - (u.x > u.x - 1 ? 0 : 0), u.y - 1)) };
    }
    // Decontamination: the sweep cleans corrosion and fire but not SCP-610's growth; Clean Route; isolation incomplete
    { const [u] = as('decon'); const c = kit('decon_agent'); u.items = [c]; S.corroded.add(idx(u.x, u.y - 1)); S.flesh.add(idx(u.x + 1, u.y - 1)); T.place(u, c, u.x, u.y - 1);
      out.decon = { cleaned: !S.corroded.has(idx(u.x, u.y - 1)), flesh: S.flesh.has(idx(u.x + 1, u.y - 1)), safe: T.corrosionSafe(u), iso: why(u, 'sq_equipment_isolation') };
    }
    // Hazardous Recovery: a sealed sample from the growth; unsuited handling risks infection
    { const [u] = as('hazrecovery'); const c = kit('sample_case', 2); u.items = [c]; S.flesh.add(idx(u.x, u.y - 1)); const s0 = S.samples ?? 0;
      u.armorKind = 'hazmat'; A.rng.force(0); T.place(u, c, u.x, u.y - 1); const suited = !u.infected;
      u.armorKind = undefined; u.ap = 2; S.flesh.add(idx(u.x, u.y - 1)); T.place(u, c, u.x, u.y - 1); A.rng.force(null);
      out.hazrecovery = { samples: S.samples - s0, suited, unsuitedInfected: u.infectedTurn !== undefined }; u.infectedTurn = undefined;
    }
    // Heavy Infantry: anchored in cover with armor can't be pinned; protected advance incomplete
    { const [u] = as('heavyinf', 1, { hasArmor: true }); Lv.grid[u.y - 1][u.x] = G.HALF; G.bump(); const tt = T.techTargets(u, 'sq_anchor').length; T.runTech(u, 'sq_anchor', u);
      out.heavyinf = { tt, pinnable: T.pinnable(u), pa: why(u, 'sq_protected_advance') };
    }
    // Demolitions: a demolition charge takes a wall and costs secrecy; safe clearance turns a drum into cover
    { const [u] = as('demolitions'); const c = kit('demo_charge'); u.items = [c]; Lv.grid[u.y - 1][u.x] = G.WALL; G.bump(); const col = S.collateral ?? 0;
      const ok = T.place(u, c, u.x, u.y - 1); const wall = Lv.grid[u.y - 1][u.x] === G.FLOOR;
      u.ap = 2; Lv.grid[u.y + 1][u.x] = G.DRUM; G.bump(); T.runTech(u, 'sq_safe_clearance', u);
      const drum = Lv.grid[u.y + 1][u.x] === G.HALF;
      const [bu] = as('breach'); Lv.grid[bu.y - 1][bu.x] = G.WALL; G.bump(); const breachWall = T.placeOptions(bu, 'breach_charge').has(idx(bu.x, bu.y - 1));
      out.demolitions = { ok, wall, collateral: (S.collateral ?? 0) - col, drum, breachWall };
    }
    // Heavy Weapons: an emplaced gun can't move, sweeps an area, and packs up; cost reductions don't stack below 1
    { const [u] = as('heavyweapons', 1, { mtfSpec: 'heavy' }); const gun0 = u.gun; u.gun = { ...gun0, type: 'mg', ammo: 8, mag: 8 };
      const cost = T.techCost(u, 'sq_emplace'); T.runTech(u, 'sq_emplace', u); const move = T.moveAdjust(u);
      const f = foe(u.x + 2, u.y + 1); foes[1].x = u.x + 3; foes[1].y = u.y + 1; A.computeVis(); u.ap = 2;
      const tg = T.techTargets(u, 'sq_interdiction'); if (tg.length) T.runTech(u, 'sq_interdiction', f);
      const pinned = foes.slice(0, 2).filter(v => (v.suppressedUntil ?? -1) >= S.turn).length, ammo = u.gun.ammo; u.ap = 2; T.runTech(u, 'sq_pack', u);
      out.heavyweapons = { cost, move, tg: tg.length, pinned, ammo, packed: !u.emplaced }; u.gun = gun0;
    }
    // Engineering: sandbags give full cover or rehang a blown door; emergency restore shuts a blown door
    { const [u] = as('engineering'); const c = kit('sandbags', 2); u.items = [c]; T.place(u, c, u.x, u.y - 1); const full = Lv.grid[u.y - 1][u.x] === G.FULL;
      u.ap = 2; setDoor(u.x, u.y + 1, 'destroyed'); T.runTech(u, 'sq_restore', u);
      out.engineering = { full, restored: Lv.door.get(idx(u.x, u.y + 1)).state };
    }
    // Infiltration: silent approach halves the noise and costs a tile; it doesn't stack with the passive; covert access is quiet unless watched
    { const [u] = as('infiltration'); const p0 = T.footstepScale(u); T.runTech(u, 'sq_silent_approach', u); const p1 = T.footstepScale(u), m1 = T.moveAdjust(u);
      u.ap = 2; setDoor(u.x, u.y - 1, 'closed'); T.runTech(u, 'sq_covert_access', u); const quiet = Lv.door.get(idx(u.x, u.y - 1)).state;
      out.infiltration = { p0, p1, m1, quiet };
    }
    // Surveillance: an observation post adds sight and logs enemies; confirm target is a clue
    { const [u] = as('surveillance'); Lv.grid[u.y - 1][u.x] = G.HALF; G.bump(); const c0 = S.clues ?? 0; const f = foe(u.x + 3, u.y + 2); S.observed = [];
      T.runTech(u, 'sq_observation_post', u); const sight = T.sightAdjust(u); u.ap = 2; const tg = T.techTargets(u, 'sq_confirm_target'); if (tg.length) T.runTech(u, 'sq_confirm_target', tg[0]);
      out.surveillance = { sight, clues: S.clues - c0, tg: tg.length };
    }
    // Tracking: enemies leave trails; reading one marks a direction; tags keep it
    { const [u] = as('tracking'); const f = foes[0]; T.leaveTrail(f, u.x + 1, u.y, u.x + 2, u.y); const m0 = S.marks.size;
      const tt = T.techTargets(u, 'sq_read_sign').length; T.runTech(u, 'sq_read_sign', u); const c = kit('field_tags', 2); u.items = [c]; u.ap = 2; T.runTech(u, 'sq_mark_trail', u);
      out.tracking = { tt, marked: S.marks.size > m0, tagged: !!S.trails.get(idx(u.x + 1, u.y))?.tagged, uses: c.uses };
    }
    // Forward Recon: route recon is a clue; designate insertion makes a real exit tile
    { const [u] = as('forwardrecon'); const c0 = S.clues; T.runTech(u, 'sq_route_recon', u); const c = kit('field_tags'); u.items = [c]; u.ap = 2; T.place(u, c, u.x, u.y - 1);
      out.forwardrecon = { clues: S.clues - c0, exit: Lv.grid[u.y - 1][u.x] === G.EXIT && Lv.exitMap[idx(u.x, u.y - 1)] === 0 };
    }
    // AP, cooldown, certification and knowledge gates
    { const [u, v] = as('breach'); u.ap = 0; const noAp = why(u, 'sq_coordinated_entry'); u.ap = 2; u.qualified = false; u.items = [kit('breach_charge')]; const cert = T.placeCheck(u, 'breach_charge');
      u.qualified = true; const other = why(u, 'sq_perimeter'); v.x = u.x + 4; const alone = why(u, 'sq_coordinated_entry');
      out.gates = { noAp, cert, other, alone, legacy: (S.setup.mtfRules = false, u.specialty = undefined, T.techKnown(u, 'sq_perimeter')) }; S.setup.mtfRules = true;
    }
    out.used = S.techUsed.length;
    return out;
  });
  const r = results;
  check(r.breach.placed && r.breach.door === 'destroyed' && r.breach.uses === 0 && r.breach.open === 'open' && r.breach.cover && r.breach.costDrilled === 1 && r.breach.cost0 === 2 && /again/.test(r.breach.again), 'Breach Response: charge takes a door; coordinated entry covers the room, 1 action when drilled, squad cooldown', r.breach);
  check(r.security.tile === r.security.half && !r.security.exitBlocked && r.security.t === 1 && r.security.shots === 2, 'Security: barrier gives half cover and never blocks an exit; hold the line adds a reaction shot', r.security);
  check(r.recovery.before === 0 && r.recovery.after === 1 && r.recovery.tt === 1 && r.recovery.saved && r.recovery.g1 && !r.recovery.g2, 'Recovery: stretcher team keeps pace, transfer at an exit saves them, bleed-out grace once', r.recovery);
  check(r.fire.r1 === 1 && r.fire.r0 === 2 && r.fire.shots === 2 && r.fire.ap === 0 && r.fire.pinned && r.fire.shift, 'Fire Support: drilled suppression costs a round, covering lane pins, suppression shifts', r.fire);
  check(r.quarantine.line === 3 && r.quarantine.blocks && /Not available yet/.test(r.quarantine.crossing) && r.quarantine.fireBurns && r.quarantine.zone && !r.quarantine.zone0, 'Quarantine: isolation line of three stops growth, fire burns it, Zone Discipline from Drilled; crossing marked incomplete', r.quarantine);
  check(r.incendiary.out && r.incendiary.blocksFire && r.incendiary.blocksFlesh, 'Incendiary Containment: firebreak puts out and keeps out fire and growth', r.incendiary);
  check(r.decon.cleaned && r.decon.flesh && r.decon.safe && /Not available yet/.test(r.decon.iso), 'Decontamination: sweep cleans corrosion but not growth; Clean Route; isolation marked incomplete', r.decon);
  check(r.hazrecovery.samples === 2 && r.hazrecovery.suited && r.hazrecovery.unsuitedInfected, 'Hazardous Recovery: sealed samples, safe in a suit when drilled, risky without one', r.hazrecovery);
  check(r.heavyinf.tt === 1 && !r.heavyinf.pinnable && /Not available yet/.test(r.heavyinf.pa), 'Heavy Infantry: anchored in cover cannot be pinned; protected advance marked incomplete', r.heavyinf);
  check(r.demolitions.ok && r.demolitions.wall && r.demolitions.collateral === 1 && r.demolitions.drum && !r.demolitions.breachWall, 'Demolitions: charges take walls (breaching charges never do), cost secrecy, and drums are made safe', r.demolitions);
  check(r.heavyweapons.cost === 1 && r.heavyweapons.move < -50 && r.heavyweapons.tg >= 1 && r.heavyweapons.pinned === 2 && r.heavyweapons.ammo === 4 && r.heavyweapons.packed, 'Heavy Weapons: emplace (never below 1 action), cannot move, area interdiction, pack up', r.heavyweapons);
  check(r.engineering.full && r.engineering.restored === 'closed', 'Engineering: sandbags give full cover; a blown door is rehung', r.engineering);
  check(r.infiltration.p0 === 0.8 && r.infiltration.p1 === 0.5 && r.infiltration.m1 === -1 && r.infiltration.quiet === 'open', 'Infiltration: silent approach halves footsteps (no stacking with the passive), costs a tile, opens doors quietly', r.infiltration);
  check(r.surveillance.sight === 2 && r.surveillance.tg >= 1 && r.surveillance.clues >= 2, 'Surveillance: observation post adds sight and logs crossings; confirmed targets are clues', r.surveillance);
  check(r.tracking.tt === 1 && r.tracking.marked && r.tracking.tagged && r.tracking.uses === 1, 'Tracking: trails are read as a direction and tagged with field tags', r.tracking);
  check(r.forwardrecon.clues === 1 && r.forwardrecon.exit, 'Forward Recon: route survey is a clue; designated insertion is a real exit', r.forwardrecon);
  check(/action/.test(r.gates.noAp) && /certified/.test(r.gates.cert) && /doesn't train/.test(r.gates.other) && /more of the squad/.test(r.gates.alone) && r.gates.legacy, '9/10. techniques check actions, certification, specialty and participants; old campaigns keep plain charges and barriers', r.gates);

  // the ability bar offers the squad's techniques with reasons
  const selId = await E(() => { const S = window.__site19.mission, u = S.units.find(u => u.side === 'mtf' && u.squadId && u.alive && !u.downed && !u.saved); u.ap = 2; u.specialty = 'breach'; u.stage = 1; u.qualified = true; return u.id; });
  await p.click(`.op[data-id="${selId}"]`).catch(e => console.log('select', e.message)); await p.waitForTimeout(200);
  const bar = await E(() => [...document.querySelectorAll('[data-ability^="sq_"]')].map(b => b.dataset.ability + (b.disabled ? ':off' : ':on')));
  check(bar.length >= 1, 'the mission ability bar lists squad techniques', bar);
  await p.screenshot({ path: require('path').join(L.OUT, 'v12-mission.png') });

  // ---------------------------------------------------------------- debrief and persistence
  const deb = await E(() => { const A = window.__site19, c = A.campaign, [s1] = c.mtfs[0].squads; const m0 = s1.mastery ?? 0;
    const S = A.mission; S.techSquads = [s1.id]; S.clues = 2; S.samples = 1; S.collateral = 1;
    return { m0, sq: s1.id };
  });
  await L.dbg(p, 'win'); await p.waitForTimeout(400); await L.close(p);
  const after = await E(s => { const c = window.__site19.campaign, sq = c.mtfs[0].squads.find(x => x.id === s); return { mastery: sq.mastery, intel: c.intel, kitBack: c.inventory.breach_charge }; }, deb.sq);
  check(after.mastery === deb.m0 + 1, '8d. a mission where the squad used its specialty adds mastery', { deb, after });
  await E(() => { const c = window.__site19.campaign, [s1] = c.mtfs[0].squads; s1.mastery = 9; s1.drilled = 2; window.__site19.save(); });
  await p.reload(); await p.waitForTimeout(400);
  const per = await E(() => { const c = window.__site19.campaign, [s1, s2] = c.mtfs[0].squads; return { m: s1.mastery, d: s1.drilled, stage: window.__site19.org.squadStage(s1), quals: c.roster[8].quals, spec: s2.specialty, archived: s2.archived }; });
  check(per.m === 9 && per.d === 2 && per.stage === 2 && per.quals?.includes('breach') && per.spec === 'security' && per.archived?.security === 4, '14. squad stage, mastery, certifications and archived mastery persist through save and load', per);

  // ---------------------------------------------------------------- the organization board
  await L.close(p); await p.click('[data-tab="personnel"]'); await p.waitForTimeout(300); await p.click('[data-archive="org"]', { timeout: 3000 }).catch(async e => { console.log('board', e.message.split('\n')[0], await p.evaluate(() => [document.querySelector('main')?.className, [...document.querySelectorAll('[data-enter],[data-tab]')].map(x => x.dataset.enter || x.dataset.tab).join(',')])); await p.screenshot({ path: require('path').join(L.OUT, 'v12-board-miss.png') }); });
  await p.waitForTimeout(300);
  const board = await E(() => { const el = document.querySelector('.sqcap'); return el ? { n: document.querySelectorAll('.sqcap').length, techs: el.querySelectorAll('.techs li').length, text: el.textContent.slice(0, 200) } : null; });
  if (board) await p.screenshot({ path: require('path').join(L.OUT, 'v12-board.png') });
  check(board && board.n >= 2 && board.techs >= 2 && /Proficient|Drilled|Authorized|Veteran/.test(board.text), 'the organization board shows each squad\'s stage, techniques and kit', board);

  check(!errs.length, 'no page errors', errs);
  R.done(); await b.close();
})();
