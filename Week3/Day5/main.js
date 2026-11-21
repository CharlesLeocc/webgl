import { createProgram, createBufferWithData, resizeCanvasToDisplay } from "../../shared/gl-utils.js";

const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");
if (!gl) {
  throw new Error("WebGL 不支持");
}

// -------------------------------------------------
// 着色器：光晕 / 径向模糊 / 色调映射 / 体素化
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
  uniform float u_param;   // 每个模式各自的可调参数
  uniform float u_aspect;  // 画布宽/高比，用来把图形修正成正圆

  // 彩色小场景：同心彩环 + 旋转辐条，给「径向模糊」和「体素化」当底图
  vec3 scene(vec2 uv) {
    vec2 p = (uv - 0.5) * vec2(u_aspect, 1.0);
    float r = length(p);
    float a = atan(p.y, p.x);

    vec3 col = vec3(0.04, 0.05, 0.09);

    // 向外扩散的彩色圆环
    float ring = smoothstep(0.06, 0.0, abs(fract(r * 3.0 - u_time * 0.3) - 0.5) - 0.3);
    vec3 hue = 0.5 + 0.5 * cos(6.2831 * (r * 1.5 + vec3(0.0, 0.33, 0.67)));
    col += hue * ring;

    // 旋转辐条
    float spoke = smoothstep(0.85, 1.0, cos(a * 6.0 + u_time));
    col += vec3(0.9, 0.8, 0.4) * spoke * 0.7;

    return col;
  }

  // ACES 色调映射近似：把 HDR 高亮压回 0~1，同时保住对比度和色相
  vec3 aces(vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  void main() {
    vec2 uv = v_uv;
    vec2 p = (uv - 0.5) * vec2(u_aspect, 1.0); // 宽高比修正后的中心坐标
    vec3 col;

    if (u_mode == 1) {
      // 光晕：亮度 = 参数 / 距离，距离越近越亮，自然衰减出光晕
      vec2 light = vec2(cos(u_time) * 0.25, sin(u_time) * 0.25);
      float d = length(p - light);
      float glow = u_param / (d + 0.02);
      col = vec3(0.02, 0.03, 0.05);
      col += vec3(1.0, 0.65, 0.25) * glow;               // 暖色光晕
      col += vec3(1.0) * smoothstep(0.04, 0.0, d);        // 白色光芯

    } else if (u_mode == 2) {
      // 径向模糊：沿「像素 → 屏幕中心」方向采样多次取平均
      vec2 center = vec2(0.5);
      const int N = 16;
      for (int i = 0; i < N; i++) {
        float t = float(i) / float(N - 1);
        col += scene(mix(uv, center, t * u_param));
      }
      col /= float(N);

    } else if (u_mode == 3) {
      // 色调映射：左边直接截断 clamp，右边 ACES，中间分界线
      vec3 hdr = vec3(0.02, 0.03, 0.06);
      // 主光源：暖色太阳
      float d0 = length(p - vec2(0.0, 0.05));
      hdr += vec3(1.2, 0.9, 0.5) * (0.08 / (d0 + 0.02));
      // 两个彩色小光源，看 ACES 怎么保住色相
      float d1 = length(p - vec2(-0.4, -0.15));
      float d2 = length(p - vec2(0.4, -0.15));
      hdr += vec3(0.4, 0.3, 1.0) * (0.02 / (d1 + 0.015));
      hdr += vec3(0.2, 1.0, 0.5) * (0.02 / (d2 + 0.015));
      hdr *= u_param; // 曝光

      if (uv.x < 0.498) {
        col = clamp(hdr, 0.0, 1.0);   // 直接截断：高光糊成一片
      } else if (uv.x > 0.502) {
        col = aces(hdr);              // ACES：亮部有层次
      } else {
        col = vec3(0.9);              // 分界线
      }

    } else if (u_mode == 4) {
      // 体素化：把 uv 量化到格子中心，像素变成大方块
      vec2 vuv = (floor(uv * u_param) + 0.5) / u_param;
      col = scene(vuv);
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

const program = createProgram(gl, vsSource, fsSource);

const aPositionLoc = gl.getAttribLocation(program, "a_position");
const uModeLoc = gl.getUniformLocation(program, "u_mode");
const uTimeLoc = gl.getUniformLocation(program, "u_time");
const uParamLoc = gl.getUniformLocation(program, "u_param");
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
    name: "1 · 光晕 Glow",
    code: "float glow = u_param / (d + 0.02);",
    desc: "亮度与距离成反比，越靠近光源越亮，叠加出自然的光晕。+/- 调光的强度。",
  },
  2: {
    name: "2 · 径向模糊 Radial Blur",
    code: "col += scene(mix(uv, center, t * u_param));",
    desc: "沿「当前像素 → 屏幕中心」方向采样 16 次取平均，形成向中心汇聚的拖影。+/- 调模糊强度。",
  },
  3: {
    name: "3 · 色调映射 Tone Mapping",
    code: "col = aces(hdr);  // 对比 clamp(hdr, 0., 1.)",
    desc: "屏幕只能显示 0~1，HDR 亮度会被截断。左半=直接 clamp（高光糊死），右半=ACES（亮部有层次）。+/- 调曝光。",
  },
  4: {
    name: "4 · 体素化 Voxelize",
    code: "vec2 vuv = (floor(uv * n) + 0.5) / n;",
    desc: "把 uv 量化到格子中心，同一格内所有像素取同一颜色，画面变成大方块。+/- 调格子密度。",
  },
};

let mode = 1;
let paused = false;
let time = 0.0;
let lastTime = performance.now();

// 每个模式各自的可调参数（+/- 修改当前模式的）
const params = {
  1: 0.02,   // 光晕强度
  2: 0.5,    // 模糊强度 0~0.95
  3: 1.5,    // 曝光
  4: 32.0,   // 体素格子数
};

const $modeName = document.getElementById("modeName");
const $modeCode = document.getElementById("modeCode");
const $modeDesc = document.getElementById("modeDesc");

function updatePanel() {
  const info = modes[mode];
  $modeName.textContent = info.name;
  $modeCode.textContent = info.code;
  $modeDesc.textContent = info.desc;
}

function adjustParam(dir) {
  if (mode === 1) {
    params[1] = Math.min(Math.max(params[1] * (dir > 0 ? 1.3 : 1 / 1.3), 0.002), 0.2);
  } else if (mode === 2) {
    params[2] = Math.min(Math.max(params[2] + dir * 0.05, 0.0), 0.95);
  } else if (mode === 3) {
    params[3] = Math.min(Math.max(params[3] * (dir > 0 ? 1.25 : 1 / 1.25), 0.2), 10.0);
  } else if (mode === 4) {
    params[4] = Math.min(Math.max(params[4] * (dir > 0 ? 1.25 : 1 / 1.25), 4.0), 128.0);
  }
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
  gl.uniform1f(uParamLoc, params[mode]);
  gl.uniform1f(uAspectLoc, canvas.width / canvas.height);

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
    adjustParam(1);
  } else if (e.key === "-" || e.key === "_") {
    adjustParam(-1);
  } else if (e.key === "p" || e.key === "P") {
    paused = !paused;
  }
});

window.addEventListener("resize", () => resizeCanvasToDisplay(gl, canvas));

updatePanel();
requestAnimationFrame(render);
