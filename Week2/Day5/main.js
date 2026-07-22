// ---------------------------------------------
// 第 2 周 Day5：2D 变换矩阵
// 学习重点：
//   1) 用 3x3 矩阵 + 齐次坐标处理 2D 仿射变换（平移/旋转/缩放）。
//   2) GLSL 中：gl_Position = u_matrix * vec3(a_position, 1.0)
//   3) JS 中实现矩阵乘法，并注意「列主序」存储（与 GLSL 一致）。
//   4) 矩阵连乘顺序：M = T * R * S，意味着先缩放、再旋转、最后平移。
// ---------------------------------------------

import {
  createProgram,
  createBufferWithData
} from "../../shared/gl-utils.js";

const canvas = document.getElementById("glCanvas");
const statusText = document.getElementById("statusText");
const tipText = document.getElementById("tipText");

const state = {
  tx: 0,
  ty: 0,
  angle: 0,    // 弧度
  sx: 1,
  sy: 1,
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

const vertexShaderSource = `
attribute vec2 a_position;
uniform mat3 u_matrix;
void main() {
  // 用 3x3 矩阵做 2D 仿射变换；a_position 扩展成齐次坐标 vec3(x, y, 1)。
  vec3 pos = u_matrix * vec3(a_position, 1.0);
  gl_Position = vec4(pos.xy, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision mediump float;
uniform vec3 u_color;
void main() {
  gl_FragColor = vec4(u_color, 1.0);
}
`;

// ---------- 3x3 矩阵工具（列主序，和 GLSL mat3 一致） ----------

function mat3Identity() {
  return new Float32Array([
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
  ]);
}

function mat3Translate(tx, ty) {
  return new Float32Array([
    1, 0, 0,
    0, 1, 0,
    tx, ty, 1
  ]);
}

function mat3Rotate(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([
    c, s, 0,
   -s, c, 0,
    0, 0, 1
  ]);
}

function mat3Scale(sx, sy) {
  return new Float32Array([
    sx, 0, 0,
    0, sy, 0,
    0, 0, 1
  ]);
}

// 矩阵乘法 result = a * b（a、b、result 都是列主序 9 元素 Float32Array）。
function mat3Multiply(a, b) {
  const out = new Float32Array(9);
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        // a[row, k] = a[row + k*3]
        // b[k, col] = b[k + col*3]
        sum += a[row + k * 3] * b[k + col * 3];
      }
      out[row + col * 3] = sum;
    }
  }
  return out;
}

// 把 3x3 矩阵展平后以列主序传给 uniformMatrix3fv。
function buildTransformMatrix(s) {
  const T = mat3Translate(s.tx, s.ty);
  const R = mat3Rotate(s.angle);
  const S = mat3Scale(s.sx, s.sy);
  // M = T * R * S：先缩放、再旋转、最后平移。
  return mat3Multiply(T, mat3Multiply(R, S));
}

function formatMatrix(m) {
  return [
    `[${m[0].toFixed(2)} ${m[3].toFixed(2)} ${m[6].toFixed(2)}]`,
    `[${m[1].toFixed(2)} ${m[4].toFixed(2)} ${m[7].toFixed(2)}]`,
    `[${m[2].toFixed(2)} ${m[5].toFixed(2)} ${m[8].toFixed(2)}]`,
  ].join(" ");
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

function init() {
  const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
  const positionLocation = gl.getAttribLocation(program, "a_position");
  const matrixLocation = gl.getUniformLocation(program, "u_matrix");
  const colorLocation = gl.getUniformLocation(program, "u_color");

  if (positionLocation < 0) throw new Error("未找到 a_position attribute");
  if (matrixLocation === null) throw new Error("未找到 u_matrix uniform");
  if (colorLocation === null) throw new Error("未找到 u_color uniform");

  // 一个中心在原点的单位正方形（EBO 索引绘制两个三角形，顶点复用）。
  const vertices = new Float32Array([
    -0.25,  0.25,  // 0 左上
    -0.25, -0.25,  // 1 左下
     0.25, -0.25,  // 2 右下
     0.25,  0.25   // 3 右上
  ]);
  const indices = new Uint16Array([
    0, 1, 2,
    0, 2, 3
  ]);

  createBufferWithData(gl, vertices, gl.STATIC_DRAW);

  const ebo = gl.createBuffer();
  if (!ebo) throw new Error("createBuffer(EBO) 返回空值");
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  function render() {
    resizeCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0.04, 0.08, 0.14, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);

    // 构造并上传 3x3 变换矩阵（GLSL 默认列主序，uniformMatrix3fv 的 false 参数表示不转置）。
    const matrix = buildTransformMatrix(state);
    gl.uniformMatrix3fv(matrixLocation, false, matrix);

    // 颜色随旋转角度微微变化，让运动更易观察。
    const hue = 0.4 + state.angle * 0.03;
    gl.uniform3f(colorLocation,
      0.5 + 0.4 * Math.sin(hue),
      0.6 + 0.3 * Math.cos(hue + 1.0),
      0.8
    );

    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    updateStatus(`状态：渲染成功 — 平移(${state.tx.toFixed(2)}, ${state.ty.toFixed(2)}) 旋转 ${(state.angle * 180 / Math.PI).toFixed(0)}° 缩放(${state.sx.toFixed(2)}, ${state.sy.toFixed(2)})`);
    updateTip(`矩阵 M = T * R * S：${formatMatrix(matrix)}`);
  }

  window.addEventListener("keydown", (event) => {
    const key = event.key;
    let changed = true;

    switch (key) {
      case "w": case "W": state.ty += 0.05; break;
      case "s": case "S": state.ty -= 0.05; break;
      case "a": case "A": state.tx -= 0.05; break;
      case "d": case "D": state.tx += 0.05; break;
      case "q": case "Q": state.angle += Math.PI / 36; break; // +5°
      case "e": case "E": state.angle -= Math.PI / 36; break; // -5°
      case "+": case "=": state.sx = Math.min(3, state.sx + 0.1); state.sy = Math.min(3, state.sy + 0.1); break;
      case "-": case "_": state.sx = Math.max(0.3, state.sx - 0.1); state.sy = Math.max(0.3, state.sy - 0.1); break;
      case " ":
        state.tx = 0;
        state.ty = 0;
        state.angle = 0;
        state.sx = 1;
        state.sy = 1;
        break;
      default:
        changed = false;
    }

    if (changed) {
      event.preventDefault();
      render();
    }
  });

  window.addEventListener("resize", render);

  render();
}

try {
  init();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  updateStatus("状态：渲染失败，请查看控制台日志", true);
  updateTip("提示：优先检查 shader 链接日志、矩阵乘法的列主序、uniform 名称拼写。");
  console.error("[Week2-Day5] Initialization failed:", message);
}
