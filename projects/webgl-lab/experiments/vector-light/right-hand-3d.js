import { createProgram, createBufferWithData } from "../../../../shared/gl-utils.js";

const vertexSource = `
attribute vec3 a_position;
attribute vec3 a_normal;
uniform mat3 u_basis;
uniform mat3 u_view;
uniform vec3 u_center;
uniform vec3 u_scale;
uniform vec2 u_zoom;
varying mediump vec3 v_normal;
void main() {
  vec3 point = u_view * (u_basis * (a_position * u_scale) + u_center);
  v_normal = u_basis * (a_normal / u_scale);
  gl_Position = vec4(point.xy * u_zoom, -point.z * 0.22, 1.0);
}
`;

const fragmentSource = `
precision mediump float;
uniform vec3 u_color;
varying mediump vec3 v_normal;
void main() {
  vec3 n = normalize(v_normal);
  float key = max(dot(n, normalize(vec3(0.25, 0.8, 0.85))), 0.0);
  float fill = max(dot(n, normalize(vec3(-0.5, -0.15, -0.7))), 0.0);
  gl_FragColor = vec4(u_color * (0.54 + 0.36 * key + 0.18 * fill), 1.0);
}
`;

const byId = (id) => document.getElementById(id);
const canvas = byId("hand");
const order = byId("order");
const curl = byId("curl");
const play = byId("play");
const status = byId("status");
const axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const skin = [0.97, 0.68, 0.49];
const accent = [0.45, 0.87, 1];

const add = (a, b) => a.map((v, i) => v + b[i]);
const scale = (a, factor) => a.map((v) => v * factor);
const cross = ([a, b, c], [x, y, z]) => [b * z - c * y, c * x - a * z, a * y - b * x];
const unit = (v) => scale(v, 1 / Math.hypot(...v));

function sphere() {
  const vertices = [];
  const point = (row, col) => {
    const phi = Math.PI * row / 12;
    const theta = 2 * Math.PI * col / 20;
    return [Math.cos(phi), Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta)];
  };
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 20; col++) {
      const [a, b, c, d] = [point(row, col), point(row + 1, col),
        point(row + 1, col + 1), point(row, col + 1)];
      for (const p of [a, b, c, a, c, d]) vertices.push(...p, ...p);
    }
  }
  return vertices;
}

function arrowhead() {
  const vertices = [];
  for (let i = 0; i < 20; i++) {
    const a = i * Math.PI / 10;
    const b = a + Math.PI / 10;
    const p = [0, Math.cos(a), Math.sin(a)];
    const q = [0, Math.cos(b), Math.sin(b)];
    const normal = unit(cross(add(q, scale(p, -1)), add([1, 0, 0], scale(p, -1))));
    for (const v of [p, q, [1, 0, 0]]) vertices.push(...v, ...normal);
    for (const v of [q, p, [0, 0, 0]]) vertices.push(...v, -1, 0, 0);
  }
  return vertices;
}

