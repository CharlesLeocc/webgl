// ---------------------------------------------
// Day3 教学版：Buffer 与 Attribute 深入
// 重点：一个顶点缓冲里同时存 position + color
//       并通过两个 attribute 用 stride/offset 正确解包
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

// 调试开关：故意制造 attribute 读取错误，练习排错。
// true  时：会使用错误的 stride，导致颜色/形状异常
// false 时：使用正确布局，显示彩色渐变三角形
const DEBUG_ATTRIBUTE_LAYOUT_ERROR = false;

// 顶点着色器：
// - a_position：每个顶点的位置（vec2）
// - a_color：每个顶点的颜色（vec3）
// - v_color：传到片元着色器并在光栅化阶段插值
const vertexShaderSource = `
attribute vec2 a_position;
attribute vec3 a_color;
varying vec3 v_color;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_color = a_color;
}
`;

// 片元着色器：直接输出插值后的 v_color。
const fragmentShaderSource = `
precision mediump float;
varying vec3 v_color;

void main() {
  gl_FragColor = vec4(v_color, 1.0);
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
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const colorLocation = gl.getAttribLocation(program, "a_color");

    if (positionLocation < 0 || colorLocation < 0) {
      throw new Error("未找到 a_position 或 a_color attribute 位置");
    }

    // 每个顶点布局（interleaved）：
    // [x, y, r, g, b]
    // 一共 5 个 float（20 字节）
    const vertices = new Float32Array([
      // 顶点1：上方（红色）
      0.0, 0.68, 1.0, 0.2, 0.2,
      // 顶点2：左下（绿色）
      -0.68, -0.52, 0.2, 1.0, 0.2,
      // 顶点3：右下（蓝色）
      0.68, -0.52, 0.2, 0.4, 1.0
    ]);

    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
      throw new Error("createBuffer 返回空值");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    function render() {
      resize();
      gl.clearColor(0.04, 0.08, 0.14, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

      // 正确 stride 应为 5 * 4 = 20 字节（每个顶点含 5 个 float）。
      // 如果开启调试错误模式，故意给错 stride，观察画面异常。
      const stride = DEBUG_ATTRIBUTE_LAYOUT_ERROR ? 16 : 20;

      // a_position: 读取每个顶点前 2 个 float（x,y）
      // size=2, type=FLOAT, normalized=false, stride=20, offset=0
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);

      // a_color: 从第 3 个 float 开始读取（跳过 x,y）
      // offset=2*4=8 字节
      gl.enableVertexAttribArray(colorLocation);
      gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, stride, 8);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    window.addEventListener("resize", render);
    render();

    updateStatus("状态：渲染成功，已显示彩色渐变三角形");
    if (DEBUG_ATTRIBUTE_LAYOUT_ERROR) {
      updateTip("调试模式开启：已故意打乱 stride，请观察异常并回到 main.js 修复。");
    } else {
      updateTip("已跑通 Day3：position+color 共用缓冲，varying 颜色插值正常。");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateStatus("状态：渲染失败，请查看控制台日志", true);
    updateTip("提示：优先检查 shader 日志、attribute 名称、stride/offset 设置。");
    console.error("[Day3] Initialization failed:", message);
  }
}

initAndRender();
