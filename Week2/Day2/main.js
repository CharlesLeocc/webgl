// ---------------------------------------------
// 第 2 周 Day2：7 种图元模式（可切换展示）
// 学习重点：
//   同一组顶点，用不同的 drawArrays mode，连成完全不同的图形。
//   POINTS / LINES / LINE_STRIP / LINE_LOOP /
//   TRIANGLES / TRIANGLE_STRIP / TRIANGLE_FAN
// 复用 shared/gl-utils.js。
// ---------------------------------------------

import {
  createProgram,
  resizeCanvasToDisplay,
  createBufferWithData
} from "../../shared/gl-utils.js";

const canvas = document.getElementById("glCanvas");
const statusText = document.getElementById("statusText");
const tipText = document.getElementById("tipText");
const buttonsBox = document.getElementById("modeButtons");

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

const vertexShaderSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  gl_PointSize = 12.0; // 只有 POINTS 模式会用到
}
`;

const fragmentShaderSource = `
precision mediump float;
uniform vec3 u_color;
void main() {
  gl_FragColor = vec4(u_color, 1.0);
}
`;

// 7 个顶点，呈扇形/折线分布，方便看清不同模式的连法差异。
const vertices = new Float32Array([
  0.0, 0.0,      // 0 中心（TRIANGLE_FAN 的扇心）
  0.7, 0.1,      // 1
  0.45, 0.6,     // 2
  -0.1, 0.75,    // 3
  -0.6, 0.45,    // 4
  -0.7, -0.2,    // 5
  -0.2, -0.65    // 6
]);
const VERTEX_COUNT = vertices.length / 2;

// 每种模式的说明，便于切换时显示。
const MODES = [
  { key: "POINTS", label: "POINTS（点）", desc: "每个顶点画一个独立的点（gl_PointSize 控制大小）。" },
  { key: "LINES", label: "LINES（线段）", desc: "每 2 个顶点连成一段独立线段（0-1, 2-3, 4-5…）。" },
  { key: "LINE_STRIP", label: "LINE_STRIP（折线）", desc: "顶点首尾依次相连成一条折线，不闭合。" },
  { key: "LINE_LOOP", label: "LINE_LOOP（闭合折线）", desc: "像 LINE_STRIP，但最后一个顶点再连回第一个，闭合。" },
  { key: "TRIANGLES", label: "TRIANGLES（独立三角形）", desc: "每 3 个顶点构成一个独立三角形（0-1-2, 3-4-5…）。" },
  { key: "TRIANGLE_STRIP", label: "TRIANGLE_STRIP（三角形带）", desc: "相邻三角形共享一条边，像一条带子向前铺。" },
  { key: "TRIANGLE_FAN", label: "TRIANGLE_FAN（三角形扇）", desc: "所有三角形共享第 0 个顶点（扇心），像折扇展开。" }
];

let currentMode = "LINE_LOOP";

function initAndRender() {
  try {
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const colorLocation = gl.getUniformLocation(program, "u_color");

    if (positionLocation < 0) {
      throw new Error("未找到 a_position attribute");
    }
    if (colorLocation === null) {
      throw new Error("未找到 uniform u_color");
    }

    const vertexBuffer = createBufferWithData(gl, vertices, gl.STATIC_DRAW);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    function render() {
      resizeCanvasToDisplay(gl, canvas);
      gl.clearColor(0.04, 0.08, 0.14, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      const isPointsOrLines =
        currentMode === "POINTS" ||
        currentMode === "LINES" ||
        currentMode === "LINE_STRIP" ||
        currentMode === "LINE_LOOP";

      // 线/点用亮色，三角形用半透明感的填充色，便于区分。
      const color = isPointsOrLines ? [0.5, 0.85, 1.0] : [1.0, 0.55, 0.4];
      gl.uniform3fv(colorLocation, color);

      gl.drawArrays(gl[currentMode], 0, VERTEX_COUNT);
    }

    // 生成切换按钮。
    MODES.forEach((mode) => {
      const btn = document.createElement("button");
      btn.textContent = mode.label;
      btn.dataset.key = mode.key;
      btn.className = mode.key === currentMode ? "active" : "";
      btn.addEventListener("click", () => {
        currentMode = mode.key;
        for (const child of buttonsBox.children) {
          child.className = child.dataset.key === currentMode ? "active" : "";
        }
        updateStatus(`状态：渲染成功，当前模式 ${currentMode}`);
        updateTip(mode.desc);
        render();
      });
      buttonsBox.appendChild(btn);
    });

    window.addEventListener("resize", render);
    render();

    const initialMode = MODES.find((m) => m.key === currentMode);
    updateStatus(`状态：渲染成功，当前模式 ${currentMode}`);
    updateTip(initialMode ? initialMode.desc : "");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateStatus("状态：渲染失败，请查看控制台日志", true);
    updateTip("提示：优先检查 shader 日志、drawArrays 的 mode 取值。");
    console.error("[Week2-Day2] Initialization failed:", message);
  }
}

initAndRender();
