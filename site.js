/* Optional preview clock: ?t=180 starts at 180s, ?speed=10 runs faster, ?speed=0 holds. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce.matches) return;

  var params = new URLSearchParams(location.search);

  function readParam(name, fallback, lo, hi) {
    if (!params.has(name)) return fallback;
    var v = Number(params.get(name));
    if (!Number.isFinite(v)) return fallback;
    return Math.min(hi, Math.max(lo, v));
  }

  var startAt = readParam("t", 0, 0, 900);
  var speed = readParam("speed", 1, 0, 40);

  var BPM = 72;
  var MUSIC = 188;
  var LATE = 272;
  var QUIET_AT = 40;

  var VERT = [
    "#version 300 es",
    "void main() {",
    "  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);",
    "  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);",
    "}"
  ].join("\n");

  var FRAG = [
    "#version 300 es",
    "precision highp float;",
    "uniform vec2 uRes;",
    "uniform float uTime;",
    "uniform float uPulse;",
    "uniform float uPhase;",
    "uniform float uSheen;",
    "uniform float uPlasma;",
    "uniform float uStars;",
    "uniform float uNight;",
    "uniform float uMarch;",
    "uniform float uCenter;",
    "uniform float uQuality;",
    "out vec4 fragColor;",
    "const vec3 PAPER = vec3(0.952941, 0.937255, 0.901961);",
    "const vec3 NIGHT = vec3(0.031373, 0.066667, 0.054902);",
    "const vec3 PINE = vec3(0.129412, 0.360784, 0.290196);",
    "const vec3 GOLD = vec3(0.768627, 0.635294, 0.396078);",
    "float hash(vec2 p) {",
    "  vec3 p3 = fract(vec3(p.xyx) * 0.1031);",
    "  p3 += dot(p3, p3.yzx + 33.33);",
    "  return fract((p3.x + p3.y) * p3.z);",
    "}",
    "vec2 rot(vec2 p, float a) {",
    "  float c = cos(a), s = sin(a);",
    "  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);",
    "}",
    "float sdTorus(vec3 p, vec2 t) {",
    "  vec2 q = vec2(length(p.xz) - t.x, p.y);",
    "  return length(q) - t.y;",
    "}",
    "vec2 scene(vec3 p) {",
    "  float dF = p.y + 1.55;",
    "  vec3 q = p;",
    "  q.y += 0.42;",
    "  q.y -= sin(uTime * 0.22) * 0.05;",
    "  q.xz = rot(q.xz, uTime * 0.11);",
    "  float dS = length(q) - 0.52;",
    "  float d1 = sdTorus(q, vec2(0.82, 0.046));",
    "  vec3 b = q;",
    "  b.yz = rot(b.yz, 1.02);",
    "  b.xz = rot(b.xz, uTime * 0.17);",
    "  float d2 = sdTorus(b, vec2(1.12, 0.034));",
    "  vec3 c = q;",
    "  c.xy = rot(c.xy, 0.72 + uTime * 0.13);",
    "  float d3 = sdTorus(c, vec2(1.42, 0.026));",
    "  float dR = min(d1, min(d2, d3));",
    "  float d = dS;",
    "  float m = 1.0;",
    "  if (dR < d) { d = dR; m = 2.0; }",
    "  if (dF < d) { d = dF; m = 3.0; }",
    "  return vec2(d, m);",
    "}",
    "vec3 normalAt(vec3 p) {",
    "  vec2 e = vec2(0.0016, 0.0);",
    "  return normalize(vec3(",
    "    scene(p + e.xyy).x - scene(p - e.xyy).x,",
    "    scene(p + e.yxy).x - scene(p - e.yxy).x,",
    "    scene(p + e.yyx).x - scene(p - e.yyx).x",
    "  ));",
    "}",
    "float softShadow(vec3 ro, vec3 rd) {",
    "  float t = 0.03;",
    "  float res = 1.0;",
    "  for (int i = 0; i < 18; i++) {",
    "    float h = scene(ro + rd * t).x;",
    "    if (h < 0.002) return 0.28;",
    "    res = min(res, 10.0 * h / t);",
    "    t += clamp(h, 0.02, 0.35);",
    "    if (t > 5.5) break;",
    "  }",
    "  return clamp(res, 0.28, 1.0);",
    "}",
    "vec3 skyOf(vec2 uv) {",
    "  vec2 p = uv * 2.0 - 1.0;",
    "  p.x *= uRes.x / max(uRes.y, 1.0);",
    "  float a = sin(p.x * 0.55 + p.y * 0.2 - uTime * 0.05);",
    "  float b = sin(p.x * 0.28 - p.y * 0.16 + uTime * 0.031 + 1.7);",
    "  vec3 col = PAPER;",
    "  col = mix(col, vec3(0.99, 0.925, 0.84), clamp(a, 0.0, 1.0) * uSheen * 0.72);",
    "  col = mix(col, vec3(0.90, 0.93, 0.925), clamp(b, 0.0, 1.0) * uSheen * 0.34);",
    "  return col;",
    "}",
    "vec3 aurora(vec2 uv) {",
    "  vec2 q = uv * 2.0 - 1.0;",
    "  q.x *= uRes.x / max(uRes.y, 1.0);",
    "  float t = uTime * 0.045;",
    "  float w = sin(q.x * 1.5 + t) + sin(q.y * 1.25 - t * 0.8);",
    "  q += 0.28 * vec2(sin(q.y * 1.6 + t * 0.7), cos(q.x * 1.35 - t));",
    "  w += sin(q.x * 2.1 + q.y * 1.15 + t * 0.65);",
    "  w += sin(length(q) * 1.8 - t * 0.9);",
    "  float f = 0.5 + 0.5 * sin(w);",
    "  return mix(vec3(0.07, 0.22, 0.18), GOLD, f);",
    "}",
    "float starLayer(vec2 uv, float scale) {",
    "  vec2 g = uv * scale;",
    "  vec2 id = floor(g);",
    "  vec2 f = fract(g) - 0.5;",
    "  float n = hash(id);",
    "  float n2 = hash(id + 19.19);",
    "  float d = length(f - (vec2(n, n2) - 0.5) * 0.62);",
    "  float tw = 0.55 + 0.45 * sin(uTime * (0.7 + n * 2.2) + n2 * 40.0);",
    "  float core = 1.0 - smoothstep(0.0, 0.055, d);",
    "  float glow = exp(-d * d * 90.0) * 0.28;",
    "  return (core + glow) * tw * smoothstep(0.8, 0.9, n);",
    "}",
    "vec3 stars(vec2 uv) {",
    "  vec3 c = vec3(0.0);",
    "  c += starLayer(uv + vec2(uTime * 0.0035, uTime * 0.0012), 26.0) * vec3(1.0, 0.96, 0.88);",
    "  c += starLayer(uv + vec2(-uTime * 0.0024, uTime * 0.0018), 15.0) * vec3(0.82, 0.9, 0.84) * 0.85;",
    "  c += starLayer(uv + vec2(uTime * 0.0011, -uTime * 0.0022), 8.0) * vec3(1.0, 0.93, 0.78) * 1.25;",
    "  return c;",
    "}",
    "vec3 shade(vec3 pos, vec3 rd, float mat, vec3 N, float sh) {",
    "  vec3 L = normalize(vec3(0.48, 0.84, 0.28));",
    "  vec3 V = -rd;",
    "  float ndl = clamp(dot(N, L), 0.0, 1.0);",
    "  float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.3);",
    "  float spec = pow(clamp(dot(N, normalize(L + V)), 0.0, 1.0), 48.0);",
    "  vec3 col;",
    "  float fill = clamp(dot(N, normalize(vec3(-0.35, -0.15, 0.45))), 0.0, 1.0);",
    "  if (mat < 1.5) {",
    "    col = vec3(0.04, 0.12, 0.09) + PINE * ndl * sh * 1.25;",
    "    col += vec3(0.12, 0.22, 0.18) * fill;",
    "    col += GOLD * rim * 1.2;",
    "    col += vec3(1.0, 0.96, 0.86) * spec * sh * 0.65;",
    "    col += GOLD * (0.16 + 0.32 * uPulse);",
    "  } else if (mat < 2.5) {",
    "    col = GOLD * (0.26 + rim * 0.7 + ndl * sh * 0.36);",
    "    col += vec3(0.12, 0.18, 0.14) * fill;",
    "    col += vec3(1.0, 0.97, 0.9) * spec * sh * 0.5;",
    "  } else {",
    "    float rad = length(pos.xz);",
    "    float engraved = 0.5 + 0.5 * sin(rad * 8.5);",
    "    float ripple = exp(-18.0 * abs(rad - uPhase * 3.1));",
    "    float ripple2 = exp(-18.0 * abs(rad - fract(uPhase + 0.5) * 3.1));",
    "    col = vec3(0.045, 0.075, 0.06);",
    "    col += vec3(0.07, 0.11, 0.085) * engraved * (1.0 - smoothstep(0.2, 4.2, rad));",
    "    col += GOLD * (ripple + ripple2 * 0.5) * 0.32;",
    "    col *= 0.72 + 0.28 * ndl * sh;",
    "  }",
    "  return col;",
    "}",
    "vec3 traceReflect(vec3 ro, vec3 rd) {",
    "  float t = 0.02;",
    "  for (int i = 0; i < 22; i++) {",
    "    vec3 pos = ro + rd * t;",
    "    float h = scene(pos).x;",
    "    if (h < 0.004) {",
    "      return mix(PINE, GOLD, 0.55 + 0.35 * uPulse);",
    "    }",
    "    t += max(h, 0.02);",
    "    if (t > 6.0) break;",
    "  }",
    "  return NIGHT + GOLD * 0.08;",
    "}",
    "vec3 march(vec2 uv, vec3 field) {",
    "  vec2 p = uv * 2.0 - 1.0;",
    "  p.x *= uRes.x / max(uRes.y, 1.0);",
    "  float ang = uTime * 0.085;",
    "  vec3 ro = vec3(0.0, 0.35, 3.25 - 0.35 * uMarch);",
    "  ro.xz = rot(ro.xz, ang);",
    "  vec3 ta = vec3(0.0, -0.72, 0.0);",
    "  vec3 ww = normalize(ta - ro);",
    "  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));",
    "  vec3 vv = cross(uu, ww);",
    "  vec3 rd = normalize(ww * 1.2 + uu * p.x + vv * p.y);",
    "  float t = 0.0;",
    "  float glow = 0.0;",
    "  float mat = 0.0;",
    "  vec3 pos = ro;",
    "  bool hit = false;",
    "  float budget = uQuality > 0.5 ? 52.0 : 30.0;",
    "  for (int i = 0; i < 52; i++) {",
    "    if (float(i) >= budget) break;",
    "    pos = ro + rd * t;",
    "    vec2 sd = scene(pos);",
    "    glow += exp(-sd.x * 5.2) * 0.022;",
    "    if (sd.x < 0.0025) { hit = true; mat = sd.y; break; }",
    "    t += max(sd.x * 0.86, 0.004);",
    "    if (t > 11.0) break;",
    "  }",
    "  vec3 col = field;",
    "  if (hit) {",
    "    vec3 N = normalAt(pos);",
    "    float sh = 1.0;",
    "    if (uQuality > 0.5) sh = softShadow(pos + N * 0.02, normalize(vec3(0.48, 0.84, 0.28)));",
    "    col = shade(pos, rd, mat, N, sh);",
    "    if (uQuality > 0.5 && mat > 2.5 && N.y > 0.35) {",
    "      vec3 rr = reflect(rd, N);",
    "      if (rr.y > 0.04) {",
    "        vec3 rc = traceReflect(pos + N * 0.04, rr);",
    "        float fres = 0.12 + 0.4 * pow(1.0 - clamp(dot(N, -rd), 0.0, 1.0), 2.0);",
    "        col = mix(col, rc, fres);",
    "      }",
    "    }",
    "    float fog = 1.0 - exp(-t * 0.035);",
    "    col = mix(col, field, fog * 0.4);",
    "  }",
    "  col += (GOLD * 0.85 + vec3(0.08, 0.14, 0.1)) * glow * (0.7 + 0.45 * uPulse);",
    "  return col;",
    "}",
    "void main() {",
    "  vec2 uv = gl_FragCoord.xy / uRes;",
    "  vec3 base = skyOf(uv);",
    "  vec3 fx = base;",
    "  fx = mix(fx, NIGHT, uNight * 0.94);",
    "  if (uPlasma > 0.001) fx = mix(fx, aurora(uv), uPlasma * mix(0.2, 0.5, uNight));",
    "  if (uStars > 0.001) fx += stars(uv) * uStars * (0.25 + 0.75 * uNight);",
    "  fx += vec3(0.025, 0.04, 0.032) * (1.0 - smoothstep(0.05, 0.62, uv.y)) * uNight;",
    "  if (uMarch > 0.001) fx = mix(fx, march(uv, fx), uMarch);",
    "  float vig = 1.0 - smoothstep(0.28, 1.2, length((uv - vec2(0.5, 0.46)) * vec2(uRes.x / max(uRes.y, 1.0), 1.0)));",
    "  fx *= mix(1.0, 0.8 + 0.2 * vig, uNight);",
    "  float grain = hash(gl_FragCoord.xy + floor(uTime * 4.0));",
    "  fx += (grain - 0.5) * 0.012 * uNight;",
    "  float shield = smoothstep(0.22, 0.74, uv.y);",
    "  shield *= 1.0 - smoothstep(0.12, 0.48, abs(uv.x - 0.5));",
    "  float mask = mix(1.0 - shield, 1.0, uCenter);",
    "  vec3 col = mix(base, fx, mask);",
    "  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;",
    "  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);",
    "}"
  ].join("\n");

  var canvas = document.createElement("canvas");
  canvas.className = "fx-canvas";
  canvas.setAttribute("aria-hidden", "true");
  var gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
    failIfMajorPerformanceCaveat: false
  });
  if (!gl) return;

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(log || "shader");
    }
    return sh;
  }

  var program;
  try {
    var vs = compile(gl.VERTEX_SHADER, VERT);
    var fs = compile(gl.FRAGMENT_SHADER, FRAG);
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "link");
    }
  } catch (err) {
    return;
  }

  gl.useProgram(program);
  var U = {};
  ["uRes", "uTime", "uPulse", "uPhase", "uSheen", "uPlasma", "uStars", "uNight", "uMarch", "uCenter", "uQuality"].forEach(function (name) {
    U[name] = gl.getUniformLocation(program, name);
  });

  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var quality = coarse ? 0 : 1;

  var ui = document.createElement("div");
  ui.className = "fx-ui";
  var quietBtn = document.createElement("button");
  quietBtn.type = "button";
  quietBtn.className = "fx-quiet";
  quietBtn.setAttribute("data-quiet", "");
  quietBtn.hidden = true;
  quietBtn.setAttribute("aria-label", "Stop animation");
  quietBtn.textContent = "Quiet";
  var soundBtn = document.createElement("button");
  soundBtn.type = "button";
  soundBtn.className = "fx-sound";
  soundBtn.setAttribute("data-sound", "");
  soundBtn.hidden = true;
  soundBtn.setAttribute("aria-label", "Play sound");
  soundBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M3.8 9.2h3.2L11.2 5.4v13.2L7 14.8H3.8z"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M15.2 9.1a3.6 3.6 0 0 1 0 5.8M17.4 7a6.2 6.2 0 0 1 0 10"/></svg>';
  ui.appendChild(quietBtn);
  ui.appendChild(soundBtn);

  var LINE = "mck.legal    \u00b7    a slow build    \u00b7    daniel mcknight    \u00b7    florida impairment guide    \u00b7    lintel    \u00b7    ";
  var scrollRoot = document.createElement("div");
  scrollRoot.className = "fx-scroll";
  scrollRoot.setAttribute("aria-hidden", "true");
  var track = document.createElement("div");
  track.className = "fx-scroll-track";
  var scrollText = LINE + LINE;
  for (var i = 0; i < scrollText.length; i++) {
    var glyph = document.createElement("span");
    var ch = scrollText.charAt(i);
    glyph.textContent = ch === " " ? "\u00a0" : ch;
    track.appendChild(glyph);
  }
  scrollRoot.appendChild(track);

  var waveEls = Array.prototype.slice.call(document.querySelectorAll(".mark, h1, .lede, #resources-heading, .things li"));

  document.body.appendChild(canvas);
  document.body.appendChild(scrollRoot);
  document.body.appendChild(ui);
  document.body.classList.add("fx-on");

  var loopWidth = track.scrollWidth / 2 || 1;
  var letters = Array.prototype.slice.call(track.children);

  var origin = performance.now();
  var frozenMs = 0;
  var hiddenAt = 0;
  var raf = 0;
  var stopped = false;
  var activated = false;
  var musicOn = false;
  var audioCtx = null;
  var schedTimer = 0;
  var nextNote = 0;
  var stepIndex = 0;
  var stepDur = 0;
  var lastDraw = 0;

  function seconds() {
    var now = hiddenAt || performance.now();
    return startAt + ((now - origin - frozenMs) / 1000) * speed;
  }

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function smooth(t, a, b) {
    var x = clamp01((t - a) / (b - a));
    return x * x * (3 - 2 * x);
  }

  function beatPhase(t) {
    var x = (t * BPM / 60) % 1;
    return x < 0 ? x + 1 : x;
  }

  function look(t) {
    return {
      canvas: smooth(t, 10, 36),
      sheen: smooth(t, 14, 52),
      plasma: smooth(t, 48, 108),
      night: smooth(t, 90, 236),
      stars: smooth(t, 104, 176),
      march: smooth(t, 136, 228),
      center: smooth(t, 228, 274),
      wave: smooth(t, 186, 255),
      scroll: smooth(t, 232, 268)
    };
  }

  function resize() {
    var maxEdge = coarse ? 560 : 840;
    var dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1 : 1.25);
    var w = Math.max(2, window.innerWidth * dpr);
    var h = Math.max(2, window.innerHeight * dpr);
    var edge = Math.max(w, h);
    if (edge > maxEdge) {
      var s = maxEdge / edge;
      w *= s;
      h *= s;
    }
    w = Math.max(2, Math.round(w));
    h = Math.max(2, Math.round(h));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function applyReadout(t, L, phase, pulse) {
    var scrimIn = smooth(t, 78, 136);
    var scrimOut = t < LATE ? 1 : 1 - smooth(t, LATE, LATE + 6);
    document.body.style.setProperty("--scrim", (scrimIn * scrimOut).toFixed(3));
    document.body.classList.toggle("fx-late", t >= LATE);
    document.body.classList.toggle("fx-bar", L.scroll > 0.04);

    var amp = L.wave * 8 + smooth(t, 250, 310) * 7;
    for (var n = 0; n < waveEls.length; n++) {
      if (amp < 0.35) {
        waveEls[n].style.transform = "";
      } else {
        var y = Math.sin(t * 0.42 + n * 0.62) * amp + Math.sin(phase * Math.PI * 2 + n * 0.8) * amp * 0.22;
        waveEls[n].style.transform = "translate3d(0," + y.toFixed(2) + "px,0)";
      }
    }

    scrollRoot.style.opacity = L.scroll.toFixed(3);
    if (L.scroll > 0.01) {
      var shift = (t * 38) % loopWidth;
      track.style.transform = "translate3d(" + (-shift).toFixed(2) + "px,0,0)";
      var sAmp = 6 + 9 * L.scroll;
      for (var g = 0; g < letters.length; g++) {
        var sy = Math.sin(g * 0.38 + t * 1.15) * sAmp;
        letters[g].style.transform = "translate3d(0," + sy.toFixed(2) + "px,0)";
      }
    }

    if (t >= QUIET_AT) quietBtn.hidden = false;
    soundBtn.style.setProperty("--pulse", pulse.toFixed(3));
    if (t >= MUSIC && !musicOn) soundBtn.hidden = false;
    if (musicOn) soundBtn.hidden = true;
    if (t >= MUSIC && activated && !musicOn) maybeStart();
  }

  function present(t) {
    var phase = beatPhase(t);
    var pulse = Math.exp(-phase * 6.5);
    var L = look(t);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uPulse, pulse * L.march);
    gl.uniform1f(U.uPhase, phase);
    gl.uniform1f(U.uSheen, L.sheen);
    gl.uniform1f(U.uPlasma, L.plasma);
    gl.uniform1f(U.uStars, L.stars);
    gl.uniform1f(U.uNight, L.night);
    gl.uniform1f(U.uMarch, L.march);
    gl.uniform1f(U.uCenter, L.center);
    gl.uniform1f(U.uQuality, quality);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.style.opacity = L.canvas.toFixed(3);
    applyReadout(t, L, phase, pulse);
  }

  function teardown() {
    if (stopped) return;
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    if (schedTimer) clearTimeout(schedTimer);
    reduce.removeEventListener("change", onReduce);
    document.removeEventListener("visibilitychange", onVis);
    document.removeEventListener("pointerdown", onPointer, true);
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pagehide", onHide);
    window.removeEventListener("pageshow", onShow);
    if (audioCtx) {
      audioCtx.onstatechange = null;
      audioCtx.close();
      audioCtx = null;
    }
    document.body.classList.remove("fx-on", "fx-late", "fx-bar");
    document.body.style.removeProperty("--scrim");
    for (var n = 0; n < waveEls.length; n++) waveEls[n].style.transform = "";
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    if (scrollRoot.parentNode) scrollRoot.parentNode.removeChild(scrollRoot);
    if (ui.parentNode) ui.parentNode.removeChild(ui);
  }

  function onReduce() {
    if (reduce.matches) teardown();
  }

  function pauseClock() {
    if (stopped || hiddenAt) return;
    hiddenAt = performance.now();
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (schedTimer) {
      clearTimeout(schedTimer);
      schedTimer = 0;
    }
    if (audioCtx && audioCtx.state === "running") audioCtx.suspend();
  }

  function resumeClock() {
    if (stopped || !hiddenAt) return;
    frozenMs += performance.now() - hiddenAt;
    hiddenAt = 0;
    if (musicOn && audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    if (musicOn) scheduler();
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function onVis() {
    if (document.hidden) pauseClock();
    else resumeClock();
  }

  function onHide() { pauseClock(); }
  function onShow() { if (!document.hidden) resumeClock(); }

  function showSpeaker() {
    if (!stopped && !musicOn && seconds() >= MUSIC) soundBtn.hidden = false;
  }

  function hideSpeaker() {
    soundBtn.hidden = true;
  }

  function maybeStart() {
    if (stopped || musicOn || seconds() < MUSIC) return;
    if (audioCtx && audioCtx.state === "running") beginMusic();
    else showSpeaker();
  }

  function unlock() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) {
      try { audioCtx = new AC(); }
      catch (err) { return; }
    }
    var pending = audioCtx.state === "suspended" ? audioCtx.resume() : Promise.resolve();
    Promise.resolve(pending).then(function () {
      if (!stopped) maybeStart();
    }).catch(function () {
      showSpeaker();
    });
  }

  function tone(ctx, dest, time, freq, dur, gain, type, slide) {
    var osc = ctx.createOscillator();
    var amp = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, time);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slide), time + dur);
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(amp);
    amp.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  function beginMusic() {
    if (musicOn || !audioCtx || audioCtx.state !== "running") return;
    musicOn = true;
    hideSpeaker();
    var ctx = audioCtx;
    var rate = speed > 0 ? speed : 1;
    stepDur = (60 / BPM) / 2 / rate;
    var pre = ctx.createGain();
    var dry = ctx.createGain();
    dry.gain.value = 0.72;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 20;
    comp.ratio.value = 3;
    comp.attack.value = 0.008;
    comp.release.value = 0.28;
    var wet = ctx.createGain();
    wet.gain.value = 0.22;
    pre.connect(dry);
    dry.connect(comp);
    comp.connect(ctx.destination);

    var combTimes = [0.0297, 0.0371, 0.0419, 0.0533];
    for (var c = 0; c < combTimes.length; c++) {
      var delay = ctx.createDelay(0.2);
      delay.delayTime.value = combTimes[c];
      var fb = ctx.createGain();
      fb.gain.value = 0.42;
      var damp = ctx.createBiquadFilter();
      damp.type = "lowpass";
      damp.frequency.value = 2400;
      pre.connect(delay);
      delay.connect(damp);
      damp.connect(fb);
      fb.connect(delay);
      damp.connect(wet);
    }
    wet.connect(comp);

    var bed = ctx.createBiquadFilter();
    bed.type = "lowpass";
    bed.Q.value = 0.55;
    bed.frequency.setValueAtTime(260, ctx.currentTime);
    bed.frequency.linearRampToValueAtTime(1500, ctx.currentTime + stepDur * 280);
    bed.connect(pre);
    var lfo = ctx.createOscillator();
    var lfoGain = ctx.createGain();
    lfo.frequency.value = 0.045 * rate;
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain);
    lfoGain.connect(bed.frequency);
    lfo.start();

    function drone(freq, level, detune) {
      var a = ctx.createOscillator();
      var b = ctx.createOscillator();
      var g = ctx.createGain();
      a.type = "sine";
      b.type = "sine";
      a.frequency.value = freq;
      b.frequency.value = freq;
      b.detune.value = detune;
      g.gain.value = level;
      a.connect(g);
      b.connect(g);
      g.connect(bed);
      a.start();
      b.start();
    }
    drone(73.42, 0.1, 7);
    drone(110, 0.045, -5);

    var echo = ctx.createDelay(1.5);
    echo.delayTime.value = Math.min(1.4, stepDur * 3);
    var echoFb = ctx.createGain();
    echoFb.gain.value = 0.28;
    var echoDamp = ctx.createBiquadFilter();
    echoDamp.type = "lowpass";
    echoDamp.frequency.value = 1800;
    var echoSend = ctx.createGain();
    echoSend.gain.value = 0.85;
    echoSend.connect(echo);
    echo.connect(echoDamp);
    echoDamp.connect(echoFb);
    echoFb.connect(echo);
    echoDamp.connect(pre);

    var beatsNow = seconds() * BPM / 60;
    var frac = beatsNow - Math.floor(beatsNow);
    var wait = speed > 0 && frac >= 0.035 ? ((1 - frac) * 60 / BPM) / speed : 0;
    var start = ctx.currentTime + wait;
    pre.gain.setValueAtTime(0.0001, start);
    pre.gain.exponentialRampToValueAtTime(0.4, start + 0.045);
    pre.gain.linearRampToValueAtTime(1, start + Math.max(0.2, (60 / BPM) * 4 / rate));

    var chords = [
      [146.83, 174.61, 220, 261.63],
      [174.61, 220, 261.63, 349.23],
      [130.81, 164.81, 196, 261.63],
      [146.83, 174.61, 220, 293.66]
    ];
    var arps = [
      [293.66, 349.23, 440, 523.25, 440, 349.23, 329.63, 261.63],
      [349.23, 440, 523.25, 698.46, 523.25, 440, 392, 261.63],
      [261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 246.94],
      [293.66, 349.23, 440, 587.33, 440, 349.23, 329.63, 293.66]
    ];

    var noiseLen = Math.floor(ctx.sampleRate * 0.4);
    var noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    var noiseData = noiseBuf.getChannelData(0);
    for (var i = 0; i < noiseLen; i++) noiseData[i] = Math.random() * 2 - 1;

    function schedule(time, step) {
      if (time < ctx.currentTime) time = ctx.currentTime + 0.005;
      var chord = Math.floor(step / 32) % 4;
      if (step % 32 === 0) {
        var freqs = chords[chord];
        var dur = stepDur * 38;
        for (var k = 0; k < freqs.length; k++) {
          var osc = ctx.createOscillator();
          var amp = ctx.createGain();
          var filt = ctx.createBiquadFilter();
          osc.type = "triangle";
          osc.frequency.value = freqs[k];
          filt.type = "lowpass";
          filt.frequency.setValueAtTime(900, time);
          filt.frequency.linearRampToValueAtTime(420, time + dur);
          amp.gain.setValueAtTime(0.0001, time);
          amp.gain.exponentialRampToValueAtTime(0.04, time + stepDur * 6);
          amp.gain.exponentialRampToValueAtTime(0.0001, time + dur);
          osc.connect(filt);
          filt.connect(amp);
          amp.connect(bed);
          osc.start(time);
          osc.stop(time + dur + 0.05);
        }
      }
      if (step % 2 === 0) {
        var accent = step % 8 === 0 ? 0.42 : 0.22;
        tone(ctx, pre, time, 128, 0.22, accent, "sine", 46);
      }
      if (step >= 16) {
        var note = arps[chord][step % 8];
        var oscA = ctx.createOscillator();
        var ampA = ctx.createGain();
        var filtA = ctx.createBiquadFilter();
        oscA.type = "triangle";
        oscA.frequency.value = note;
        filtA.type = "lowpass";
        filtA.frequency.setValueAtTime(2200, time);
        filtA.frequency.exponentialRampToValueAtTime(380, time + 0.28);
        ampA.gain.setValueAtTime(0.0001, time);
        ampA.gain.exponentialRampToValueAtTime(0.07, time + 0.015);
        ampA.gain.exponentialRampToValueAtTime(0.0001, time + 0.42);
        oscA.connect(filtA);
        filtA.connect(ampA);
        ampA.connect(pre);
        ampA.connect(echoSend);
        oscA.start(time);
        oscA.stop(time + 0.46);
      }
      if (step >= 48 && step % 2 === 1) {
        var src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        var hat = ctx.createBiquadFilter();
        hat.type = "highpass";
        hat.frequency.value = 6000;
        var hatAmp = ctx.createGain();
        hatAmp.gain.setValueAtTime(0.045, time);
        hatAmp.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
        src.connect(hat);
        hat.connect(hatAmp);
        hatAmp.connect(pre);
        src.start(time);
        src.stop(time + 0.06);
      }
    }

    scheduler = function () {
      if (stopped || !musicOn || !audioCtx) return;
      var now = audioCtx.currentTime;
      if (nextNote < now - 0.02) {
        var skip = Math.ceil((now + 0.01 - nextNote) / stepDur);
        nextNote += skip * stepDur;
        stepIndex += skip;
      }
      var horizon = now + 0.24;
      var guard = 0;
      while (nextNote < horizon && guard < 48) {
        schedule(nextNote, stepIndex);
        nextNote += stepDur;
        stepIndex += 1;
        guard += 1;
      }
      schedTimer = window.setTimeout(scheduler, 70);
    };

    nextNote = start;
    stepIndex = 0;
    scheduler();

    audioCtx.onstatechange = function () {
      if (stopped || hiddenAt || !musicOn) return;
      if (audioCtx && audioCtx.state === "suspended") showSpeaker();
      if (audioCtx && audioCtx.state === "running") hideSpeaker();
    };
  }

  var scheduler = function () {};

  function onPointer(e) {
    if (stopped) return;
    if (e.target && e.target.closest && e.target.closest("[data-quiet]")) return;
    activated = true;
    unlock();
  }

  function onKey(e) {
    if (stopped) return;
    if (e.key === "Escape") {
      if (seconds() >= QUIET_AT || musicOn) {
        e.preventDefault();
        teardown();
      }
      return;
    }
    if (e.repeat) return;
    if (e.target && e.target.closest && e.target.closest("[data-quiet], [data-sound]")) return;
    activated = true;
    unlock();
  }

  function onResize() {
    if (stopped) return;
    resize();
    present(seconds());
  }

  quietBtn.addEventListener("click", function () { teardown(); });
  soundBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    activated = true;
    if (musicOn && audioCtx && audioCtx.state !== "running") {
      audioCtx.resume().then(hideSpeaker).catch(showSpeaker);
      return;
    }
    unlock();
  });

  reduce.addEventListener("change", onReduce);
  document.addEventListener("visibilitychange", onVis);
  document.addEventListener("pointerdown", onPointer, true);
  document.addEventListener("keydown", onKey);
  window.addEventListener("resize", onResize);
  window.addEventListener("pagehide", onHide);
  window.addEventListener("pageshow", onShow);

  function frame(now) {
    if (stopped || hiddenAt) return;
    raf = requestAnimationFrame(frame);
    var cap = coarse ? 34 : 15;
    if (now - lastDraw < cap) return;
    lastDraw = now;
    present(seconds());
  }

  canvas.addEventListener("webglcontextlost", function () { teardown(); });

  resize();
  present(seconds());
  if (document.hidden) pauseClock();
  else if (speed > 0) raf = requestAnimationFrame(frame);
})();
