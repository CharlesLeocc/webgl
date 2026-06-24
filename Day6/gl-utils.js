// ---------------------------------------------
// Day6 模块化拆分：gl-utils.js
// 把 Day1~Day5 里反复出现的样板抽成可复用工具模块。
// 用 ES Module 导出，main.js 用 import 引入。
// ---------------------------------------------

// 编译单个着色器，失败时抛出带日志的错误。
export function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("createShader 返回空值");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    const shaderType = type === gl.VERTEX_SHADER ? "VERTEX_SHADER" : "FRAGMENT_SHADER";
    const log = gl.getShaderInfoLog(shader) || "无编译日志";
    gl.deleteShader(shader);
    throw new Error(`${shaderType} 编译失败：${log}`);
  }

  return shader;
}

// 链接 VS + FS 成一个 program，并清理中间的 shader 对象。
export function createProgram(gl, vsSource, fsSource) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error("createProgram 返回空值");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    const log = gl.getProgramInfoLog(program) || "无链接日志";
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error(`Program 链接失败：${log}`);
  }

  // program 链接完成后，shader 对象就可以删了（已并入 program）。
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return program;
}

// 让 canvas 的绘制缓冲匹配 CSS 尺寸 * 设备像素比，并同步 viewport。
export function resizeCanvasToDisplay(gl, canvas) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.floor(canvas.clientWidth * dpr);
  const height = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
}

// 创建并填充一个 ARRAY_BUFFER（VBO），返回 buffer 句柄。
export function createBufferWithData(gl, data, usage) {
  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new Error("createBuffer 返回空值");
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage || gl.STATIC_DRAW);
  return buffer;
}
