// ---------------------------------------------
// 第 2 周 Day4：鼠标与键盘交互
// 学习重点：
//   1) 屏幕(clientX, clientY) → WebGL 像素坐标 → NDC 的转换。
//      WebGL 原点在画布左下角、y 向上；而 clientY 原点在窗口左上角、y 向下，
//      所以需要做 y 轴翻转：glY = canvas.clientHeight - clientY。
//   2) 把交互结果以 uniform 方式传给 shader：
//      u_offset —— 三角形中心偏移；
//      u_scale  —— 三角形缩放；
//      u_color  —— 基础颜色（由键盘 R/G/B 切换）。
//   3) 事件驱动渲染：不跑循环，只在 mousemove/keydown/resize 时调用 render()。
// ---------------------------------------------

import {
  createProgram,
  createBufferWithData
} from "../../shared/gl-utils.js";

const canvas = document.getElementById("glCanvas");
const statusText = document.getElementById("statusText");
const tipText = document.getElementById("tipText");

const COLORS = {
  R: [1.0, 0.25, 0.25],
  G: [0.25, 1.0, 0.45],
  B: [0.35, 0.65, 1.0],
};

const state = {
  ndcX: 0.0,          // 鼠标对应的 NDC x
  ndcY: 0.0,          // 鼠标对应的 NDC y
  scale: 1.0,
  colorName: "R",
};

function updateStatus(text, isError = false) {
  if (!statusText) return;
  statusText.textContent = text;
  statusText.className = isError ? "err" : "ok";
}

function updateTip(text) {
  if (!tipText) return;
  tipText.textContent = text;
}

if (!canvas) {
  throw new Error("未找到 #glCanvas 元素");
}

const gl = canvas.getContext("webgl");
if (!gl) {
  updateStatus("状态：WebGL 上下文创建失败", true);
  throw new Error("当前环境不支持 WebGL");
}

// 顶点着色器：本地三角形 + u_offset 位移 + u_scale 缩放。
const vertexShaderSource = `
attribute vec2 a_position;
uniform vec2 u_offset;
uniform float u_scale;
void main() {
  gl_Position = vec4(a_position * u_scale + u_offset, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision mediump float;
uniform vec3 u_color;
void main() {
  gl_FragColor = vec4(u_color, 1.0);
}
`;

// 调整 canvas 内部像素尺寸以匹配 CSS 尺寸 * DPR，但不在这里设 viewport。
function resizeCanvas(canvas) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.floor(canvas.clientWidth * dpr);
  const height = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function pixelToNdc(canvas, clientX, clientY) {
  // 先拿到画布在视口中的位置。
  const rect = canvas.getBoundingClientRect();
  // 换算成「以画布左下角为原点」的像素坐标。
  // CSS/clientY 向下增大，WebGL y 向上增大，因此要翻转。
  const x = clientX - rect.left;
  const y = rect.height - (clientY - rect.top);

  // 再归一化到 NDC：像素原点 → -1~1。
  const ndcX = (x / rect.width) * 2.0 - 1.0;
  const ndcY = (y / rect.height) * 2.0 - 1.0;

  return { ndcX, ndcY };
}

function init() {
  const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
  const positionLocation = gl.getAttribLocation(program, "a_position");
  const offsetLocation = gl.getUniformLocation(program, "u_offset");
  const scaleLocation = gl.getUniformLocation(program, "u_scale");
  const colorLocation = gl.getUniformLocation(program, "u_color");

  if (positionLocation < 0) throw new Error("未找到 a_position attribute");
  if (offsetLocation === null) throw new Error("未找到 u_offset uniform");
  if (scaleLocation === null) throw new Error("未找到 u_scale uniform");
  if (colorLocation === null) throw new Error("未找到 u_color uniform");

  // 一个以 (0,0) 为中心的小三角形，后续再用 u_offset 把它移到鼠标位置。
  const vertices = new Float32Array([
    0.0,  0.18,
   -0.16, -0.14,
    0.16, -0.14
  ]);
  createBufferWithData(gl, vertices, gl.STATIC_DRAW);

  function render() {
    resizeCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0.04, 0.08, 0.14, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(offsetLocation, state.ndcX, state.ndcY);
    gl.uniform1f(scaleLocation, state.scale);
    gl.uniform3fv(colorLocation, COLORS[state.colorName]);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // 鼠标移动 → 更新 NDC 坐标 → 重绘（事件驱动）。
  canvas.addEventListener("mousemove", (event) => {
    const { ndcX, ndcY } = pixelToNdc(canvas, event.clientX, event.clientY);
    state.ndcX = ndcX;
    state.ndcY = ndcY;
    render();
    updateInfo();
  });

  // 鼠标离开画布：把三角形移回中心并复位状态。
  canvas.addEventListener("mouseleave", () => {
    state.ndcX = 0.0;
    state.ndcY = 0.0;
    render();
    updateInfo();
  });

  window.addEventListener("keydown", (event) => {
    const key = event.key.toUpperCase();

    if (COLORS[key]) {
      state.colorName = key;
    } else if (key === "ARROWUP") {
      state.scale = Math.min(3.0, state.scale + 0.1);
    } else if (key === "ARROWDOWN") {
      state.scale = Math.max(0.3, state.scale - 0.1);
    } else if (key === " ") {
      // 空格复位：颜色 R、缩放 1、位置回中心。
      state.colorName = "R";
      state.scale = 1.0;
      state.ndcX = 0.0;
      state.ndcY = 0.0;
    } else {
      // 无关按键不重绘。
      return;
    }

    event.preventDefault();
    render();
    updateInfo();
  });

  window.addEventListener("resize", () => {
    render();
    updateInfo();
  });

  function updateInfo() {
    updateStatus(
      `状态：渲染成功 — 位置(${state.ndcX.toFixed(2)}, ${state.ndcY.toFixed(2)})，缩放 ${state.scale.toFixed(2)}，颜色 ${state.colorName}`
    );
    updateTip(
      "提示：移动鼠标控制三角形位置；按 ↑/↓ 缩放，按 R/G/B 改颜色，按空格复位。"
    );
  }

  // 初始居中。
  render();
  updateInfo();
}

try {
  init();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  updateStatus("状态：渲染失败，请查看控制台日志", true);
  updateTip("提示：优先检查 shader 链接日志、uniform 名称拼写、canvas 尺寸。");
  console.error("[Week2-Day4] Initialization failed:", message);
}
