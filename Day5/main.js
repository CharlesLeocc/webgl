// ---------------------------------------------
// Day5 教学版：Varying 与插值
// 重点：
//   1) varying 的核心是「VS 输出 -> 光栅化自动插值 -> FS 接收」
//   2) 渐变三角形：颜色作为 varying，三角形内部由重心坐标插值
//   3) 棋盘格：UV 作为 varying，片元着色器用插值后的 UV 算出黑白格
// ---------------------------------------------

const canvas = document.getElementById("glCanvas");
const statusText = document.getElementById("statusText");
const tipText = document.getElementById("tipText");

if (!canvas) {
  throw new Error("未找到 #glCanvas 元素");
}

const gl = canvas.getContext("webgl");

if (!gl) {
  updateStatus("状态：WebGL 上下文创建失败", true);
  throw new Error("当前环境不支持 WebGL");
}

// 棋盘格的格子数量（每行/每列）。调大变密，调小变疏。
const GRID_COUNT = 8.0;

// ---------- 着色器：渐变三角形 ----------
// a_color 作为 varying 传给片元着色器，三角形内部颜色由 GPU 自动插值。
const triangleVS = `
attribute vec2 a_position;
attribute vec3 a_color;
varying vec3 v_color;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_color = a_color;
}
`;

const triangleFS = `
precision mediump float;
varying vec3 v_color;

void main() {
  // 这里收到的 v_color 已经是「插值后」的颜色，而非顶点原始颜色。
  gl_FragColor = vec4(v_color, 1.0);
}
`;

// ---------- 着色器：UV 棋盘格 ----------
// a_uv(0~1) 作为 varying 传入；片元着色器用插值后的 uv 计算黑白格。
const gridVS = `
attribute vec2 a_position;
attribute vec2 a_uv;
varying vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = a_uv;
}
`;

const gridFS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_grid;

