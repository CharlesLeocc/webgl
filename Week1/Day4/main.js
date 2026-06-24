// ---------------------------------------------
// Day4 教学版：uniform + requestAnimationFrame 动画
// 目标：理解 uniform 是“当前 draw/当前帧共享参数”
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

// 调试开关：如果设为 true，会暂停动画（便于观察静态一帧）。
const DEBUG_FREEZE_ANIMATION = false;

// 顶点着色器：只负责把顶点坐标写入 gl_Position。
const vertexShaderSource = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// 片元着色器：
// 使用 uniform float u_time 作为时间参数，生成动态颜色。
// 这里用 sin 函数做平滑变化，结果在 [0,1] 范围内。
const fragmentShaderSource = `
precision mediump float;
uniform float u_time;

void main() {
  float r = 0.5 + 0.5 * sin(u_time);
  float g = 0.5 + 0.5 * sin(u_time + 2.094); // +120度相位
  float b = 0.5 + 0.5 * sin(u_time + 4.188); // +240度相位
  gl_FragColor = vec4(r, g, b, 1.0);
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
    const timeLocation = gl.getUniformLocation(program, "u_time");

    if (positionLocation < 0) {
      throw new Error("未找到 attribute: a_position");
    }

    if (timeLocation === null) {
      throw new Error("未找到 uniform: u_time");
    }

    // 继续使用最小三角形顶点（NDC坐标）。
    const vertices = new Float32Array([
      0.0, 0.65,
      -0.65, -0.45,
      0.65, -0.45
    ]);

    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
      throw new Error("createBuffer 返回空值");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // 为了减少每帧重复调用，这里提前配置好 attribute 读取规则。
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    let frameCount = 0;

    function render(nowMs) {
      resize();

      gl.clearColor(0.05, 0.08, 0.13, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // requestAnimationFrame 提供的是毫秒，这里转秒更适合三角函数。
      const timeInSeconds = nowMs * 0.001;
      const usedTime = DEBUG_FREEZE_ANIMATION ? 0 : timeInSeconds;

      // uniform1f 把“当前帧共享时间值”传给片元着色器。
      gl.uniform1f(timeLocation, usedTime);

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 控制台每 120 帧输出一次，避免刷屏。
      frameCount += 1;
      if (frameCount % 120 === 0) {
        console.log("[Day4] u_time =", usedTime.toFixed(3));
      }

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
    window.addEventListener("resize", resize);

    updateStatus("状态：渲染成功，颜色动画已启动");
    if (DEBUG_FREEZE_ANIMATION) {
      updateTip("调试模式：动画已冻结。把 DEBUG_FREEZE_ANIMATION 改为 false 恢复。");
    } else {
      updateTip("已跑通 Day4：uniform(u_time) + requestAnimationFrame 动画。");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateStatus("状态：渲染失败，请查看控制台日志", true);
    updateTip("提示：优先检查 shader 编译日志和 uniform 名称是否一致。");
    console.error("[Day4] Initialization failed:", message);
  }
}

initAndRender();
