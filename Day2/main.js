// -------------------------------
// Day2 教学版：第一个三角形（完整最小渲染管线）
// 目标：让你明确每一步“为什么做、做了什么、在哪个阶段生效”
// 管线顺序：CPU准备 -> VS -> 图元装配 -> 光栅化 -> FS -> 写入颜色缓冲
// -------------------------------

// 1) 获取页面元素：canvas 是 WebGL 的绘制目标。
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

// 练习开关：用于“故意制造 shader 编译错误”来训练排错能力。
// 使用方式：
// - enabled: true  开启故意报错
// - target: "vertex" | "fragment" 选择在哪个 shader 注入错误
// 默认关闭，不影响正常渲染。
const DEBUG_SHADER_ERROR = {
  enabled: false,
  target: "fragment"
};

// 2) 顶点着色器（Vertex Shader）
// - 每个顶点都会执行一次
// - 输入 a_position（来自 CPU 上传的顶点缓冲）
// - 输出 gl_Position（裁剪空间坐标）
// 这里先用最简单方案：直接把 2D 顶点扩成 vec4，不做矩阵变换。
const vertexShaderSource = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// 3) 片元着色器（Fragment Shader）
// - 每个片元（可理解为像素候选）执行一次
// - 输出该片元最终颜色
// 这里固定输出橙红色，便于你先关注“几何是否正确画出来”。
const fragmentShaderSource = `
precision mediump float;

void main() {
  gl_FragColor = vec4(0.96, 0.45, 0.33, 1.0);
}
`;

// 根据 DEBUG_SHADER_ERROR 配置，返回最终参与编译的 shader 源码。
// 如果开启了故意报错，会在指定 shader 末尾插入一行非法语法。
function getShaderSources() {
  let vsSource = vertexShaderSource;
  let fsSource = fragmentShaderSource;

  if (!DEBUG_SHADER_ERROR.enabled) {
    return { vsSource, fsSource };
  }

  const brokenLine = "\nthis_will_break_shader_code\n";
  if (DEBUG_SHADER_ERROR.target === "vertex") {
    vsSource += brokenLine;
  } else {
    fsSource += brokenLine;
  }

  return { vsSource, fsSource };
}

// 更新页面上的状态文本，便于你在不打开控制台时也知道运行结果。
function updateStatus(text, isError = false) {
  if (!statusText) return;
  statusText.textContent = text;
  statusText.className = isError ? "err" : "ok";
}

// 更新提示文本，通常用于给你下一步排错建议。
function updateTip(text) {
  if (!tipText) return;
  tipText.textContent = text;
}

// 4) 编译单个 shader 的工具函数
// 输入：shader 类型 + 源码
// 输出：可被 program 使用的 shader 对象
// 若失败：抛出具体编译日志，帮助快速定位语法/类型错误。
function createShader(glContext, type, source) {
  const shader = glContext.createShader(type);
  if (!shader) {
    throw new Error("createShader 返回空值");
  }

  glContext.shaderSource(shader, source);
  glContext.compileShader(shader);

  // COMPILE_STATUS 为 false 说明当前 shader 编译失败。
  const compiled = glContext.getShaderParameter(shader, glContext.COMPILE_STATUS);
  if (!compiled) {
    const shaderType = type === glContext.VERTEX_SHADER ? "VERTEX_SHADER" : "FRAGMENT_SHADER";
    const log = glContext.getShaderInfoLog(shader) || "无编译日志";
    glContext.deleteShader(shader);
    throw new Error(`${shaderType} 编译失败：${log}`);
  }

  return shader;
}

// 5) 链接 program（把顶点着色器 + 片元着色器组装成可执行渲染程序）
// 输入：VS源码、FS源码
// 输出：可传给 useProgram 的 program
function createProgram(glContext, vsSource, fsSource) {
  const vertexShader = createShader(glContext, glContext.VERTEX_SHADER, vsSource);
  const fragmentShader = createShader(glContext, glContext.FRAGMENT_SHADER, fsSource);

  const program = glContext.createProgram();
  if (!program) {
    throw new Error("createProgram 返回空值");
  }

  glContext.attachShader(program, vertexShader);
  glContext.attachShader(program, fragmentShader);
  glContext.linkProgram(program);

  // LINK_STATUS 为 false 通常是 VS/FS 接口不匹配等问题。
  const linked = glContext.getProgramParameter(program, glContext.LINK_STATUS);
  if (!linked) {
    const log = glContext.getProgramInfoLog(program) || "无链接日志";
    glContext.deleteProgram(program);
    throw new Error(`Program 链接失败：${log}`);
  }

  glContext.deleteShader(vertexShader);
  glContext.deleteShader(fragmentShader);

  return program;
}