void main() {
  // 把 0~1 的 uv 放大成网格坐标，floor 后取奇偶决定黑白。
  vec2 cell = floor(v_uv * u_grid);
  float checker = mod(cell.x + cell.y, 2.0);
  vec3 colorA = vec3(0.10, 0.12, 0.18); // 深色格
  vec3 colorB = vec3(0.85, 0.88, 0.95); // 浅色格
  vec3 color = mix(colorA, colorB, checker);
  gl_FragColor = vec4(color, 1.0);
}
`;

function updateStatus(text, isError = false) {
  if (!statusText) return;
  statusText.textContent = text;
  statusText.className = isError ? "err" : "ok";
}

function updateTip(text) {
  if (!tipText) return;
  tipText.textContent = text;
}

function createShader(glContext, type, source) {
  const shader = glContext.createShader(type);
  if (!shader) {
    throw new Error("createShader 返回空值");
  }

  glContext.shaderSource(shader, source);
  glContext.compileShader(shader);

  const compiled = glContext.getShaderParameter(shader, glContext.COMPILE_STATUS);
  if (!compiled) {
    const shaderType = type === glContext.VERTEX_SHADER ? "VERTEX_SHADER" : "FRAGMENT_SHADER";
    const log = glContext.getShaderInfoLog(shader) || "无编译日志";
    glContext.deleteShader(shader);
    throw new Error(`${shaderType} 编译失败：${log}`);
  }

  return shader;
}

function createProgram(glContext, vsSource, fsSource) {
  const vertexShader = createShader(glContext, glContext.VERTEX_SHADER, vsSource);
  const fragmentShader = createShader(glContext, glContext.FRAGMENT_SHADER, fsSource);

  const program = glContext.createProgram();
  if (!program) {
    glContext.deleteShader(vertexShader);
    glContext.deleteShader(fragmentShader);
    throw new Error("createProgram 返回空值");
  }

  glContext.attachShader(program, vertexShader);
  glContext.attachShader(program, fragmentShader);
  glContext.linkProgram(program);

  const linked = glContext.getProgramParameter(program, glContext.LINK_STATUS);
  if (!linked) {
    const log = glContext.getProgramInfoLog(program) || "无链接日志";
    glContext.deleteProgram(program);
    glContext.deleteShader(vertexShader);
    glContext.deleteShader(fragmentShader);
    throw new Error(`Program 链接失败：${log}`);
  }

  glContext.deleteShader(vertexShader);
  glContext.deleteShader(fragmentShader);
  return program;
}

function resize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.floor(canvas.clientWidth * dpr);
  const height = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
}

function initAndRender() {
  try {
    // ---------- 程序与 attribute 位置 ----------
    const triangleProgram = createProgram(gl, triangleVS, triangleFS);
    const triPosLoc = gl.getAttribLocation(triangleProgram, "a_position");
    const triColorLoc = gl.getAttribLocation(triangleProgram, "a_color");
    if (triPosLoc < 0 || triColorLoc < 0) {
      throw new Error("渐变三角形：未找到 a_position 或 a_color");
    }

    const gridProgram = createProgram(gl, gridVS, gridFS);
    const gridPosLoc = gl.getAttribLocation(gridProgram, "a_position");
    const gridUvLoc = gl.getAttribLocation(gridProgram, "a_uv");
    const gridUniformLoc = gl.getUniformLocation(gridProgram, "u_grid");
    if (gridPosLoc < 0 || gridUvLoc < 0) {
      throw new Error("棋盘格：未找到 a_position 或 a_uv");
    }
    if (gridUniformLoc === null) {
      throw new Error("棋盘格：未找到 uniform u_grid");
    }

    // ---------- 左侧渐变三角形数据：交错 [x, y, r, g, b] ----------
    const triangleData = new Float32Array([
      // 顶点1：上方（红色）
      -0.45, 0.6, 1.0, 0.2, 0.2,
      // 顶点2：左下（绿色）
      -0.9, -0.5, 0.2, 1.0, 0.2,
      // 顶点3：右下（蓝色）
      0.0, -0.5, 0.2, 0.4, 1.0
    ]);
    const triangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, triangleData, gl.STATIC_DRAW);

    // ---------- 右侧棋盘格数据：一个正方形（两个三角形），交错 [x, y, u, v] ----------
    // UV 是「手动指定」的：把贴图/图案坐标 0~1 钉在四个角上。
    const gridData = new Float32Array([
      // 第一个三角形
      0.15, -0.5, 0.0, 0.0, // 左下
      0.9, -0.5, 1.0, 0.0,  // 右下
      0.15, 0.6, 0.0, 1.0,  // 左上
      // 第二个三角形
      0.9, -0.5, 1.0, 0.0,  // 右下
      0.9, 0.6, 1.0, 1.0,   // 右上
      0.15, 0.6, 0.0, 1.0   // 左上
    ]);
    const gridBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, gridData, gl.STATIC_DRAW);

    const FSIZE = triangleData.BYTES_PER_ELEMENT; // 4 字节

    function render() {
      resize();
      gl.clearColor(0.04, 0.08, 0.14, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // --- 绘制左侧渐变三角形 ---
      gl.useProgram(triangleProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
      // stride = 5 个 float = 20 字节
      gl.enableVertexAttribArray(triPosLoc);
      gl.vertexAttribPointer(triPosLoc, 2, gl.FLOAT, false, FSIZE * 5, 0);
      gl.enableVertexAttribArray(triColorLoc);
      gl.vertexAttribPointer(triColorLoc, 3, gl.FLOAT, false, FSIZE * 5, FSIZE * 2);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // --- 绘制右侧棋盘格 ---
      gl.useProgram(gridProgram);
      gl.uniform1f(gridUniformLoc, GRID_COUNT);
      gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
      // stride = 4 个 float = 16 字节
      gl.enableVertexAttribArray(gridPosLoc);
      gl.vertexAttribPointer(gridPosLoc, 2, gl.FLOAT, false, FSIZE * 4, 0);
      gl.enableVertexAttribArray(gridUvLoc);
      gl.vertexAttribPointer(gridUvLoc, 2, gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    window.addEventListener("resize", render);
    render();

    updateStatus("状态：渲染成功，左侧渐变三角形 + 右侧棋盘格");
    updateTip("左侧颜色、右侧棋盘格都是「顶点数据经 varying 插值」的结果。改 GRID_COUNT 看格子疏密变化。");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateStatus("状态：渲染失败，请查看控制台日志", true);
    updateTip("提示：优先检查 shader 日志、attribute 名称、stride/offset 设置。");
    console.error("[Day5] Initialization failed:", message);
  }
}

initAndRender();
