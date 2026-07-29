import { createProgram, createBufferWithData, resizeCanvasToDisplay } from "../../shared/gl-utils.js";

const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");
if (!gl) {
  throw new Error("WebGL 不支持");
}

// -------------------------------------------------
// 着色器代码：演示 GLSL 的数据类型
// -------------------------------------------------
const vsSource = `
  attribute vec2 a_position;
  attribute vec2 a_uv;
  varying vec2 v_uv;

  // mat4：把二维旋转放进四维矩阵（z、w 恒为 0、1）
  uniform mat4 u_transform;

  void main() {
    gl_Position = u_transform * vec4(a_position, 0.0, 1.0);
    v_uv = a_uv;
  }
`;

const fsSource = `
  precision mediump float;
  precision mediump int;

  varying vec2 v_uv;
  uniform sampler2D u_texture;
  uniform int u_mode;

  void main() {
    // sampler2D：从纹理中采样颜色
    vec4 tex = texture2D(u_texture, v_uv);
    vec3 c = tex.rgb;

    if (u_mode == 1) {
      // vec2：用纹理坐标的 xy 填充 rg 通道
      gl_FragColor = vec4(v_uv, 0.0, 1.0);

    } else if (u_mode == 2) {
      // mat2：旋转 uv 后再采样
      vec2 centered = v_uv * 2.0 - 1.0;
      float angle = radians(30.0);
      float cs = cos(angle);
      float sn = sin(angle);
      mat2 rot = mat2(vec2(cs, sn), vec2(-sn, cs));
      vec2 uv2 = rot * centered * 0.5 + 0.5;
      gl_FragColor = texture2D(u_texture, uv2);

    } else if (u_mode == 3) {
      // vec3/vec4 的 swizzle：重新排列颜色通道
      gl_FragColor = tex.bgra;

    } else if (u_mode == 4) {
      // sampler2D：直接显示纹理原色
      gl_FragColor = tex;

    } else if (u_mode == 5) {
      // mat3：颜色矩阵，把 RG 通道互换
      mat3 m = mat3(
        vec3(0.0, 1.0, 0.0), // 第 1 列：新 R 取 G
        vec3(1.0, 0.0, 0.0), // 第 2 列：新 G 取 R
        vec3(0.0, 0.0, 1.0)  // 第 3 列：新 B 取 B
      );
      vec3 swapped = m * c;
      gl_FragColor = vec4(swapped, 1.0);

    } else if (u_mode == 6) {
      // swizzle：用 r 通道填充 rgb，保留 alpha
      gl_FragColor = tex.rrra;

    } else {
      gl_FragColor = tex;
    }
  }
`;

const program = createProgram(gl, vsSource, fsSource);

// 获取 attribute / uniform 位置
const aPositionLoc = gl.getAttribLocation(program, "a_position");
const aUvLoc = gl.getAttribLocation(program, "a_uv");
const uTransformLoc = gl.getUniformLocation(program, "u_transform");
const uTextureLoc = gl.getUniformLocation(program, "u_texture");
const uModeLoc = gl.getUniformLocation(program, "u_mode");

// -------------------------------------------------
// 顶点数据：一个位于中央的小方块 [x, y, u, v]
// -------------------------------------------------
const vertices = new Float32Array([
  -0.6, -0.6, 0.0, 0.0,
   0.6, -0.6, 1.0, 0.0,
  -0.6,  0.6, 0.0, 1.0,
   0.6,  0.6, 1.0, 1.0,
]);
createBufferWithData(gl, vertices, gl.STATIC_DRAW);

