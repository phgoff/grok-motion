// grok-player.js: 2D avatar animation engine (browser ESM).
//
// Consumes clip, state, expression and shape data from grok-recipes.json and
// renders a model for a host to mount. Exports createRuntime,
// createStateMachine, makeConfig, makeMorphGenerators, makeTrail, buildModel,
// createRenderer, and the geometry helpers used by the session.
//

const TAU = Math.PI * 2; // ut / CT
const DEG = Math.PI / 180; // vn

// ---------- Basic math ----------
const le = (e, t, n) => Math.min(n, Math.max(t, e)); // le
const Jo = (e) => {
  const t = le(e, 0, 1);
  return t * t * (3 - 2 * t);
}; // Jo (smoothstep)
const Qo = (e) => (e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2); // Qo easeInOutCubic
const Ye = (e) => 1 - Math.pow(1 - e, 3); // Ye easeOutCubic
const Es = (e) => 1 + 2.70158 * Math.pow(e - 1, 3) + 1.70158 * Math.pow(e - 1, 2); // Es easeOutBack
const eb = Jo;
const ma = (e, t, n) => {
  const r = le((n - e) / (t - e), 0, 1);
  return r * r * (3 - 2 * r);
}; // ma
const Bt = (e) => ((e % 1) + 1) % 1; // Bt
const fo = (e, t, n) => (e <= t || e >= n ? 0 : Math.sin((Math.PI * (e - t)) / (n - t)) ** 2); // fo
const cd = (e) => e - TAU * Math.round(e / TAU); // cd
const Dr = (e) => {
  const t = e % TAU;
  return t < 0 ? t + TAU : t;
}; // Dr
const ad = (e, t, n) => [e[0] + (t[0] - e[0]) * n, e[1] + (t[1] - e[1]) * n]; // ad
const ud = (e, t) => {
  const n = t[0] - e[0],
    r = t[1] - e[1];
  return n * n + r * r;
}; // ud
function QM(e, t, n) {
  const r = n[0] - t[0],
    o = n[1] - t[1],
    s = e[0] - t[0],
    i = e[1] - t[1],
    a = r * r + o * o,
    c = a > 0 ? le((s * r + i * o) / a, 0, 1) : 0,
    u = s - r * c,
    l = i - o * c;
  return Math.sqrt(u * u + l * l);
}

// ---------- Bezier easing ----------
const el = (e, t, n) => {
  const r = 1 - e;
  return 3 * r * r * e * t + 3 * r * e * e * n + e * e * e;
};
const sb = (e, t, n) => {
  const r = 1 - e;
  return 3 * r * r * t + 6 * r * e * (n - t) + 3 * e * e * (1 - n);
};
function Qa(e, t) {
  const [n, r, o, s] = t;
  let i = e;
  for (let a = 0; a < 8; a++) {
    const c = el(i, n, o) - e,
      u = sb(i, n, o);
    if (Math.abs(c) < 1e-6 || Math.abs(u) < 1e-6) break;
    i = le(i - c / u, 0, 1);
  }
  return el(i, r, s);
}

