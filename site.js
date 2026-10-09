/* Preview clock: ?t= seconds, ?speed= rate, ?speed=0 holds.
   Film acts (seconds): 320 grain, 346.7 struggle, 386.7 escalation, 413.3 flood, 440 resolve, 480 hold. */
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
  var MUSIC = 252;
  var QUIET_AT = 50;
  var BAR = 10 / 3;
  var ACT1 = 320;
  var ACT2 = 320 + 8 * BAR;
  var ACT3 = 320 + 20 * BAR;
  var ACT4 = 320 + 28 * BAR;
  var ACT5 = 320 + 36 * BAR;
  var HOLD = 320 + 48 * BAR;

  function film(t) {
    var o = { act: 0, grains: 0, side: 0, shed: 0, cap: 900, jitter: 0.08, damp: 1.7, stiff: 6.2 };
    if (t < ACT1) return o;
    if (t < ACT2) {
      o.act = 1;
      o.side = 1;
      o.cap = 4;
      o.damp = 2.6;
      o.stiff = 4;
      return o;
    }
    if (t < ACT3) {
      o.act = 2;
      o.grains = 6;
      o.side = (Math.floor((t - ACT2) / (4 * BAR)) % 2 === 0) ? 1 : -1;
      o.shed = 0.006;
      o.cap = 170;
      o.jitter = 0.08;
      return o;
    }
    if (t < ACT4) {
      o.act = 3;
      o.grains = 14;
      o.side = (Math.floor((t - ACT3) / (2 * BAR)) % 2 === 0) ? -1 : 1;
      o.shed = 0.012;
      o.cap = 220;
      o.jitter = 0.22;
      o.stiff = 7.2;
      return o;
    }
    if (t < ACT5) {
      o.act = 4;
      o.grains = 26;
      o.side = (Math.floor((t - ACT4) / (2 * BAR)) % 2 === 0) ? 1 : -1;
      o.shed = 0.02;
      o.cap = 240;
      o.jitter = 0.72;
      o.stiff = 8;
      return o;
    }
    var u = t >= HOLD ? 1 : (t - ACT5) / (HOLD - ACT5);
    o.act = 5;
    o.grains = (1 - u) * (1 - u) * 3;
    o.side = 0;
    o.shed = 0.005 + 0.012 * u;
    o.cap = 120;
    o.jitter = 0.36;
    o.damp = 2.4 + 2.8 * u;
    o.stiff = 3.4;
    return o;
  }

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
    "uniform float uSheen;",
    "uniform float uPlasma;",
    "uniform float uStars;",
    "uniform float uNight;",
    "uniform float uCenter;",
    "uniform float uSwell;",
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
    "vec3 skyOf(vec2 uv) {",
    "  vec2 p = uv * 2.0 - 1.0;",
    "  p.x *= uRes.x / max(uRes.y, 1.0);",
    "  float a = sin(p.x * 0.55 + p.y * 0.2 - uTime * 0.05);",
    "  float b = sin(p.x * 0.28 - p.y * 0.16 + uTime * 0.031 + 1.7);",
    "  vec3 col = PAPER;",
    "  col = mix(col, vec3(0.984, 0.945, 0.90), clamp(a, 0.0, 1.0) * uSheen * 0.42);",
    "  col = mix(col, vec3(0.945, 0.948, 0.94), clamp(b, 0.0, 1.0) * uSheen * 0.16);",
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
    "  float tw = 0.86 + 0.14 * sin(uTime * (0.32 + n * 0.6) + n2 * 20.0);",
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
    "void main() {",
    "  vec2 uv = gl_FragCoord.xy / uRes;",
    "  vec3 base = skyOf(uv);",
    "  vec3 fx = base;",
    "  fx = mix(fx, NIGHT, uNight * 0.94);",
    "  if (uPlasma > 0.001) {",
    "    vec3 aur = aurora(uv);",
    "    fx = mix(fx, mix(PAPER, aur, 0.22), uPlasma * (1.0 - uNight) * 0.28);",
    "    fx = mix(fx, aur, uPlasma * uNight * 0.4);",
    "  }",
    "  if (uStars > 0.001) fx += stars(uv) * uStars * uNight;",
    "  fx *= 1.0 + 0.03 * uSwell * uNight;",
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
    depth: true,
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
  ["uRes", "uTime", "uSheen", "uPlasma", "uStars", "uNight", "uCenter", "uSwell"].forEach(function (name) {
    U[name] = gl.getUniformLocation(program, name);
  });

  var coarse = window.matchMedia("(pointer: coarse)").matches;

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
  var shell = document.querySelector(".shell");

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
  var controlsUntil = 0;
  var promptSound = false;

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

  function createScales() {
    var LIB = [
      "const float ARM = 0.76;",
      "const float HANG = 0.50;",
      "const float PR = 0.30;",
      "vec3 rotY(vec3 p, float a) {",
      "  float c = cos(a), s = sin(a);",
      "  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);",
      "}",
      "vec3 rotZ(vec3 p, float a) {",
      "  float c = cos(a), s = sin(a);",
      "  return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z);",
      "}",
      "vec3 panPos(float side, float ang) {",
      "  float c = cos(ang), s = sin(ang);",
      "  return vec3(side * ARM * c, -side * ARM * s - HANG, 0.0);",
      "}",
      "float bowl(vec2 d) {",
      "  float r = clamp(length(d) / PR, 0.0, 1.0);",
      "  return mix(-0.062, -0.012, r * r);",
      "}"
    ].join("\n");

    function link(vsSrc, fsSrc) {
      var vs, fs, p;
      try {
        vs = compile(gl.VERTEX_SHADER, vsSrc);
        fs = compile(gl.FRAGMENT_SHADER, fsSrc);
      } catch (err) {
        return null;
      }
      p = gl.createProgram();
      gl.attachShader(p, vs);
      gl.attachShader(p, fs);
      gl.bindAttribLocation(p, 0, "aPos");
      gl.bindAttribLocation(p, 1, "aNrm");
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
      return p;
    }

    function Mesh() { this.p = []; }
    Mesh.prototype.tri = function (a, b, c, n) {
      this.p.push(
        a[0], a[1], a[2], n[0], n[1], n[2],
        b[0], b[1], b[2], n[0], n[1], n[2],
        c[0], c[1], c[2], n[0], n[1], n[2]
      );
    };
    Mesh.prototype.box = function (cx, cy, cz, hx, hy, hz) {
      var faces = [
        [0, 1, 0, hx, 0, 0, 0, 0, hz, 0, hy, 0],
        [0, -1, 0, hx, 0, 0, 0, 0, hz, 0, -hy, 0],
        [1, 0, 0, 0, hy, 0, 0, 0, hz, hx, 0, 0],
        [-1, 0, 0, 0, hy, 0, 0, 0, hz, -hx, 0, 0],
        [0, 0, 1, hx, 0, 0, 0, hy, 0, 0, 0, hz],
        [0, 0, -1, hx, 0, 0, 0, hy, 0, 0, 0, -hz]
      ];
      for (var i = 0; i < faces.length; i++) {
        var f = faces[i];
        var n = [f[0], f[1], f[2]];
        var u = [f[3], f[4], f[5]];
        var v = [f[6], f[7], f[8]];
        var o = [cx + f[9], cy + f[10], cz + f[11]];
        var p00 = [o[0] - u[0] - v[0], o[1] - u[1] - v[1], o[2] - u[2] - v[2]];
        var p10 = [o[0] + u[0] - v[0], o[1] + u[1] - v[1], o[2] + u[2] - v[2]];
        var p11 = [o[0] + u[0] + v[0], o[1] + u[1] + v[1], o[2] + u[2] + v[2]];
        var p01 = [o[0] - u[0] + v[0], o[1] - u[1] + v[1], o[2] - u[2] + v[2]];
        this.tri(p00, p10, p11, n);
        this.tri(p00, p11, p01, n);
      }
    };
    Mesh.prototype.disk = function (y, r, segs, ny) {
      for (var i = 0; i < segs; i++) {
        var a0 = (i / segs) * Math.PI * 2;
        var a1 = ((i + 1) / segs) * Math.PI * 2;
        var p0 = [Math.cos(a0) * r, y, Math.sin(a0) * r];
        var p1 = [Math.cos(a1) * r, y, Math.sin(a1) * r];
        if (ny > 0) this.tri([0, y, 0], p0, p1, [0, 1, 0]);
        else this.tri([0, y, 0], p1, p0, [0, -1, 0]);
      }
    };
    Mesh.prototype.rim = function (y0, y1, r, segs) {
      for (var i = 0; i < segs; i++) {
        var a0 = (i / segs) * Math.PI * 2;
        var a1 = ((i + 1) / segs) * Math.PI * 2;
        var c0 = Math.cos(a0), s0 = Math.sin(a0);
        var c1 = Math.cos(a1), s1 = Math.sin(a1);
        var n = [(c0 + c1) * 0.5, 0, (s0 + s1) * 0.5];
        var b0 = [c0 * r, y0, s0 * r];
        var b1 = [c1 * r, y0, s1 * r];
        var t0 = [c0 * r, y1, s0 * r];
        var t1 = [c1 * r, y1, s1 * r];
        this.tri(b0, b1, t1, n);
        this.tri(b0, t1, t0, n);
      }
    };

    function upload(mesh) {
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.p), gl.STATIC_DRAW);
      return { buf: buf, n: mesh.p.length / 6 };
    }

    var segs = coarse ? 16 : 24;
    var pillar = new Mesh();
    pillar.box(0, -1.04, 0, 0.30, 0.055, 0.22);
    pillar.box(0, -0.54, 0, 0.062, 0.46, 0.062);
    pillar.box(0, -0.015, 0, 0.1, 0.045, 0.08);
    var beam = new Mesh();
    beam.box(0, 0, 0, 0.78, 0.026, 0.03);
    beam.box(-0.76, 0, 0, 0.022, 0.034, 0.034);
    beam.box(0.76, 0, 0, 0.022, 0.034, 0.034);
    var pan = new Mesh();
    pan.disk(-0.062, 0.30, segs, 1);
    pan.disk(-0.062, 0.30, segs, -1);
    pan.rim(-0.062, 0.018, 0.30, segs);
    pan.box(0, 0.25, 0.055, 0.011, 0.25, 0.011);
    pan.box(0, 0.25, -0.055, 0.011, 0.25, 0.011);
    var geo = {
      pillar: upload(pillar),
      beam: upload(beam),
      pan: upload(pan)
    };

    var meshProg = link(
      [
        "#version 300 es",
        "layout(location=0) in vec3 aPos;",
        "layout(location=1) in vec3 aNrm;",
        "uniform mat4 uVP;",
        "uniform sampler2D uAng;",
        "uniform float uYaw;",
        "uniform float uPart;",
        LIB,
        "out vec3 vN;",
        "void main() {",
        "  float ang = texelFetch(uAng, ivec2(0, 0), 0).x;",
        "  vec3 p = aPos;",
        "  vec3 n = aNrm;",
        "  if (uPart > 0.5 && uPart < 1.5) {",
        "    p = rotZ(p, -ang);",
        "    n = rotZ(n, -ang);",
        "  } else if (uPart > 1.5) {",
        "    float side = uPart > 2.5 ? 1.0 : -1.0;",
        "    p += panPos(side, ang);",
        "  }",
        "  p = rotY(p, uYaw);",
        "  n = rotY(n, uYaw);",
        "  vN = n;",
        "  gl_Position = uVP * vec4(p, 1.0);",
        "}"
      ].join("\n"),
      [
        "#version 300 es",
        "precision mediump float;",
        "in vec3 vN;",
        "uniform vec3 uColor;",
        "uniform float uAlpha;",
        "out vec4 fragColor;",
        "void main() {",
        "  vec3 N = normalize(vN);",
        "  if (!gl_FrontFacing) N = -N;",
        "  vec3 L = normalize(vec3(0.28, 0.88, 0.38));",
        "  float ndl = clamp(dot(N, L), 0.0, 1.0);",
        "  float rim = pow(1.0 - clamp(dot(N, vec3(0.0, 0.12, 0.99)), 0.0, 1.0), 2.0);",
        "  vec3 col = uColor * (0.4 + 0.78 * ndl) + vec3(1.0, 0.9, 0.7) * rim * 0.3;",
        "  fragColor = vec4(col, uAlpha);",
        "}"
      ].join("\n")
    );
    if (!meshProg) return null;

    var meshU = {};
    ["uVP", "uAng", "uYaw", "uPart", "uColor", "uAlpha"].forEach(function (name) {
      meshU[name] = gl.getUniformLocation(meshProg, name);
    });

    function dummyAng() {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      return t;
    }

    var sand = null;
    gl.getExtension("EXT_color_buffer_float");
    gl.getExtension("EXT_color_buffer_half_float");

    function makeTex(w, h, internal, type) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, type, null);
      return t;
    }

    function complete(tex, texB) {
      var f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      if (texB) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, texB, 0);
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      }
      var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (!ok) gl.deleteFramebuffer(f);
      return ok ? f : null;
    }

    var formats = [
      [gl.RGBA16F, gl.HALF_FLOAT],
      [gl.RGBA32F, gl.FLOAT]
    ];
    var fmt = null;
    for (var fi = 0; fi < formats.length; fi++) {
      var trial = makeTex(2, 2, formats[fi][0], formats[fi][1]);
      var trialF = complete(trial, null);
      gl.deleteTexture(trial);
      if (trialF) {
        gl.deleteFramebuffer(trialF);
        fmt = formats[fi];
        break;
      }
    }

    var PW = coarse ? 96 : 128;
    var PH = coarse ? 36 : 48;
    if (fmt) {
      var posTex = [makeTex(PW, PH, fmt[0], fmt[1]), makeTex(PW, PH, fmt[0], fmt[1])];
      var velTex = [makeTex(PW, PH, fmt[0], fmt[1]), makeTex(PW, PH, fmt[0], fmt[1])];
      var angTex = [makeTex(1, 1, fmt[0], fmt[1]), makeTex(1, 1, fmt[0], fmt[1])];
      var rowTex = makeTex(PH, 1, fmt[0], fmt[1]);
      var simFbo = [complete(posTex[0], velTex[0]), complete(posTex[1], velTex[1])];
      var angFbo = [complete(angTex[0], null), complete(angTex[1], null)];
      var rowFbo = complete(rowTex, null);
      var simProg = link(
        VERT,
        [
          "#version 300 es",
          "precision highp float;",
          "uniform sampler2D uPos;",
          "uniform sampler2D uVel;",
          "uniform sampler2D uAng;",
          "uniform float uDt;",
          "uniform float uTime;",
          "uniform float uSpawn;",
          "uniform float uSide;",
          "uniform float uJitter;",
          "uniform float uShed;",
          "uniform float uAct;",
          "uniform float uCap;",
          LIB,
          "layout(location=0) out vec4 oPos;",
          "layout(location=1) out vec4 oVel;",
          "float hash(vec2 p) {",
          "  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));",
          "  q += dot(q, q.yzx + 33.33);",
          "  return fract((q.x + q.y) * q.z);",
          "}",
          "float mound(float mass, vec2 d) {",
          "  float H = min(0.26, mass * 0.00055);",
          "  float r = clamp(length(d) / PR, 0.0, 1.0);",
          "  return H * (1.0 - r * r);",
          "}",
          "void main() {",
          "  ivec2 id = ivec2(gl_FragCoord.xy);",
          "  vec4 pos = texelFetch(uPos, id, 0);",
          "  vec4 vel = texelFetch(uVel, id, 0);",
          "  vec4 stt = texelFetch(uAng, ivec2(0, 0), 0);",
          "  float ang = stt.x;",
          "  float massL = stt.z;",
          "  float massR = stt.w;",
          "  float dt = clamp(uDt, 0.001, 0.033);",
          "  if (pos.w < 0.5) {",
          "    if (uAct > 0.5 && uAct < 1.5) {",
          "      if (id.x == 0 && id.y == 0) {",
          "        oPos = vec4(0.74, 1.05, 0.10, 1.0);",
          "        oVel = vec4(0.0, -0.02, 0.0, 0.0);",
          "      } else {",
          "        oPos = vec4(0.0, -4.0, 0.0, 0.0);",
          "        oVel = vec4(0.0);",
          "      }",
          "      return;",
          "    }",
          "    float n = hash(vec2(id) + vec2(uTime * 17.3, floor(uTime * 60.0)));",
          "    if (uSpawn > 0.0 && n < uSpawn) {",
          "      float stream = abs(uSide) < 0.5 ? (hash(vec2(id) + 19.2) - 0.5) * 1.55 : uSide * 0.74;",
          "      float jx = (hash(vec2(id) + 2.3) - 0.5) * uJitter;",
          "      float jz = (hash(vec2(id) + 5.1) - 0.5) * uJitter * 0.65;",
          "      oPos = vec4(stream + jx, 0.95, 0.10 + jz, 1.0);",
          "      oVel = vec4((hash(vec2(id) + 8.0) - 0.5) * 0.12, -0.04, (hash(vec2(id) + 9.0) - 0.5) * 0.08, 0.0);",
          "    } else {",
          "      oPos = vec4(0.0, -4.0, 0.0, 0.0);",
          "      oVel = vec4(0.0);",
          "    }",
          "    return;",
          "  }",
          "  if (pos.w < 1.5) {",
          "    vel.y -= 3.5 * dt;",
          "    vel.xyz *= exp(-0.22 * dt);",
          "    pos.xyz += vel.xyz * dt;",
          "    vel.w += dt;",
          "    float pr = length(pos.xz);",
          "    if (pr < 0.07 && pos.y < 0.04 && pos.y > -1.06) {",
          "      vec2 nrm = pos.xz / max(pr, 0.0001);",
          "      pos.xz = nrm * 0.078;",
          "      vel.xz = nrm * 0.3;",
          "    }",
          "    vec3 q = rotZ(pos.xyz, ang);",
          "    if (abs(q.x) < ARM + 0.02 && abs(q.y) < 0.04 && abs(q.z) < 0.042) {",
          "      q.y = q.y >= 0.0 ? 0.042 : -0.042;",
          "      pos.xyz = rotZ(q, -ang);",
          "      vel.y = abs(vel.y) * 0.12;",
          "    }",
          "    for (int s = 0; s < 2; s++) {",
          "      float side = s == 0 ? -1.0 : 1.0;",
          "      float mass = side < 0.0 ? massL : massR;",
          "      vec3 c = panPos(side, ang);",
          "      vec2 d = pos.xz - c.xz;",
          "      float r = length(d);",
          "      if (r > PR || pos.y > c.y + 0.12 || pos.y < c.y - 0.34) continue;",
          "      float top = bowl(d) + mound(mass, d);",
          "      if (pos.y <= c.y + top + 0.016 && vel.y <= 0.25) {",
          "        bool spill = mass > uCap || r > PR * 0.9;",
          "        if (spill) {",
          "          vec2 o = d / max(r, 0.0001);",
          "          pos.xz += o * 0.035;",
          "          vel.xz += o * 0.9;",
          "          vel.y = 0.08;",
          "        } else {",
          "          float jx = (hash(vec2(id) + 3.7) - 0.5) * 0.02;",
          "          float jz = (hash(vec2(id) + 6.2) - 0.5) * 0.02;",
          "          oPos = vec4(d.x + jx, mound(mass, d) + 0.008, d.y + jz, side < 0.0 ? 2.0 : 3.0);",
          "          oVel = vec4(0.0);",
          "          return;",
          "        }",
          "      }",
          "    }",
          "    if (pos.y < -1.4 || vel.w > 9.0) {",
          "      oPos = vec4(0.0, -4.0, 0.0, 0.0);",
          "      oVel = vec4(0.0);",
          "      return;",
          "    }",
          "    oPos = vec4(pos.xyz, 1.0);",
          "    oVel = vel;",
          "    return;",
          "  }",
          "  float side2 = pos.w > 2.5 ? 1.0 : -1.0;",
          "  float mass2 = side2 > 0.0 ? massR : massL;",
          "  float r2 = length(pos.xz);",
          "  float surface = mound(mass2, pos.xz);",
          "  float h = hash(vec2(id) + vec2(floor(uTime * 47.0), uTime * 13.1));",
          "  float rim = smoothstep(PR * 0.22, PR * 0.9, r2);",
          "  bool leave = r2 > PR * 0.93 || pos.y > surface + 0.05;",
          "  bool favored = uSide * side2 > 0.2;",
          "  if (!favored && abs(uSide) > 0.5 && h < uShed * (0.25 + rim)) leave = true;",
          "  if (mass2 > uCap && r2 > PR * 0.48 && h < 0.012 + 0.02 * rim) leave = true;",
          "  if (uAct > 4.5) {",
          "    float heavy = massR > massL + 1.5 ? 1.0 : (massL > massR + 1.5 ? -1.0 : 0.0);",
          "    if (heavy * side2 > 0.5 && h < uShed * (0.3 + rim)) leave = true;",
          "  }",
          "  if (leave) {",
          "    vec3 c2 = panPos(side2, ang);",
          "    vec2 o2 = pos.xz / max(r2, 0.0001);",
          "    vec3 world = vec3(c2.x + pos.x, c2.y + bowl(pos.xz) + pos.y, c2.z + pos.z);",
          "    oPos = vec4(world + vec3(o2.x, 0.04, o2.y) * 0.05, 1.0);",
          "    oVel = vec4(o2.x * 0.9, 0.14, o2.y * 0.9, 0.0);",
          "    return;",
          "  }",
          "  oPos = pos;",
          "  oVel = vec4(0.0);",
          "}"
        ].join("\n")
      );
      var rowProg = link(
        VERT,
        [
          "#version 300 es",
          "precision highp float;",
          "uniform sampler2D uPos;",
          "uniform float uW;",
          "out vec4 fragColor;",
          "void main() {",
          "  int row = int(gl_FragCoord.x);",
          "  int w = int(uW);",
          "  float L = 0.0;",
          "  float R = 0.0;",
          "  for (int x = 0; x < 128; x++) {",
          "    if (x >= w) break;",
          "    float s = texelFetch(uPos, ivec2(x, row), 0).w;",
          "    if (s > 2.5) R += 1.0;",
          "    else if (s > 1.5) L += 1.0;",
          "  }",
          "  fragColor = vec4(L, R, 0.0, 0.0);",
          "}"
        ].join("\n")
      );
      var angProg = link(
        VERT,
        [
          "#version 300 es",
          "precision highp float;",
          "uniform sampler2D uRow;",
          "uniform sampler2D uAng;",
          "uniform float uDt;",
          "uniform float uRows;",
          "uniform float uDamp;",
          "uniform float uStiff;",
          "out vec4 fragColor;",
          "void main() {",
          "  int rows = int(uRows);",
          "  float L = 0.0;",
          "  float R = 0.0;",
          "  for (int y = 0; y < 64; y++) {",
          "    if (y >= rows) break;",
          "    vec2 c = texelFetch(uRow, ivec2(y, 0), 0).rg;",
          "    L += c.x;",
          "    R += c.y;",
          "  }",
          "  vec4 prev = texelFetch(uAng, ivec2(0, 0), 0);",
          "  float target = clamp((R - L) * 0.0024, -0.48, 0.48);",
          "  float omega = prev.y + ((target - prev.x) * uStiff - prev.y * uDamp) * uDt;",
          "  float ang = clamp(prev.x + omega * uDt, -0.52, 0.52);",
          "  fragColor = vec4(ang, omega, L, R);",
          "}"
        ].join("\n")
      );
      var ptProg = link(
        [
          "#version 300 es",
          "precision highp float;",
          "uniform sampler2D uPos;",
          "uniform sampler2D uAng;",
          "uniform mat4 uVP;",
          "uniform float uYaw;",
          "uniform vec2 uRes;",
          "uniform vec2 uGrid;",
          "uniform float uScale;",
          LIB,
          "out vec3 vCol;",
          "void main() {",
          "  int w = int(uGrid.x);",
          "  ivec2 id = ivec2(gl_VertexID % w, gl_VertexID / w);",
          "  vec4 p = texelFetch(uPos, id, 0);",
          "  if (p.w < 0.5) {",
          "    gl_Position = vec4(3.0, 3.0, 3.0, 1.0);",
          "    gl_PointSize = 1.0;",
          "    vCol = vec3(0.0);",
          "    return;",
          "  }",
          "  float ang = texelFetch(uAng, ivec2(0, 0), 0).x;",
          "  vec3 world;",
          "  if (p.w < 1.5) world = p.xyz;",
          "  else {",
          "    float side = p.w > 2.5 ? 1.0 : -1.0;",
          "    vec3 c = panPos(side, ang);",
          "    world = vec3(c.x + p.x, c.y + bowl(p.xz) + p.y, c.z + p.z);",
          "  }",
          "  world = rotY(world, uYaw);",
          "  vec4 clip = uVP * vec4(world, 1.0);",
          "  gl_Position = clip;",
          "  gl_PointSize = clamp(uRes.y * 0.034 * uScale / max(clip.w, 0.15), 2.0, 28.0);",
          "  float g = fract(float(id.x * 13 + id.y * 7) * 0.173);",
          "  vCol = mix(vec3(0.74, 0.58, 0.34), vec3(0.98, 0.88, 0.62), g);",
          "}"
        ].join("\n"),
        [
          "#version 300 es",
          "precision mediump float;",
          "in vec3 vCol;",
          "uniform float uAlpha;",
          "out vec4 fragColor;",
          "void main() {",
          "  vec2 q = gl_PointCoord * 2.0 - 1.0;",
          "  float d = dot(q, q);",
          "  if (d > 1.0) discard;",
          "  float a = smoothstep(1.0, 0.25, d) * uAlpha;",
          "  fragColor = vec4(vCol, a);",
          "}"
        ].join("\n")
      );
      if (simProg && rowProg && angProg && ptProg && simFbo[0] && simFbo[1] && angFbo[0] && angFbo[1] && rowFbo) {
        var simU = {};
        ["uPos", "uVel", "uAng", "uDt", "uTime", "uSpawn", "uSide", "uJitter", "uShed", "uAct", "uCap"].forEach(function (name) {
          simU[name] = gl.getUniformLocation(simProg, name);
        });
        var rowU = {
          uPos: gl.getUniformLocation(rowProg, "uPos"),
          uW: gl.getUniformLocation(rowProg, "uW")
        };
        var angU = {
          uRow: gl.getUniformLocation(angProg, "uRow"),
          uAng: gl.getUniformLocation(angProg, "uAng"),
          uDt: gl.getUniformLocation(angProg, "uDt"),
          uRows: gl.getUniformLocation(angProg, "uRows"),
          uDamp: gl.getUniformLocation(angProg, "uDamp"),
          uStiff: gl.getUniformLocation(angProg, "uStiff")
        };
        var ptU = {};
        ["uPos", "uAng", "uVP", "uYaw", "uRes", "uGrid", "uScale", "uAlpha"].forEach(function (name) {
          ptU[name] = gl.getUniformLocation(ptProg, name);
        });
        gl.useProgram(simProg);
        gl.uniform1i(simU.uPos, 0);
        gl.uniform1i(simU.uVel, 1);
        gl.uniform1i(simU.uAng, 3);
        gl.useProgram(rowProg);
        gl.uniform1i(rowU.uPos, 0);
        gl.uniform1f(rowU.uW, PW);
        gl.useProgram(angProg);
        gl.uniform1i(angU.uRow, 2);
        gl.uniform1i(angU.uAng, 3);
        gl.uniform1f(angU.uRows, PH);
        gl.useProgram(ptProg);
        gl.uniform1i(ptU.uPos, 0);
        gl.uniform1i(ptU.uAng, 3);
        gl.uniform2f(ptU.uGrid, PW, PH);
        function clearF(fbo, w, h, r, g, b, a) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
          gl.viewport(0, 0, w, h);
          gl.disable(gl.BLEND);
          gl.disable(gl.SCISSOR_TEST);
          gl.colorMask(true, true, true, true);
          gl.clearColor(r, g, b, a);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
        clearF(simFbo[0], PW, PH, 0, -4, 0, 0);
        clearF(simFbo[1], PW, PH, 0, -4, 0, 0);
        clearF(angFbo[0], 1, 1, 0, 0, 0, 0);
        clearF(angFbo[1], 1, 1, 0, 0, 0, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        sand = {
          cur: 0,
          aCur: 0,
          step: function (dt, spawn, time, F) {
            var state = F || film(time);
            var next = 1 - sand.cur;
            var aNext = 1 - sand.aCur;
            gl.disable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);
            gl.depthMask(false);
            gl.colorMask(true, true, true, true);
            gl.useProgram(simProg);
            gl.bindFramebuffer(gl.FRAMEBUFFER, simFbo[next]);
            gl.viewport(0, 0, PW, PH);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, posTex[sand.cur]);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, velTex[sand.cur]);
            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_2D, angTex[sand.aCur]);
            gl.uniform1f(simU.uDt, dt);
            gl.uniform1f(simU.uTime, time);
            gl.uniform1f(simU.uSpawn, spawn);
            gl.uniform1f(simU.uSide, state.side);
            gl.uniform1f(simU.uJitter, state.jitter);
            gl.uniform1f(simU.uShed, state.shed);
            gl.uniform1f(simU.uAct, state.act);
            gl.uniform1f(simU.uCap, state.cap);
            gl.disableVertexAttribArray(0);
            gl.disableVertexAttribArray(1);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            sand.cur = next;
            gl.useProgram(rowProg);
            gl.bindFramebuffer(gl.FRAMEBUFFER, rowFbo);
            gl.viewport(0, 0, PH, 1);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, posTex[sand.cur]);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            gl.useProgram(angProg);
            gl.bindFramebuffer(gl.FRAMEBUFFER, angFbo[aNext]);
            gl.viewport(0, 0, 1, 1);
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, rowTex);
            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_2D, angTex[sand.aCur]);
            gl.uniform1f(angU.uDt, dt);
            gl.uniform1f(angU.uDamp, state.damp);
            gl.uniform1f(angU.uStiff, state.stiff);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            sand.aCur = aNext;
          }
        };
        sand.pos = function () { return posTex[sand.cur]; };
        sand.ang = function () { return angTex[sand.aCur]; };
        sand.ptProg = ptProg;
        sand.ptU = ptU;
      }
    }

    var angFallback = sand ? null : dummyAng();
    var bronze = [0.72, 0.54, 0.3];
    var panColor = [0.8, 0.62, 0.36];

    function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    function cross3(a, b) {
      return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    }
    function norm3(a) {
      var l = Math.hypot(a[0], a[1], a[2]) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    }
    function lookAt(eye, target, up) {
      var z = norm3(sub3(eye, target));
      var x = norm3(cross3(up, z));
      var y = cross3(z, x);
      return new Float32Array([
        x[0], y[0], z[0], 0,
        x[1], y[1], z[1], 0,
        x[2], y[2], z[2], 0,
        -dot3(x, eye), -dot3(y, eye), -dot3(z, eye), 1
      ]);
    }
    function persp(fovy, aspect, near, far) {
      var f = 1 / Math.tan(fovy / 2);
      var nf = 1 / (near - far);
      var o = new Float32Array(16);
      o[0] = f / aspect;
      o[5] = f;
      o[10] = (far + near) * nf;
      o[11] = -1;
      o[14] = 2 * far * near * nf;
      return o;
    }
    function mul4(a, b) {
      var o = new Float32Array(16);
      for (var c = 0; c < 4; c++) {
        for (var r = 0; r < 4; r++) {
          o[c * 4 + r] =
            a[r] * b[c * 4] +
            a[4 + r] * b[c * 4 + 1] +
            a[8 + r] * b[c * 4 + 2] +
            a[12 + r] * b[c * 4 + 3];
        }
      }
      return o;
    }
    function camera(aspect) {
      var tall = aspect < 0.92;
      var fovy = (tall ? 42 : 34) * Math.PI / 180;
      var dist = tall ? 4.15 : 4.05;
      var eye = [0.2, tall ? 0.2 : 0.28, dist];
      var target = [0, -0.02, 0];
      return mul4(persp(fovy, Math.max(0.2, aspect), 0.06, 40), lookAt(eye, target, [0, 1, 0]));
    }

    function mix3(a, b, u) {
      return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
    }
    function ease01(u) {
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      return u * u * (3 - 2 * u);
    }
    function vpOf(eye, target, fovyDeg, aspect, t) {
      var phone = aspect < 0.92;
      var e0 = eye[0];
      var e1 = eye[1];
      var e2 = eye[2];
      var t0 = target[0];
      var t1 = target[1];
      var t2 = target[2];
      if (phone) {
        e0 = t0 + (e0 - t0) * 1.2;
        e1 = t1 + (e1 - t1) * 1.2;
        e2 = t2 + (e2 - t2) * 1.2;
        fovyDeg += 6;
      }
      e0 += Math.sin(t * 0.17) * 0.06;
      e1 += Math.sin(t * 0.11 + 1.3) * 0.035;
      e2 += Math.cos(t * 0.13) * 0.045;
      return mul4(
        persp(fovyDeg * Math.PI / 180, Math.max(0.2, aspect), 0.05, 40),
        lookAt([e0, e1, e2], [t0, t1, t2], [0, 1, 0])
      );
    }
    function blendShots(t, t0, period, shots, aspect) {
      var elapsed = t - t0;
      var n = Math.floor(elapsed / period);
      var f = elapsed - n * period;
      var len = shots.length;
      var next = shots[((n % len) + len) % len];
      var eye = next.eye;
      var at = next.at;
      var fov = next.fov;
      if (n > 0) {
        var prev = shots[(((n - 1) % len) + len) % len];
        var u = f < 0.45 ? ease01(f / 0.45) : 1;
        eye = mix3(prev.eye, next.eye, u);
        at = mix3(prev.at, next.at, u);
        fov = prev.fov + (next.fov - prev.fov) * u;
      }
      var k = 1 - 0.045 * Math.min(1, f / period);
      eye = mix3(at, eye, k);
      return vpOf(eye, at, fov, aspect, t);
    }
    var SHOT_STRUGGLE = [
      { eye: [1.55, 0.42, 2.55], at: [0, -0.12, 0], fov: 32 },
      { eye: [0.08, -0.48, 2.65], at: [0, 0.04, 0], fov: 34 },
      { eye: [-1.6, 0.32, 2.35], at: [0, -0.08, 0], fov: 32 },
      { eye: [0.62, -0.22, 1.95], at: [0, 0.02, 0], fov: 30 }
    ];
    var SHOT_RISE = [
      { eye: [1.35, -0.15, 3.25], at: [0, -0.02, 0], fov: 40 },
      { eye: [-0.35, -0.62, 3.55], at: [0, 0.08, 0], fov: 44 },
      { eye: [1.9, 0.18, 2.45], at: [0.05, -0.08, 0], fov: 36 },
      { eye: [0.15, 0.72, 3.7], at: [0, -0.16, 0], fov: 38 }
    ];
    var SHOT_FLOOD = [
      { eye: [0.25, -0.95, 4.15], at: [0, 0.12, 0], fov: 42 },
      { eye: [0.85, 0.12, 1.75], at: [0, 0.04, 0], fov: 30 },
      { eye: [-2.15, 0.28, 2.05], at: [0, -0.04, 0], fov: 36 },
      { eye: [0.15, 2.55, 1.45], at: [0, -0.18, 0], fov: 40 }
    ];
    function filmCam(t, aspect) {
      if (t < ACT1) return null;
      if (t < ACT2) {
        var u = ease01((t - ACT1) / (ACT2 - ACT1));
        var drop = ease01(Math.min(1, (t - ACT1) / 8));
        var y = 0.78 + (-0.46 - 0.78) * drop;
        var dist = 1.9 - 0.42 * u;
        return vpOf([1.08, y + 0.2, dist], [0.68, y, 0.08], 26, aspect, t);
      }
      if (t < ACT3) return blendShots(t, ACT2, 2 * BAR, SHOT_STRUGGLE, aspect);
      if (t < ACT4) return blendShots(t, ACT3, 2 * BAR, SHOT_RISE, aspect);
      if (t < ACT5) return blendShots(t, ACT4, 2 * BAR, SHOT_FLOOD, aspect);
      var settle = t >= HOLD ? 1 : ease01((t - ACT5) / (HOLD - ACT5));
      var orbit = 0.45 + (t - ACT5) * 0.05;
      var dist2 = 2.4 + settle * 2.9;
      var eye = [Math.sin(orbit) * dist2 * 0.62, 0.12 + settle * 1.15, Math.cos(orbit) * dist2];
      return vpOf(eye, [0, -0.06 * (1 - settle), 0], 30 + settle * 8, aspect, t);
    }

    function drawPart(obj, part, color, alpha) {
      gl.bindBuffer(gl.ARRAY_BUFFER, obj.buf);
      gl.enableVertexAttribArray(0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
      gl.uniform1f(meshU.uPart, part);
      gl.uniform3fv(meshU.uColor, color);
      gl.uniform1f(meshU.uAlpha, alpha);
      gl.drawArrays(gl.TRIANGLES, 0, obj.n);
    }

    function runFilm(n, t0, useFilm, extra) {
      var tt = t0;
      for (var i = 0; i < n; i++) {
        var F = useFilm ? film(tt) : extra;
        var prob = F.grains > 0 ? F.grains / (PW * PH) : 0;
        sand.step(0.016, prob, tt, F);
        tt += 0.016;
      }
    }

    return {
      step: function (dt, grains, time, F) {
        if (!sand) return;
        var state = F || film(time);
        var prob = grains > 0 ? grains / (PW * PH) : 0;
        sand.step(dt, prob, time, state);
      },
      warm: function (t) {
        if (!sand || t < ACT1 + 0.02) return;
        if (film(t).act >= 5) {
          var primeR = { act: 4, grains: 12, side: 1, shed: 0.008, cap: 150, jitter: 0.16, damp: 2.4, stiff: 5.5 };
          var primeL = { act: 4, grains: 12, side: -1, shed: 0.008, cap: 150, jitter: 0.16, damp: 2.4, stiff: 5.5 };
          runFilm(90, ACT5 - 3, false, primeR);
          runFilm(90, ACT5 - 1.5, false, primeL);
          var tail = Math.max(2.4, t - ACT5);
          var n5 = Math.min(420, Math.floor(tail / 0.016));
          runFilm(n5, t - n5 * 0.016, true, null);
          return;
        }
        var n = Math.min(520, Math.floor((t - ACT1) / 0.016));
        runFilm(n, t - n * 0.016, true, null);
      },
      draw: function (time, alpha, aspect) {
        var yaw = time < ACT1 ? (time - 330) * 0.028 + 0.42 : (time - 300) * 0.012 + 0.22;
        var vp = filmCam(time, aspect) || camera(aspect);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.depthMask(true);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(meshProg);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, sand ? sand.ang() : angFallback);
        gl.uniform1i(meshU.uAng, 3);
        gl.uniformMatrix4fv(meshU.uVP, false, vp);
        gl.uniform1f(meshU.uYaw, yaw);
        drawPart(geo.pillar, 0, bronze, alpha);
        drawPart(geo.beam, 1, bronze, alpha);
        drawPart(geo.pan, 2, panColor, alpha);
        drawPart(geo.pan, 3, panColor, alpha);
        if (!sand) return;
        gl.depthMask(false);
        gl.useProgram(sand.ptProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sand.pos());
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, sand.ang());
        gl.uniformMatrix4fv(sand.ptU.uVP, false, vp);
        gl.uniform1f(sand.ptU.uYaw, yaw);
        gl.uniform1f(sand.ptU.uAlpha, alpha);
        gl.uniform2f(sand.ptU.uRes, canvas.width, canvas.height);
        gl.uniform1f(sand.ptU.uScale, time >= ACT1 && time < ACT2 ? 2.6 : 1);
        gl.disableVertexAttribArray(0);
        gl.disableVertexAttribArray(1);
        gl.drawArrays(gl.POINTS, 0, PW * PH);
      }
    };
  }

  var scales = createScales();

  function look(t) {
    return {
      canvas: smooth(t, 12, 40),
      sheen: smooth(t, 36, 190),
      plasma: smooth(t, 175, 245),
      night: smooth(t, 255, 330),
      stars: smooth(t, 268, 332),
      hero: smooth(t, 262, 318),
      pour: smooth(t, 278, 336),
      center: smooth(t, 252, 318),
      fade: smooth(t, 250, 316),
      scroll: smooth(t, 304, 318) * (1 - smooth(t, 322, 332))
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

  function pokeControls() {
    controlsUntil = performance.now() + 2800;
  }

  function applyReadout(t, L) {
    var page = 1 - L.fade;
    if (shell) {
      shell.style.opacity = page.toFixed(3);
      shell.style.pointerEvents = page < 0.08 ? "none" : "";
    }
    document.body.style.background = L.fade > 0.92 ? "#08110e" : "";
    document.body.classList.toggle("fx-dim", L.night > 0.35);
    document.body.classList.toggle("fx-bar", L.scroll > 0.04);

    var amp = (1 - page) * page * 18;
    for (var n = 0; n < waveEls.length; n++) {
      if (amp < 0.4) {
        waveEls[n].style.transform = "";
      } else {
        var y = Math.sin(t * 0.35 + n * 0.7) * amp;
        waveEls[n].style.transform = "translate3d(0," + y.toFixed(2) + "px,0)";
      }
    }

    scrollRoot.style.opacity = (L.scroll * L.fade).toFixed(3);
    if (L.scroll > 0.01) {
      var shift = (t * 36) % loopWidth;
      track.style.transform = "translate3d(" + (-shift).toFixed(2) + "px,0,0)";
      var sAmp = 7 + 8 * L.scroll;
      for (var g = 0; g < letters.length; g++) {
        var sy = Math.sin(g * 0.38 + t * 1.15) * sAmp;
        letters[g].style.transform = "translate3d(0," + sy.toFixed(2) + "px,0)";
      }
    }

    var idle = 0.72;
    if (musicOn) {
      var left = controlsUntil - performance.now();
      idle = left > 500 ? 0.72 : left > 0 ? (left / 500) * 0.72 : 0;
    }
    if (t >= QUIET_AT) {
      quietBtn.hidden = false;
      var qo = musicOn ? idle : 0.34;
      quietBtn.style.opacity = qo.toFixed(3);
      quietBtn.style.pointerEvents = qo < 0.04 ? "none" : "auto";
    }
    var showPrompt = promptSound && !musicOn && t >= MUSIC;
    if (showPrompt || musicOn) {
      soundBtn.hidden = false;
      var so = showPrompt ? 1 : idle;
      soundBtn.style.opacity = so.toFixed(3);
      soundBtn.style.pointerEvents = so < 0.04 ? "none" : "auto";
    } else {
      soundBtn.hidden = true;
    }
    if (t >= MUSIC && activated && !musicOn) maybeStart();
    var breath = 0.5 + 0.5 * Math.sin(t * 0.55);
    soundBtn.style.setProperty("--pulse", breath.toFixed(3));
  }

  function present(t) {
    var L = look(t);
    var swell = 0.5 + 0.5 * Math.sin(t * 0.28);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.depthMask(false);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uSheen, L.sheen);
    gl.uniform1f(U.uPlasma, L.plasma);
    gl.uniform1f(U.uStars, L.stars);
    gl.uniform1f(U.uNight, L.night);
    gl.uniform1f(U.uCenter, L.center);
    gl.uniform1f(U.uSwell, swell);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (scales && speed > 0 && t >= ACT1) {
      var F = film(t);
      var nstep = coarse ? 2 : 1;
      if (speed > 1) nstep = Math.min(4, Math.ceil(speed / 3));
      for (var s = 0; s < nstep; s++) scales.step(0.016, F.grains, t, F);
    }
    if (scales && L.hero > 0.02) scales.draw(t, L.hero, canvas.width / Math.max(1, canvas.height));
    canvas.style.opacity = L.canvas.toFixed(3);
    applyReadout(t, L);
  }

  function teardown() {
    if (stopped) return;
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    if (schedTimer) clearTimeout(schedTimer);
    reduce.removeEventListener("change", onReduce);
    document.removeEventListener("visibilitychange", onVis);
    document.removeEventListener("pointerdown", onPointer, true);
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pagehide", onHide);
    window.removeEventListener("pageshow", onShow);
    if (audioCtx) {
      audioCtx.onstatechange = null;
      audioCtx.close();
      audioCtx = null;
    }
    document.body.classList.remove("fx-on", "fx-dim", "fx-bar");
    document.body.style.background = "";
    if (shell) {
      shell.style.opacity = "";
      shell.style.pointerEvents = "";
    }
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
    if (!stopped && !musicOn && seconds() >= MUSIC) promptSound = true;
  }

  function hideSpeaker() {
    promptSound = false;
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
    pokeControls();
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
    var eighthVis = (60 / BPM) / 2;
    var visNow = seconds();
    var actNow = film(visNow).act;
    var open = actNow < 2 ? 280 : actNow < 3 ? 720 : actNow < 5 ? 1400 : 480;
    bed.frequency.setValueAtTime(open, ctx.currentTime);
    if (actNow < 5) bed.frequency.linearRampToValueAtTime(Math.min(1600, open + 380), ctx.currentTime + 8);
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

    var into = visNow - MUSIC;
    var wait = 0;
    if (into < eighthVis * 2 && speed > 0) {
      var beatsNow = visNow * BPM / 60;
      var frac = beatsNow - Math.floor(beatsNow);
      if (frac >= 0.035) wait = ((1 - frac) * 60 / BPM) / rate;
    }
    var start = ctx.currentTime + wait;
    var fadeIn = into < 24 ? Math.max(0.25, (60 / BPM) * 4 / rate) : 0.08;
    pre.gain.setValueAtTime(0.0001, start);
    pre.gain.exponentialRampToValueAtTime(0.4, start + 0.04);
    pre.gain.linearRampToValueAtTime(1, start + fadeIn);

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

    function playChord(time, chord, gain, dur) {
      var freqs = chords[chord];
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
        amp.gain.exponentialRampToValueAtTime(gain, time + Math.min(dur * 0.25, stepDur * 6));
        amp.gain.exponentialRampToValueAtTime(0.0001, time + dur);
        osc.connect(filt);
        filt.connect(amp);
        amp.connect(bed);
        osc.start(time);
        osc.stop(time + dur + 0.05);
      }
    }

    function schedule(time, step) {
      if (time < ctx.currentTime) time = ctx.currentTime + 0.005;
      var vt = MUSIC + step * eighthVis;
      var act = film(vt).act;
      if (act < 1) return;
      function hit(quant) {
        return Math.floor((vt - ACT1) / quant) !== Math.floor((vt - eighthVis - ACT1) / quant);
      }
      var chord = Math.floor(Math.max(0, vt - ACT2) / (4 * BAR)) % 4;
      if (act === 1) {
        if (hit(BAR)) tone(ctx, pre, time, 196, 2.4, 0.032, "sine");
        return;
      }
      if (act === 2 && hit(4 * BAR)) playChord(time, chord, 0.04, stepDur * 42);
      if (act === 3 && hit(2 * BAR)) playChord(time, chord, 0.055, stepDur * 30);
      if (act === 4 && hit(BAR)) playChord(time, chord, 0.065, stepDur * 22);
      if (act === 5 && hit(8 * BAR)) playChord(time, chord, 0.03, stepDur * 70);
      if (act >= 2 && act < 5 && hit(BAR)) {
        var accent = act === 2 ? 0.06 : act === 3 ? 0.09 : 0.11;
        tone(ctx, pre, time, 96, 0.42, accent, "sine", 48);
      }
      if (act >= 2 && act < 5 && step % 2 === 0) {
        var note = arps[chord][step % 8];
        var arpGain = act === 2 ? 0.04 : act === 3 ? 0.055 : 0.07;
        var oscA = ctx.createOscillator();
        var ampA = ctx.createGain();
        var filtA = ctx.createBiquadFilter();
        oscA.type = "triangle";
        oscA.frequency.value = note;
        filtA.type = "lowpass";
        filtA.frequency.setValueAtTime(1800, time);
        filtA.frequency.exponentialRampToValueAtTime(420, time + 0.3);
        ampA.gain.setValueAtTime(0.0001, time);
        ampA.gain.exponentialRampToValueAtTime(arpGain, time + 0.02);
        ampA.gain.exponentialRampToValueAtTime(0.0001, time + 0.4);
        oscA.connect(filtA);
        filtA.connect(ampA);
        ampA.connect(pre);
        ampA.connect(echoSend);
        oscA.start(time);
        oscA.stop(time + 0.44);
      }
      if (act === 4 && step % 4 === 2) {
        var src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        var hat = ctx.createBiquadFilter();
        hat.type = "highpass";
        hat.frequency.value = 5000;
        var hatAmp = ctx.createGain();
        hatAmp.gain.setValueAtTime(0.018, time);
        hatAmp.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
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
    stepIndex = Math.max(0, Math.floor((visNow + wait * rate - MUSIC) / eighthVis));
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
    pokeControls();
    if (e.target && e.target.closest && e.target.closest("[data-quiet]")) return;
    activated = true;
    unlock();
  }

  function onMove() {
    if (!stopped && musicOn) pokeControls();
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
  document.addEventListener("pointermove", onMove, { passive: true });
  quietBtn.addEventListener("focus", pokeControls);
  soundBtn.addEventListener("focus", pokeControls);
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
  if (scales) scales.warm(seconds());
  present(seconds());
  if (document.hidden) pauseClock();
  else if (speed > 0) raf = requestAnimationFrame(frame);
})();
