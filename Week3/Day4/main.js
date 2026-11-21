import { createProgram, createBufferWithData, resizeCanvasToDisplay } from "../../shared/gl-utils.js";

const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");
if (!gl) {
  throw new Error("WebGL 不支持");
}

// -------------------------------------------------
// 着色器：SDF 形状 + 布尔运算 + 平滑混合
// -------------------------------------------------
const vsSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_uv = a_position * 0.5 + 0.5;
  }
`;

const fsSource = `
  precision mediump float;
  precision mediump int;

  varying vec2 v_uv;
  uniform int u_mode;
  uniform float u_time;
  uniform float u_aspect;

  // 圆
  float sdCircle(vec2 p, float r) {
    return length(p) - r;
  }

  // 矩形
  float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }

  // 线段（粗细可减半径）
  float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  // 布尔运算
  float opUnion(float d1, float d2) { return min(d1, d2); }
  float opIntersect(float d1, float d2) { return max(d1, d2); }
  float opSubtract(float d1, float d2) { return max(d1, -d2); }

  // 平滑并（让交界处圆润过渡）
  float opSmoothUnion(float d1, float d2, float k) {
    float h = max(k - abs(d1 - d2), 0.0) / k;
    return min(d1, d2) - h * h * h * k * (1.0 / 6.0);
  }

  // 根据距离场着色：内部白、外部黑、边界红
  vec3 render(float d) {
    vec3 col = vec3(1.0 - smoothstep(0.0, 0.05, d));
    col = mix(vec3(1.0, 0.25, 0.45), col, smoothstep(0.0, 0.02, abs(d)));
    return col;
  }

  void main() {
    // 把 uv 映射成带宽高比的“世界坐标”
    vec2 p = (v_uv - 0.5) * vec2(u_aspect, 1.0) * 2.5;
    float d;
    float t = u_time;

    if (u_mode == 1) {
      // 圆
      d = sdCircle(p, 0.6);

    } else if (u_mode == 2) {
      // 矩形
      d = sdBox(p, vec2(0.7, 0.45));

    } else if (u_mode == 3) {
      // 线段（带 0.04 粗细）
      d = sdSegment(p, vec2(-0.8, -0.4), vec2(0.8, 0.4)) - 0.04;

    } else if (u_mode == 4) {
      // 并集：圆 + 矩形
      float c = sdCircle(p - vec2(-0.3, 0.0), 0.45);
      float b = sdBox(p - vec2(0.35, 0.0), vec2(0.4, 0.55));
      d = opUnion(c, b);

    } else if (u_mode == 5) {
      // 交集：圆 ∩ 矩形
      float c = sdCircle(p, 0.7);
      float b = sdBox(p, vec2(0.5, 0.8));
      d = opIntersect(c, b);

    } else if (u_mode == 6) {
      // 差集：矩形 - 圆（挖洞）
      float b = sdBox(p, vec2(0.75, 0.55));
      float c = sdCircle(p - vec2(0.15, 0.0), 0.35);
      d = opSubtract(b, c);

    } else if (u_mode == 7) {
      // 平滑并：两个圆靠近时融化
      float x = sin(t) * 0.45;
      float c1 = sdCircle(p - vec2(-0.45 + x, 0.0), 0.45);
      float c2 = sdCircle(p - vec2(0.45 - x, 0.0), 0.45);
      d = opSmoothUnion(c1, c2, 0.35);
    }

    gl_FragColor = vec4(render(d), 1.0);
  }
`;

const program = createProgram(gl, vsSource, fsSource);

const aPositionLoc = gl.getAttribLocation(program, "a_position");
const uModeLoc = gl.getUniformLocation(program, "u_mode");
const uTimeLoc = gl.getUniformLocation(program, "u_time");
const uAspectLoc = gl.getUniformLocation(program, "u_aspect");

// 全屏四边形
const vertices = new Float32Array([
  -1, -1,
   1, -1,
  -1,  1,
   1,  1,
]);
createBufferWithData(gl, vertices, gl.STATIC_DRAW);
gl.enableVertexAttribArray(aPositionLoc);
gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);

// -------------------------------------------------
// 模式说明
// -------------------------------------------------
const modes = {
  1: {
    name: "1 · 圆 SDF",
    code: "float sdCircle(vec2 p, float r) {\n  return length(p) - r;\n}",
    desc: "到圆的有符号距离：内部 < 0，边界 = 0，外部 > 0。",
  },
  2: {
    name: "2 · 矩形 SDF",
    code: "float sdBox(vec2 p, vec2 b) {\n  vec2 d = abs(p) - b;\n  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);\n}",
    desc: "abs 把点折到第一象限，再算到矩形边框的距离。",
  },
  3: {
    name: "3 · 线段 SDF",
    code: "float sdSegment(p, a, b) {\n  float h = clamp(dot(p-a, b-a) / dot(b-a, b-a), 0.0, 1.0);\n  return length((p-a) - (b-a) * h);\n}",
    desc: "在 ab 上找最近投影点，再算到投影点的距离。",
  },
  4: {
    name: "4 · 并集 union",
    code: "return min(sdCircle(p), sdBox(p));",
    desc: "min：只要满足任一形状即属于结果。",
  },
  5: {
    name: "5 · 交集 intersect",
    code: "return max(sdCircle(p), sdBox(p));",
    desc: "max：同时满足两个形状才属于结果。",
  },
  6: {
    name: "6 · 差集 subtract",
    code: "return max(sdBox(p), -sdCircle(p));",
    desc: "在 Box 内、但在 Circle 外部的区域：用负的圆距离把圆挖掉。",
  },
  7: {
    name: "7 · 平滑并 smooth union",
    code: "return opSmoothUnion(d1, d2, k);",
    desc: "在 min 基础上做 Hermite 平滑，两个形状靠近时会像液体一样融合。",
  },
};

let mode = 1;
let paused = false;
let time = 0.0;
let lastTime = performance.now();

const $modeName = document.getElementById("modeName");
const $modeCode = document.getElementById("modeCode");
const $modeDesc = document.getElementById("modeDesc");

function updatePanel() {
  const info = modes[mode];
  $modeName.textContent = info.name;
  $modeCode.textContent = info.code;
  $modeDesc.textContent = info.desc;
}

// -------------------------------------------------
// 渲染循环
// -------------------------------------------------
function render(now) {
  resizeCanvasToDisplay(gl, canvas);
  gl.clearColor(0.02, 0.03, 0.06, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  if (!paused) {
    time += (now - lastTime) * 0.001;
  }
  lastTime = now;

  const aspect = canvas.width / canvas.height;

  gl.useProgram(program);
  gl.uniform1i(uModeLoc, mode);
  gl.uniform1f(uTimeLoc, time);
  gl.uniform1f(uAspectLoc, aspect);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(render);
}

// -------------------------------------------------
// 键盘交互
// -------------------------------------------------
window.addEventListener("keydown", (e) => {
  if (e.key >= "1" && e.key <= "7") {
    mode = parseInt(e.key, 10);
    updatePanel();
  } else if (e.key === "p" || e.key === "P") {
    paused = !paused;
  }
});

window.addEventListener("resize", () => resizeCanvasToDisplay(gl, canvas));

updatePanel();
requestAnimationFrame(render);
