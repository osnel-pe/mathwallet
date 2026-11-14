import { HEIGHT, FLOOR } from './engine'
import { WORLDS, MECHANICS } from './content'
const palettes = [
  ['#bd8e60', '#96613e', '#6ac589'],
  ['#e8be7e', '#a26b48', '#f4d08d'],
  ['#b8d6e3', '#7189aa', '#dcfaff'],
  ['#665984', '#3d3459', '#7ee0d3'],
  ['#866278', '#4e394c', '#f5ac82']
]
function rect(c, x, y, w, h, color) {
  c.fillStyle = color
  c.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h))
}
function round(c, x, y, w, h, r, color) {
  c.fillStyle = color
  c.beginPath()
  c.roundRect(x, y, w, h, r)
  c.fill()
}
function ellipse(c, x, y, rx, ry, color) {
  c.fillStyle = color
  c.beginPath()
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  c.fill()
}
function text(c, str, x, y, size = 12, color = '#fff', align = 'left') {
  c.font = `800 ${size}px ui-sans-serif,system-ui,sans-serif`
  c.textAlign = align
  c.fillStyle = color
  c.fillText(str, x, y)
}
function poly(c, pts, color) {
  c.fillStyle = color
  c.beginPath()
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
  c.closePath()
  c.fill()
}
const noise = (x, y) => Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1
function cube(c, x, y, w, h, palette, kind = 'stone', time = 0) {
  const [face, side, top] = palette
  rect(c, x, y, w, h, face)
  poly(
    c,
    [
      [x, y],
      [x + 8, y - 7],
      [x + w + 8, y - 7],
      [x + w, y]
    ],
    top
  )
  poly(
    c,
    [
      [x + w, y],
      [x + w + 8, y - 7],
      [x + w + 8, y + h - 7],
      [x + w, y + h]
    ],
    side
  )
  rect(c, x + 2, y + 2, w - 4, 3, '#ffffff25')
  rect(c, x, y + h - 4, w, 4, '#00000018')
  if (kind === 'ground' || kind === 'ice') {
    rect(c, x, y, w, 9, top)
    rect(c, x, y + 8, w, 3, '#2f61452c')
  }
  if (kind === 'ice') {
    poly(
      c,
      [
        [x + 4, y + 13],
        [x + w * 0.6, y + 4],
        [x + w * 0.25, y + h - 5]
      ],
      '#ffffff35'
    )
  }
  for (let i = 0; i < Math.ceil(w / 36); i++)
    for (let j = 0; j < Math.min(3, Math.ceil(h / 36)); j++) {
      const a = x + i * 36 + 9,
        b = y + j * 36 + 18,
        n = noise(a, b)
      if (n > 0.4) {
        rect(c, a, b, 5 + n * 7, 4, '#ffffff12')
        rect(c, a + 9, b + 10, 4, 3, '#00000013')
      }
    }
}
function crystal(c, x, y, color = '#ffe29e', size = 11) {
  poly(
    c,
    [
      [x, y - size],
      [x + size * 0.7, y],
      [x, y + size],
      [x - size * 0.7, y]
    ],
    color
  )
  poly(
    c,
    [
      [x, y - size],
      [x, y + size],
      [x - size * 0.7, y]
    ],
    '#fff4'
  )
  rect(c, x - 1, y - size / 2, 2, 5, '#fff9')
}
function tree(c, x, y, scale, world) {
  c.save()
  c.translate(x, y)
  c.scale(scale, scale)
  const foliage =
    world === 1 ? '#d6aa6d' : world === 2 ? '#c2dde6' : world === 3 ? '#6b739c' : '#479d78'
  cube(c, -7, -100, 15, 100, ['#8e6a50', '#634d43', '#a68564'])
  for (const [dx, dy, w] of [
    [-55, -136, 66],
    [-12, -165, 70],
    [-35, -202, 70],
    [15, -123, 49]
  ])
    cube(c, dx, dy, w, 45, [
      foliage,
      world === 2 ? '#7ba8bf' : '#30735f',
      world === 2 ? '#e1f5fb' : '#77ba8d'
    ])
  c.restore()
}
function background(c, s, view, world, t) {
  const sky = c.createLinearGradient(0, 0, 0, HEIGHT)
  sky.addColorStop(0, world.sky[0])
  sky.addColorStop(1, world.sky[1])
  c.fillStyle = sky
  c.fillRect(0, 0, view, HEIGHT)
  if (world.id >= 3) {
    for (let i = 0; i < 65; i++) {
      const x = (i * 131.7 - s.camera * 0.03) % (view + 160),
        y = 20 + ((i * 61) % 280)
      ellipse(c, x, y, 1 + (i % 3) * 0.4, 1 + (i % 3) * 0.4, '#eff5ffb0')
    }
    ellipse(c, view - 130, 85, 32, 32, '#ffdfa6')
    ellipse(c, view - 119, 76, 30, 30, world.sky[0])
  } else {
    ellipse(c, view - 140, 90, 42, 42, '#fff0b5')
    ellipse(c, view - 140, 90, 65, 65, '#fff0b519')
  }
  for (let layer = 0; layer < 3; layer++) {
    const speed = 0.08 + layer * 0.12,
      span = 320,
      offset = s.camera * speed
    for (let i = Math.floor(offset / span) - 1; i < Math.floor((offset + view) / span) + 2; i++) {
      const x = i * span - offset,
        h = 120 + (((i % 3) + 3) % 3) * 37 + layer * 16,
        y = FLOOR - 25 + layer * 12
      const colors =
        world.id === 0
          ? ['#7fb9b0', '#62a699', '#8bc3ac']
          : world.id === 1
            ? ['#d2ab8b', '#ba917d', '#deb48b']
            : world.id === 2
              ? ['#8fabc5', '#759db9', '#a5c7d9']
              : world.id === 3
                ? ['#34345d', '#3e426f', '#4c527b']
                : ['#68425c', '#7a4962', '#97596f']
      poly(
        c,
        [
          [x - 70, y],
          [x - 70, y - h * 0.45],
          [x - 20, y - h * 0.45],
          [x - 20, y - h * 0.72],
          [x + 45, y - h * 0.72],
          [x + 45, y - h],
          [x + 100, y - h],
          [x + 100, y - h * 0.65],
          [x + 170, y - h * 0.65],
          [x + 170, y]
        ],
        colors[layer]
      )
      if (layer === 0 && world.id === 2)
        poly(
          c,
          [
            [x + 45, y - h],
            [x + 100, y - h],
            [x + 100, y - h * 0.65],
            [x + 63, y - h * 0.7]
          ],
          '#d2e9f5'
        )
      if (layer === 1 && world.id === 3)
        for (let j = 0; j < 3; j++) crystal(c, x + 50 + j * 30, y - h * 0.55, '#8ed8d450', 13)
    }
  }
  // Nubes voxel y bruma en capas, sin texturas externas.
  if (world.id < 3)
    for (let i = 0; i < 8; i++) {
      const x = i * 260 - s.camera * 0.17 + Math.sin(t * 0.13 + i) * 5,
        y = 95 + (i % 3) * 52
      round(c, x, y, 105, 20, 4, '#ffffff50')
      round(c, x + 20, y - 19, 38, 28, 4, '#ffffff50')
      round(c, x + 49, y - 10, 40, 23, 4, '#ffffff50')
    }
  const mist = c.createLinearGradient(0, 300, 0, 520)
  mist.addColorStop(0, '#ffffff00')
  mist.addColorStop(1, world.id >= 3 ? '#a496f114' : '#e2f4ed40')
  c.fillStyle = mist
  c.fillRect(0, 300, view, 220)
}
function character(c, p, t, portrait, expression = 0) {
  c.save()
  c.translate(p.x + p.w / 2, p.y + p.h)
  c.scale(p.face, 1)
  if (p.invincible > 0 && Math.floor(t * 12) % 2 === 0) c.globalAlpha = 0.5
  ellipse(c, 0, 2, 15, 3, '#142c3c28')
  const speed = Math.min(1, Math.abs(p.vx) / 250)
  const walk = p.grounded ? Math.sin(t * 17) * speed : 0
  const cheer = Math.min(1, expression / 0.22)
  const airborne = !p.grounded && Math.abs(p.vy) > 40
  const bob = p.grounded ? -Math.abs(walk) * 1.2 : 0
  c.translate(0, bob)
  c.imageSmoothingEnabled = true
  c.imageSmoothingQuality = 'high'
  if (portrait?.complete && portrait.naturalWidth > 0) {
    const w = portrait.naturalWidth,
      h = portrait.naturalHeight
    const scale = 70 / (h * 0.991)
    c.save()
    c.scale(scale, scale)
    c.translate(-w * 0.5, -h * 0.995)
    // Rig de recortes del PNG original: cabeza, tronco, brazos y piernas.
    // Cada zona conserva el detalle de la imagen; no añade un cuerpo de bloques.
    function part(points, px, py, angle) {
      c.save()
      c.translate(px * w, py * h)
      c.rotate(angle)
      c.translate(-px * w, -py * h)
      c.beginPath()
      points.forEach(([x, y], i) => (i ? c.lineTo(x * w, y * h) : c.moveTo(x * w, y * h)))
      c.closePath()
      c.clip()
      c.drawImage(portrait, 0, 0)
      c.restore()
    }
    const leftLeg = [
      [0.365, 0.5],
      [0.505, 0.5],
      [0.505, 1],
      [0.31, 1],
      [0.315, 0.93],
      [0.36, 0.82],
      [0.37, 0.65]
    ]
    const rightLeg = [
      [0.5, 0.5],
      [0.635, 0.5],
      [0.635, 0.8],
      [0.67, 0.93],
      [0.675, 1],
      [0.505, 1]
    ]
    part(leftLeg, 0.425, 0.52, airborne ? 0.18 : walk * 0.24)
    part(rightLeg, 0.575, 0.52, airborne ? -0.14 : -walk * 0.24)
    part(
      [
        [0.35, 0.22],
        [0.65, 0.22],
        [0.66, 0.29],
        [0.625, 0.34],
        [0.63, 0.49],
        [0.65, 0.555],
        [0.35, 0.555],
        [0.37, 0.49],
        [0.375, 0.34],
        [0.34, 0.29]
      ],
      0.5,
      0.52,
      walk * 0.018
    )
    const lift = Math.min(2.4, cheer * 2.4 + (airborne ? 1.65 : 0))
    part(
      [
        [0.35, 0.235],
        [0.405, 0.29],
        [0.405, 0.43],
        [0.395, 0.59],
        [0.31, 0.625],
        [0.27, 0.55],
        [0.275, 0.43],
        [0.31, 0.3]
      ],
      0.363,
      0.265,
      lift + walk * 0.3
    )
    part(
      [
        [0.65, 0.235],
        [0.595, 0.29],
        [0.595, 0.43],
        [0.605, 0.59],
        [0.69, 0.625],
        [0.74, 0.55],
        [0.735, 0.43],
        [0.69, 0.3]
      ],
      0.637,
      0.265,
      -lift - walk * 0.3
    )
    part(
      [
        [0.32, 0],
        [0.68, 0],
        [0.68, 0.225],
        [0.62, 0.255],
        [0.38, 0.255],
        [0.32, 0.225]
      ],
      0.5,
      0.225,
      walk * 0.025 + Math.sin(t * 6) * cheer * 0.045
    )
    c.restore()
    if (cheer > 0) {
      c.globalAlpha *= cheer
      crystal(c, -15, -80, '#fff0a1', 4)
      crystal(c, 17, -76, '#bff8cf', 3)
    }
  } else ellipse(c, 0, -25, 7, 7, '#c4efb080')
  c.restore()
}
export function renderWorld(c, s, width, height, portrait, reduced = false) {
  const scale = height / HEIGHT,
    view = width / scale,
    world = WORLDS[s.level.world],
    palette = palettes[world.id],
    t = reduced ? 0 : s.time
  c.save()
  c.scale(scale, scale)
  background(c, s, view, world, t)
  c.translate(-s.camera, 0)
  const min = s.camera - 100,
    max = s.camera + view + 100,
    visible = (t) => t.x + t.w > min && t.x < max
  for (let i = Math.floor(min / 270); i < Math.ceil(max / 270); i++) {
    const x = i * 270 + 100
    if (world.id === 0 || world.id === 2) tree(c, x, FLOOR, 0.8 + (i % 2) * 0.15, world.id)
    else if (world.id === 1) {
      cube(c, x, 350, 70, 138, ['#c49866', '#9d704e', '#e8c58b'])
      cube(c, x - 12, 340, 93, 17, ['#d3ab75', '#a67b52', '#f0d398'])
    } else if (world.id === 3) {
      crystal(c, x, FLOOR - 50, '#8ee9de40', 40)
      crystal(c, x + 35, FLOOR - 24, '#c6b0ff40', 24)
    }
  }
  // Subsuelo: agua, hielo profundo o lava viva bajo los saltos.
  const floorColor =
    world.id === 4 ? '#e07562' : world.id === 3 ? '#424069' : world.id === 2 ? '#639dbb' : '#60b9b1'
  rect(c, min, FLOOR + 85, max - min, HEIGHT, floorColor)
  for (let x = Math.floor(min / 45) * 45; x < max; x += 45)
    rect(
      c,
      x,
      FLOOR + 84 + Math.sin(x * 0.04 + t * 2) * 5,
      30,
      4,
      world.id === 4 ? '#ffcc7b' : '#d1f6f450'
    )
  const barriers = s.level.solids.filter(
    (tile) => tile.kind !== 'barrier' || !s.level.switches.find((sw) => sw.id === tile.switchId)?.on
  )
  for (const tile of barriers) {
    if (!visible(tile)) continue
    if (tile.kind === 'barrier') {
      cube(c, tile.x, tile.y, tile.w, tile.h, ['#514a70', '#302d48', '#aba0ce'])
      for (let y = tile.y + 15; y < tile.y + tile.h; y += 29)
        rect(c, tile.x + 6, y, tile.w - 12, 4, '#dfc6fc70')
      continue
    }
    const tileMin = Math.max(tile.x, Math.floor(min / 40) * 40)
    for (let x = tileMin; x < Math.min(tile.x + tile.w, max); x += 40) {
      const w = Math.min(40, tile.x + tile.w - x)
      cube(c, x, tile.y, w, tile.h, palette, tile.kind, t)
    }
  }
  for (const platform of s.level.moving)
    if (visible(platform)) {
      cube(c, platform.x, platform.y, platform.w, platform.h, ['#ccad75', '#836b50', '#ffdfa2'])
      for (let i = 0; i < 4; i++) rect(c, platform.x + 10 + i * 28, platform.y + 7, 15, 4, '#fff3')
      text(c, '↔', platform.x + platform.w / 2, platform.y - 12, 20, world.accent, 'center')
    }
  for (const tile of s.level.crumbles)
    if (visible(tile) && tile.down === 0) {
      const shake = tile.timer ? Math.sin(t * 65) * 2 : 0
      cube(c, tile.x + shake, tile.y, tile.w, tile.h, ['#b6a1a0', '#786576', '#ead2c1'])
      poly(
        c,
        [
          [tile.x + 30, tile.y],
          [tile.x + 45, tile.y + 10],
          [tile.x + 32, tile.y + 20]
        ],
        '#655367'
      )
    }
  for (const build of s.level.builds) {
    if (build.x < min || build.x > max) continue
    if (build.built) {
      for (let x = build.start; x < build.end; x += 42)
        cube(c, x, FLOOR, Math.min(42, build.end - x), 30, ['#bb905b', '#805d42', '#e0ba7e'])
    } else {
      for (let x = build.start; x < build.end; x += 45) {
        c.strokeStyle = '#c5fff070'
        c.setLineDash([5, 5])
        c.strokeRect(x, FLOOR, 40, 22)
        c.setLineDash([])
      }
      text(c, '▧  3 BLOQUES', build.x, FLOOR - 35, 11, '#eaffd0', 'center')
    }
  }
  for (const sw of s.level.switches) {
    cube(c, sw.x, sw.y + 24, 30, 18, ['#8f8e9e', '#55566f', '#bfc4cb'])
    c.lineWidth = 6
    c.strokeStyle = sw.on ? '#b9ffb1' : '#ffd48a'
    c.beginPath()
    c.moveTo(sw.x + 15, sw.y + 25)
    c.lineTo(sw.x + (sw.on ? 28 : 1), sw.y + 2)
    c.stroke()
    ellipse(c, sw.x + (sw.on ? 28 : 1), sw.y + 2, 7, 7, sw.on ? '#c2ffbe' : '#ffd48a')
  }
  for (const spring of s.level.springs) {
    cube(c, spring.x, spring.y + 8, spring.w, 9, ['#5f8497', '#3b5668', '#a9e4e6'])
    for (let j = 0; j < 3; j++)
      rect(c, spring.x + 7, spring.y + 3 - j * 4, spring.w - 14, 2, '#b5f6ff')
    text(c, '↑', spring.x + 22, spring.y - 12, 22, '#c4faff', 'center')
  }
  for (const pickup of s.level.pickups)
    if (!pickup.taken && pickup.x > min && pickup.x < max) {
      const bob = Math.sin(t * 3 + pickup.x) * 4
      cube(c, pickup.x, pickup.y + bob, 22, 22, ['#79c6b0', '#387e70', '#c5ffe0'])
      rect(c, pickup.x + 7, pickup.y + 5 + bob, 8, 11, '#fff6')
    }
  for (const coin of s.level.coins)
    if (!s.collected.has(coin.id) && coin.x > min && coin.x < max)
      crystal(c, coin.x, coin.y + Math.sin(t * 3 + coin.x) * 4)
  for (const hazard of s.level.hazards) {
    if (!visible(hazard)) continue
    if (hazard.type === 'spikes')
      for (let x = hazard.x; x < hazard.x + hazard.w; x += 20) {
        poly(
          c,
          [
            [x, hazard.y + hazard.h],
            [x + 10, hazard.y],
            [x + 20, hazard.y + hazard.h]
          ],
          world.id === 4 ? '#ffc77d' : '#d1e7ef'
        )
        poly(
          c,
          [
            [x + 10, hazard.y],
            [x + 20, hazard.y + hazard.h],
            [x + 10, hazard.y + hazard.h]
          ],
          '#8294a9'
        )
      }
    else {
      c.save()
      c.translate(hazard.x + 21, hazard.y + 21)
      c.rotate(t * 5)
      for (let n = 0; n < 10; n++) {
        c.rotate(Math.PI / 5)
        poly(
          c,
          [
            [12, -4],
            [25, 0],
            [12, 6]
          ],
          '#c9d4e2'
        )
      }
      ellipse(c, 0, 0, 16, 16, '#6c7d97')
      ellipse(c, 0, 0, 5, 5, '#f3d3a2')
      c.restore()
    }
  }
  for (const enemy of s.level.enemies)
    if (enemy.alive && visible(enemy)) {
      const bob = Math.sin(t * 8) * 2
      cube(c, enemy.x, enemy.y + bob, enemy.w, enemy.h, ['#9880b6', '#5f4d81', '#c5abe2'])
      rect(c, enemy.x + 7, enemy.y + 10, 7, 8, '#fff')
      rect(c, enemy.x + 23, enemy.y + 10, 7, 8, '#fff')
      rect(c, enemy.x + 8, enemy.y + 12, 3, 4, '#293348')
      rect(c, enemy.x + 24, enemy.y + 12, 3, 4, '#293348')
    }
  for (const gate of s.level.gates) {
    if (!visible(gate)) continue
    const open = s.solved.has(gate.id),
      center = gate.x + 22
    cube(c, gate.x - 9, gate.y, 12, gate.h, ['#678d97', '#36565e', '#b1d1d0'])
    cube(c, gate.x + 43, gate.y, 12, gate.h, ['#678d97', '#36565e', '#b1d1d0'])
    cube(c, gate.x - 9, gate.y - 9, 64, 23, ['#678d97', '#36565e', '#b1d1d0'])
    if (!open) {
      const glow = c.createLinearGradient(gate.x, 0, gate.x + 44, 0)
      glow.addColorStop(0, '#4fa5bc80')
      glow.addColorStop(0.5, '#b0e2e34a')
      glow.addColorStop(1, '#4fa5bc80')
      c.fillStyle = glow
      c.fillRect(gate.x + 3, gate.y + 16, 40, gate.h - 16)
      for (let j = 0; j < 6; j++)
        rect(c, gate.x + 5, gate.y + 34 + j * 31 + Math.sin(t * 2 + j) * 3, 36, 3, '#ceffff65')
    }
    round(c, center - 25, gate.y + 35, 50, 44, 9, open ? '#a6edb4' : '#ffdda0')
    text(c, open ? '✓' : '?', center, gate.y + 65, 26, open ? '#245e43' : '#70502f', 'center')
    text(
      c,
      `${gate.id} / 50`,
      center,
      gate.y - 27,
      12,
      world.id >= 3 ? '#e9eeff' : '#243d4e',
      'center'
    )
    if (!open) text(c, '+4 MC', center, gate.y + 105, 12, '#edfbd8', 'center')
  }
  for (const sign of s.level.signs)
    if (sign.x > min && sign.x < max) {
      const [title] = MECHANICS[sign.type]
      rect(c, sign.x + 28, sign.y + 30, 5, 58, '#927453')
      round(c, sign.x - 33, sign.y, 128, 35, 5, '#183b3ce8')
      text(c, title, sign.x + 31, sign.y + 22, 9, '#d4f2dd', 'center')
    }
  // Observatorio de llegada, construido con el mismo vocabulario de bloques.
  if (s.level.finish < max) {
    const x = s.level.finish
    cube(c, x - 20, FLOOR - 150, 125, 150, ['#d3c5a7', '#9b8b86', '#fff0cb'])
    cube(c, x - 33, FLOOR - 170, 152, 22, ['#6f9294', '#415c6d', '#c2e1da'])
    round(c, x + 22, FLOOR - 75, 42, 75, 7, '#345064')
    rect(c, x + 48, FLOOR - 230, 5, 60, '#efdbb0')
    poly(
      c,
      [
        [x + 53, FLOOR - 230],
        [x + 110, FLOOR - 212],
        [x + 53, FLOOR - 195]
      ],
      '#baffad'
    )
    text(c, 'META', x + 45, FLOOR - 185, 13, '#efffe9', 'center')
  }
  character(c, s.player, t, portrait, reduced ? 0 : s.expression || 0)
  for (const part of s.particles) {
    c.globalAlpha = Math.max(0, part.life / 0.8)
    rect(c, part.x, part.y, 4, 4, part.color)
  }
  c.globalAlpha = 1
  for (const notice of s.notifications || []) {
    const age = Math.max(0, 1.25 - notice.life)
    c.save()
    c.globalAlpha = Math.min(1, notice.life * 3)
    c.textAlign = 'center'
    const fontSize = Math.max(12, Math.min(20, 12 / scale))
    const w = fontSize * 4.5,
      x = notice.x - w / 2,
      y = notice.y - age * 28
    round(c, x, y - fontSize * 1.25, w, fontSize * 1.75, 7, '#123c30e8')
    text(c, notice.text, notice.x, y, fontSize, '#d4ffb7', 'center')
    c.restore()
  }
  // Partículas ambientales deterministas: nieve, esporas o ceniza.
  for (let i = 0; i < 18; i++) {
    const x = s.camera + ((i * 73 + t * (world.id === 2 ? -18 : 8)) % (view + 50)),
      y = (i * 47 + t * (world.id === 2 ? 30 : -9) + HEIGHT * 4) % HEIGHT
    if (world.id === 2) rect(c, x, y, 3, 3, '#f5ffff90')
    else if (world.id >= 3) rect(c, x, y, 2, 2, world.id === 4 ? '#ffd29890' : '#a9f8d580')
  }
  c.restore()
}
