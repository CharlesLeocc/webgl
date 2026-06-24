// ---------------------------------------------
// Day6 整合：彩色动画三角形（第 1 周收尾）
// 把前几天的知识合到一起：
//   - Day3：交错缓冲 [x, y, r, g, b] + stride/offset
//   - Day5：a_color 作为 varying，三角形内部颜色插值
//   - Day4：uniform u_time 驱动整体色相随时间旋转 + 轻微缩放动画
// 样板（createShader/createProgram/resize/buffer）已抽到 gl-utils.js。
// ---------------------------------------------

import {
  createProgram,
  resizeCanvasToDisplay,
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

// 顶点着色器：
// - u_time 用来做轻微缩放（呼吸感），并把时间传给片元做色相旋转
// - a_color 经 varying 插值传给片元
const vertexShaderSource = `
attribute vec2 a_position;
attribute vec3 a_color;
uniform mediump float u_time;
varying vec3 v_color;

void main() {
  float scale = 0.9 + 0.1 * sin(u_time * 2.0); // 在 0.8~1.0 之间呼吸
  gl_Position = vec4(a_position * scale, 0.0, 1.0);
  v_color = a_color;
}
`;

// 片元着色器：
// 在插值后的顶点色基础上，叠加一个随时间旋转的色相偏移，让画面“流动”。
const fragmentShaderSource = `
precision mediump float;
uniform mediump float u_time;
varying vec3 v_color;

void main() {
  // 用时间生成一个在 [0,1] 间循环的三通道偏移，和顶点插值色混合。
  vec3 shift = 0.5 + 0.5 * vec3(
    sin(u_time),
    sin(u_time + 2.094), // +120°
    sin(u_time + 4.188)  // +240°
  );
  vec3 color = mix(v_color, shift, 0.5);
  gl_FragColor = vec4(color, 1.0);
}
`;

function initAndRender() {
  try {
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const colorLocation = gl.getAttribLocation(program, "a_color");
    const timeLocation = gl.getUniformLocation(program, "u_time");

    if (positionLocation < 0 || colorLocation < 0) {
      throw new Error("未找到 a_position 或 a_color attribute");
    }
    if (timeLocation === null) {
      throw new Error("未找到 uniform u_time");
    }

    // 交错布局：每个顶点 [x, y, r, g, b]，共 5 个 float。
    const vertices = new Float32Array([
      // 顶点1：上方（红）
      0.0, 0.68, 1.0, 0.2, 0.2,
      // 顶点2：左下（绿）
      -0.68, -0.52, 0.2, 1.0, 0.2,
      // 顶点3：右下（蓝）
      0.68, -0.52, 0.2, 0.4, 1.0
    ]);
    const vertexBuffer = createBufferWithData(gl, vertices, gl.STATIC_DRAW);
    const FSIZE = vertices.BYTES_PER_ELEMENT; // 4 字节

    // attribute 读取规则只需配置一次。
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, FSIZE * 5, 0);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, FSIZE * 5, FSIZE * 2);

    function render(nowMs) {
      resizeCanvasToDisplay(gl, canvas);
      gl.clearColor(0.04, 0.08, 0.14, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const timeInSeconds = nowMs * 0.001;
      gl.uniform1f(timeLocation, timeInSeconds);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);

    updateStatus("状态：渲染成功，彩色动画三角形运行中");
    updateTip("整合完成：交错缓冲(Day3) + varying 插值(Day5) + uniform 动画(Day4)，样板已抽到 gl-utils.js。");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateStatus("状态：渲染失败，请查看控制台日志", true);
    updateTip("提示：优先检查 shader 日志、attribute 名称、stride/offset 设置。");
    console.error("[Day6] Initialization failed:", message);
  }
}

initAndRender();
