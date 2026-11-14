import { RECIPES, gateId } from './content'
export const HEIGHT = 640,
  PLAYER_W = 34,
  PLAYER_H = 62,
  FLOOR = 488,
  ROOM = 1000
const clamp = (n, a, b) => Math.max(a, Math.min(b, n))
export const overlaps = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
export function createLevel(index) {
  const solids = [],
    moving = [],
    crumbles = [],
    hazards = [],
    switches = [],
    builds = [],
    springs = [],
    pickups = [],
    coins = [],
    gates = [],
    signs = [],
    enemies = []
  const world = Math.floor(index / 2),
    recipes = RECIPES[index]
  function tile(x, y, w, h = 32, kind = 'stone') {
    const t = { x, y, w, h, kind }
    solids.push(t)
    return t
  }
  for (let i = 0; i < 5; i++) {
    const x = i * ROOM,
      recipe = recipes[i]
    signs.push({ x: x + 90, y: FLOOR - 85, type: recipe })
    let gap = null
    if (['gap', 'moving', 'crumble', 'build', 'spring'].includes(recipe))
      gap =
        recipe === 'gap'
          ? [x + 430, x + 570]
          : recipe === 'spring'
            ? [x + 390, x + 730]
            : [x + 340, x + 690]
    if (gap) {
      tile(x, FLOOR, gap[0] - x, 220, 'ground')
      tile(gap[1], FLOOR, x + ROOM - gap[1], 220, 'ground')
    } else tile(x, FLOOR, ROOM, 220, recipe === 'ice' ? 'ice' : 'ground')
    if (recipe === 'stairs') {
      tile(x + 255, 416, 100, 72)
      tile(x + 345, 344, 100, 144)
      tile(x + 435, 272, 110, 216)
      tile(x + 545, 344, 95, 144)
      tile(x + 635, 416, 95, 72)
      for (let n = 0; n < 4; n++)
        coins.push({ id: `${i}:top:${n}`, x: x + 300 + n * 92, y: 370 - Math.min(n, 2) * 70 })
    }
    if (recipe === 'moving')
      moving.push({
        id: i,
        x: x + 330,
        y: 410,
        w: 125,
        h: 26,
        base: x + 330,
        range: 240,
        phase: 0,
        speed: 0.9 + world * 0.12,
        dx: 0,
        kind: 'moving'
      })
    if (recipe === 'crumble')
      for (let n = 0; n < 3; n++)
        crumbles.push({
          id: i * 3 + n,
          x: x + 350 + n * 120,
          y: 426 - (n % 2) * 43,
          w: 92,
          h: 25,
          timer: 0,
          down: 0,
          kind: 'crumble'
        })
    if (recipe === 'switch') {
      switches.push({ id: i, x: x + 290, y: FLOOR - 42, w: 30, h: 42, on: false })
      tile(x + 685, FLOOR - 170, 46, 170, 'barrier').switchId = i
      tile(x + 470, FLOOR - 75, 110, 25)
    }
    if (recipe === 'build') {
      builds.push({
        id: i,
        x: x + 285,
        y: FLOOR - 10,
        w: 45,
        h: 10,
        built: false,
        cost: 3,
        start: x + 340,
        end: x + 690
      })
      for (let n = 0; n < 3; n++)
        pickups.push({
          id: `wood:${i}:${n}`,
          x: x + 150 + n * 47,
          y: FLOOR - 30,
          w: 23,
          h: 23,
          taken: false,
          type: 'wood'
        })
    }
    if (recipe === 'spring') {
      springs.push({ x: x + 325, y: FLOOR - 17, w: 45, h: 17 })
      tile(x + 510, 298, 145, 25)
      tile(x + 740, 376, 120, 25)
      for (let n = 0; n < 4; n++)
        coins.push({ id: `${i}:air:${n}`, x: x + 430 + n * 65, y: 235 - Math.sin(n) * 35 })
    }
    if (recipe === 'spikes') {
      hazards.push({ x: x + 390, y: FLOOR - 26, w: 100, h: 26, type: 'spikes' })
      tile(x + 280, 414, 95, 25)
      tile(x + 500, 375, 105, 25)
      hazards.push({
        x: x + 650,
        y: FLOOR - 53,
        w: 42,
        h: 42,
        type: 'saw',
        base: x + 650,
        range: 105,
        speed: 1.6 + world * 0.1
      })
    }
    if (recipe === 'ice') {
      tile(x + 330, 416, 150, 72, 'ice')
      tile(x + 550, 344, 130, 25, 'ice')
      hazards.push({ x: x + 745, y: FLOOR - 24, w: 70, h: 24, type: 'spikes' })
    }
    if (
      index > 1 &&
      ['gap', 'stairs', 'ice', 'switch', 'build', 'moving', 'spring'].includes(recipe)
    )
      enemies.push({
        id: i,
        x: x + 760,
        y: FLOOR - 30,
        w: 36,
        h: 30,
        min: x + 745,
        max: x + 820,
        dir: -1,
        speed: 50 + index * 5,
        alive: true
      })
    for (let n = 0; n < 5; n++)
      coins.push({ id: `${i}:base:${n}`, x: x + 80 + n * 40, y: FLOOR - 45 })
    gates.push({ id: gateId(index, i), local: i, x: x + 905, y: FLOOR - 236, w: 44, h: 236 })
  }
  tile(5000, FLOOR, 240, 220, 'ground')
  return {
    index,
    world,
    recipes,
    width: 5240,
    solids,
    moving,
    crumbles,
    hazards,
    switches,
    builds,
    springs,
    pickups,
    coins,
    gates,
    signs,
    enemies,
    finish: 5100
  }
}
export function createState(index, saved = {}) {
  const level = createLevel(index),
    solved = new Set(saved.gates || [])
  const last = level.gates.filter((g) => solved.has(g.id)).at(-1),
    spawn = last && !saved.restart ? last.x + 74 : 70
  return {
    level,
    player: {
      x: spawn,
      y: FLOOR - PLAYER_H,
      w: PLAYER_W,
      h: PLAYER_H,
      vx: 0,
      vy: 0,
      grounded: false,
      face: 1,
      coyote: 0,
      jumpBuffer: 0,
      invincible: 1,
      dash: 0,
      dashCooldown: 0
    },
    solved,
    collected: new Set((saved.coins || []).filter((id) => typeof id === 'string')),
    checkpoint: spawn,
    checkpointY: FLOOR - PLAYER_H,
    hearts: saved.hearts ?? 3,
    blocks: 0,
    time: 0,
    camera: Math.max(0, spawn - 280),
    particles: [],
    notifications: [],
    expression: 0,
    complete: false,
    pendingDamage: false,
    standing: null
  }
}
export function burst(s, x, y, color = '#ffe29b', n = 16) {
  for (let i = 0; i < n; i++) {
    if (s.particles.length >= 150) break
    s.particles.push({
      x,
      y,
      vx: Math.sin(i * 2.399) * 130,
      vy: -100 - Math.cos(i * 1.7) * 120,
      life: 0.8,
      color
    })
  }
}
export function solveGate(s, id) {
  if (s.solved.has(id)) return
  s.solved.add(id)
  const gate = s.level.gates.find((g) => g.id === id)
  if (gate) {
    s.checkpoint = gate.x + 74
    s.checkpointY = FLOOR - PLAYER_H
  }
  s.expression = 1.5
  burst(s, gate ? gate.x : s.player.x, FLOOR - 100, '#baffae', 30)
}
export function applyDamage(s, hearts, restart) {
  const solved = [...s.solved],
    coins = [...s.collected]
  if (restart) {
    const fresh = createState(s.level.index, { gates: solved, hearts, coins })
    Object.assign(s, fresh)
    s.checkpoint = 70
    s.player.x = 70
    s.camera = 0
  } else {
    s.player.x = s.checkpoint
    s.player.y = s.checkpointY
    s.player.vx = 0
    s.player.vy = 0
    s.player.grounded = false
    s.hearts = hearts
  }
  s.pendingDamage = false
  s.player.invincible = 1.7
}
function hit(s, events) {
  if (s.player.invincible > 0 || s.pendingDamage) return
  s.pendingDamage = true
  s.player.vx = 0
  events.push({ type: 'damage' })
}
export function interact(s) {
  const p = s.player,
    sw = s.level.switches.find(
      (t) => !t.on && Math.abs(t.x - p.x) < 85 && Math.abs(t.y - p.y) < 100
    )
  if (sw) {
    sw.on = true
    burst(s, sw.x, sw.y, '#baffad')
    return { type: 'switch', message: '¡Mecanismo activado! La barrera está abierta.' }
  }
  const build = s.level.builds.find((t) => !t.built && Math.abs(t.x - p.x) < 95)
  if (build) {
    if (s.blocks < build.cost)
      return {
        type: 'hint',
        message: 'Necesitas 3 bloques. Recoge los cubos de energía de este tramo.'
      }
    build.built = true
    s.blocks -= build.cost
    burst(s, build.x, build.y)
    return { type: 'build', message: '¡Puente construido! Tus bloques abrieron una nueva ruta.' }
  }
  return null
}
export function stepWorld(s, input, rawDt, viewWidth = 960) {
  const dt = clamp(rawDt, 0, 1 / 30),
    events = [],
    p = s.player
  if (s.pendingDamage) return events
  s.time += dt
  s.expression = Math.max(0, (s.expression || 0) - dt)
  for (const notice of s.notifications || []) notice.life -= dt
  s.notifications = (s.notifications || []).filter((n) => n.life > 0)
  p.invincible = Math.max(0, p.invincible - dt)
  p.dashCooldown = Math.max(0, p.dashCooldown - dt)
  p.dash = Math.max(0, p.dash - dt)
  p.coyote = p.grounded ? 0.1 : Math.max(0, p.coyote - dt)
  p.jumpBuffer = input.jump ? 0.12 : Math.max(0, p.jumpBuffer - dt)
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0),
    ice = s.standing?.kind === 'ice'
  const acceleration = ice ? 1100 : 2500,
    friction = ice ? 450 : 2600,
    target = direction * 310
  p.vx += clamp(
    target - p.vx,
    -(direction ? acceleration : friction) * dt,
    (direction ? acceleration : friction) * dt
  )
  if (direction) p.face = direction
  if (input.dash && p.dashCooldown === 0) {
    p.dash = 0.16
    p.dashCooldown = 0.85
    events.push({ type: 'dash' })
  }
  if (p.dash > 0) p.vx = p.face * 510
  if (p.jumpBuffer > 0 && p.coyote > 0) {
    p.vy = -735
    p.grounded = false
    p.coyote = 0
    p.jumpBuffer = 0
    events.push({ type: 'jump' })
  }
  if (input.interact) {
    const event = interact(s)
    if (event) events.push(event)
  }
  const beforeX = p.x,
    oldY = p.y,
    oldBottom = p.y + p.h
  const activeSolids = s.level.solids.filter(
    (t) => t.kind !== 'barrier' || !s.level.switches.find((sw) => sw.id === t.switchId)?.on
  )
  for (const build of s.level.builds)
    if (build.built)
      activeSolids.push({
        x: build.start,
        y: FLOOR,
        w: build.end - build.start,
        h: 30,
        kind: 'built'
      })
  for (const moving of s.level.moving) {
    const old = moving.x
    moving.x =
      moving.base + (Math.sin(s.time * moving.speed - Math.PI / 2) + 1) * 0.5 * moving.range
    moving.dx = moving.x - old
    if (s.standing === moving) p.x += moving.dx
  }
  for (const tile of s.level.crumbles) {
    if (tile.down > 0) {
      tile.down = Math.max(0, tile.down - dt)
      if (tile.down === 0) tile.timer = 0
    } else if (tile.timer > 0) {
      tile.timer += dt
      if (tile.timer > 0.68) {
        tile.down = 3.6
        events.push({ type: 'crumble' })
      }
    }
  }
  p.x = clamp(p.x + p.vx * dt, 0, s.level.width - p.w)
  for (const t of activeSolids)
    if (overlaps(p, t) && p.y + p.h > t.y + 2 && p.y < t.y + t.h - 2) {
      if (beforeX + p.w <= t.x + 1) {
        p.x = t.x - p.w
        p.vx = 0
      } else if (beforeX >= t.x + t.w - 1) {
        p.x = t.x + t.w
        p.vx = 0
      }
    }
  for (const gate of s.level.gates)
    if (!s.solved.has(gate.id) && p.x + p.w > gate.x && p.x < gate.x + gate.w) {
      p.x = gate.x - p.w
      p.vx = 0
    }
  p.vy = Math.min(1000, p.vy + 1950 * dt)
  p.y += p.vy * dt
  p.grounded = false
  s.standing = null
  const surfaces = [
    ...activeSolids,
    ...s.level.moving,
    ...s.level.crumbles.filter((t) => t.down === 0)
  ]
  for (const tile of surfaces) {
    if (p.x + p.w <= tile.x || p.x >= tile.x + tile.w) continue
    if (p.vy >= 0 && oldBottom <= tile.y + 1 && p.y + p.h >= tile.y) {
      p.y = tile.y - p.h
      p.vy = 0
      p.grounded = true
      s.standing = tile
      if (tile.kind === 'crumble' && tile.timer === 0) tile.timer = 0.001
    } else if (p.vy < 0 && oldY >= tile.y + tile.h && p.y < tile.y + tile.h) {
      p.y = tile.y + tile.h
      p.vy = 0
    }
  }
  for (const spring of s.level.springs)
    if (p.grounded && p.x + p.w > spring.x && p.x < spring.x + spring.w) {
      p.vy = -1250
      p.grounded = false
      s.standing = null
      burst(s, spring.x, spring.y, '#a9f7ff', 8)
      events.push({ type: 'spring' })
    }
  if (p.y > HEIGHT + 75) hit(s, events)
  for (const hazard of s.level.hazards) {
    if (hazard.type === 'saw')
      hazard.x = hazard.base + Math.sin(s.time * hazard.speed) * hazard.range
    if (overlaps(p, hazard)) hit(s, events)
  }
  for (const enemy of s.level.enemies) {
    if (!enemy.alive) continue
    enemy.x += enemy.dir * enemy.speed * dt
    if (enemy.x < enemy.min || enemy.x > enemy.max) {
      enemy.x = clamp(enemy.x, enemy.min, enemy.max)
      enemy.dir *= -1
    }
    if (overlaps(p, enemy)) {
      if (p.vy > 0 && oldBottom <= enemy.y + 14) {
        enemy.alive = false
        p.vy = -460
        burst(s, enemy.x, enemy.y, '#e9b8fb')
        events.push({ type: 'stomp' })
      } else hit(s, events)
    }
  }
  for (const pickup of s.level.pickups)
    if (!pickup.taken && overlaps(p, pickup)) {
      pickup.taken = true
      s.blocks++
      burst(s, pickup.x, pickup.y, '#a5f5ef', 6)
      events.push({ type: 'block' })
    }
  for (const coin of s.level.coins)
    if (
      !s.collected.has(coin.id) &&
      overlaps(p, { x: coin.x - 12, y: coin.y - 12, w: 24, h: 24 })
    ) {
      s.collected.add(coin.id)
      burst(s, coin.x, coin.y, '#ffe28b', 5)
      events.push({ type: 'coin', id: coin.id, level: s.level.index })
    }
  const gate = s.level.gates.find((g) => !s.solved.has(g.id) && p.x + p.w > g.x - 100 && p.x < g.x)
  const action =
    s.level.switches.some((sw) => !sw.on && Math.abs(sw.x - p.x) < 85) ||
    s.level.builds.some((b) => !b.built && Math.abs(b.x - p.x) < 95)
  if (gate) events.push({ type: 'near', gate: gate.id })
  else if (action) events.push({ type: 'action' })
  if (p.x >= s.level.finish && s.level.gates.every((g) => s.solved.has(g.id)) && !s.complete) {
    s.complete = true
    events.push({ type: 'finish' })
    burst(s, p.x, p.y, '#baffae', 40)
  }
  const cameraTarget = clamp(p.x - viewWidth * 0.34, 0, Math.max(0, s.level.width - viewWidth))
  s.camera += (cameraTarget - s.camera) * Math.min(1, dt * 9)
  for (const part of s.particles) {
    part.x += part.vx * dt
    part.y += part.vy * dt
    part.vy += 260 * dt
    part.life -= dt
  }
  s.particles = s.particles.filter((p) => p.life > 0)
  return events
}