// 6) 尺寸同步：保证 canvas 的实际像素尺寸与 CSS 显示尺寸一致
// 为什么要做：
// - 不处理会导致画面发虚（像素不足）或比例异常
// - resize 后必须重新设置 viewport，否则映射区域不正确
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

// 7) 初始化并执行首次渲染
// 这里串起 Day2 的完整最小流程：
// program -> buffer -> attribute -> drawArrays
function initAndRender() {
  try {
    const { vsSource, fsSource } = getShaderSources();

    if (DEBUG_SHADER_ERROR.enabled) {
      updateTip(
        `调试模式已开启：正在故意制造 ${DEBUG_SHADER_ERROR.target} shader 编译错误，请观察控制台日志。`
      );
      console.warn(
        `[Day2] DEBUG_SHADER_ERROR enabled. target=${DEBUG_SHADER_ERROR.target}. This run is expected to fail.`
      );
    }

    // 7.1 创建并链接渲染程序（GPU 可执行）
    const program = createProgram(gl, vsSource, fsSource);

    // 7.2 查询 attribute 位置
    // a_position 是 shader 里声明的顶点输入变量。
    const positionLocation = gl.getAttribLocation(program, "a_position");
    if (positionLocation < 0) {
      throw new Error("未找到 attribute: a_position");
    }

    // 7.3 顶点数据（NDC 空间坐标）
    // 三个点组成一个三角形：上顶点 + 左下 + 右下
    const vertices = new Float32Array([
      0.0, 0.62,
      -0.62, -0.45,
      0.62, -0.45
    ]);

    // 7.4 创建并绑定顶点缓冲（VBO）
    // ARRAY_BUFFER 表示“当前正在操作的是顶点属性数据缓冲”。
    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
      throw new Error("createBuffer 返回空值");
    }

    // 7.5 把 CPU 内存中的 Float32Array 上传到 GPU
    // STATIC_DRAW 表示：数据基本不变、绘制频繁（驱动可据此优化）。
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // 7.6 实际绘制函数（首次执行 + resize 后重绘）
    function render() {
      // 先同步尺寸和视口，保证像素映射正确。
      resize();

      // 清屏：避免上一帧残留图像干扰当前结果。
      gl.clearColor(0.03, 0.07, 0.12, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // 选择当前 program，后续 attribute/buffer/draw 都基于它。
      gl.useProgram(program);

      // 绑定顶点缓冲，告诉 GPU attribute 数据从哪个缓冲读取。
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

      // 开启该 attribute 位置的数据读取功能。
      gl.enableVertexAttribArray(positionLocation);

      // 指定 attribute 的读取规则：
      // - 每个顶点读 2 个 float（x,y）
      // - 不做归一化
      // - 紧密排列（stride=0）
      // - 从偏移 0 开始读取
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      // 发起绘制命令：
      // TRIANGLES + 从第0个顶点开始 + 共3个顶点 = 一个三角形
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // 窗口变化时重绘，保证画面始终正确填充。
    window.addEventListener("resize", render);
    render();

    updateStatus("状态：渲染成功，已绘制三角形");
    updateTip("已跑通 Day2 最小管线：compile -> link -> buffer -> drawArrays");
    console.log("[Day2] Triangle rendered successfully.");
  } catch (error) {
    // 统一错误处理：把错误展示给页面并输出控制台日志，便于排查。
    const message = error instanceof Error ? error.message : String(error);
    updateStatus("状态：渲染失败，请查看控制台日志", true);
    if (DEBUG_SHADER_ERROR.enabled) {
      updateTip("提示：这是故意报错模式。请在控制台定位是哪一类 shader 编译失败。");
    } else {
      updateTip("提示：优先检查 shader 编译日志和 attribute 名称是否一致。");
    }
    console.error("[Day2] Initialization failed:", message);
  }
}

// 程序入口：执行 Day2 初始化逻辑。
initAndRender();