const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
gl.enableVertexAttribArray(aPositionLoc);
gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, stride, 0);
gl.enableVertexAttribArray(aUvLoc);
gl.vertexAttribPointer(aUvLoc, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

// -------------------------------------------------
// 创建一张 2x2 的彩色纹理，演示 sampler2D
// -------------------------------------------------
function createCheckerTexture() {
  const data = new Uint8Array([
    255, 0,   0,   255,  // 左上：红
    0,   255, 0,   255,  // 右上：绿
    0,   0,   255, 255,  // 左下：蓝
    255, 255, 0,   255,  // 右下：黄
  ]);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return texture;
}

createCheckerTexture();
gl.useProgram(program);
gl.uniform1i(uTextureLoc, 0); // 使用纹理单元 0

// -------------------------------------------------
// mat4 列主序旋转矩阵（绕 Z 轴）
// -------------------------------------------------
function mat4RotateZ(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  // 列主序：4 列依次排列
  return new Float32Array([
    c,  s, 0, 0,
    -s, c, 0, 0,
    0,  0, 1, 0,
    0,  0, 0, 1,
  ]);
}

// -------------------------------------------------
// 模式说明
// -------------------------------------------------
const modes = {
  1: {
    name: "1 · vec2 分量访问",
    code: "gl_FragColor = vec4(v_uv, 0.0, 1.0);",
    desc: "用 vec2 的 xy 分量填充颜色的 rg 通道，b = 0。",
  },
  2: {
    name: "2 · mat2 矩阵旋转",
    code: "mat2 rot = mat2(vec2(cs, sn), vec2(-sn, cs));\nvec2 uv2 = rot * (v_uv * 2.0 - 1.0) * 0.5 + 0.5;\ngl_FragColor = texture2D(u_texture, uv2);",
    desc: "mat2 旋转 uv 坐标，再采样纹理。",
  },
  3: {
    name: "3 · vec3/vec4 swizzle",
    code: "gl_FragColor = tex.bgra;",
    desc: "swizzle 可以重新排列 rgba / xyzw 分量。.bgra 把红蓝通道互换。",
  },
  4: {
    name: "4 · sampler2D 纹理采样",
    code: "gl_FragColor = texture2D(u_texture, v_uv);",
    desc: "sampler2D 是 GLSL 的纹理采样器类型，用 texture2D() 读取颜色。",
  },
  5: {
    name: "5 · mat3 颜色矩阵",
    code: "mat3 m = mat3(vec3(0,1,0), vec3(1,0,0), vec3(0,0,1));\nvec3 swapped = m * tex.rgb;\ngl_FragColor = vec4(swapped, 1.0);",
    desc: "mat3 乘 vec3，实现颜色通道的线性变换（这里是 RG 互换）。",
  },
  6: {
    name: "6 · .rrra 分量重组",
    code: "gl_FragColor = tex.rrra;",
    desc: "把 1 个分量重复 3 次，再加原 alpha：vec4(r, r, r, a)。",
  },
};

let mode = 1;
let angle = 0;
let paused = false;
let lastTime = performance.now();

const $modeName = document.getElementById("modeName");
const $modeCode = document.getElementById("modeCode");
const $modeDesc = document.getElementById("modeDesc");

function updatePanel() {
  const info = modes[mode];
  $modeName.textContent = info.name;
  $modeCode.textContent = info.code;
  $modeDesc.textContent = info.desc;
}

// -------------------------------------------------
// 渲染循环
// -------------------------------------------------
function render(now) {
  resizeCanvasToDisplay(gl, canvas);
  gl.clearColor(0.02, 0.03, 0.06, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // 更新时间，计算旋转矩阵
  if (!paused) {
    const dt = (now - lastTime) * 0.001;
    angle += dt * 0.8;
  }
  lastTime = now;

  gl.useProgram(program);
  gl.activeTexture(gl.TEXTURE0);
  gl.uniformMatrix4fv(uTransformLoc, false, mat4RotateZ(angle));
  gl.uniform1i(uModeLoc, mode);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(render);
}

// -------------------------------------------------
// 键盘交互
// -------------------------------------------------
window.addEventListener("keydown", (e) => {
  if (e.key >= "1" && e.key <= "6") {
    mode = parseInt(e.key, 10);
    updatePanel();
  } else if (e.code === "Space") {
    e.preventDefault();
    angle = 0;
  } else if (e.key === "p" || e.key === "P") {
    paused = !paused;
  }
});

window.addEventListener("resize", () => resizeCanvasToDisplay(gl, canvas));

updatePanel();
requestAnimationFrame(render);