// ---------- Random numbers and shuffle ----------
function tc(e) {
  let t = e | 0;
  return () => {
    t = (t + 1831565813) | 0;
    let n = Math.imul(t ^ (t >>> 15), t | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
const hl = (e, t, n) => {
  const r = e[t],
    o = e[n];
  ((e[t] = o), (e[n] = r));
};
function Lx(e, t, n) {
  const r = [...e];
  for (let s = r.length - 1; s > 0; s -= 1) hl(r, s, Math.floor(t() * (s + 1)));
  const o = r.findIndex((s) => s !== n);
  return (o > 0 && hl(r, 0, o), r);
}

// ---------- Quaternions ----------
function ra(e, t) {
  return [
    e[0] * t[0] - e[1] * t[1] - e[2] * t[2] - e[3] * t[3],
    e[0] * t[1] + e[1] * t[0] + e[2] * t[3] - e[3] * t[2],
    e[0] * t[2] - e[1] * t[3] + e[2] * t[0] + e[3] * t[1],
    e[0] * t[3] + e[1] * t[2] - e[2] * t[1] + e[3] * t[0],
  ];
}
const Po = (e, t) => {
  const n = Math.sin(t / 2);
  return [Math.cos(t / 2), e[0] * n, e[1] * n, e[2] * n];
};
const cb = (e) => {
  const t = Math.hypot(e[0], e[1], e[2], e[3]) || 1;
  return [e[0] / t, e[1] / t, e[2] / t, e[3] / t];
};
function ir(e) {
  const [t, n, r, o] = e;
  return [
    1 - 2 * (r * r + o * o),
    2 * (n * r - t * o),
    2 * (n * o + t * r),
    2 * (n * r + t * o),
    1 - 2 * (n * n + o * o),
    2 * (r * o - t * n),
    2 * (n * o - t * r),
    2 * (r * o + t * n),
    1 - 2 * (n * n + r * r),
  ];
}
const lb = (e, t, n) => ra(Po([0, 0, 1], n), ra(Po([0, 1, 0], t), Po([1, 0, 0], e)));
const Et = (e, t) => [
  e[0] * t[0] + e[1] * t[1] + e[2] * t[2],
  e[3] * t[0] + e[4] * t[1] + e[5] * t[2],
  e[6] * t[0] + e[7] * t[1] + e[8] * t[2],
];

// ---------- Spring (semi-implicit Euler, 120Hz substeps) ----------
const To = (e) => ({ x: e, v: 0, t: e }); // To
const Eo = (e, t, n, r) => {
  // Eo: v += (-2ζωv - ω²(x - t)) dt
  e.v += (-2 * n * t * e.v - t * t * (e.x - e.t)) * r;
  e.x += e.v * r;
  (!Number.isFinite(e.x) || !Number.isFinite(e.v)) && ((e.x = e.t), (e.v = 0));
};
const Jw = 1 / 120,
  Bf = (e) => Math.max(1, Math.ceil(e / Jw)); // Jw / Bf

// ============================================================
// Eye descriptor geometry
// ============================================================

function xb({ p0: e, p1: t, p2: n, isArc: r }, KB) {
  const [o, s] = e,
    [i, a] = t,
    [c, u] = n,
    l = new Array(KB).fill(0);
  const d = (y, w) => {
      ((l[y * 6] = w[0]), (l[y * 6 + 1] = w[1]));
    },
    f = (y, w) => {
      ((l[y * 6 + 2] = w[0] - l[y * 6]), (l[y * 6 + 3] = w[1] - l[y * 6 + 1]));
    },
    h = (y, w) => {
      ((l[y * 6 + 4] = w[0] - l[y * 6]), (l[y * 6 + 5] = w[1] - l[y * 6 + 1]));
    };
  if (r) {
    const y = 2 * (o * (a - u) + i * (u - s) + c * (s - a));
    if (Math.abs(y) > 1e-9) {
      const S = o * o + s * s,
        b = i * i + a * a,
        v = c * c + u * u,
        T = (S * (a - u) + b * (u - s) + v * (s - a)) / y,
        A = (S * (c - i) + b * (o - c) + v * (i - o)) / y,
        F = Math.hypot(o - T, s - A),
        N = Math.atan2(s - A, o - T),
        R2 = Math.atan2(u - A, c - T),
        B2 = Math.atan2(a - A, i - T),
        E = TAU,
        I = (R2 - N + E) % E,
        O = (B2 - N + E) % E <= I ? I : I - E,
        H = (K) => [T + F * Math.cos(K), A + F * Math.sin(K)],
        L = (K) => [-Math.sin(K), Math.cos(K)],
        j = O / 2,
        J = (4 / 3) * Math.tan(j / 4) * F,
        fe = [N, N + j, N + O];
      for (let K = 0; K < 3; K++) {
        const te = H(fe[K]),
          Z = L(fe[K]);
        (d(K, te),
          K > 0 && f(K, [te[0] - J * Z[0], te[1] - J * Z[1]]),
          K < 2 && h(K, [te[0] + J * Z[0], te[1] + J * Z[1]]));
      }
      return l;
    }
    const w = [(o + c) / 2, (s + u) / 2];
    return (
      d(0, [o, s]),
      d(1, w),
      d(2, [c, u]),
      h(0, [o + (w[0] - o) / 3, s + (w[1] - s) / 3]),
      f(1, [w[0] - (w[0] - o) / 3, w[1] - (w[1] - s) / 3]),
      h(1, [w[0] + (c - w[0]) / 3, w[1] + (u - w[1]) / 3]),
      f(2, [c - (c - w[0]) / 3, u - (u - w[1]) / 3]),
      l
    );
  }
  const p = [(o + i) / 2, (s + a) / 2],
    g = [(i + c) / 2, (a + u) / 2],
    m = [(p[0] + g[0]) / 2, (p[1] + g[1]) / 2];
  return (
    d(0, [o, s]),
    d(1, m),
    d(2, [c, u]),
    h(0, [o + (2 / 3) * (p[0] - o), s + (2 / 3) * (p[1] - o)]),
    f(1, [m[0] - (2 / 3) * (p[0] - m[0]), m[1] - (2 / 3) * (p[1] - m[1])]),
    h(1, [m[0] + (2 / 3) * (g[0] - m[0]), m[1] + (2 / 3) * (g[1] - m[1])]),
    f(2, [c + (2 / 3) * (g[0] - c), u + (2 / 3) * (g[1] - u)]),
    l
  );
}
const uo = (e, t) => [e[t * 6], e[t * 6 + 1]]; // uo
const lo = (e, t, n) => {
  const r = n ? 4 : 2;
  return [e[t * 6] + e[t * 6 + r], e[t * 6 + 1] + e[t * 6 + r + 1]];
}; // lo
function Gf(e, YB) {
  const t = (YB + 1) >> 1,
    n = [],
    r = (o, s, i, a, c) => {
      for (let u = c; u < t; u++) {
        const l = u / (t - 1),
          d = 1 - l,
          f = d * d * d,
          h = 3 * d * d * l,
          p = 3 * d * l * l,
          g = l * l * l;
        n.push([
          f * o[0] + h * s[0] + p * i[0] + g * a[0],
          f * o[1] + h * s[1] + p * i[1] + g * a[1],
        ]);
      }
    };
  return (
    r(uo(e, 0), lo(e, 0, !0), lo(e, 1, !1), uo(e, 1), 0),
    r(uo(e, 1), lo(e, 1, !0), lo(e, 2, !1), uo(e, 2), 1),
    n
  );
}
const Pr = (e, t, n, r, o, G) => {
  const s = xb(r, G.kb);
  return {
    off: e,
    tilt: t,
    wid: n,
    lidY: 1,
    oval: o,
    ovalMix: 0,
    pts: Gf(s, G.yb),
    path: s,
    fillRing: null,
  };
};
function ec(e, t, n, r, o, G) {
  const s = Math.max(0, (t - e) / 2),
    i = n * DEG,
    a = Math.sin(i) * s,
    c = Math.cos(i) * s;
  return Pr(r, o, e / 2, { p0: [-a, -c], p1: [0, 0], p2: [a, c], isArc: !1 }, [0, 0], G);
}
const oa = (e, t, n, r, G) => ec(Math.max(e, 1e-4), Math.max(t, e), 0, r, n, G); // oa
const Nb = (e, t, n, r, G) => (t >= e ? oa(e, t, 0, [n, r], G) : oa(t, e, Math.PI / 2, [n, r], G)); // Nb

const jt = (e) => e.oval[0] > 1e-4 && e.oval[1] > 1e-4;
function ts(e) {
  if (jt(e) || e.pts.length < 3) return !1;
  const t = e.pts[0],
    n = e.pts[e.pts.length - 1],
    r = n[0] - t[0],
    o = n[1] - t[1],
    s = r * r + o * o;
  if (s < 1e-8) return !1;
  let i = 0;
  for (const a of e.pts) {
    const c = ((a[0] - t[0]) * r + (a[1] - t[1]) * o) / s,
      u = t[0] + c * r,
      l = t[1] + c * o,
      d = Math.hypot(a[0] - u, a[1] - l);
    d > i && (i = d);
  }
  return i > Math.max(0.012, e.wid * 0.2);
}
const Zn = (e, t, n) => e + (t - e) * n; // Zn
const Ao = (e, t, n) => [Zn(e[0], t[0], n), Zn(e[1], t[1], n)]; // Ao
function nl(e, t, n) {
  if (e.length === 0) return [0, 0];
  if (e.length === 1 || n <= 1) return e[0];
  const r = (t / (n - 1)) * (e.length - 1),
    o = Math.min(Math.floor(r), e.length - 2);
  return Ao(e[o], e[o + 1], r - o);
}
function _b(e, t, n, G) {
  const r = {
    off: Ao(e.off, t.off, n),
    tilt: Zn(e.tilt, t.tilt, n),
    wid: Zn(e.wid, t.wid, n),
    lidY: Zn(e.lidY, t.lidY, n),
    oval: Ao(e.oval, t.oval, n),
    ovalMix: 0,
    fillRing: null,
  };
  if (e.path && t.path && e.path.length === t.path.length) {
    const i = t.path,
      a = e.path.map((c, u) => Zn(c, i[u], n));
    return { ...r, path: a, pts: Gf(a, G.yb) };
  }
  const o = Math.max(e.pts.length, t.pts.length, 2),
    s = [];
  for (let i = 0; i < o; i++) s.push(Ao(nl(e.pts, i, o), nl(t.pts, i, o), n));
  return { ...r, path: null, pts: s };
}
function ns(e) {
  if (jt(e)) {
    const [o, s] = e.oval;
    return {
      cx: e.off[0],
      cy: e.off[1],
      ang: o >= s ? Math.PI / 2 : 0,
      halfLen: Math.max(o, s),
      halfW: Math.min(o, s),
    };
  }
  const t = e.wid;
  if (e.pts.length < 2) return { cx: e.off[0], cy: e.off[1], ang: e.tilt, halfLen: t, halfW: t };
  const n = e.pts[0],
    r = e.pts[e.pts.length - 1];
  return {
    cx: e.off[0] + (n[0] + r[0]) / 2,
    cy: e.off[1] + (n[1] + r[1]) / 2,
    ang: Math.atan2(r[0] - n[0], r[1] - n[1]) + e.tilt,
    halfLen: Math.hypot(r[0] - n[0], r[1] - n[1]) / 2 + t,
    halfW: t,
  };
}
function Wf(e, t) {
  let n = t.ang - e.ang;
  for (; n > Math.PI / 2;) n -= Math.PI;
  for (; n < -Math.PI / 2;) n += Math.PI;
  return n;
}
function Cb(e, t, n) {
  const o = Math.max(0, e - t),
    s = le(n, 0, 1),
    i = [];
  for (let a = 0; a < 48; a++) {
    const c = (a / 48) * TAU,
      u = Math.cos(c),
      l = Math.sin(c),
      d = t * u,
      f = e * l,
      h = t / Math.max(Math.abs(u), 1e-6);
    let p;
    if (h * Math.abs(l) <= o + 1e-6 && Number.isFinite(h)) p = h;
    else {
      const w = (l >= 0 ? 1 : -1) * o * l,
        S = Math.max(0, w * w - o * o + t * t);
      p = w + Math.sqrt(S);
    }
    const g = p * u,
      m = p * l;
    i.push([g + (d - g) * s, m + (f - m) * s]);
  }
  return i;
}
const wt = (e) => ({ ...e, ovalMix: 0 }); // wt
const nt = (e, t) => [t(e[0], 0), t(e[1], 1)]; // nt
function Rb(e, t, n, G) {
  if (n <= 1e-4) return wt(e);
  if (n >= 0.995) return wt(t);
  const r = ns(e),
    o = ns(t),
    s = Wf(r, o),
    i = jt(t),
    a = i ? 1 - (1 - n) ** 3 : n * n * n,
    c = r.ang + s * n,
    u = Math.max(r.halfLen + (o.halfLen - r.halfLen) * n, 1e-4),
    l = Math.max(r.halfW + (o.halfW - r.halfW) * n, 1e-4),
    d = jt(e) ? 1 : 0,
    f = d + ((i ? 1 : 0) - d) * a,
    h = oa(2 * l, 2 * u, c, [r.cx + (o.cx - r.cx) * n, r.cy + (o.cy - r.cy) * n], G),
    p = f > 1e-4;
  return { ...h, oval: p ? [l, u] : h.oval, ovalMix: p ? f : 0, fillRing: Cb(u, l, f) };
}
function $b(e, t, n, G) {
  if (n >= 1 - 1e-4) return wt(t);
  const r = ns(e),
    o = ns(t),
    s = r.ang + Wf(r, o) * n,
    i = Math.max(1e-4, r.halfW + (o.halfW - r.halfW) * n),
    a = Math.max(0, r.halfLen - r.halfW) * (1 - n) + Math.max(0, o.halfLen - o.halfW) * n,
    c = [r.cx + (o.cx - r.cx) * n, r.cy + (o.cy - r.cy) * n];
  return ec(2 * i, 2 * (a + i), s / DEG, c, 0, G);
}
function Ob(e) {
  const t = jt(e);
  if (!(e.wid > 0) && !t) return null;
  const n = e.lidY,
    r = e.tilt / DEG;
  if (t)
    return { width: 2 * e.oval[0], height: 2 * e.oval[1] * n, tilt: r, cx: e.off[0], cy: e.off[1] };
  if (e.pts.length < 2) return null;
  const o = e.pts[0],
    s = e.pts[e.pts.length - 1],
    i = s[0] - o[0],
    a = s[1] - o[1],
    c = Math.hypot(i, a),
    u = 2 * e.wid;
  return {
    width: u,
    height: (c + u) * n,
    tilt: Math.atan2(i, a) / DEG + r,
    cx: e.off[0] + (o[0] + s[0]) / 2,
    cy: e.off[1] + ((o[1] + s[1]) / 2) * n,
  };
}
function Lb(e, XR) {
  const t = Ob(e);
  if (t == null) return { w: XR, h: 0.57, cx: e.off[0], cy: e.off[1] };
  const n = t.tilt * DEG,
    r = Math.abs(Math.cos(n)),
    o = Math.abs(Math.sin(n));
  return { w: t.width * r + t.height * o, h: t.width * o + t.height * r, cx: t.cx, cy: t.cy };
}
function rl(e, t, G) {
  if (t <= 0) return e;
  const n = Math.min(1, t),
    r = Lb(e, G.xr),
    o = Math.max(r.w, 1e-4),
    s = Math.max(r.h, o),
    i = o * G.Ab;
  return Nb(o, s + (i - s) * n, r.cx, r.cy, G);
}
const Fb = (e) => ({ ...e, wid: 0, oval: [0, 0] });
function zb(e, G) {
  let t, n;
  if (jt(e)) ((t = -e.oval[1]), (n = e.oval[1]));
  else {
    let r = 1e9,
      o = -1e9;
    for (const s of e.pts) (s[1] < r && (r = s[1]), s[1] > o && (o = s[1]));
    ((t = r - e.wid), (n = o + e.wid));
  }
  return t + (1 - G.Pb) * (n - t);
}
function Db(e) {
  if (e.pts.length < 2) return e;
  const t = e.pts[0],
    n = e.pts[e.pts.length - 1],
    r = n[0] - t[0],
    o = n[1] - t[1];
  if (Math.abs(o) < Math.abs(r)) return e;
  const s = Math.atan2(r, o);
  if (Math.abs(s) < 1e-5) return e;
  const i = Math.cos(s),
    a = Math.sin(s);
  return {
    ...e,
    tilt: e.tilt + s,
    pts: e.pts.map((c) => [c[0] * i - c[1] * a, c[0] * a + c[1] * i]),
  };
}
function ol(e, t, G) {
  if (t === 0) return e;
  const n = Db(e),
    r = Math.max(G.Eb, 1 - t),
    o = zb(n, G) * (1 - r),
    s = Math.cos(-n.tilt),
    i = Math.sin(-n.tilt);
  return { ...n, off: [n.off[0] - i * o, n.off[1] + s * o], lidY: n.lidY * r };
}

// ============================================================
// Face machine: blink, morph, lidMorph and inspect weighting
// ============================================================
const sl = (e) => (e === "inspecting" ? 1 : 0); // sl

function createFace(G) {
  // Bb
  const bn = G.expressions,
    bb = G.blinkBlocking,
    wb = G.expressionAliases,
    gb = G.expressionNames;
  const Lr = (e) => bb.has(e); // Lr
  const Sb = (e) => gb.has(e); // Sb
  const Mb = (e) => {
    const t = e.trim().toLowerCase(),
      n = wb.get(t) ?? t;
    return Sb(n) ? n : "neutral";
  }; // Mb
  const ii = (e, dur) => {
    const t = Math.min(0.28, (e ? G.ob : G.rb) / Math.max(dur, 0.05));
    return { u1: (1 - t) * 0.42, u2: (1 - t) * 0.42 + t };
  };
  const ib = (e) => {
    const t = le(e, 0, 1);
    if (t < 0.7) {
      const n = t / 0.7;
      return (1 - (1 - n) * (1 - n)) * G.si;
    }
    return G.si + (1 - G.si) * Jo((t - 0.7) / 0.3);
  };
  const ab = (e, { u1: t, u2: n }) =>
    e < t ? Jo(e / t) : e <= n ? 1 : 1 - Jo((e - n) / Math.max(1e-6, 1 - n)); // ab
  const il = (r) => Qa(le(r.t / r.dur, 0, 1), G.tbEase);
  let e = "neutral",
    t = nt(bn.neutral, wt),
    n = 0,
    r = null;
  const o = () => {
    // eyes()
    if (r == null) return t;
    if (r.kind === "blink") return r.from;
    if (r.kind === "morph") {
      const m = il(r),
        { from: y, to: w, path: S } = r;
      return S === "oval"
        ? nt(y, (b, v) => Rb(b, w[v], m, G))
        : S === "spine"
          ? nt(y, (b, v) => _b(b, w[v], m, G))
          : nt(y, (b, v) => $b(b, w[v], m, G));
    }
    const f = Math.min(r.t / r.dur, 1),
      { u1: h, u2: p } = ii(!1, r.dur);
    if (f < h) return nt(r.from, (m) => ol(m, Jo(f / h), G));
    if (f <= p) return nt(r.to, Fb);
    const g = ib((f - p) / Math.max(1e-6, 1 - p));
    return nt(r.to, (m) => ol(m, 1 - g, G));
  };
  const s = () => {
    // inspectWeight()
    if (r == null) return n;
    if (r.kind === "blink") return r.fromInspect;
    const f = r.fromInspect,
      h = sl(r.toName);
    if (r.kind === "morph") return f + (h - f) * il(r);
    const p = Math.min(r.t / r.dur, 1),
      { u1: g, u2: m } = ii(!1, r.dur);
    return p <= g ? f : p < m ? 0 : h;
  };
  const i = (f) => {
    // morph
    const h = nt(o(), wt),
      p = bn[f],
      g = h.some(ts) || p.some(ts) || e === "sleepy" || f === "sleepy";
    r = {
      kind: "morph",
      path:
        !(h.some(ts) || p.some(ts)) && (h.some(jt) || p.some(jt))
          ? "oval"
          : g
            ? "spine"
            : "stadium",
      fromInspect: s(),
      toName: f,
      from: h,
      to: p,
      t: 0,
      dur: G.nb,
      isHeld: !1,
    };
    e = f;
  };
  const a = (f) => {
    // lidMorph
    r = {
      kind: "lidMorph",
      fromInspect: s(),
      toName: f,
      from: nt(o(), wt),
      to: bn[f],
      t: 0,
      dur: G.ta,
      isHeld: !1,
    };
    e = f;
  };
  const c = () => {
    // blink
    (r != null && !r.isHeld) ||
      (r = {
        kind: "blink",
        fromInspect: n,
        toName: e,
        from: nt(t, wt),
        to: bn[e],
        t: 0,
        dur: G.na,
        isHeld: !1,
      });
  };
  const u = (f) => {
    // play(expression event)
    (f.name === e && (r == null || r.toName === f.name)) ||
      (f.isThroughBlink && !Lr(f.name) && !Lr(e) ? a(f.name) : i(f.name));
  };
  const l = (f, h) => {
    // settle
    h >= f.dur
      ? ((t = nt(f.to, wt)), (n = sl(f.toName)), (r = null))
      : (r = h < 0 ? null : { ...f, t: h });
  };
  const d = (f) => {
    r != null && (r = { ...r, isHeld: f });
  };
  return {
    get name() {
      return e;
    },
    get isMorphing() {
      return r != null && r.kind !== "blink" && !r.isHeld;
    },
    eyes: o,
    inspectWeight: s,
    blinkAmount() {
      if (r?.kind !== "blink" || r.isHeld) return null;
      const f = Math.min(r.t / r.dur, 1);
      return le(ab(f, ii(!0, r.dur)), 0, 1);
    },
    morph: i,
    lidMorph: a,
    blink: c,
    play: u,
    step(f) {
      r != null && !r.isHeld && l(r, r.t + f);
    },
    release() {
      d(!1);
    },
    seek(f, h) {
      ((e = "neutral"), (t = nt(bn.neutral, wt)), (n = 0), (r = null));
      let p = 0;
      const g = (m) => {
        r != null && l(r, m - p);
      };
      for (const m of f) {
        if (m.t > h + 1e-9) break;
        (g(m.t), u(m), (p = m.t));
      }
      (g(h), d(!0));
    },
    Mb,
  };
}

// ============================================================
// Ambient morph animator: amount/swap/spin springs and shot retrigger
// ============================================================
function createMorphBehavior(G, e = {}) {
  // cx
  const t = e.isReducedMotion ?? !1,
    n = tc(e.seed ?? 2654435769),
    r = To(0),
    o = To(1),
    s = To(0);
  let i = null,
    a = null,
    c = null,
    u = null,
    l = !1,
    d = 0,
    f = 0,
    h = 1,
    p = !1,
    g = 0,
    m = 0,
    y = 0,
    w = 0,
    S = 0;
  const sx = G.morphShotSet,
    ix = G.morphShotSeconds,
    ax = 1.5,
    rx = 0.1,
    nx = Math.PI;
  const nc = (e2) => ix[e2] ?? 2.5;
  const b = () => {
    const v = i == null ? null : G.stateMorphMap[i],
      T = y;
    i !== a && ((a = i), i != null && ((y = g), (l = !1)));
    let A = v != null;
    (i != null &&
      sx.has(i) &&
      (!l && g - y > nc(i) ? ((l = !0), (d = g)) : l && g - d > ax && ((l = !1), (y = g)),
      (A = !l)),
      (r.t = A ? 1 : 0),
      v != null &&
        v !== c &&
        (c != null && r.x > 0.02
          ? ((u = c), (w = m), (S = T), (o.x = t ? 1 : 0))
          : ((u = null), (o.x = 1)),
        (o.v = 0),
        (o.t = 1),
        (c = v),
        (m = g)),
      v == null && r.x < 0.004 && ((c = null), (u = null)),
      o.x > 0.996 && (u = null),
      A !== p && (A && !t && (h = n() < 0.5 ? 1 : -1), t || ((f += nx * h), (s.t = f)), (p = A)));
  };
  return {
    get target() {
      return i;
    },
    set(v) {
      i = v;
    },
    advance(v) {
      const T = v > 0 ? Math.min(v, rx) : 0;
      ((g += T), b());
      const A = Bf(T),
        F = T / A;
      for (let N = 0; N < A; N++) (Eo(r, 14, 1, F), Eo(o, 11, 1, F), Eo(s, 14, 1, F));
      t && ((o.x = 1), (s.x = s.t), (r.x = r.t));
    },
    settle() {
      b();
      for (const v of [r, o, s]) ((v.x = v.t), (v.v = 0));
      b();
    },
    snapshot() {
      return {
        amount: le(r.x, 0, 1),
        spin: s.x,
        kind: c,
        outgoing: u,
        swap: le(o.x, 0, 1),
        clock: { stateTime: g - m, shotTime: g - y },
        outgoingClock: { stateTime: g - w, shotTime: g - S },
        isReducedMotion: t,
        isSettled: Math.abs(r.x - r.t) < 0.001 && Math.abs(s.t - s.x) < 0.01 && o.x > 0.996,
      };
    },
  };
}

// ============================================================
// Clip normalization, track evaluation, rest frame, similarity and bridge
// ============================================================
const mx = ({ t: e, v: t, ease: n }, nr) => ({
  t: e,
  v: typeof t == "string" ? [] : t,
  ease: n?.length === 4 ? n : nr,
}); // mx
const gx = (e, G) => [
  { t: e, v: [0], ease: G.nr },
  { t: e + G.na * 0.45, v: [1], ease: G.nr },
  { t: e + G.na, v: [0], ease: G.nr },
];
function kx(e, G) {
  // kx
  const t = new Map();
  for (const [i, a] of Object.entries(e.tracks)) {
    const c = G.trackAliases.get(i);
    c !== void 0 && t.set(c, a);
  }
  const n = (i) => (t.get(i) ?? []).map((kf) => mx(kf, G.nr)),
    r = n("lids"),
    o = [];
  let s = !1;
  for (const i of t.get("expression") ?? []) {
    if (i.v === "blink") {
      ((s = !0), r.push(...gx(i.t, G)));
      continue;
    }
    o.push({
      t: i.t,
      name: typeof i.v == "string" ? G.Mb(i.v) : "neutral",
      isThroughBlink: i.cut === !1,
    });
  }
  return (
    s && r.sort((i, a) => i.t - a.t),
    {
      duration: e.duration,
      body: G.bodyAlias(e.body ?? "sphere"),
      squashAnchor: e.squashAnchor ?? 0,
      restTime: e.workArea ? e.workArea.start : 0,
      inspect: {
        bias: Number.isFinite(e.inspect?.bias) ? le(e.inspect.bias, -1, 1) : void 0,
        isFollowingTurn: e.inspect?.follow,
      },
      position: n("position"),
      rotation: n("rotation"),
      squash: n("squash"),
      zoom: n("zoom"),
      lids: r,
      expression: o,
    }
  );
}
function vt(e, t) {
  if (e.length === 0) return null;
  if (t <= e[0].t) return e[0].v;
  const n = e[e.length - 1];
  if (t >= n.t) return n.v;
  let r = 0;
  for (; r < e.length - 2 && e[r + 1].t <= t;) r++;
  const o = e[r],
    s = e[r + 1],
    i = (t - o.t) / Math.max(s.t - o.t, 1e-9),
    a = Qa(i, o.ease);
  return o.v.map((c, u) => c + (s.v[u] - c) * a);
}
function dl(e, t) {
  let n = "neutral";
  for (const r of e) {
    if (r.t > t + 1e-9) break;
    n = r.name;
  }
  return n;
} // dl
function ul(e, G) {
  const t = e.restTime,
    n = vt(e.rotation, t),
    r = vt(e.position, t),
    o = vt(e.squash, t),
    s = vt(e.zoom, t),
    i = vt(e.lids, t);
  let a = "neutral",
    c = !1;
  for (const u of e.expression) (c || ((a = u.name), (c = !0)), u.t <= t + 1e-9 && (a = u.name));
  return {
    rot: n ? [n[0], n[1], n[2]] : [0, 0, 0],
    pos: r ? [r[0], r[1]] : [0, 0],
    scl: o ? [o[0], o[1]] : [1, 1],
    zoom: s ? s[0] : G.$n,
    lids: i ? le(i[0], 0, 1) : 0,
    expr: a,
    squashAnchor: e.squashAnchor,
  };
}
const ai = (e, t) => e + 360 * Math.round((t - e) / 360); // ai
const ci = (e, t) => Math.abs(((((e - t) % 360) + 540) % 360) - 180); // ci
function wx(e, t) {
  return (
    ci(e.rot[0], t.rot[0]) < 4 &&
    ci(e.rot[1], t.rot[1]) < 4 &&
    ci(e.rot[2], t.rot[2]) < 4 &&
    Math.abs(e.pos[0] - t.pos[0]) < 0.015 &&
    Math.abs(e.pos[1] - t.pos[1]) < 0.015 &&
    Math.abs(e.scl[0] - t.scl[0]) < 0.02 &&
    Math.abs(e.scl[1] - t.scl[1]) < 0.02 &&
    Math.abs(e.zoom - t.zoom) < 0.02 &&
    Math.abs(e.lids - t.lids) < 0.05
  );
}
function bx(e, t, G) {
  // bx: bridge clip (.35s, ease dx -> nr)
  const n = (o, s) => [
      { t: 0, v: o, ease: G.dxEase },
      { t: G.ta, v: s, ease: G.nr },
    ],
    r = [ai(t.rot[0], e.rot[0]), ai(t.rot[1], e.rot[1]), ai(t.rot[2], e.rot[2])];
  return {
    duration: G.ta,
    body: null,
    squashAnchor: e.squashAnchor,
    restTime: 0,
    inspect: {},
    position: n(e.pos, t.pos),
    rotation: n(e.rot, r),
    squash: n(e.scl, t.scl),
    zoom: n([e.zoom], [t.zoom]),
    lids: e.lids === 0 && t.lids === 0 ? [] : n([e.lids], [t.lids]),
    expression: [],
  };
}

// ============================================================
// Gaze, look and poke
// ============================================================
function al(e, t, n, G) {
  const r = e !== "sphere",
    o = G.gazeShapeMul[e] ?? 1;
  return {
    rx: -(r ? 19 : 14) * o * n,
    ry: (r ? 26 : 18) * o * t,
    px: (r ? 0.07 : 0.03) * t,
    py: (r ? 0.055 : 0.024) * n,
  };
}
const ex = (e, t, n = 2, G) => {
  const r = Math.max(e.width, 1) * n,
    o = (s) => le(s, -1, 1);
  return [o((t.x - (e.left + e.width / 2)) / r), o(-(t.y - (e.top + e.height / 2)) / r)];
};
const XX = {
  left: { rot: [0, -20, 0], pos: [-0.1, 0] },
  right: { rot: [0, 20, 0], pos: [0.1, 0] },
  up: { rot: [-20, 0, 0], pos: [0, 0.1] },
  down: { rot: [20, 0, 0], pos: [0, -0.1] },
  center: { rot: [0, 0, 0], pos: [0, 0] },
};
function Uf({ poke: e, turns: t }) {
  switch (e) {
    case "spin":
      return 0.9 + 0.4 * (t - 1);
    case "bounce":
      return 0.62;
    case "nod":
      return 0.5;
  }
}
function Xb(e) {
  let t = 0,
    n = 0,
    r = 0,
    o = 1,
    s = 1;
  for (const i of e) {
    const a = Math.min(1, i.t / Uf(i));
    switch (i.poke) {
      case "spin":
        n += 180 * i.turns * (1 - Math.cos(Math.PI * a));
        break;
      case "nod":
        t += 16 * fo(a, 0, 1);
        break;
      case "bounce": {
        const c = fo(a, 0, 0.18) + fo(a, 0.82, 1),
          u = fo(a, 0.18, 0.82);
        ((r += 0.3 * Math.sin(Math.PI * le((a - 0.14) / 0.72, 0, 1))),
          (o *= 1 + 0.08 * c - 0.04 * u),
          (s *= 1 - 0.1 * c + 0.06 * u));
        break;
      }
    }
  }
  return { pitch: t, yaw: n, lift: r, squash: [o, s] };
}

// ============================================================
// Motion runtime
// ============================================================
function createRuntime(G, e = {}) {
  const t = le(e.zoomMul || 1, 0.2, 3),
    n = createFace(G);
  let r = e.body ?? "sphere",
    o = e.body !== void 0,
    s = [];
  const i = To(1),
    a = createMorphBehavior(G, { isReducedMotion: e.isReducedMotion });
  let c = null,
    u = [...G.baseEulerDeg],
    l = [0, 0],
    d = [1, 1],
    f = 0,
    h = G.$n * t,
    p = { bias: -1, isFollowingTurn: !0 },
    g = null,
    m = { isHeld: !1, isAlways: e.isGazeAlways ?? !1, x: 0, y: 0, cx: 0, cy: 0, hold: 0 },
    y = G.restClip,
    w = 0,
    S = !1,
    b = !0,
    v = !1,
    T = null,
    A = null,
    F = null,
    N = 0,
    R = 0,
    B = null,
    E = null,
    I = !1,
    _ = [];
  const O = () => {
      const $ = vt(y.position, w);
      l = $ ? [$[0], $[1]] : [0, 0];
      const q = vt(y.rotation, w);
      u = q ? [q[0], q[1], q[2]] : [0, 0, 0];
      const U = vt(y.squash, w);
      d = U ? [U[0], U[1]] : [1, 1];
      const P = vt(y.zoom, w);
      P && (h = le(P[0], 0.25, 2.5) * t);
    },
    H = ($) => {
      (n.blinkAmount() ?? fe()) > 0 ? (E = $) : ($(), K());
    },
    L = ($, q) => {
      if (B == null) for (const U of y.expression) U.t <= $ || U.t > q || H(() => n.play(U));
    },
    j = ($) => {
      ((w = $),
        (g = null),
        (E = null),
        O(),
        n.seek(y.expression, $),
        B != null && n.seek([{ t: 0, name: B, isThroughBlink: !1 }], 0));
    },
    J = () => {
      const $ = vt(y.lids, w);
      return $ ? le($[0], 0, 1) : 0;
    },
    fe = () => (I ? 0 : J()),
    K = () => {
      !G.Tb(n.name) || n.isMorphing ? (I = !0) : I && J() === 0 && (I = !1);
    },
    te = () => ({ rot: u, pos: l, scl: d, zoom: h / t, lids: fe(), expr: n.name, squashAnchor: f }),
    Z = ($) => {
      ((S = !1),
        (y = $),
        (w = 0),
        (f = $.squashAnchor),
        $.body != null && !o && (r = $.body),
        (p = {
          bias: $.inspect.bias ?? p.bias,
          isFollowingTurn: $.inspect.isFollowingTurn ?? p.isFollowingTurn,
        }));
    },
    D = ($) => {
      if (((A = null), Z($.clip), (T = { clip: $.clip, name: $.name }), (b = !0), !$.isPlaying)) {
        (j(0), $.isRest && (m = { ...m, hold: 0 }));
        return;
      }
      ((S = !0),
        $.phase > 0 && j($.phase * $.clip.duration),
        n.release(),
        $.phase <= 0 && L(-1e-9, 0));
    },
    Gx = ($) => {
      const q = te(),
        U = ul($.clip, G);
      ((A = $),
        Z(bx(q, U, G)),
        (b = !1),
        (S = !0),
        B == null && q.expr !== U.expr && H(() => n.morph(U.expr)));
    },
    Y = () =>
      A != null || T == null || wx(te(), ul(T.clip, G))
        ? !1
        : (Gx({ ...T, isPlaying: !0, phase: 0, isRest: !1 }), !0),
    Q = ($) => {
      const q = w;
      let U = q + $;
      if (U >= y.duration) {
        if ((L(q, y.duration), b)) {
          if (((R += 1), Y())) return;
          ((U = U - y.duration), U >= y.duration && (U = 0), L(-1e-9, U), (w = U));
        } else ((w = y.duration), (S = !1), A != null && D(A));
      } else (L(q, U), (w = U));
      ((g = null), O());
    },
    ne = ($, q) => {
      const U = $ + (q - $) * G.Yb;
      return Math.abs(q - U) < G.Ax ? q : U;
    },
    se = () => {
      if (
        v ||
        (!m.isHeld && m.hold === 0) ||
        ((m = { ...m, cx: ne(m.cx, m.x), cy: ne(m.cy, m.y), hold: ne(m.hold, m.isHeld ? 1 : 0) }),
        S)
      )
        return;
      O();
      const $ = al(r, m.cx, m.cy, G),
        { hold: q } = m;
      ((u = [u[0] + ($.rx - u[0]) * q, u[1] + ($.ry - u[1]) * q, u[2] * (1 - q)]),
        (l = [l[0] + ($.px - l[0]) * q, l[1] + ($.py - l[1]) * q]));
    },
    ee = ($) => {
      if (g == null) return;
      const q = g.t + $,
        U = Math.min(q / G.Sx, 1),
        P = Qa(U, G.vxEase),
        { fromRot: C2, toRot: z, fromPos: W, toPos: V } = g;
      ((u = [C2[0] + (z[0] - C2[0]) * P, C2[1] + (z[1] - C2[1]) * P, C2[2] + (z[2] - C2[2]) * P]),
        (l = [W[0] + (V[0] - W[0]) * P, W[1] + (V[1] - W[1]) * P]),
        U >= 1 ? ((u = z), (l = V), (g = null)) : (g = { ...g, t: q }));
    },
    me = () => {
      if (s.length === 0) return [{ body: r, weight: 1 }];
      const $ = Qo(le(i.x, 0, 1)),
        q = new Map();
      for (const C2 of s) q.set(C2.body, (q.get(C2.body) ?? 0) + C2.weight * (1 - $));
      q.set(r, (q.get(r) ?? 0) + $);
      const U = [...q].filter(([, C2]) => C2 > G.Ex),
        P = U.reduce((C2, [, z]) => C2 + z, 0);
      return U.map(([C2, z]) => ({ body: C2, weight: z / P }));
    },
    de = ($) => {
      $ !== r && ((s = me()), (r = $), (i.x = 0), (i.v = 0), (i.t = 1));
    },
    xe = ($) => {
      if (s.length === 0) return;
      const q = Bf($);
      for (let U = 0; U < q; U++) Eo(i, G.Tx, 1, $ / q);
      Math.abs(i.x - 1) < 0.001 && Math.abs(i.v) < 0.01 && ((i.x = 1), (i.v = 0), (s = []));
    },
    Pe = () => n.blinkAmount() ?? fe(),
    be = ($, q) => {
      const U = jb(n.eyes(), q, p, $, G),
        P = Pe();
      return P <= 1e-4 ? U : [rl(U[0], P, G), rl(U[1], P, G)];
    };
  return {
    get isPlaying() {
      return S;
    },
    get time() {
      return w;
    },
    get duration() {
      return y.duration;
    },
    get loopCount() {
      return R;
    },
    get face() {
      return n.name;
    },
    get isSettled() {
      const $ =
        v || (m.hold === (m.isHeld ? 1 : 0) && (!m.isHeld || (m.cx === m.x && m.cy === m.y)));
      return (
        !S &&
        _.length === 0 &&
        s.length === 0 &&
        g == null &&
        E == null &&
        !n.isMorphing &&
        n.blinkAmount() == null &&
        a.snapshot().isSettled &&
        $
      );
    },
    load($, { isPlaying: q = !0, transition: U = "bridge", phase: P = 0 } = {}) {
      const C2 = $.name || T?.name || "recipe",
        z = { clip: kx($, G), name: C2, isPlaying: q, phase: le(P, 0, 1) % 1, isRest: !1 };
      U === "bridge" && T != null && (A != null || T.name !== C2) ? Gx(z) : D(z);
    },
    play() {
      ((v = !1), (S = !0));
    },
    pause() {
      ((v = !0), (S = !1));
    },
    stop() {
      ((S = !1), j(0));
    },
    rest() {
      v = !1;
      const $ = { clip: G.restClip, name: "rest", isPlaying: !1, phase: 0, isRest: !0 };
      if (A == null && (T == null || T.name === "rest")) {
        T == null && D($);
        return;
      }
      Gx($);
    },
    seek: j,
    setBody($, { isInstant: q = !1 } = {}) {
      if (((o = !0), !q)) {
        de($);
        return;
      }
      ((r = $), (s = []), (i.x = 1), (i.v = 0));
    },
    setMorph($, { isInstant: q = !1 } = {}) {
      (a.set($), q && a.settle());
    },
    setExpression($, { isThroughBlink: q = !1 } = {}) {
      H(() => {
        q && !G.Lr($) && !G.Lr(n.name) ? n.lidMorph($) : n.morph($);
      });
    },
    holdFace($) {
      $ !== B &&
        ((B = $),
        H(() => {
          const q = B ?? (A == null ? dl(y.expression, w) : dl(A.clip.expression, 0));
          q !== n.name && n.morph(q);
        }));
    },
    poke($, { turns: q = 1 } = {}) {
      _ = [..._, { poke: $, t: 0, turns: Math.max(1, Math.round(q)) }];
    },
    blink() {
      n.blink();
    },
    setInspect({ bias: $, isFollowingTurn: q }) {
      p = { bias: $ === void 0 ? p.bias : le($, -1, 1), isFollowingTurn: q ?? p.isFollowingTurn };
    },
    setGaze($) {
      if ($ == null) {
        m = { ...m, isHeld: !1 };
        return;
      }
      const q = le($[0] || 0, -1, 1),
        U = le($[1] || 0, -1, 1);
      m =
        m.hold === 0
          ? { ...m, isHeld: !0, x: q, y: U, cx: q, cy: U }
          : { ...m, isHeld: !0, x: q, y: U };
    },
    setGazeAlways($) {
      m = { ...m, isAlways: $ };
    },
    look($) {
      const q = XX[$];
      g = { t: 0, fromRot: u, toRot: q.rot, fromPos: l, toPos: q.pos };
    },
    setGlow($) {
      F = $;
    },
    advance($) {
      se();
      const q = Math.min($, G.Mx),
        U = 1 - a.snapshot().amount;
      if ((S && Q(q * U), ee(q), n.step(q), E != null && (n.blinkAmount() ?? fe()) === 0)) {
        const C2 = E;
        ((E = null), C2());
      }
      (K(),
        xe(q),
        (_ = _.map((C2) => ({ ...C2, t: C2.t + q })).filter((C2) => C2.t < Uf(C2))),
        a.advance(q));
      const P = a.snapshot();
      (P.amount > 0 || !P.isSettled ? (c ??= [ui(u[0]), ui(u[1]), ui(u[2])]) : (c = null),
        (N += $));
    },
    frame() {
      const $ = m.isAlways && S && !v ? al(r, m.cx, m.cy, G) : null,
        q = G.Zb * m.hold,
        U = Xb(_),
        P = [u[0] + ($ ? $.rx * q : 0) + U.pitch, u[1] + ($ ? $.ry * q : 0) + U.yaw, u[2]],
        C2 = [l[0] + ($ ? $.px * q : 0), l[1] + ($ ? $.py * q : 0) + U.lift],
        z = [d[0] * U.squash[0], d[1] * U.squash[1]],
        W = n.inspectWeight(),
        V = a.snapshot(),
        X = 1 - V.amount,
        ie = (V.spin % TAU) / DEG,
        he = c ?? [0, 0, 0],
        pe = (ue) => he[ue] + (P[ue] - he[ue]) * X,
        ge = pe(1);
      return {
        body: r,
        bodyRoll: pe(2) - G.baseEulerDeg[2],
        pitch: pe(0) - G.baseEulerDeg[0],
        yaw: pe(1) - G.baseEulerDeg[1],
        quat: lb(pe(0) * DEG, (ge + ie) * DEG, pe(2) * DEG),
        zoom: h,
        offset: X === 1 ? C2 : [C2[0] * X, C2[1] * X],
        squash: X === 1 ? z : [1 + (z[0] - 1) * X, 1 + (z[1] - 1) * X],
        squashAnchor: f,
        eyes: V.amount >= G.Px ? null : be(ge, W),
        glow: F && { ...F, midT: 0.5 + 0.5 * Math.sin((N * 1e3) / 860) },
        inspectWeight: W,
        bodies: me(),
        morph: V.kind === null && V.isSettled ? null : V,
      };
    },
  };
}
const ui = (e) => 360 * Math.round(e / 360); // ui

// ============================================================
// State machine
// ============================================================
function createStateMachine(G, e, t, n = {}) {
  // Nx(runtime, initialState, opts)
  const r = tc(n.seed ?? 1),
    o = new Map();
  let s = n.isCompact ?? !1,
    i = n.isResting ?? !1,
    a = !1,
    c = i,
    u = t,
    l = G.states[t],
    d = 0,
    f = 0,
    h = e.loopCount,
    p = null;
  const g = () => (s && l.compactClips != null ? l.compactClips : l.clips),
    m = () => l.next != null && l.holdSeconds == null,
    y = () => {
      const v = g(),
        T = o.get(v) ?? [];
      return (T.length === 0 && T.push(...Lx(v, r, p)), o.set(v, T), T.shift());
    },
    w = () => {
      const v = m() ? g()[f] : y();
      if (((h = e.loopCount), v === void 0 || v === p)) return;
      const T = c || m(),
        clip = G.clipByName(v);
      (e.load(clip, { phase: T ? 0 : (n.firstPhase ?? r()) }),
        (c = !0),
        (p = v),
        (h = e.loopCount));
    },
    S = () => {
      e.holdFace(l.face ?? (a ? "surprised" : null));
    },
    b = (v) => {
      ((u = v), (l = G.states[v]), (d = 0), (f = 0), e.setMorph(l.morph ?? null), S(), i || w());
    };
  return (
    i && e.rest(),
    b(t),
    {
      get state() {
        return u;
      },
      get clip() {
        return p;
      },
      setState(v) {
        v !== u && G.states[v] && b(v);
      },
      setCompact(v) {
        s = v;
      },
      setEmphasis(v) {
        v !== a && ((a = v), S());
      },
      setResting(v) {
        if (v !== i) {
          if (((i = v), !i)) {
            w();
            return;
          }
          (e.rest(), (p = null));
        }
      },
      advance(v) {
        if (i) return;
        d += v;
        const T = l.next;
        if (T != null && l.holdSeconds != null && d >= l.holdSeconds) {
          b(T);
          return;
        }
        if (e.loopCount !== h) {
          if (T != null && l.holdSeconds == null && ((f += 1), f >= g().length)) {
            b(T);
            return;
          }
          w();
        }
      },
    }
  );
}

function jb(e, t, n, r, G) {
  if (t < 0.001) return e;
  const o = n.isFollowingTurn ? le(r / G.Ib, -1, 1) : n.bias,
    [s, i] = G.expressions.inspecting,
    a = Math.max(1e-4, s.wid),
    c = Math.max(1e-4, i.wid),
    u = (1 + o) / 2,
    l = (d, f) => {
      const h = 1 + (f - 1) * t;
      return { ...wt(d), wid: d.wid * h, pts: d.pts.map((p) => [p[0] * h, p[1] * h]) };
    };
  return [l(e[0], Math.pow(c / a, u)), l(e[1], Math.pow(a / c, u))];
}

// ============================================================
// Eye SDF contour tracing (marching squares)
// ============================================================
const BM = 60,
  HM = 256,
  VM = 24,
  GM = 2e4,
  WM = 0.2;
const JM = 0.02,
  eT = 16,
  tT = 0.015,
  nT = 400,
  rT = 512,
  ls = 5;
const kn = new Map();
const uT = (e, t, n) => Jo(le((n - e) / (t - e), 0, 1)); // uT
function sT(e) {
  const [t, n] = e.oval,
    o =
      t > 1e-5 && n > 1e-5
        ? e.ovalMix > 1e-4
          ? Math.min(1, e.ovalMix)
          : uT(0, 0.08, Math.min(t, n))
        : 0,
    s = Math.max(0, e.pts.length - 1),
    i = new Float64Array(s * ls);
  for (let a = 0; a < s; a++) {
    const [c, u] = e.pts[a],
      l = e.pts[a + 1][0] - c,
      d = e.pts[a + 1][1] - u,
      f = l * l + d * d;
    i.set([c, u, l, d, f > 0 ? 1 / f : 0], a * ls);
  }
  return { segments: i, halfWidth: e.wid > 0 ? e.wid : -1, rx: t, ry: n, ellipseMix: o };
}
function aT(e, t, n) {
  let r = 1e6;
  for (let o = 0; o < e.length; o += ls) {
    const s = t - e[o],
      i = n - e[o + 1],
      a = e[o + 2],
      c = e[o + 3],
      u = (s * a + i * c) * e[o + 4],
      l = u < 0 ? 0 : u > 1 ? 1 : u,
      d = s - a * l,
      f = i - c * l,
      h = d * d + f * f;
    h < r && (r = h);
  }
  return Math.sqrt(r);
}
function iT(e, t, n) {
  const r = aT(e.segments, t, n) - e.halfWidth;
  if (e.ellipseMix === 0) return r;
  const o = t / e.rx,
    s = n / e.ry,
    i = (Math.sqrt(o * o + s * s) - 1) * Math.min(e.rx, e.ry);
  return r * (1 - e.ellipseMix) + i * e.ellipseMix;
}
function cT(e, t) {
  let n = 1 / 0,
    r = 1 / 0,
    o = -1 / 0,
    s = -1 / 0,
    i = 1 / 0;
  const { segments: a, halfWidth: c } = e;
  if (c > 0 && e.ellipseMix < 1 && a.length > 0) {
    for (let d = 0; d < a.length; d += ls)
      for (const [f, h] of [
        [a[d], a[d + 1]],
        [a[d] + a[d + 2], a[d + 1] + a[d + 3]],
      ])
        ((n = Math.min(n, f - c)),
          (r = Math.min(r, h - c)),
          (o = Math.max(o, f + c)),
          (s = Math.max(s, h + c)));
    i = c;
  }
  if (
    (e.ellipseMix > 0 &&
      ((n = Math.min(n, -e.rx)),
      (r = Math.min(r, -e.ry)),
      (o = Math.max(o, e.rx)),
      (s = Math.max(s, e.ry)),
      (i = Math.min(i, e.rx, e.ry))),
    !(o > n && s > r))
  )
    return [];
  const u = Math.max(Math.min(tT, i / 3), Math.max(o - n, s - r) / nT),
    l = {
      x0: n - 2 * u,
      y0: r - 2 * u,
      step: u,
      nx: Math.ceil((o - n) / u) + 4,
      ny: Math.ceil((s - r) / u) + 4,
    };
  return UM((d, f) => iT(e, d, f), l, { deviation: t, edge: Math.sqrt(4 * t) });
}
function oT(e, t) {
  const n = Math.min(eT, Math.max(0, Math.ceil(Math.log2(Math.max(t, 1))))),
    r = `${n}|${e.wid}|${e.oval.join()}|${e.ovalMix}|${e.pts.join()}`,
    o = kn.get(r);
  if (o !== void 0) return (kn.delete(r), kn.set(r, o), o);
  const s = cT(sT(e), JM / 2 ** n);
  if ((kn.set(r, s), kn.size > rT)) {
    const i = kn.keys().next();
    i.done !== !0 && kn.delete(i.value);
  }
  return s;
}
function UM(e, t, n) {
  const r = {
      field: e,
      tolerance: n,
      root: n.deviation * 0.001,
      reach: t.step * Math.hypot(t.nx, t.ny),
    },
    o = [];
  for (const s of KM(r, t)) {
    const i = ZM(XM(r, s), n);
    i.length >= 3 && o.push(i);
  }
  return o;
}
function KM(e, t) {
  const { field: n } = e,
    { x0: r, y0: o, step: s, nx: i, ny: a } = t,
    c = i + 1,
    u = new Float64Array(c * (a + 1));
  for (let b = 0; b <= a; b++) for (let v = 0; v <= i; v++) u[b * c + v] = n(r + v * s, o + b * s);
  const l = 2 * c * (a + 1),
    d = new Int32Array(l).fill(-1),
    f = new Map(),
    h = (b) => {
      const v = f.get(b);
      if (v !== void 0) return v;
      const T = b >> 1,
        A = b & 1 ? T + c : T + 1,
        F = r + (T % c) * s,
        N = o + Math.floor(T / c) * s,
        R = r + (A % c) * s,
        B = o + Math.floor(A / c) * s,
        E = Ah(e, F, N, u[T], R, B, u[A]),
        I = [F + (R - F) * E, N + (B - N) * E];
      return (f.set(b, I), I);
    },
    p = [0, 0, 0, 0],
    g = [0, 0, 0, 0],
    m = [],
    y = [];
  for (let b = 0; b < a; b++)
    for (let v = 0; v < i; v++) {
      const T = b * c + v;
      ((p[0] = T),
        (p[1] = T + 1),
        (p[2] = T + 1 + c),
        (p[3] = T + c),
        (g[0] = 2 * T),
        (g[1] = 2 * (T + 1) + 1),
        (g[2] = 2 * (T + c)),
        (g[3] = 2 * T + 1),
        (m.length = 0),
        (y.length = 0));
      for (let A = 0; A < 4; A++) {
        const F = u[p[A]] < 0,
          N = u[p[(A + 1) & 3]] < 0;
        F !== N && (m.push(g[A]), y.push(F));
      }
      if (m.length === 2) {
        const A = y[0] ? 0 : 1;
        d[m[A]] = m[1 - A];
      } else if (m.length === 4) {
        const A = n(r + (v + 0.5) * s, o + (b + 0.5) * s) < 0;
        for (let F = 0; F < 4; F++) y[F] && (d[m[F]] = m[(F + (A ? 1 : 3)) & 3]);
      }
    }
  const w = [],
    S = new Uint8Array(l);
  for (let b = 0; b < l; b++) {
    if (d[b] < 0 || S[b]) continue;
    const v = [];
    let T = b;
    for (; T >= 0 && !S[T];) ((S[T] = 1), v.push(h(T)), (T = d[T]));
    T === b && w.push(v);
  }
  return w;
}
function Ah(e, t, n, r, o, s, i) {
  let a = 0,
    c = r,
    u = 1,
    l = i,
    d = 0,
    f = 0;
  for (let h = 0; h < BM; h++) {
    f = (a * l - u * c) / (l - c);
    const p = e.field(t + (o - t) * f, n + (s - n) * f);
    if (Math.abs(p) <= e.root || u - a <= 1e-15) break;
    p < 0 == l < 0
      ? ((u = f), (l = p), d === -1 && (c /= 2), (d = -1))
      : ((a = f), (c = p), d === 1 && (l /= 2), (d = 1));
  }
  return f;
}
function XM(e, t) {
  const n = [];
  for (let r = 0; r < t.length; r++) {
    const o = t[r],
      s = t[(r + 1) % t.length];
    (o[0] === s[0] && o[1] === s[1]) || (n.push(o), fa(e, o, s, 0, n));
  }
  return n;
}
function fa(e, t, n, r, o) {
  const s = n[0] - t[0],
    i = n[1] - t[1],
    a = Math.sqrt(s * s + i * i);
  if (a === 0 || r >= VM || o.length >= GM) return;
  const c = (t[0] + n[0]) / 2,
    u = (t[1] + n[1]) / 2,
    l = e.field(c, u);
  if (!Number.isFinite(l)) return;
  const d = l > 0 ? 1 : -1,
    f = (-i / a) * d,
    h = (s / a) * d,
    p = Ih(e, c, u, l, f, h);
  if (p === null || (p <= e.tolerance.deviation / 2 && a <= e.tolerance.edge)) return;
  const g = l > 0 ? YM(e, c, u, l, f, h, p) : [c + f * p, u + h * p];
  (fa(e, t, g, r + 1, o), o.push(g), fa(e, g, n, r + 1, o));
}
function YM(e, t, n, r, o, s, i) {
  const a = [t + o * i, n + s * i],
    c = i * 0.001,
    u = e.field(t + c, n) - e.field(t - c, n),
    l = e.field(t, n + c) - e.field(t, n - c),
    d = Math.sqrt(u * u + l * l);
  if (d === 0) return a;
  const f = u * s - l * o < 0 ? -1 : 1,
    h = (-l / d) * f,
    p = (u / d) * f;
  if (h * o + p * s < WM) return a;
  const g = Ih(e, t, n, r, h, p);
  return g === null || g * (h * o + p * s) <= i ? a : [t + h * g, n + p * g];
}
function Ih(e, t, n, r, o, s) {
  if (r === 0) return 0;
  let i = 0,
    a = r;
  for (let c = 0; c < HM; c++) {
    const u = i + Math.max(Math.abs(a), e.root);
    if (u > e.reach) return null;
    const l = t + o * u,
      d = n + s * u,
      f = e.field(l, d);
    if (f < 0 != r < 0) return i + (u - i) * Ah(e, t + o * i, n + s * i, a, l, d, f);
    ((i = u), (a = f));
  }
  return null;
}
function ZM(e, t) {
  const n = e.length;
  if (n < 4) return e;
  const r = new Uint8Array(n);
  let o = 0,
    s = -1;
  for (let a = 1; a < n; a++) {
    const c = ud(e[0], e[a]);
    c > s && ((s = c), (o = a));
  }
  ((r[0] = 1), (r[o] = 1));
  const i = (a, c) => {
    if (c - a < 2) return;
    const u = e[a],
      l = e[c % n];
    let d = -1,
      f = a;
    for (let p = a + 1; p < c; p++) {
      const g = QM(e[p], u, l);
      g > d && ((d = g), (f = p));
    }
    const h = d > t.deviation / 2;
    (!h && Math.sqrt(ud(u, l)) <= t.edge) ||
      (h || (f = (a + c) >> 1), (r[f] = 1), i(a, f), i(f, c));
  };
  return (i(0, o), i(o, n), e.filter((a, c) => r[c] === 1));
}

// ============================================================
// Spherical mapping, squash clipping and cutout
// ============================================================
function ST(e, t, n, r, _o, radiusAt) {
  const s = oT(e, 512 * Math.max(1, e.lidY));
  if (s.length === 0) return [];
  const i = Et(r, t.M),
    a = Et(r, t.C),
    c = Et(r, t.T),
    u = Math.atan2(i[1], i[0]),
    rad = radiusAt ? radiusAt(u) : 1,
    shiftX = (rad - 1) * i[0],
    shiftY = (rad - 1) * i[1],
    l = Math.cos(e.tilt),
    d = Math.sin(e.tilt),
    [f, h] = e.off,
    p = ([m, y]) => {
      const w = y * e.lidY,
        S = f + l * m + d * w,
        b = h - d * m + l * w,
        v = Math.sqrt(S * S + b * b),
        T = v > 1e-12 ? Math.sin(v) / v : 1,
        A = Math.cos(v);
      return [
        A * i[0] + T * (S * a[0] + b * c[0]) + shiftX,
        A * i[1] + T * (S * a[1] + b * c[1]) + shiftY,
        A * i[2] + T * (S * a[2] + b * c[2]),
      ];
    },
    g = [];
  for (const m of s) {
    const y = m.map(p);
    n && y.reverse();
    const w = RM(y, u);
    w !== null && g.push(w);
  }
  return g;
}
function sd(e, t) {
  const n = e[2] / (e[2] - t[2]),
    r = e[0] + (t[0] - e[0]) * n,
    o = e[1] + (t[1] - e[1]) * n,
    s = Math.sqrt(r * r + o * o);
  return [r / s, o / s];
}
const CM = [1, 1];
function id(e, t, n) {
  const r = cd(Math.atan2(t[1], t[0]) - n) - cd(Math.atan2(e[1], e[0]) - n);
  return { kind: "arc", to: t, radii: CM, sweep: r };
}
function RM(e, t) {
  const n = e.length;
  let r = -1;
  for (let a = 0; a < n && r < 0; a++) e[a][2] <= 0 && e[(a + 1) % n][2] > 0 && (r = a);
  if (r < 0)
    return n === 0 || e[0][2] <= 0 ? null : e.map(([a, c]) => ({ kind: "line", to: [a, c] }));
  const o = [];
  let s = [1, 0],
    i = null;
  for (let a = 0; a < n; a++) {
    const c = e[(r + a) % n],
      u = e[(r + a + 1) % n],
      l = c[2] > 0,
      d = u[2] > 0;
    if (l && d) o.push({ kind: "line", to: [u[0], u[1]] });
    else if (l) ((i = sd(c, u)), o.push({ kind: "line", to: i }));
    else if (d) {
      const f = sd(c, u);
      (i === null ? (s = f) : o.push(id(i, f, t)), o.push({ kind: "line", to: [u[0], u[1]] }));
    }
  }
  return (i !== null && o.push(id(i, s, t)), o);
}
function xT(e, kT) {
  const t = [];
  let n = e[e.length - 1]?.to ?? [0, 0];
  for (const r of e) {
    if (r.kind === "arc") {
      const o = Math.atan2(n[1], n[0]),
        s = Math.max(1, Math.ceil(Math.abs(r.sweep) / kT));
      for (let i = 1; i < s; i++) t.push(Ph(r.radii, o + (r.sweep * i) / s));
    }
    (t.push(r.to), (n = r.to));
  }
  return t;
}
function Ph(e, t) {
  const n = Math.cos(t),
    r = Math.sin(t),
    o = 1 / Math.sqrt((n * n) / (e[0] * e[0]) + (r * r) / (e[1] * e[1]));
  return [o * n, o * r];
}
function zr(e, t) {
  return [
    { kind: "arc", to: [-e[0], 0], radii: e, sweep: t * Math.PI },
    { kind: "arc", to: [e[0], 0], radii: e, sweep: t * Math.PI },
  ];
}
// ---- Clip eye rings to the body ellipse when squash < 1 ----
function NM(e, t, n, r) {
  const o = t[0] - e[0],
    s = t[1] - e[1],
    i = n * o * o + r * s * s,
    a = n * e[0] * o + r * e[1] * s,
    c = n * e[0] * e[0] + r * e[1] * e[1] - 1,
    u = a * a - i * c;
  if (i === 0 || u <= 0) return [];
  const l = Math.sqrt(u),
    d = -(a + (a < 0 ? -l : l));
  return [d / i, c / d].filter((f) => f > 0 && f < 1).sort((f, h) => f - h);
}
function FM(e, t, n, r, o) {
  if (r === o || n === 0) return [];
  const s = (1 / (e * e) - o) / (r - o);
  if (!(s > 0 && s < 1)) return [];
  const i = Math.acos(Math.sqrt(s)),
    a = [];
  for (const c of [i, -i, Math.PI - i, Math.PI + i]) {
    const l = (n > 0 ? Dr(c - t) : Dr(t - c)) / Math.abs(n);
    l > 0 && l < 1 && a.push(l);
  }
  return a.sort((c, u) => c - u);
}
function LM(e, t) {
  const n = 1 / (t[0] * t[0]),
    r = 1 / (t[1] * t[1]),
    o = (a) => n * a[0] * a[0] + r * a[1] * a[1] - 1,
    s = [];
  let i = e[e.length - 1].to;
  for (const a of e) {
    if (a.kind === "line") {
      const c = NM(i, a.to, n, r);
      let u = i;
      for (let l = 0; l <= c.length; l++) {
        const d = l === 0 ? 0 : c[l - 1],
          f = l === c.length ? 1 : c[l],
          h = l === c.length ? a.to : ad(i, a.to, f);
        (s.push({
          from: u,
          segment: { kind: "line", to: h },
          sweep: Math.atan2(u[0] * h[1] - u[1] * h[0], u[0] * h[0] + u[1] * h[1]),
          isInside: o(ad(i, a.to, (d + f) / 2)) < 0,
        }),
          (u = h));
      }
    } else {
      const c = a.radii[0],
        u = Math.atan2(i[1], i[0]),
        l = FM(c, u, a.sweep, n, r);
      let d = i;
      for (let f = 0; f <= l.length; f++) {
        const h = f === 0 ? 0 : l[f - 1],
          p = f === l.length ? 1 : l[f],
          g = u + a.sweep * p,
          m = f === l.length ? a.to : [c * Math.cos(g), c * Math.sin(g)],
          y = u + (a.sweep * (h + p)) / 2,
          w = a.sweep * (p - h);
        (s.push({
          from: d,
          segment: { kind: "arc", to: m, radii: a.radii, sweep: w },
          sweep: w,
          isInside: o([c * Math.cos(y), c * Math.sin(y)]) < 0,
        }),
          (d = m));
      }
    }
    i = a.to;
  }
  return s;
}
function $M(e, t) {
  const n = LM(e, t),
    r = n.length;
  if (n.every((c) => c.isInside)) return e;
  let o = -1;
  for (let c = 0; c < r && o < 0; c++) n[c].isInside && !n[(c + r - 1) % r].isInside && (o = c);
  if (o < 0) {
    const c = n.reduce((u, l) => u + l.sweep, 0);
    return Math.abs(c) > Math.PI ? zr(t, Math.sign(c)) : null;
  }
  const s = [];
  let i = null,
    a = 0;
  for (let c = 0; c < r; c++) {
    const u = n[(o + c) % r];
    u.isInside
      ? (i !== null && s.push({ kind: "arc", to: u.from, radii: t, sweep: a }),
        (i = null),
        s.push(u.segment))
      : (i === null && ((i = u.from), (a = 0)), (a += u.sweep));
  }
  return (i !== null && s.push({ kind: "arc", to: n[o].from, radii: t, sweep: a }), s);
}
// ---- Cutout: replace the eye horizon arc into the body outline ----
function zM(e, t) {
  const n = [e, ...t.map((o) => o.to)],
    r = t
      .map((o, s) =>
        o.kind === "line" ? { kind: "line", to: n[s] } : { ...o, to: n[s], sweep: -o.sweep },
      )
      .reverse();
  return { from: n[n.length - 1], to: e, segments: r };
}
function DM(e, t, n) {
  const r = n
      .map((s) => ({ point: s, angle: Dr(Math.atan2(s[1], s[0])) }))
      .sort((s, i) => s.angle - i.angle),
    o = [];
  for (let s = 0; s < r.length; s++) {
    const i = r[s],
      a = r[(s + 1) % r.length],
      c = s + 1 < r.length ? a.angle - i.angle : a.angle + TAU - i.angle;
    if (c <= 0) continue;
    const u = i.angle + c / 2;
    t.reduce((l, d) => l + jM(d, u), 0) === 0 &&
      o.push({
        from: i.point,
        to: a.point,
        segments: [{ kind: "arc", to: a.point, radii: e, sweep: c }],
      });
  }
  return o;
}
function jM(e, t) {
  const n = Math.atan2(e.from[1], e.from[0]);
  return (e.sweep > 0 ? Dr(t - n) : Dr(n - t)) < Math.abs(e.sweep) ? Math.sign(e.sweep) : 0;
}
function qM(e) {
  const t = (s) => `${s[0]} ${s[1]}`,
    n = new Map();
  for (const s of e) {
    const i = n.get(t(s.from));
    i === void 0 ? n.set(t(s.from), [s]) : i.push(s);
  }
  const r = new Set(),
    o = [];
  for (const s of e) {
    const i = [];
    let a = s;
    for (; a !== void 0 && !r.has(a);)
      (r.add(a), i.push(...a.segments), (a = n.get(t(a.to))?.find((c) => !r.has(c))));
    i.length > 0 && o.push(i);
  }
  return o;
}
function OM(e, t) {
  const n = (a) => a.kind === "arc" && a.radii[0] === e[0] && a.radii[1] === e[1],
    r = [],
    o = [],
    s = [],
    i = [];
  for (const a of t) {
    const c = a.findIndex(n);
    if (c < 0) {
      r.push(a);
      continue;
    }
    let u = a[c].to,
      l = [],
      d = u;
    for (let f = 1; f <= a.length; f++) {
      const h = a[(c + f) % a.length];
      (n(h)
        ? (s.push({ from: d, sweep: h.sweep }),
          i.push(d, h.to),
          l.length > 0 && o.push(zM(u, l)),
          (l = []),
          (u = h.to))
        : l.push(h),
        (d = h.to));
    }
  }
  return s.length === 0 ? [zr(e, 1), ...r] : [...qM([...o, ...DM(e, s, i)]), ...r];
}
// ---- Path serialization ----
const _h = Math.PI * 0.999;
function ha(e, t, n) {
  let r = e[e.length - 1].to,
    o = `M${t(r)}`;
  for (const s of e) ((o += s.kind === "line" ? `L${t(s.to)}` : pa(r, s, t, n)), (r = s.to));
  return `${o}Z`;
}
function pa(e, t, n, r) {
  if (t.sweep === 0) return "";
  if (Math.abs(t.sweep) > _h) {
    const s = t.sweep / 2,
      i = Ph(t.radii, Math.atan2(e[1], e[0]) + s);
    return pa(e, { ...t, to: i, sweep: s }, n, r) + pa(i, { ...t, sweep: s }, n, r);
  }
  return `A${`${qt(t.radii[0] * r)} ${qt(t.radii[1] * r)}`} 0 0 ${t.sweep > 0 ? 0 : 1} ${n(t.to)}`;
}
const qt = (e) => String(Math.round(e * 100) / 100); // qt
const od = (e) => String(Math.round(e * 100) / 100); // od
const Se = (e, t = 2) => {
  const n = 10 ** t;
  return String(Math.round(e * n) / n);
}; // Se

// ============================================================
// Sphere body and glow
// ============================================================
const yT = 192,
  kT = Math.PI / 48;
function Ch(e, t, G, radiusAt) {
  if (e.eyes === null) return [];
  const n = ir(e.quat),
    r = [Math.abs(e.squash[0]), Math.abs(e.squash[1])],
    o = r[0] < 1 || r[1] < 1,
    s = [];
  return (
    e.eyes.forEach((i, a) => {
      for (const c of ST(i, G.eyeBasis[a], G.eyeMirror[a], n, t, radiusAt)) {
        const u = o ? $M(c, r) : c;
        u !== null && s.push(u);
      }
    }),
    s
  );
}
function wT(e, t, n, G) {
  const o = (e.zoom * n) / 2,
    [s, i] = e.squash;
  if (o === 0 || s === 0 || i === 0) return { size: n, body: "", eyes: "", glow: null };
  const a = [Math.abs(s), Math.abs(i)],
    c = n / 2 + o * e.offset[0],
    u = n / 2 - o * (e.squashAnchor * (1 - i) + e.offset[1]),
    l = (h) => `${qt(c + h[0] * o)} ${qt(u - h[1] * o)}`,
    d = (h) => h.map((p) => ha(p, l, Math.abs(o))).join(""),
    f = Ch(e, Math.abs(o), G);
  return {
    size: n,
    body: d(t.cutout ? OM(a, f) : [zr(a, 1)]),
    eyes: t.cutout ? "" : d(f),
    glow: e.glow === null ? null : TT(e.glow, a, l, Math.abs(o)),
    center: [c, u],
    radius: Math.abs(o),
  };
}
const ld = 48,
  dd = 11,
  gr = 0.055;
const hd = (e, t, n) => [
  e[0] + (t[0] - e[0]) * n,
  e[1] + (t[1] - e[1]) * n,
  e[2] + (t[2] - e[2]) * n,
]; // hd
function Nr(e) {
  const t = (n) =>
    Math.round(le(n, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${t(e[0])}${t(e[1])}${t(e[2])}`;
}
function AT(e, t, n) {
  const r = ma(0.12, t, n),
    o = ma(t, 0.93, n),
    s = 0.9 + 0.1 * Math.max(0, 1 - n * n) ** 0.225,
    i = (a) => {
      const c = e.inner[a] + (e.mid[a] - e.inner[a]) * r;
      return (c + (e.rim[a] - c) * o) * s;
    };
  return [i(0), i(1), i(2)];
}
function pd(e, t, n) {
  return `matrix(${qt(e[0] * n)} 0 0 ${qt(e[1] * n)} ${t([0, 0])})`;
} // pd
function TT(e, t, n, r) {
  const o = 0.42 + 0.16 * e.midT,
    s = [];
  for (let u = 0; u <= ld; u++) {
    const l = 1 - (1 - u / ld) ** 2;
    s.push({ offset: l, color: Nr(AT(e, o, l)), opacity: 1 });
  }
  const i = { transform: pd(t, n, r), focus: 0, stops: s };
  if (!(e.halo > 0)) return { body: i, halo: null };
  const a = [];
  for (let u = 0; u <= dd; u++) {
    const l = (gr * u) / dd,
      d = Math.min(1, e.halo * (1 - ma(0, gr, l)));
    a.push({ offset: (1 + l) / (1 + gr), color: Nr(e.rim), opacity: d });
  }
  const c = [t[0] * (1 + gr), t[1] * (1 + gr)];
  return {
    body: i,
    halo: {
      d: ha(zr(c, 1), n, r) + ha(zr(t, 1), n, r),
      gradient: { transform: pd(c, n, r), focus: 0, stops: a },
    },
  };
}

// ============================================================
// Morph overlay: generators, compositor and body-outline blend
// ============================================================
function Lh(e, t, n, r, G) {
  const o = Bt((e.stateTime * 1e3) / G.FT + 0.119),
    s = Math.abs(o - t / 3),
    i = Math.min(s, 1 - s),
    a = r ? 1 : Math.exp(-(i * i) / (2 * 0.15 * 0.15)),
    c = r ? 0 : 1;
  return {
    lift: a * G.NT * n * c,
    pop: 1 + c * (G.$T + G.OT * a - 1),
    tone: 1 - c * 0.5 * (1 - a),
  };
}
const ZT = (e) =>
  0.42 + 0.29 * Math.sin(e * 0.0021) * Math.sin(e * 0.0034) + 0.29 * Math.sin(e * 0.0013 + 1.7); // ZT
const QT = (e, t) => ZT(e) * (0.55 + 0.45 * Math.sin(e * 0.012 - Math.abs(t) * 1.05)); // QT
const JT = (e) => -Math.PI * 1.25 + tc(e)() * Math.PI * 1.5; // JT
function eE(e) {
  const r = 1082.2060353798126,
    o = 40,
    s = Math.sqrt((2 * o) / r);
  if (e < s) return 0.5 * r * e * e;
  const i = Bt((e - s) / 0.62);
  return o - 208 * i * (1 - i);
}
function pc(e, G) {
  const t = Bt(e / G.ds);
  if (t < G.Mr) {
    const r = t / G.Mr,
      o = r * r * (3 - 2 * r),
      s = le(r / 0.08, 0, 1) * le((1 - r) / 0.08, 0, 1);
    return {
      x: -54 + 118 * o,
      y: 26,
      wig: Math.sin(r * 24) * 3.2 * s,
      rot: 17 + Math.sin(e * 6e-4) * 1,
    };
  }
  const n = Qo((t - G.Mr) / (1 - G.Mr));
  return {
    x: 64 - 118 * n,
    y: 26 - 20 * Math.sin(n * Math.PI),
    wig: 0,
    rot: 17 - 2 * Math.sin(n * Math.PI) + Math.sin(e * 6e-4) * 1,
  };
}
const Nh = (e, G) => {
  const t = pc(e, G);
  return [G.x + t.x, G.x + t.y + t.wig + 19];
}; // Nh
function makeTrail(G) {
  const e = [];
  for (let t = 0; t < G.Co; t++) {
    const n = Nh(t, G),
      r = e[e.length - 1];
    (r === void 0 || Math.hypot(n[0] - r.point[0], n[1] - r.point[1]) > G.zT) &&
      e.push({ at: t, point: n });
  }
  return e;
}
function nE(e, G, tE) {
  const t = Bt(e / G.ds) * G.ds,
    n = Math.min(t, G.Co),
    r = tE.filter((a) => a.at <= n),
    o = r.length > 0 ? r[r.length - 1].at : n,
    s = n > o ? [Nh(n, G)] : [],
    i = [...r.map((a) => a.point), ...s].slice(-64);
  return t < G.Co ? i : i.slice(Math.floor(((t - G.Co) / 1e3) * G.DT));
}
function rE(e) {
  const t = e.length;
  let n = `M${e[0][0].toFixed(1)} ${e[0][1].toFixed(1)}`;
  if (t === 2) return n + `L${e[1][0].toFixed(1)} ${e[1][1].toFixed(1)}`;
  for (let r = 0; r < t - 1; r++) {
    const o = e[Math.max(r - 1, 0)],
      s = e[r],
      i = e[r + 1],
      a = e[Math.min(r + 2, t - 1)],
      c = s[0] + (i[0] - o[0]) / 6,
      u = s[1] + (i[1] - o[1]) / 6,
      l = i[0] - (a[0] - s[0]) / 6,
      d = i[1] - (a[1] - s[1]) / 6;
    n += `C${c.toFixed(1)} ${u.toFixed(1)} ${l.toFixed(1)} ${d.toFixed(1)} ${i[0].toFixed(1)} ${i[1].toFixed(1)}`;
  }
  return n;
}
const Ht = (e, t, n, r, o) => ({ type: "disc", key: e, cx: t, cy: n, r, opacity: o }); // Ht
const _s = (e, t, n, r, X) => ({ type: "ring", key: e, cx: X, cy: X, r: t, width: n, opacity: r });
const Oh = (e, t, n, r) => ({ type: "shape", key: e, d: t, transform: n, opacity: r }); // Oh
const XT = (e, t, n, r) => ({ type: "stroke", key: e, d: t, width: n, opacity: r }); // XT

function makeMorphGenerators(G) {
  const x = G.x;
  const oE = (e, t, n) => {
    // dots
    const r = [x - G.yd, x + G.yd],
      o = [];
    for (let s = 0; s < 2; s++) {
      const i = le((e - s * 0.12) / (1 - s * 0.12), 0, 1);
      if (i <= 0.004) continue;
      const a = Ye(i),
        c = Es(i),
        u = Lh(t, s === 0 ? 0 : 2, e, n, G);
      o.push(Ht(`dots.${s}`, x + (r[s] - x) * c, x - u.lift, G.RT * a * u.pop * G.LT, a * u.tone));
    }
    return o;
  };
  const sE = (e, t) => {
    // orbit
    const n = Ye(e),
      r = 52 * Es(e),
      o = 12,
      s = t.stateTime * 1e3 * 0.0017;
    return Array.from({ length: 5 }, (i, a) => {
      const c = s + (a * TAU) / 5,
        u = Math.cos(c),
        l = 0.5 + 0.5 * le(u, 0, 1);
      return Ht(
        `orbit.${a}`,
        x + r * Math.sin(c),
        x - r * 0.42 * Math.cos(c),
        Math.max(o * l * n, 0.3),
        le((u + 0.4) / 0.6, 0.18, 1) * n,
      );
    });
  };
  const iE = (e, t, n) => {
    // radar
    const r = Ye(e),
      o = 1300,
      s = 104;
    return Array.from({ length: 3 }, (i, a) => {
      const c = Bt((t.stateTime * 1e3) / o + a / 3);
      return {
        type: "ring",
        key: `radar.${a}`,
        cx: x,
        cy: x,
        r: n + (s - n) * c,
        width: 3.4 * (1 - c * 0.55),
        opacity: r * (1 - c) * 0.9,
      };
    });
  };
  const aE = (e, t) => {
    // progress
    const n = Ye(e),
      r = 62 * Es(e),
      o = le((t.shotTime * 1e3) / G.jT, 0, 1),
      s = le(o / 0.85, 0, 1),
      i = { type: "ring", key: "progress.track", cx: x, cy: x, r, width: 5, opacity: n * 0.16 };
    return s <= 0
      ? [i]
      : [
          i,
          {
            type: "ring",
            key: "progress.arc",
            cx: x,
            cy: x,
            r,
            width: 5,
            opacity: n,
            arc: { fraction: s, startDeg: -90 },
          },
        ];
  };
  const cE = (e, t) => {
    // gather
    const n = Ye(e),
      r = [];
    for (let o = 0; o < 5; o++) {
      const s = le(((t.shotTime * 1e3) / G.qT - o * 0.09) / 0.62, 0, 1);
      if (s >= 1) continue;
      const i = 1 - Math.pow(1 - s, 3),
        a = o * 2.4 + s * 2.2,
        c = 96 * (1 - i);
      r.push(
        Ht(
          `gather.${o}`,
          x + c * Math.cos(a),
          x + c * Math.sin(a) * 0.8,
          9 * (0.5 + 0.5 * i) * n,
          n * le(s * 5, 0, 1) * (1 - i * 0.25),
        ),
      );
    }
    return r;
  };
  const uE = (e, t) => {
    // wave
    const n = t.stateTime * 1e3,
      r = 44,
      o = [];
    for (const s of G.BT) {
      const i = le((e - Math.abs(s) * 0.1) / (1 - Math.abs(s) * 0.1), 0, 1);
      if (i <= 0.004) continue;
      const a = Es(i),
        c = QT(n, s),
        u = (7 + 9 * le(c, 0.08, 1)) * Ye(i),
        l = 6 * le(c, 0, 1) * i;
      o.push(Ht(`wave.${s}`, x + s * r * a, x - l, u, i));
    }
    return o;
  };
  const lE = (e, t) => {
    // send
    const n = Ye(e),
      r = Bt((t.stateTime * 1e3) / G.Rh),
      o = le((r - 0.18) / 0.55, 0, 1),
      s = o * o * (0.4 + 0.6 * o),
      i = 0.74,
      a = -0.62,
      c = [];
    if (o > 0 && o < 1) {
      const f = 108 * s;
      c.push(Ht("send.packet", x + i * f, x + a * f, 10 * (1 - s * 0.55) * n, n * (1 - s * s)));
    }
    const u = le((r - 0.26) / 0.55, 0, 1),
      l = u * u * (0.4 + 0.6 * u);
    if (o > 0 && u > 0 && u < 1) {
      const f = 108 * l;
      c.push(Ht("send.streak", x + i * f, x + a * f, 5 * (1 - l * 0.6) * n, n * 0.3 * (1 - l)));
    }
    const d = le((r - 0.18) / 0.3, 0, 1);
    return (
      d > 0 &&
        d < 1 &&
        c.push({
          type: "ring",
          key: "send.launch",
          cx: x,
          cy: x,
          r: 20 + 34 * Ye(d),
          width: 2.8 * (1 - d),
          opacity: n * (1 - d) * 0.8,
        }),
      c
    );
  };
  const dE = (e, t) => {
    // receive
    const n = Ye(e),
      r = t.stateTime * 1e3,
      o = JT(Math.floor(r / G.ga)),
      s = Bt(r / G.ga),
      i = le(s / 0.6, 0, 1),
      a = 1 - Math.pow(1 - i, 3),
      c = Math.cos(o),
      u = Math.sin(o),
      l = 108 * (1 - a),
      d = [];
    if (i < 1) {
      const h = 18 * Math.sin(i * Math.PI) * (1 - a * 0.7);
      d.push(
        Ht(
          "receive.packet",
          x + c * l - u * h,
          x + u * l + c * h,
          3.5 + 6.5 * a,
          n * le(i * 3.5, 0, 1) * (0.3 + 0.7 * a),
        ),
      );
    }
    const f = le((s - 0.58) / 0.32, 0, 1);
    return (
      f > 0 &&
        f < 1 &&
        d.push({
          type: "ring",
          key: "receive.absorb",
          cx: x,
          cy: x,
          r: 20 + 26 * Ye(f),
          width: 2.8 * (1 - f),
          opacity: n * (1 - f) * 0.8,
        }),
      d
    );
  };
  const fE = (e, t) => {
    // dock
    const n = Ye(e),
      r = t.stateTime * 1e3,
      o = 42,
      s = 1.1,
      i = [];
    for (let a = 0; a < 2; a++) {
      const c = le((t.stateTime - (0.2 + a * 1.3)) / 0.9, 0, 1);
      if (c <= 0) continue;
      const u = 1 - Math.pow(1 - c, 3),
        l = r * 0.001 * s + a * Math.PI,
        d = x + o * Math.sin(l),
        f = x + o * 0.5 * Math.cos(l) + Math.sin(r * 0.003 + a) * 2,
        h = x - 120 + a * 30,
        p = x + 95;
      i.push(
        Ht(`dock.${a}`, h + (d - h) * u, p + (f - p) * u, (7 + 3 * u) * n, n * le(c * 4, 0, 1)),
      );
    }
    return i;
  };
  const hE = (e, t, n, tE) => {
    // pencil
    const r = t.stateTime * 1e3,
      o = pc(r, G),
      s2 = (o.rot - 90) * DEG,
      i = 68,
      a = Math.cos(s2) * i,
      c = Math.sin(s2) * i,
      u = x + (o.x + a) * e,
      l = x + (o.y + o.wig * 0.15 + c) * e,
      d = [
        Oh(
          "pencil.shaft",
          G.UT,
          `translate(${u.toFixed(1)} ${l.toFixed(1)}) rotate(${(o.rot * e).toFixed(1)}) scale(${Ye(e).toFixed(3)}) translate(${-x} ${-x})`,
          le(e * 1.6 - 0.3, 0, 1),
        ),
      ],
      f = nE(r, G, tE);
    return (f.length >= 2 && d.push(XT("pencil.ink", rE(f), 6, le(e * 1.2, 0, 1))), d);
  };
  const pE = (e, t) => {
    // bang
    const n = t.stateTime,
      r = Ye(le(e * 1.1, 0, 1)),
      o = Math.exp(-(n % 2.2) * 5.5),
      s = Math.sin(n * 42) * 2.2 * o;
    return [
      Oh(
        "bang.bar",
        G.KT,
        `translate(0 ${(-26 - (1 - r) * 70).toFixed(1)}) rotate(${s.toFixed(2)} ${x} ${(x - 74).toFixed(1)}) translate(${x} ${x}) scale(${le(e * 1.2, 0, 1).toFixed(3)}) translate(${-x} ${-x})`,
        le(e * 1.5 - 0.2, 0, 1),
      ),
    ];
  };
  const mE = (e, t) => {
    // standby
    const n = 0.5 + 0.5 * Math.sin(t.stateTime * 1e3 * 0.0016);
    return [Ht("standby.halo", x, x, 26 + 7 * n, Ye(e) * (0.06 + 0.1 * n))];
  };
  return (e, t, n, r, o, tE) => {
    // gE
    switch (e) {
      case "dots":
        return oE(t, n, o);
      case "orbit":
        return sE(t, n);
      case "radar":
        return iE(t, n, r);
      case "progress":
        return aE(t, n);
      case "gather":
        return cE(t, n);
      case "wave":
        return uE(t, n);
      case "send":
        return lE(t, n);
      case "receive":
        return dE(t, n);
      case "dock":
        return fE(t, n);
      case "ball":
        return [];
      case "pencil":
        return hE(t, n, o, tE);
      case "bang":
        return pE(t, n);
      case "standby":
        return mE(t, n);
    }
  };
}

// ============================================================
// yE: morph compositor (amount/swap to core transform, parts and zoom)
// ============================================================
const YT = { lift: 0, pop: 1, tone: 1 };
const Kx = (e, t, n) => e.map(([r, o], s) => [r + (t[s][0] - r) * n, o + (t[s][1] - o) * n]);
const Mi = (e, G) => G.$h;
function yE(e, t, G, gE, tE) {
  const { kind: n, isReducedMotion: r } = e,
    o = le(e.amount, 0, 1),
    s = le(e.swap, 0, 1),
    i = s < 0.999 ? e.outgoing : null,
    a = (j) => (j === n ? o * s : j === i ? o * (1 - s) : 0),
    c = (j) => (j === n ? e.clock : e.outgoingClock),
    u = le(o / G._T, 0, 1),
    d =
      n === "pencil" || i === "pencil"
        ? s >= 0.999
          ? Mi(n, G)
          : Kx(Mi(i, G), Mi(n, G), Qo(s))
        : G.$h,
    f = n ? G.Si[n] * s + (i ? G.Si[i] : G.Si[n]) * (1 - s) : 19,
    h = a("dots"),
    p = n === "dots" || i === "dots",
    g = p ? Lh(c("dots"), 1, o, r, G) : YT;
  let m = p ? 1 + (g.pop - 1) * (h / Math.max(o, 0.001)) : 1;
  const y = a("receive");
  if (y > 0.004) {
    const j = Bt((c("receive").stateTime * 1e3) / G.ga),
      J = le((j - 0.58) / 0.34, 0, 1);
    m *= 1 + 0.11 * Math.sin(J * Math.PI) * y;
  }
  const w = a("send");
  if (w > 0.004) {
    const j = Bt((c("send").stateTime * 1e3) / G.Rh),
      J = j < 0.18 ? -0.06 * Math.sin((j / 0.18) * Math.PI) : 0,
      fe = j >= 0.18 && j < 0.42 ? 0.05 * Math.sin(((j - 0.18) / 0.24) * Math.PI) : 0;
    m *= 1 + (J + fe) * w;
  }
  const S = a("bang");
  S > 0.004 && (m *= 1 + 0.04 * Math.exp(-(c("bang").stateTime % 2.2) * 5.5) * S);
  let b = 0,
    v = 0,
    T = 0;
  const A = a("pencil");
  if (A > 0.004) {
    const j = pc(c("pencil").stateTime * 1e3, G);
    ((b += j.x * A), (v += (j.y + j.wig * 0.5) * A), (T += j.rot * A));
  }
  S > 0.004 && (v += 58 * S);
  const F = a("ball");
  F > 0.004 && (v += eE(c("ball").stateTime) * F);
  const N = (f / G.x) * m,
    R = a("standby"),
    B = R > 0 ? (0.28 + 0.2 * Math.sin(c("standby").stateTime * 1e3 * 0.0016)) * R : 0,
    E = {
      scale: 1 - o + N * o,
      dx: b * o,
      dy: -g.lift * h + v * o,
      rotation: T * o,
      opacity: (1 - (1 - g.tone) * h) * (1 - B),
      round: Qo(u),
      ring: d,
    },
    I = 1 - eb(le((t - 44) / 90, 0, 1)),
    _ = n == null ? 1 : G.gd[n],
    O = i ? G.gd[i] : _,
    H = 1 + (_ * s + O * (1 - s) - 1) * o * I,
    L = [];
  for (const j of [i, n]) {
    if (j == null) continue;
    const J = a(j);
    J > 0.004 && L.push(...gE(j, J, c(j), f, r, tE));
  }
  return { core: E, isFaceVisible: o < 0.5, zoom: H, parts: L.filter((j) => j.opacity > 0) };
}

// ============================================================
// Body outline and morph ring blend
// ============================================================
const rd = 1e-9,
  dM = 1e-7,
  tn = 720; // rd/dM/tn
function hM(e) {
  return Array.from({ length: e }, (t, n) => (n / e) * TAU);
} // hM
const kE = hM(192);
function yM(e, t, n) {
  const [r, o] = t;
  return Array.from({ length: n }, (s, i) => {
    const a = (i / n) * TAU,
      c = Math.cos(a),
      u = Math.sin(a),
      l = r === 0 || o === 0 ? 0 : 1 / Math.hypot(c / r, u / o);
    return [e[0] + c * l, e[1] + u * l];
  });
}
function pM(e, t) {
  return e.flatMap((n) => n.map(([r, o]) => us(t, r, o)));
} // pM
function mM(e) {
  const t = e.flat().sort((n, r) => n - r);
  return t.filter((n, r) => r === 0 || n - t[r - 1] > dM);
}
function us(e, t, n) {
  const r = Math.atan2(n - e[1], t - e[0]);
  return r < 0 ? r + TAU : r;
} // us
function EM(e, t) {
  const n = Array.from({ length: tn }, () => []);
  for (const r of e)
    for (let o = 0; o < r.length; o++) {
      const s = r[o],
        i = r[(o + 1) % r.length],
        a = us(t, s[0], s[1]);
      let c = us(t, i[0], i[1]) - a;
      (c > Math.PI && (c -= TAU), c < -Math.PI && (c += TAU));
      const u = Math.floor(((c < 0 ? a + c : a) / TAU) * tn) - 1,
        l = Math.floor(((c < 0 ? a : a + c) / TAU) * tn) + 1;
      for (let d = u; d <= l; d++) n[((d % tn) + tn) % tn].push([s, i]);
    }
  return n;
}
function PM(e, [t, n], r) {
  const o = Math.cos(r),
    s = Math.sin(r);
  let i = Number.NaN;
  for (const [[a, c], [u, l]] of e[Math.floor((r / TAU) * tn) % tn]) {
    const d = u - a,
      f = l - c,
      h = o * f - s * d;
    if (Math.abs(h) < 1e-12) continue;
    const p = a - t,
      g = c - n,
      m = (p * f - g * d) / h,
      y = (p * s - g * o) / h;
    m >= 0 && y >= -rd && y <= 1 + rd && !(m <= i) && (i = m);
  }
  return i;
}
function AM(e) {
  const t = e.length,
    n = e.flatMap((r, o) => (Number.isNaN(r) ? [] : [o]));
  return n.length === 0
    ? e.map(() => 0)
    : e.map((r, o) => {
        if (!Number.isNaN(r)) return r;
        const s = n.find((c) => c > o) ?? n[0] + t,
          i = [...n].reverse().find((c) => c < o) ?? (n.at(-1) ?? 0) - t,
          a = (o - i) / (s - i);
        return e[(i + t) % t] * (1 - a) + e[s % t] * a;
      });
}
function gM(e, t, n) {
  const r = EM(e, t),
    o = AM(n.map((s) => PM(r, t, s)));
  return n.map((s, i) => [t[0] + Math.cos(s) * o[i], t[1] + Math.sin(s) * o[i]]);
}
function IM(e, t) {
  const n = e.length;
  if (n === 0) return 0;
  let r = e.findIndex((c) => c.angle >= t);
  r < 0 && (r = 0);
  const o = e[r],
    s = e[(r - 1 + n) % n],
    i = (o.angle - s.angle + TAU) % TAU;
  if (i === 0) return o.reach;
  const a = ((t - s.angle + TAU) % TAU) / i;
  return s.reach + (o.reach - s.reach) * a;
}
function kM(e, t, n) {
  const r = e
    .map(([o, s]) => ({ angle: us(t, o, s), reach: Math.hypot(o - t[0], s - t[1]) }))
    .sort((o, s) => o.angle - s.angle);
  return n.map((o) => {
    const s = IM(r, o);
    return [t[0] + Math.cos(o) * s, t[1] + Math.sin(o) * s];
  });
}
function Th(e) {
  const t = e.reduce((r, o) => r + o.weight, 0),
    [n] = e;
  return n == null || t === 0
    ? []
    : n.outline.map((r, o) => {
        let s = 0,
          i = 0;
        for (const { outline: a, weight: c } of e) ((s += a[o][0] * c), (i += a[o][1] * c));
        return [s / t, i / t];
      });
}
function SM(e, t, n) {
  return e.map(([r, o], s) => [r + (t[s][0] - r) * n, o + (t[s][1] - o) * n]);
}
function ME(e, t, n, r, G) {
  const o = n / G.x,
    s = e.core.ring.map(([i, a]) => [t[0] + (i - G.x) * o, t[1] + (a - G.x) * o]);
  return kM(s, t, r);
}
function TE(e, t, n, r, G) {
  const { core: o } = e,
    s = 1 - t,
    i = t > 0 ? (o.scale - s) / t : 0;
  return {
    translate: [o.dx * r, o.dy * r],
    rotation: o.rotation,
    scale: s + i * (G.$n / n) * t,
    opacity: o.opacity,
  };
}
const da = (e) => (e.length === 0 ? "" : `M${e.map(([t, n]) => `${od(t)} ${od(n)}`).join("L")}Z`);

// ============================================================
// Outline radius (radiusAtAngle) and point-in-outline test
// ============================================================
const outlineRadiusCache = new WeakMap();
function makeOutlineRadiusAt(outline) {
  let cached = outlineRadiusCache.get(outline);
  if (cached) return cached;
  const DIRS = 720,
    lutArr = new Array(DIRS);
  for (let i = 0; i < DIRS; i++) {
    const a = (i / DIRS) * TAU,
      dx = Math.cos(a),
      dy = Math.sin(a);
    let best = Infinity;
    for (let j = 0, k = outline.length - 1; j < outline.length; k = j++) {
      const [ax, ay] = outline[k],
        [bx, by] = outline[j],
        ex = bx - ax,
        ey = by - ay,
        den = ex * dy - ey * dx;
      if (Math.abs(den) < 1e-12) continue;
      const s = (ax * dy - ay * dx) / -den;
      if (s < -1e-9 || s > 1 + 1e-9) continue;
      const t = dx * (ax + s * ex) + dy * (ay + s * ey);
      if (t > 1e-9 && t < best) best = t;
    }
    lutArr[i] = Number.isFinite(best) ? best : 1;
  }
  cached = (angle) => {
    const wrap = ((angle % TAU) + TAU) % TAU,
      pos = (wrap / TAU) * DIRS,
      i0 = Math.floor(pos),
      i1 = (i0 + 1) % DIRS,
      f = pos - i0;
    return lutArr[i0] * (1 - f) + lutArr[i1] * f;
  };
  outlineRadiusCache.set(outline, cached);
  return cached;
}
function pointInOutline(x, y, outline) {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const xi = outline[i][0],
      yi = outline[i][1],
      xj = outline[j][0],
      yj = outline[j][1],
      intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
function fitEyes(rings, outline) {
  if (rings.length === 0) return rings;
  const all = rings.flat();
  let cx = 0,
    cy = 0;
  for (const [x, y] of all) {
    cx += x;
    cy += y;
  }
  cx /= all.length;
  cy /= all.length;
  const inside = (p) => pointInOutline(p[0], p[1], outline),
    test = (k) =>
      rings.every((ring) => ring.every((p) => inside([cx + (p[0] - cx) * k, cy + (p[1] - cy) * k])));
  if (test(1)) return rings;
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (test(mid)) lo = mid;
    else hi = mid;
  }
  const k = lo * 0.99;
  if (k <= 0.01) return [];
  return rings.map((ring) => ring.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]));
}
const FACE_Z = 0.3;
function faceEyeRings(e, quality, G) {
  if (e.eyes === null) return [];
  const m = ir(e.quat),
    normal = Et(m, [0, 0, 1]);
  if (normal[2] <= 0) return [];
  const rings = [];
  e.eyes.forEach((d, a) => {
    const anchorX = G.eyeBasis[a].M[0],
      l = Math.cos(d.tilt),
      d2 = Math.sin(d.tilt),
      [f, h] = d.off;
    for (const src of oT(d, Math.max(64, quality))) {
      rings.push(
        src.map(([u, v]) => {
          const w = v * d.lidY,
            S = f + l * u + d2 * w,
            b = h - d2 * u + l * w;
          return Et(m, [anchorX + S, b, FACE_Z]);
        }),
      );
    }
  });
  return rings;
}
// ============================================================
// Render model builder
// ============================================================
function bT(e, t, G, outline, seat = "sphere") {
  const n = (e.zoom * t) / 2,
    [r, o] = e.squash,
    s = [t / 2 + n * e.offset[0], t / 2 - n * (e.squashAnchor * (1 - o) + e.offset[1])],
    i = Math.abs(n),
    rollRad = (e.bodyRoll ?? 0) * DEG,
    cRoll = Math.cos(rollRad),
    sRoll = Math.sin(rollRad),
    eyeScale = outline ? 0.72 : 1,
    eyeShiftY = outline ? -0.14 : 0,
    dx = (-eyeShiftY * sRoll) * r,
    dy = (eyeShiftY * cRoll) * o,
    toBody = ([x, y]) => [
      s[0] + (x * cRoll - y * sRoll) * r * n,
      s[1] - (x * sRoll + y * cRoll) * o * n,
    ],
    a = ([c, u]) => [s[0] + (c * eyeScale + dx) * n, s[1] - (u * eyeScale + dy) * n];
  const eyes = outline
    ? seat === "front"
      ?
        fitEyes(
          faceEyeRings(e, 512, G).map((ring) => ring.map(([x, y]) => [x, y])),
          outline,
        ).map((ring) => ring.map((pt) => toBody(pt)))
      : fitEyes(
          Ch(e, 1, G, makeOutlineRadiusAt(outline)).map((ring) => xT(ring, kT)),
          outline,
        ).map((ring) => ring.map(toBody))
    : Ch(e, i, G).map((c) => xT(c, kT).map(a));
  return {
    center: s,
    radius: i,
    body: [outline ? outline.map(toBody) : yM(s, [Math.abs(r) * i, Math.abs(o) * i], yT)],
    eyes,
  };
}
function buildModel(e, t, n, G, gE, tE, warnBody, outline, seat = "sphere") {
  const r = t.inkPaint ?? Nr(t.ink),
    o = t.spotPaint ?? Nr(t.spot),
    s = !outline && e.morph == null && e.bodies.length === 1 && e.bodies[0].body === "sphere";
  if (s) {
    const i = wT(e, t, n, G);
    return {
      mode: "sphere",
      size: n,
      bodyD: i.body,
      eyesD: i.eyes,
      glow: i.glow,
      inkPaint: r,
      spotPaint: o,
      cutout: t.cutout,
    };
  }
  const i = e.bodies
    .map(({ body: c, weight: u }) => {
      !outline && c !== "sphere" && warnBody(c);
      return { shape: bT(e, n, G, outline, seat), weight: u };
    })
    .sort((c, u) => u.weight - c.weight);
  const a = i[0]?.shape.center ?? [n / 2, n / 2],
    u2 = i[0]?.shape.radius ?? 0,
    l = mM([kE, ...i.map(({ shape: c }) => pM(c.body, c.center))]),
    d = Th(i.map(({ shape: c, weight: u }) => ({ outline: gM(c.body, c.center, l), weight: u }))),
    f = e.morph == null ? null : yE(e.morph, n, G, gE, tE),
    h = (G.$n * n) / 2 / G.x;
  return {
    mode: "morph",
    size: n,
    center: a,
    bodyPts: f == null || f.core.round === 0 ? d : SM(d, ME(f, a, u2, l, G), f.core.round),
    eyesPts: i[0]?.shape.eyes ?? [],
    head: f == null || e.morph == null ? null : TE(f, e.morph.amount, e.zoom, h, G),
    parts: f?.parts ?? [],
    markScale: h,
    zoom: f?.zoom ?? 1,
    inkPaint: r,
    spotPaint: o,
    cutout: t.cutout,
  };
}

// ============================================================
// Procedural decoration shapes and design-canvas constants
// ============================================================
const GT = (e, t, x) => {
  const n = e / 2,
    r = x - t / 2 + n,
    o = x + t / 2 - n;
  return `M${x - n} ${r}A${n} ${n} 0 0 1 ${x + n} ${r}L${x + n} ${o}A${n} ${n} 0 0 1 ${x - n} ${o}Z`;
};
const WT = (e, t, n, x) => {
  const r = e / 2,
    o = t / 2,
    s = x - n / 2,
    i = x + n / 2;
  return `M${x - r} ${s + r}A${r} ${r} 0 0 1 ${x + r} ${s + r}L${x + o} ${i - o}A${o} ${o} 0 0 1 ${x - o} ${i - o}Z`;
};

// ============================================================
// makeConfig: recipes to engine config
// ============================================================
function makeConfig(R) {
  const C = R.constants,
    M = C.morph,
    bn = R.expressions,
    bb = new Set(R.blinkBlockingExpressions),
    wb = new Map(Object.entries(R.expressionAliases)),
    gb = new Set(R.expressionNames),
    Kf = R.eyes.baseEulerDeg,
    shapeNames = R.shapes.names,
    lx = new Map(Object.entries(R.shapes.aliases)),
    Rx = new Map(R.clips.map((e) => [e.name, e])),
    x = M.canvasCenter,
    $h = Array.from({ length: 96 }, (e, t) => {
      const n = (t / 96) * TAU;
      return [x + Math.cos(n) * x, x + Math.sin(n) * x];
    });
  return {
    expressions: bn,
    expressionNames: gb,
    expressionAliases: wb,
    blinkBlocking: bb,
    eyeBasis: R.eyes.basis,
    eyeMirror: R.eyes.mirror,
    baseEulerDeg: Kf,
    xr: R.eyes.defaultWidth,
    kb: R.eyes.pathSegments,
    yb: R.eyes.spineSamples,
    Eb: C.eyes.Eb,
    Pb: C.eyes.Pb,
    Ab: C.eyes.Ab,
    Ib: C.eyes.Ib,
    na: C.durations.blink,
    nb: C.durations.morph,
    ta: C.durations.lidMorph,
    rb: C.durations.blinkHold,
    ob: C.durations.blinkClose,
    si: C.durations.blinkOvershoot,
    nr: C.ease.nr,
    tbEase: C.ease.tb,
    dxEase: C.ease.dx,
    vxEase: C.ease.vx,
    $n: C.runtime.zoomDefault,
    Sx: C.runtime.lookDuration,
    Mx: C.runtime.maxAdvance,
    Tx: C.runtime.bodySpringFreq,
    Ex: C.runtime.bodyWeightEps,
    Px: C.runtime.morphHideEyes,
    Ax: C.runtime.gazeSnap,
    Yb: C.gaze.Yb,
    Zb: C.gaze.Zb,
    gazeShapeMul: C.gaze.Qb,
    stateMorphMap: M.stateMap,
    morphShotSet: new Set(["progress", "spawning"]),
    morphShotSeconds: { progress: 2.5, spawning: 2 }, // sx / ix
    trackAliases: new Map(Object.entries(R.aliases.tracks)),
    bodyAlias(e) {
      const t = lx.get(e) ?? e;
      return shapeNames.includes(t) ? t : "sphere";
    }, // hx
    restClip: {
      duration: C.runtime.restClipDuration,
      body: null,
      squashAnchor: 0,
      restTime: 0,
      inspect: {},
      position: [],
      rotation: [{ t: 0, v: Kf, ease: C.ease.nr }],
      squash: [],
      zoom: [],
      lids: [],
      expression: [],
    },
    clipByName(e) {
      // $x
      const t = Rx.get(e);
      if (t == null) throw new Error(`No motion recipe named ${e}`);
      return t;
    },
    Tb: (e) => !bb.has(e) && !bn[e].some(jt),
    Lr: (e) => bb.has(e), // Lr
    Mb: (e) => {
      const t = e.trim().toLowerCase(),
        n = wb.get(t) ?? t;
      return gb.has(n) ? n : "neutral";
    },
    states: R.states,
    x,
    IT: M.markOffset,
    _T: M.weightsFull,
    FT: M.liftPeriodMs,
    NT: M.liftAmp,
    $T: M.zoomFloor,
    OT: M.zoomFloorAmt,
    LT: M.liftBoost,
    RT: M.discR,
    yd: M.dotsGap,
    jT: M.progressShotMs,
    qT: M.gatherShotMs,
    BT: M.waveOffsets,
    Rh: M.sendPeriodMs,
    ga: M.receivePeriodMs,
    ds: M.pencilPeriodMs,
    Mr: M.pencilDrawFrac,
    Co: M.pencilTrailMs,
    zT: M.trailMinStep,
    DT: M.trailSampleMsPerFrame,
    gd: M.kindZoom,
    Si: M.baseRadius,
    UT: GT(30, 88, x),
    KT: WT(30, 17, 96, x),
    $h,
  };
}

// ============================================================
// DOM renderer: fixed skeleton with attribute-level updates
// ============================================================
const SVG_NS = "http://www.w3.org/2000/svg";
function createRenderer(doc, uid, S, G) {
  const cache = new WeakMap();
  const setA = (n, k, v) => {
    let m = cache.get(n);
    m === void 0 && cache.set(n, (m = {}));
    if (m[k] === v) return;
    m[k] = v;
    v == null ? n.removeAttribute(k) : n.setAttribute(k, v);
  };
  const mk = (tag, attrs = {}, parent) => {
    const n = doc.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return parent ? parent.appendChild(n) : n;
  };
  const svg = mk("svg", {
    id: uid,
    width: S,
    height: S,
    viewBox: `0 0 ${S} ${S}`,
    role: "img",
    "aria-hidden": "true",
    style: "display:block;overflow:visible",
  });
  const defs = mk("defs", {}, svg);
  const mask = mk(
    "mask",
    {
      id: `${uid}-holes`,
      maskUnits: "userSpaceOnUse",
      x: -S * 4,
      y: -S * 4,
      width: S * 9,
      height: S * 9,
    },
    defs,
  );
  mk("rect", { x: -S * 4, y: -S * 4, width: S * 9, height: S * 9, fill: "#fff" }, mask);
  const maskEyes = mk("path", { fill: "#000" }, mask);
  const clip = mk("clipPath", { id: `${uid}-body` }, defs);
  const clipBody = mk("path", {}, clip);
  let gBody = null,
    gBodyStops = null,
    gHalo = null,
    gHaloStops = null;
  const ensureBodyGrad = () => {
    if (gBody) return;
    gBody = mk(
      "radialGradient",
      { id: `${uid}-gbody`, gradientUnits: "userSpaceOnUse", cx: 0, cy: 0, r: 1, fx: 0, fy: 0 },
      defs,
    );
    gBodyStops = Array.from({ length: ld + 1 }, () => mk("stop", {}, gBody));
  };
  const ensureHaloGrad = () => {
    if (gHalo) return;
    gHalo = mk(
      "radialGradient",
      { id: `${uid}-ghalo`, gradientUnits: "userSpaceOnUse", cx: 0, cy: 0, r: 1, fx: 0, fy: 0 },
      defs,
    );
    gHaloStops = Array.from({ length: dd + 1 }, () => mk("stop", {}, gHalo));
  };
  const applyGrad = (grad, stops, spec) => {
    setA(grad, "gradientTransform", spec.transform);
    for (let i = 0; i < stops.length; i++) {
      const st = spec.stops[i];
      setA(stops[i], "offset", String(st.offset));
      setA(stops[i], "stop-color", st.color);
      setA(stops[i], "stop-opacity", String(st.opacity));
    }
  };
  const zoomG = mk("g", {}, svg);
  const partsG = mk("g", {}, zoomG);
  const headG = mk("g", {}, zoomG);
  const haloP = mk("path", { "fill-rule": "evenodd" }, headG);
  const bodyP = mk("path", { "fill-rule": "evenodd" }, headG);
  const eyesP = mk("path", {}, headG);
  const pool = new Map();
  const renderParts = (parts, inkPaint) => {
    const seen = new Set();
    for (const p of parts) {
      seen.add(p.key);
      let rec = pool.get(p.key);
      const tag = p.type === "disc" || p.type === "ring" ? "circle" : "path";
      if (rec === void 0 || rec.type !== p.type) {
        rec?.node.remove();
        rec = { type: p.type, node: mk(tag) };
        pool.set(p.key, rec);
      }
      const n = partsG.appendChild(rec.node);
      if (p.type === "disc") {
        setA(n, "cx", Se(p.cx));
        setA(n, "cy", Se(p.cy));
        setA(n, "r", Se(p.r));
        setA(n, "fill", inkPaint);
        setA(n, "stroke", null);
        setA(n, "stroke-width", null);
        setA(n, "stroke-dasharray", null);
        setA(n, "transform", null);
        setA(n, "d", null);
      } else if (p.type === "ring") {
        setA(n, "cx", Se(p.cx));
        setA(n, "cy", Se(p.cy));
        setA(n, "r", Se(p.r));
        setA(n, "fill", "none");
        setA(n, "stroke", inkPaint);
        setA(n, "stroke-width", Se(p.width));
        if (p.arc != null) {
          const C2 = 2 * Math.PI * p.r;
          setA(n, "stroke-dasharray", `${Se(C2 * p.arc.fraction)} ${Se(C2)}`);
          setA(n, "transform", `rotate(${Se(p.arc.startDeg)} ${Se(p.cx)} ${Se(p.cy)})`);
        } else (setA(n, "stroke-dasharray", null), setA(n, "transform", null));
        setA(n, "d", null);
      } else if (p.type === "shape") {
        setA(n, "d", p.d);
        setA(n, "transform", p.transform ?? null);
        setA(n, "fill", inkPaint);
        setA(n, "stroke", null);
        setA(n, "stroke-width", null);
        setA(n, "stroke-dasharray", null);
        setA(n, "cx", null);
        setA(n, "cy", null);
        setA(n, "r", null);
      } else {
        // stroke
        setA(n, "d", p.d);
        setA(n, "fill", "none");
        setA(n, "stroke", inkPaint);
        setA(n, "stroke-width", Se(p.width));
        setA(n, "stroke-linecap", "round");
        setA(n, "stroke-linejoin", "round");
        setA(n, "transform", null);
        setA(n, "stroke-dasharray", null);
        setA(n, "cx", null);
        setA(n, "cy", null);
        setA(n, "r", null);
      }
      setA(n, "opacity", p.opacity < 1 ? Se(p.opacity, 3) : null);
    }
    for (const [k, rec] of pool) seen.has(k) || (rec.node.remove(), pool.delete(k));
  };
  const render = (model) => {
    if (model.mode === "sphere") {
      renderParts(EMPTY_PARTS, model.inkPaint);
      setA(partsG, "transform", null);
      setA(headG, "transform", null);
      setA(headG, "opacity", null);
      setA(zoomG, "transform", null);
      const glow = model.glow;
      if (glow?.halo != null) {
        ensureHaloGrad();
        applyGrad(gHalo, gHaloStops, glow.halo.gradient);
        setA(haloP, "d", glow.halo.d);
        setA(haloP, "fill", `url(#${uid}-ghalo)`);
      } else (setA(haloP, "d", ""), setA(haloP, "fill", null));
      if (glow != null) {
        ensureBodyGrad();
        applyGrad(gBody, gBodyStops, glow.body);
        setA(bodyP, "fill", `url(#${uid}-gbody)`);
      } else setA(bodyP, "fill", model.inkPaint);
      setA(bodyP, "d", model.bodyD);
      setA(clipBody, "d", model.bodyD);
      setA(bodyP, "mask", null);
      setA(eyesP, "d", model.eyesD);
      setA(eyesP, "fill", model.eyesD === "" ? null : model.spotPaint);
      setA(eyesP, "clip-path", null);
      return;
    }
    setA(haloP, "d", "");
    setA(haloP, "fill", null);
    const bodyD = da(model.bodyPts),
      eyesD = model.eyesPts.map(da).join("");
    setA(bodyP, "d", bodyD);
    setA(bodyP, "fill", model.inkPaint);
    if (eyesD !== "" && model.cutout) {
      setA(maskEyes, "d", eyesD);
      setA(bodyP, "mask", `url(#${uid}-holes)`);
      setA(eyesP, "d", "");
      setA(eyesP, "fill", null);
      setA(eyesP, "clip-path", null);
    } else if (eyesD !== "") {
      setA(bodyP, "mask", null);
      setA(clipBody, "d", bodyD);
      setA(eyesP, "d", eyesD);
      setA(eyesP, "fill", model.spotPaint);
      setA(eyesP, "clip-path", `url(#${uid}-body)`);
    } else {
      setA(bodyP, "mask", null);
      setA(eyesP, "d", "");
      setA(eyesP, "fill", null);
      setA(eyesP, "clip-path", null);
    }
    const d = model.head;
    if (d == null) (setA(headG, "transform", null), setA(headG, "opacity", null));
    else {
      const [cx, cy] = model.center;
      setA(
        headG,
        "transform",
        `translate(${Se(cx + d.translate[0])} ${Se(cy + d.translate[1])}) rotate(${Se(d.rotation)}) scale(${Se(d.scale, 5)}) translate(${Se(-cx)} ${Se(-cy)})`,
      );
      setA(headG, "opacity", d.opacity < 1 ? Se(d.opacity, 3) : null);
    }
    if (model.parts.length === 0)
      (renderParts(EMPTY_PARTS, model.inkPaint), setA(partsG, "transform", null));
    else {
      setA(
        partsG,
        "transform",
        `translate(${Se(model.size / 2)} ${Se(model.size / 2)}) scale(${Se(model.markScale, 5)}) translate(${-G.x} ${-G.x})`,
      );
      renderParts(model.parts, model.inkPaint);
    }
    if (model.zoom === 1) setA(zoomG, "transform", null);
    else {
      const p = model.size / 2 + (G.IT - G.x) * model.markScale;
      setA(
        zoomG,
        "transform",
        `translate(${Se(p)} ${Se(p)}) scale(${Se(model.zoom, 5)}) translate(${Se(-p)} ${Se(-p)})`,
      );
    }
  };
  return { svg, render };
}
const EMPTY_PARTS = [];

export {
  makeConfig,
  createRuntime,
  createStateMachine,
  buildModel,
  makeMorphGenerators,
  makeTrail,
  createRenderer,
  lb,
  ir,
  Et,
  ST,
  xT,
  kT,
};