function start(gl) {
  const program = createProgram(gl, vertexSource, fragmentSource);
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.075, 0.132, 0.18, 1);

  const ball = sphere();
  const tip = arrowhead();
  createBufferWithData(gl, new Float32Array([...ball, ...tip]));
  const position = gl.getAttribLocation(program, "a_position");
  const normal = gl.getAttribLocation(program, "a_normal");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(normal);
  gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 24, 12);

  const location = Object.fromEntries(
    ["basis", "view", "center", "scale", "zoom", "color"].map((name) =>
      [name, gl.getUniformLocation(program, `u_${name}`)])
  );
  const ballCount = ball.length / 6;
  const tipCount = tip.length / 6;

  function mesh(center, basis, dimensions, color, pointed = false) {
    gl.uniform3fv(location.center, center);
    gl.uniformMatrix3fv(location.basis, false, basis.flat());
    gl.uniform3fv(location.scale, dimensions);
    gl.uniform3fv(location.color, color);
    gl.drawArrays(gl.TRIANGLES, pointed ? ballCount : 0, pointed ? tipCount : ballCount);
  }

  function directionBasis(forward) {
    const reference = Math.abs(forward[2]) > 0.9 ? axes[1] : axes[2];
    const side = unit(cross(reference, forward));
    return [forward, side, cross(forward, side)];
  }

  function arrow(origin, direction, length, color) {
    const basis = directionBasis(direction);
    const shaft = length - 0.24;
    mesh(add(origin, scale(direction, shaft / 2)), basis, [shaft / 2, 0.038, 0.038], color);
    mesh(add(origin, scale(direction, shaft - 0.035)), basis, [0.275, 0.12, 0.12], color, true);
  }

  let yaw = 0.64;
  let pitch = 0.30;
  let phase = 0;
  let previous;
  let running = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  let frameId = 0;
  let drag;

  function drawHand(amount, swapped) {
    // Rotating 180 degrees about the XY diagonal swaps the two in-plane axes
    // and reverses Z without mirroring a right hand into a left hand.
    const orient = swapped ? ([x, y, z]) => [y, x, -z] : (v) => v;
    const handMesh = (center, basis, dimensions, color = skin) =>
      mesh(orient(center), basis.map(orient), dimensions, color);

    handMesh([-0.92, -0.025, 0], axes, [0.41, 0.17, 0.28], [0.30, 0.45, 0.54]);
    handMesh([-0.40, 0, 0], axes, [0.64, 0.19, 0.50]);
    handMesh([-0.13, 0.055, 0.32], axes, [0.35, 0.15, 0.24]);

    const fingers = [
      [0.35, 0.94, 0.105],
      [0.12, 1.06, 0.115],
      [-0.12, 0.99, 0.108],
      [-0.35, 0.78, 0.090]
    ];
    for (const [z, length, width] of fingers) {
      let joint = [0.08, 0, z];
      let bend = 0;
      for (const [share, angle, taper] of [[0.42, 0.20, 1], [0.33, 0.78, 0.88], [0.25, 0.78, 0.74]]) {
        bend += angle * amount;
        const forward = [Math.cos(bend), Math.sin(bend), 0];
        const segment = length * share;
        const radius = width * taper;
        const middle = add(joint, scale(forward, segment / 2));
        handMesh(middle, directionBasis(forward), [segment / 2 + radius * 0.75, radius, radius]);
        joint = add(joint, scale(forward, segment));
      }
    }

    handMesh([-0.21, 0.06, 0.56], directionBasis(unit([0.34, 0, 1])), [0.30, 0.15, 0.15]);
    handMesh([-0.13, 0.06, 0.94], directionBasis(axes[2]), [0.28, 0.119, 0.119], [1, 0.77, 0.58]);
    arrow(orient([-0.13, 0.06, 1.24]), orient(axes[2]), 0.76, accent);
  }

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const [s, c] = [Math.sin(yaw), Math.cos(yaw)];
    const [sp, cp] = [Math.sin(pitch), Math.cos(pitch)];
    gl.uniformMatrix3fv(location.view, false, [c, -s * sp, s * cp, 0, cp, sp, -s, -c * sp, c * cp]);
    const aspect = width / height;
    gl.uniform2f(location.zoom, 0.64 / Math.max(aspect, 1), 0.64 * Math.min(aspect, 1));

    const swapped = order.value === "acb";
    const green = [0.38, 0.90, 0.65];
    const amber = [1, 0.76, 0.42];
    const origin = [0.78, -1.16, -0.53];
    arrow(origin, axes[0], 0.78, swapped ? amber : green);
    arrow(origin, axes[1], 0.78, swapped ? green : amber);
    drawHand(curl.valueAsNumber / 100, swapped);
  }

  function schedule() {
    if (!frameId) frameId = requestAnimationFrame(tick);
  }

  function tick(time) {
    frameId = 0;
    if (running) {
      phase = (phase + (previous === undefined ? 0 : Math.min(time - previous, 60))) % 3600;
      previous = time;
      const progress = Math.min(1, Math.max(0, (phase - 450) / 1350));
      curl.value = String(Math.round(100 * progress ** 2 * (3 - 2 * progress)));
    }
    draw();
    if (running) schedule();
  }

  function setRunning(value) {
    running = value;
    previous = undefined;
    play.textContent = running ? "Pause" : "Play";
    schedule();
  }

  function updateOrder() {
    const swapped = order.value === "acb";
    byId("first-label").textContent = swapped ? "First: AC (+Y)" : "First: AB (+X)";
    byId("second-label").textContent = swapped ? "Second: AB (+X)" : "Second: AC (+Y)";
    byId("result-label").textContent = swapped ? "Thumb: -Z" : "Thumb: +Z";
    schedule();
  }

  order.addEventListener("change", updateOrder);
  play.addEventListener("click", () => {
    if (!running) phase = 0;
    setRunning(!running);
  });
  curl.addEventListener("input", () => setRunning(false));
  byId("oblique").addEventListener("click", () => { yaw = 0.86; pitch = 0.37; schedule(); });
  byId("front").addEventListener("click", () => { yaw = 0; pitch = 0; schedule(); });
  canvas.addEventListener("pointerdown", (event) => {
    if (drag || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (drag?.id !== event.pointerId) return;
    yaw -= (event.clientX - drag.x) * 0.012;
    pitch = Math.max(-1.4, Math.min(1.4, pitch + (event.clientY - drag.y) * 0.012));
    drag.x = event.clientX;
    drag.y = event.clientY;
    schedule();
  });
  canvas.addEventListener("lostpointercapture", () => { drag = undefined; });
  new ResizeObserver(schedule).observe(canvas);
  byId("controls").disabled = false;
  status.textContent = "Drag the model to orbit. Use Finger curl to pause at any pose.";
  setRunning(running);
}

try {
  const gl = canvas.getContext("webgl");
  if (!gl) throw new Error("Could not create a WebGL context.");
  start(gl);
} catch (error) {
  status.textContent = error.message;
  console.error(error);
}
