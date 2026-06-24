const canvas = document.getElementById("glCanvas");
const statusText = document.getElementById("statusText");

if (!canvas) {
  throw new Error("未找到 #glCanvas 元素");
}

const gl = canvas.getContext("webgl");

if (!gl) {
  statusText.textContent = "状态：WebGL 上下文创建失败，请检查浏览器是否支持。";
  statusText.className = "err";
  throw new Error("当前环境不支持 WebGL");
}

statusText.textContent = "状态：WebGL 上下文创建成功";
statusText.className = "ok";

function resizeCanvasToDisplaySize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const displayWidth = Math.floor(canvas.clientWidth * dpr);
  const displayHeight = Math.floor(canvas.clientHeight * dpr);

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
}

function render() {
  resizeCanvasToDisplaySize();

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.08, 0.16, 0.28, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  console.log("[Day1] Canvas Size:", canvas.width, canvas.height);
}

window.addEventListener("resize", render);
render();
