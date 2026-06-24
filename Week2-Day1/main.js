// ---------------------------------------------
// 第 2 周 Day1：NDC 坐标与裁剪 / scissor 测试
// 分屏渲染 Demo（2x2 四宫格）
// 学习重点：
//   1) 同一个 -1~1 的 NDC 三角形，通过 gl.viewport 映射到不同子区域
//   2) gl.scissor + SCISSOR_TEST：把「清屏/绘制」限制在指定像素矩形内
//   3) 复用 Day6 抽出的 gl-utils.js 模块
// ---------------------------------------------

import {
  createProgram,
  resizeCanvasToDisplay,
  createBufferWithData
} from "../Day6/gl-utils.js";

const canvas = document.getElementById("glCanvas");
const statusText = document.getElementById("statusText");
const tipText = document.getElementById("tipText");

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
}
`;

// 每个分屏用 uniform u_color 给不同颜色，方便区分。
const fragmentShaderSource = `
precision mediump float;
uniform vec3 u_color;
void main() {
  gl_FragColor = vec4(u_color, 1.0);
}
`;

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

    // 一个标准的 NDC 三角形（占满整个 -1~1 空间的大部分）。
    // 关键点：这个三角形的坐标永远不变，"分屏" 完全靠 viewport 实现。
    const vertices = new Float32Array([
      0.0, 0.8,
      -0.8, -0.8,
      0.8, -0.8
    ]);
    const vertexBuffer = createBufferWithData(gl, vertices, gl.STATIC_DRAW);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // 四个分屏：各自的背景色 + 三角形颜色（左下角原点坐标系，y 向上）。
    // 注意 WebGL 的 viewport/scissor 原点在「左下角」。
    const quadrants = [
      { name: "左上", bg: [0.10, 0.12, 0.20], tri: [1.0, 0.4, 0.4] },
      { name: "右上", bg: [0.20, 0.12, 0.10], tri: [0.4, 1.0, 0.5] },
      { name: "左下", bg: [0.10, 0.18, 0.16], tri: [0.5, 0.7, 1.0] },
      { name: "右下", bg: [0.16, 0.10, 0.20], tri: [1.0, 0.9, 0.4] }
    ];

    function render() {
      resizeCanvasToDisplay(gl, canvas);

      const w = canvas.width;
      const h = canvas.height;
      const halfW = Math.floor(w / 2);
      const halfH = Math.floor(h / 2);

      // 先用一次「无 scissor」的全屏清屏，作为分屏之间的分隔缝底色。
      gl.disable(gl.SCISSOR_TEST);
      gl.clearColor(0.02, 0.03, 0.05, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // 每个分屏的左下角像素坐标（留 2px 缝隙更直观）。
      const gap = 2;
      const rects = [
        // 左上
        [0, halfH + gap, halfW - gap, halfH - gap],
        // 右上
        [halfW + gap, halfH + gap, halfW - gap, halfH - gap],
        // 左下
        [0, 0, halfW - gap, halfH - gap],
        // 右下
        [halfW + gap, 0, halfW - gap, halfH - gap]
      ];

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      for (let i = 0; i < 4; i++) {
        const [x, y, rw, rh] = rects[i];
        const q = quadrants[i];

        // 1) scissor：把「清屏」限制在这个矩形里，给该分屏单独背景色。
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(x, y, rw, rh);
        gl.clearColor(q.bg[0], q.bg[1], q.bg[2], 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // 2) viewport：把 -1~1 的 NDC 映射到这个矩形 → 三角形被缩放进子区域。
        gl.viewport(x, y, rw, rh);
        gl.uniform3fv(colorLocation, q.tri);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      // 收尾：关掉 scissor，避免影响后续可能的绘制。
      gl.disable(gl.SCISSOR_TEST);
    }

    window.addEventListener("resize", render);
    render();

    updateStatus("状态：渲染成功，四宫格分屏（同一个 NDC 三角形）");
    updateTip("四个三角形的顶点坐标完全相同，分屏只靠 viewport 映射；每格背景由 scissor 限定。");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateStatus("状态：渲染失败，请查看控制台日志", true);
    updateTip("提示：优先检查 shader 日志、viewport/scissor 参数（原点在左下角）。");
    console.error("[Week2-Day1] Initialization failed:", message);
  }
}

initAndRender();
