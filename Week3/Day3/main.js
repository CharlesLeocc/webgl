import { createProgram, createBufferWithData, resizeCanvasToDisplay } from "../../shared/gl-utils.js";

const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");
if (!gl) {
  throw new Error("WebGL 不支持");
}

// -------------------------------------------------
// 着色器：从伪随机 → 值噪声 → 梯度噪声 → FBM
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
  uniform float u_scale;

  // 伪随机：把整数坐标转成 0~1 的“随机”数
  float rand(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // 值噪声：格子角点随机值 + 平滑插值
  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep Hermite

    float a = rand(i);
    float b = rand(i + vec2(1.0, 0.0));
    float c = rand(i + vec2(0.0, 1.0));
    float d = rand(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // 随机梯度（用于 Perlin 噪声）
  vec2 hashGradient(vec2 p) {
    float n = rand(p);
    float angle = n * 6.28318530718;
    return vec2(cos(angle), sin(angle));
  }

  // 梯度噪声（Perlin 简化版）
  float gradNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float n00 = dot(hashGradient(i), f);
    float n10 = dot(hashGradient(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
    float n01 = dot(hashGradient(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
    float n11 = dot(hashGradient(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));

    return 0.5 + 0.5 * mix(mix(n00, n10, u.x), mix(n01, n11, u.x), u.y);
  }

  // FBM：把多层噪声叠加，得到云/地形细节
  float fbm(vec2 p) {
    float total = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 5; i++) {
      total += amp * gradNoise(p * freq);
      amp *= 0.5;
      freq *= 2.0;
    }
    return total;
  }

  void main() {
    vec2 uv = v_uv;
    vec2 p = uv * u_scale + u_time * 0.05;
    float n;
    vec3 col;

    if (u_mode == 1) {
      // 伪随机：高频白噪声
      n = rand(floor(p * 64.0));
      col = vec3(n);

    } else if (u_mode == 2) {
      // 值噪声：平滑斑块
      n = valueNoise(p);
      col = vec3(n);

    } else if (u_mode == 3) {
      // 梯度噪声：更自然，方向连续变化
      n = gradNoise(p);
      col = vec3(n);

    } else if (u_mode == 4) {
      // FBM：多层叠加，像云或地形
      n = fbm(p);
      // 简单地形色阶：深海 → 陆地 → 雪山
      vec3 sea = vec3(0.1, 0.25, 0.55);
      vec3 land = vec3(0.2, 0.55, 0.2);
      vec3 rock = vec3(0.45, 0.4, 0.35);
      vec3 snow = vec3(0.95, 0.95, 1.0);
      if (n < 0.35) col = mix(sea, land, smoothstep(0.20, 0.35, n));
      else if (n < 0.65) col = mix(land, rock, smoothstep(0.35, 0.65, n));
      else col = mix(rock, snow, smoothstep(0.65, 0.85, n));
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

const program = createProgram(gl, vsSource, fsSource);

const aPositionLoc = gl.getAttribLocation(program, "a_position");
const uModeLoc = gl.getUniformLocation(program, "u_mode");
const uTimeLoc = gl.getUniformLocation(program, "u_time");
const uScaleLoc = gl.getUniformLocation(program, "u_scale");

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
    name: "1 · 伪随机噪声 (hash noise)",
    code: "n = rand(floor(p * 64.0));",
    desc: "每个格子一个随机数，看起来像电视雪花。优点是快，缺点是块状、不连续。",
  },
  2: {
    name: "2 · 值噪声 (value noise)",
    code: "n = valueNoise(p);",
    desc: "在网格角点放随机值，再用 smoothstep 插值，得到有渐变斑点的图案。",
  },
  3: {
    name: "3 · 梯度噪声 (gradient noise / Perlin)",
    code: "n = gradNoise(p);",
    desc: "每个格子的随机不是数值，而是随机方向（梯度），插值后方向变化更自然。",
  },
  4: {
    name: "4 · 分形布朗运动 (FBM)",
    code: "n = fbm(p);",
    desc: "把多层梯度噪声按频率翻倍、振幅减半叠加，模拟云、地形、水波纹等自然纹理。",
  },
};

let mode = 1;
let scale = 4.0;
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

  gl.useProgram(program);
  gl.uniform1i(uModeLoc, mode);
  gl.uniform1f(uTimeLoc, time);
  gl.uniform1f(uScaleLoc, scale);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(render);
}

// -------------------------------------------------
// 键盘交互
// -------------------------------------------------
window.addEventListener("keydown", (e) => {
  if (e.key >= "1" && e.key <= "4") {
    mode = parseInt(e.key, 10);
    updatePanel();
  } else if (e.key === "+" || e.key === "=") {
    scale = Math.min(scale * 1.2, 32.0);
  } else if (e.key === "-" || e.key === "_") {
    scale = Math.max(scale / 1.2, 1.0);
  } else if (e.key === "p" || e.key === "P") {
    paused = !paused;
  }
});

window.addEventListener("resize", () => resizeCanvasToDisplay(gl, canvas));

updatePanel();
requestAnimationFrame(render);
