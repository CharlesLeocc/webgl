// ---------------------------------------------
// 第 2 周 Day6-7：阶段整合项目
//
// 把第 2 周学到的内容串到一个完整 Demo 中：
//   - NDC / viewport（全屏视口 + 网格）
//   - 多图元：TRIANGLES（母舰/卫星）、LINES（坐标轴/网格线）、POINTS（网格点）
//   - EBO 索引缓冲与顶点复用（母舰方块、卫星三角形）
//   - 鼠标 / 键盘交互（移动鼠标控制母舰位置，键盘调整自转/缩放/卫星速度/图元）
//   - 2D 变换矩阵与层级组合：
//       母舰矩阵 = T(鼠标) * R(角度) * S(缩放)
//       卫星矩阵 = T(母舰) * R(公转) * T(轨道半径) * R(自转) * S(缩放)
//
// 复用 shared/gl-utils.js。矩阵函数写在本文件内，便于学习者对照。
// ---------------------------------------------

import {
  createProgram,
  createBufferWithData
} from "../../shared/gl-utils.js";

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
uniform mat3 u_matrix;
void main() {
  vec3 pos = u_matrix * vec3(a_position, 1.0);
  gl_Position = vec4(pos.xy, 0.0, 1.0);
  gl_PointSize = 3.0;
}
`;

const fragmentShaderSource = `
precision mediump float;
uniform vec3 u_color;
void main() {
  gl_FragColor = vec4(u_color, 1.0);
}
`;

// ---------- 矩阵工具（列主序） ----------
function mat3Translate(tx, ty) {
  return new Float32Array([1, 0, 0, 0, 1, 0, tx, ty, 1]);
}

function mat3Rotate(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([c, s, 0, -s, c, 0, 0, 0, 1]);
}

function mat3Scale(sx, sy) {
  return new Float32Array([sx, 0, 0, 0, sy, 0, 0, 0, 1]);
}

// a * b，列主序。
function mat3Multiply(a, b) {
  const out = new Float32Array(9);
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        sum += a[row + k * 3] * b[k + col * 3];
      }
      out[row + col * 3] = sum;
    }
  }
  return out;
}

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
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = rect.height - (clientY - rect.top);
  return {
    ndcX: (x / rect.width) * 2.0 - 1.0,
    ndcY: (y / rect.height) * 2.0 - 1.0,
  };
}

function createIndexBuffer(indices) {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("createBuffer(EBO) 返回空值");
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  return buffer;
}

function drawObject(vbo, ebo, primitive, indexCount, matrix, color, useElements) {
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.uniformMatrix3fv(matrixLocation, false, matrix);
  gl.uniform3fv(colorLocation, color);
  if (useElements) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.drawElements(primitive, indexCount, gl.UNSIGNED_SHORT, 0);
  } else {
    gl.drawArrays(primitive, 0, indexCount);
  }
}

// ---------- 全局资源 ----------
let positionLocation;
let matrixLocation;
let colorLocation;

// 母舰：以原点为中心的单位正方形，4 顶点，6 索引。
const motherVertices = new Float32Array([
  -0.12,  0.12,
  -0.12, -0.12,
   0.12, -0.12,
   0.12,  0.12,
]);
const motherIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
const motherVbo = createBufferWithData(gl, motherVertices, gl.STATIC_DRAW);
const motherEbo = createIndexBuffer(motherIndices);

// 卫星：原点上方的等边三角形，3 顶点，3 索引（也可直接 drawArrays，但这里用 EBO 巩固）。
const satVertices = new Float32Array([
   0.0,  0.08,
  -0.07, -0.04,
   0.07, -0.04,
]);
const satIndices = new Uint16Array([0, 1, 2]);
const satVbo = createBufferWithData(gl, satVertices, gl.STATIC_DRAW);
const satEbo = createIndexBuffer(satIndices);

// 网格：坐标轴 + 网格线 + 点。
function buildGrid() {
  const lines = [];
  const points = [];

  // 坐标轴
  lines.push(-1, 0, 1, 0); // x 轴
  lines.push(0, -1, 0, 1); // y 轴

  // 网格线，每 0.25 一条
  for (let i = -0.75; i <= 0.75; i += 0.25) {
    if (Math.abs(i) < 0.001) continue;
    lines.push(-1, i, 1, i); // 水平线
    lines.push(i, -1, i, 1); // 垂直线
    for (let j = -0.75; j <= 0.75; j += 0.25) {
      if (Math.abs(j) < 0.001) continue;
      points.push(j, i);
    }
  }

  return {
    lineBuffer: createBufferWithData(gl, new Float32Array(lines), gl.STATIC_DRAW),
    lineCount: lines.length / 2,
    pointBuffer: createBufferWithData(gl, new Float32Array(points), gl.STATIC_DRAW),
    pointCount: points.length / 2,
  };
}
const grid = buildGrid();

const state = {
  mother: { x: 0, y: 0, angle: 0, scale: 1 },
  satellite: { orbitAngle: 0, orbitSpeed: 0.01, selfAngle: 0, scale: 0.8, radius: 0.35 },
  satPrimitive: "TRIANGLES",
};

const COLORS = {
  mother: [0.2, 0.7, 1.0],
  satellite: [1.0, 0.55, 0.2],
  wire: [1.0, 1.0, 0.45],
  axis: [0.35, 0.35, 0.35],
  gridLine: [0.2, 0.25, 0.35],
  point: [0.5, 0.6, 0.75],
};

function buildMotherMatrix() {
  const T = mat3Translate(state.mother.x, state.mother.y);
  const R = mat3Rotate(state.mother.angle);
  const S = mat3Scale(state.mother.scale, state.mother.scale);
  return mat3Multiply(T, mat3Multiply(R, S));
}

function buildSatelliteMatrix() {
  const parentT = mat3Translate(state.mother.x, state.mother.y);
  const orbitR = mat3Rotate(state.satellite.orbitAngle);
  const orbitT = mat3Translate(state.satellite.radius, 0);
  const selfR = mat3Rotate(state.satellite.selfAngle);
  const S = mat3Scale(state.satellite.scale, state.satellite.scale);
  // 从右到左：先缩放，再自转，再平移到轨道半径，再绕母舰公转，最后跟随母舰。
  return mat3Multiply(
    parentT,
    mat3Multiply(
      orbitR,
      mat3Multiply(orbitT, mat3Multiply(selfR, S))
    )
  );
}

function drawGrid() {
  const identity = mat3Translate(0, 0);

  // 网格线
  drawObject(grid.lineBuffer, null, gl.LINES, grid.lineCount, identity, COLORS.gridLine, false);
  // 坐标轴
  gl.lineWidth(2.0);
  const axisBuf = createBufferWithData(gl, new Float32Array([-1, 0, 1, 0, 0, -1, 0, 1]), gl.STATIC_DRAW);
  drawObject(axisBuf, null, gl.LINES, 4, identity, COLORS.axis, false);
  gl.lineWidth(1.0);

  // 网格点
  drawObject(grid.pointBuffer, null, gl.POINTS, grid.pointCount, identity, COLORS.point, false);
}

function render() {
  resizeCanvas(canvas);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.04, 0.08, 0.14, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);

  drawGrid();

  const motherMatrix = buildMotherMatrix();
  drawObject(motherVbo, motherEbo, gl.TRIANGLES, motherIndices.length, motherMatrix, COLORS.mother, true);

  // 母舰外框：同一组顶点，用 LINE_LOOP 画出轮廓，展示多图元复用同一 VBO。
  drawObject(motherVbo, null, gl.LINE_LOOP, motherVertices.length / 2, motherMatrix, COLORS.wire, false);

  const satMatrix = buildSatelliteMatrix();
  const satPrimitive = gl[state.satPrimitive];

  if (state.satPrimitive === "LINE_LOOP") {
    // 画线框：用原始顶点数，无 EBO。
    drawObject(satVbo, null, gl.LINE_LOOP, satVertices.length / 2, satMatrix, COLORS.wire, false);
  } else if (state.satPrimitive === "POINTS") {
    drawObject(satVbo, null, gl.POINTS, satVertices.length / 2, satMatrix, COLORS.satellite, false);
  } else {
    // TRIANGLES
    drawObject(satVbo, satEbo, gl.TRIANGLES, satIndices.length, satMatrix, COLORS.satellite, true);
  }

  updateStatus(
    `状态：渲染成功 — 母舰(${state.mother.x.toFixed(2)}, ${state.mother.y.toFixed(2)}) 旋转${(state.mother.angle * 180 / Math.PI).toFixed(0)}° 缩放${state.mother.scale.toFixed(2)}；卫星图元 ${state.satPrimitive} 公转${(state.satellite.orbitAngle * 180 / Math.PI).toFixed(0)}°`
  );
}

// 初始化 program（必须放在 draw 函数使用的位置之后或之前，这里使用 createProgram）。
const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
positionLocation = gl.getAttribLocation(program, "a_position");
matrixLocation = gl.getUniformLocation(program, "u_matrix");
colorLocation = gl.getUniformLocation(program, "u_color");

if (positionLocation < 0) throw new Error("未找到 a_position");
if (matrixLocation === null) throw new Error("未找到 u_matrix");
if (colorLocation === null) throw new Error("未找到 u_color");

let lastTime = 0;
function tick(time) {
  const dt = Math.min(0.033, (time - lastTime) / 1000 || 0.016);
  lastTime = time;

  state.satellite.orbitAngle += state.satellite.orbitSpeed;
  state.satellite.selfAngle += state.satellite.orbitSpeed * 2;

  render();
  requestAnimationFrame(tick);
}

// ---------- 交互 ----------
canvas.addEventListener("mousemove", (event) => {
  const { ndcX, ndcY } = pixelToNdc(canvas, event.clientX, event.clientY);
  state.mother.x = ndcX;
  state.mother.y = ndcY;
});

canvas.addEventListener("mouseleave", () => {
  state.mother.x = 0;
  state.mother.y = 0;
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toUpperCase();
  let changed = true;

  switch (key) {
    case "W": state.mother.y += 0.05; break;
    case "S": state.mother.y -= 0.05; break;
    case "A": state.mother.x -= 0.05; break;
    case "D": state.mother.x += 0.05; break;
    case "Q": state.mother.angle += Math.PI / 36; break;
    case "E": state.mother.angle -= Math.PI / 36; break;
    case "+": case "=":
      state.mother.scale = Math.min(3, state.mother.scale + 0.1);
      break;
    case "-": case "_":
      state.mother.scale = Math.max(0.3, state.mother.scale - 0.1);
      break;
    case " ":
      state.mother = { x: 0, y: 0, angle: 0, scale: 1 };
      state.satellite = { orbitAngle: 0, orbitSpeed: 0.01, selfAngle: 0, scale: 0.8, radius: 0.35 };
      state.satPrimitive = "TRIANGLES";
      break;
    default:
      changed = false;
  }

  // 调整卫星速度，不依赖大小写。
  if (event.key === "ArrowUp") {
    state.satellite.orbitSpeed = Math.min(0.1, state.satellite.orbitSpeed + 0.005);
    changed = true;
  } else if (event.key === "ArrowDown") {
    state.satellite.orbitSpeed = Math.max(0, state.satellite.orbitSpeed - 0.005);
    changed = true;
  } else if (event.key === "1") {
    state.satPrimitive = "TRIANGLES";
    changed = true;
  } else if (event.key === "2") {
    state.satPrimitive = "LINE_LOOP";
    changed = true;
  } else if (event.key === "3") {
    state.satPrimitive = "POINTS";
    changed = true;
  }

  if (changed) event.preventDefault();
});

window.addEventListener("resize", render);

// 启动循环。
updateTip("提示：移动鼠标控制母舰；W/A/S/D 平移，Q/E 自转，+/- 缩放；↑/↓ 调整卫星速度；1/2/3 切换卫星图元；空格复位。");
requestAnimationFrame(tick);
