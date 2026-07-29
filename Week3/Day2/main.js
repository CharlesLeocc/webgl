import { createProgram, createBufferWithData, resizeCanvasToDisplay } from "../../shared/gl-utils.js";

const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");
if (!gl) {
  throw new Error("WebGL 不支持");
}

// -------------------------------------------------
// 着色器：全屏 quad，片元着色器演示各种内置函数
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

  void main() {
    vec2 uv = v_uv;
    vec3 col;

    if (u_mode == 1) {
      // mix：按 uv.x 在红蓝之间线性插值
      col = mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), uv.x);

    } else if (u_mode == 2) {
      // clamp：把正弦波限制在 [0.2, 0.8]
      float v = sin((uv.x + uv.y) * 6.0 + u_time) * 0.5 + 0.5;
      v = clamp(v, 0.2, 0.8);
      col = vec3(v);

    } else if (u_mode == 3) {
      // smoothstep：平滑阶跃，软边缘圆
      float d = length(uv - 0.5);
      float edge = smoothstep(0.25, 0.35, d);
      col = vec3(1.0 - edge);

    } else if (u_mode == 4) {
      // step：硬阈值，左右黑白
      float s = step(0.5, uv.x);
      col = vec3(s);

    } else if (u_mode == 5) {
      // mod：取模产生循环条纹
      float m = mod(uv.x * 10.0 + u_time, 1.0);
      col = vec3(m);

    } else if (u_mode == 6) {
      // fract：取小数部分，锯齿波
      float f = fract((uv.x + uv.y) * 5.0 - u_time * 2.0);
      col = vec3(f);

    } else if (u_mode == 7) {
      // length：到中心的距离
      float l = length(uv - 0.5) * 2.0;
      col = vec3(l);

    } else if (u_mode == 8) {
      // dot + normalize：漫反射光照
      vec3 lightDir = normalize(vec3(cos(u_time), sin(u_time), 0.5));
      vec3 normal = normalize(vec3((uv - 0.5) * 2.0, 1.0));
      float diff = max(dot(normal, lightDir), 0.0);
      col = vec3(diff);

    } else if (u_mode == 9) {
      // cross + reflect：向量反射与叉积
      vec3 I = normalize(vec3(uv.x - 0.5, uv.y - 0.5, -0.5));
      vec3 N = normalize(vec3(0.0, 0.0, 1.0));
      vec3 R = reflect(I, N);
      vec3 c = cross(I, N);
      col = R * 0.5 + 0.5 + abs(c) * 0.5;
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

const program = createProgram(gl, vsSource, fsSource);

const aPositionLoc = gl.getAttribLocation(program, "a_position");
const uModeLoc = gl.getUniformLocation(program, "u_mode");
const uTimeLoc = gl.getUniformLocation(program, "u_time");

// 全屏四边形：NDC 范围 [-1, 1]，VS 内换算成 uv [0, 1]
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
    name: "1 · mix(a, b, t)",
    code: "col = mix(vec3(1,0,0), vec3(0,0,1), uv.x);",
    desc: "线性插值：t=0 取 a，t=1 取 b，中间按比例混合。",
  },
  2: {
    name: "2 · clamp(x, min, max)",
    code: "v = clamp(sin(...), 0.2, 0.8);",
    desc: "把值限制在 [min, max] 区间内，低于 min 取 min，高于 max 取 max。",
  },
  3: {
    name: "3 · smoothstep(edge0, edge1, x)",
    code: "float edge = smoothstep(0.25, 0.35, d);",
    desc: "x 在 edge0 以下为 0，edge1 以上为 1，中间做平滑 Hermite 插值。",
  },
  4: {
    name: "4 · step(edge, x)",
    code: "float s = step(0.5, uv.x);",
    desc: "硬阈值：x < edge 返回 0，x >= edge 返回 1。",
  },
  5: {
    name: "5 · mod(x, y)",
    code: "float m = mod(uv.x * 10.0 + u_time, 1.0);",
    desc: "取模，常用来生成循环重复的条纹或格子。",
  },
  6: {
    name: "6 · fract(x)",
    code: "float f = fract((uv.x + uv.y) * 5.0 - u_time * 2.0);",
    desc: "取小数部分，结果在 0~1 之间循环，形成锯齿波。",
  },
  7: {
    name: "7 · length(p)",
    code: "float l = length(uv - 0.5) * 2.0;",
    desc: "计算向量长度，常用来画圆形、计算距离场。",
  },
  8: {
    name: "8 · dot + normalize",
    code: "vec3 n = normalize(...);\nfloat diff = max(dot(n, lightDir), 0.0);",
    desc: "normalize 化为单位向量；dot 求两向量夹角余弦，漫反射光照核心。",
  },
  9: {
    name: "9 · cross + reflect",
    code: "vec3 R = reflect(I, N);\nvec3 c = cross(I, N);",
    desc: "reflect 围绕法线反射入射向量；cross 返回垂直于两向量的新向量。",
  },
};

let mode = 1;
let paused = false;
let startTime = performance.now();
let lastTime = startTime;
let time = 0;

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

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(render);
}

// -------------------------------------------------
// 键盘交互
// -------------------------------------------------
window.addEventListener("keydown", (e) => {
  if (e.key >= "1" && e.key <= "9") {
    mode = parseInt(e.key, 10);
    updatePanel();
  } else if (e.key === "p" || e.key === "P") {
    paused = !paused;
  }
});

window.addEventListener("resize", () => resizeCanvasToDisplay(gl, canvas));

updatePanel();
requestAnimationFrame(render);
