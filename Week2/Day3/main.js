// ---------------------------------------------
// 第 2 周 Day3：索引缓冲 EBO（Element Buffer Object）
// 学习重点：
//   1) ELEMENT_ARRAY_BUFFER：存「顶点的索引」而不是顶点本身
//   2) gl.drawElements 用索引绘制，实现「顶点复用」
//   3) 对比：矩形用 4 个顶点 + 6 个索引，而不是 6 个重复顶点
//   4) 多边形（扇形三角剖分）：N+1 个顶点 + 3N 个索引
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
const buttonsBox = document.getElementById("sideButtons");

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

const fragmentShaderSource = `
precision mediump float;
uniform vec3 u_color;
void main() {
  gl_FragColor = vec4(u_color, 1.0);
}
`;

// 创建一个 ELEMENT_ARRAY_BUFFER（EBO），存放顶点索引。
function createIndexBuffer(indices) {
  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new Error("createBuffer(EBO) 返回空值");
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  return buffer;
}

// 生成正 N 边形：中心点 + N 个环上顶点；用「扇形」方式三角剖分。
// 返回 { vertices: Float32Array, indices: Uint16Array }
function buildPolygon(sides, radius) {
  const positions = [0.0, 0.0]; // 顶点 0：中心（扇心）
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  // 索引：每个三角形 = 中心(0) + 第 i 个环点 + 第 i+1 个环点（首尾相接）
  const indices = [];
  for (let i = 0; i < sides; i++) {
    const a = i + 1;
    const b = ((i + 1) % sides) + 1;
    indices.push(0, a, b);
  }
  return {
    vertices: new Float32Array(positions),
    indices: new Uint16Array(indices)
  };
}

let sides = 6;

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

    // ---------- 矩形：4 个顶点，6 个索引（2 个三角形复用对角顶点）----------
    const rectVertices = new Float32Array([
      -0.6, 0.6,  // 0 左上
      -0.6, -0.6, // 1 左下
      0.6, -0.6,  // 2 右下
      0.6, 0.6    // 3 右上
    ]);
    // 两个三角形：0-1-2 和 0-2-3，顶点 0 和 2 被复用。
    const rectIndices = new Uint16Array([
      0, 1, 2,
      0, 2, 3
    ]);
    const rectVbo = createBufferWithData(gl, rectVertices, gl.STATIC_DRAW);
    const rectEbo = createIndexBuffer(rectIndices);

    function drawRect() {
      gl.bindBuffer(gl.ARRAY_BUFFER, rectVbo);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, rectEbo);
      gl.uniform3fv(colorLocation, [0.4, 0.7, 1.0]);
      // 用索引绘制：count=6 个索引，类型 UNSIGNED_SHORT，从偏移 0 开始。
      gl.drawElements(gl.TRIANGLES, rectIndices.length, gl.UNSIGNED_SHORT, 0);
    }

    function drawPolygon() {
      const { vertices, indices } = buildPolygon(sides, 0.75);
      const vbo = createBufferWithData(gl, vertices, gl.STATIC_DRAW);
      const ebo = createIndexBuffer(indices);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
      gl.uniform3fv(colorLocation, [1.0, 0.6, 0.35]);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
      return { vertexCount: vertices.length / 2, indexCount: indices.length };
    }

    function render() {
      resizeCanvasToDisplay(gl, canvas);
      const w = canvas.width;
      const h = canvas.height;
      const halfW = Math.floor(w / 2);

      gl.disable(gl.SCISSOR_TEST);
      gl.clearColor(0.04, 0.08, 0.14, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      // 左半屏：矩形
      gl.viewport(0, 0, halfW, h);
      drawRect();

      // 右半屏：多边形
      gl.viewport(halfW, 0, w - halfW, h);
      const poly = drawPolygon();

      return poly;
    }

    // 侧边数切换按钮。
    [3, 4, 5, 6, 8, 12, 32].forEach((n) => {
      const btn = document.createElement("button");
      btn.textContent = `${n} 边`;
      btn.dataset.sides = String(n);
      btn.className = n === sides ? "active" : "";
      btn.addEventListener("click", () => {
        sides = n;
        for (const child of buttonsBox.children) {
          child.className = Number(child.dataset.sides) === sides ? "active" : "";
        }
        refresh();
      });
      buttonsBox.appendChild(btn);
    });

    function refresh() {
      const poly = render();
      updateStatus("状态：渲染成功，左=矩形(EBO)，右=多边形(EBO)");
      updateTip(
        `矩形：4 个顶点 + 6 个索引（顶点 0、2 各被复用一次）。` +
        `　多边形(${sides}边)：${poly.vertexCount} 个顶点 + ${poly.indexCount} 个索引，中心点被复用 ${sides} 次。`
      );
    }

    window.addEventListener("resize", refresh);
    refresh();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateStatus("状态：渲染失败，请查看控制台日志", true);
    updateTip("提示：优先检查 shader 日志、drawElements 的 count/type、EBO 绑定。");
    console.error("[Week2-Day3] Initialization failed:", message);
  }
}

initAndRender();
