import { createProgram, createBufferWithData } from "../../../../shared/gl-utils.js";

const vertexSource = `
attribute vec3 a_position;
attribute vec3 a_color;
uniform mat4 u_model;
uniform mat4 u_view;
uniform vec2 u_zoom;
varying mediump vec3 v_color;
void main() {
  vec4 p = u_view * u_model * vec4(a_position, 1.0);
  // The camera is on the +Z side of view space; nearer points need smaller depth.
  gl_Position = vec4(p.xy * u_zoom, -p.z * 0.24, p.w);
  v_color = a_color;
}
`;

const fragmentSource = `
precision mediump float;
varying mediump vec3 v_color;
void main() {
  gl_FragColor = vec4(v_color, 1.0);
}
`;

const byId = (id) => document.getElementById(id);
const canvas = byId("scene");
const distance = byId("distance");
const angle = byId("angle");
const stretch = byId("stretch");
const axis = byId("axis");

const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const translateX = (x) => [...identity.slice(0, 12), x, 0, 0, 1];
const scaleX = (x) => [x, ...identity.slice(1)];

function rotation(axisName, radians) {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  if (axisName === "X") return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
  if (axisName === "Y") return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
  return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

// Column-major storage: (row, column) is stored at column * 4 + row.
function multiply(a, b) {
  const result = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4; k++) result[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
    }
  }
  return result;
}

function cubeVertices() {
  const h = 0.26;
  const corners = [[-h,-h,-h], [h,-h,-h], [h,h,-h], [-h,h,-h],
    [-h,-h,h], [h,-h,h], [h,h,h], [-h,h,h]];
  const faces = [
    [[4,5,6,7], [0.95,0.66,0.33]], [[1,0,3,2], [0.47,0.31,0.59]],
    [[5,1,2,6], [0.29,0.70,0.75]], [[0,4,7,3], [0.25,0.48,0.57]],
    [[7,6,2,3], [0.76,0.80,0.43]], [[0,1,5,4], [0.73,0.40,0.27]]
  ];
  return faces.flatMap(([[a,b,c,d], color]) =>
    [a,b,c,a,c,d].flatMap((i) => [...corners[i], ...color])
  );
}

function gridVertices() {
  const vertices = [];
  const grid = [0.18, 0.27, 0.30];
  const line = (a, b, color) => vertices.push(...a, ...color, ...b, ...color);
  for (let i = -4; i <= 4; i++) {
    if (i === 0) continue;
    const n = i / 2;
    line([n, -2, 0], [n, 2, 0], grid);
    line([-2, n, 0], [2, n, 0], grid);
  }
  line([0, 0, 0], [2, 0, 0], [0.97, 0.50, 0.44]);
  line([0, 0, 0], [0, 2, 0], [0.51, 0.85, 0.65]);
  line([0, 0, 0], [0, 0, 1.4], [0.50, 0.72, 1]);
  return vertices;
}

function formatCenter(model) {
  // Applying the model to (0, 0, 0, 1) picks out its last column.
  const coords = Array.from(model.slice(12, 15), (v) =>
    (Math.abs(v) < 0.005 ? 0 : v).toFixed(2)
  );
  return `(${coords.join(", ")})`;
}

function start(gl) {
  const program = createProgram(gl, vertexSource, fragmentSource);
  const cube = cubeVertices();
  const grid = gridVertices();
  createBufferWithData(gl, new Float32Array([...cube, ...grid]));
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  for (const [name, offset] of [["position", 0], ["color", 12]]) {
    const location = gl.getAttribLocation(program, `a_${name}`);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 24, offset);
  }
  const modelLocation = gl.getUniformLocation(program, "u_model");
  const viewLocation = gl.getUniformLocation(program, "u_view");
  const zoomLocation = gl.getUniformLocation(program, "u_zoom");
  const view = multiply(rotation("X", -0.38), rotation("Y", -0.48));
  gl.uniformMatrix4fv(viewLocation, false, view);
  const cubeCount = cube.length / 6;

  function render() {
    const T = translateX(distance.valueAsNumber);
    const R = rotation(axis.value, angle.valueAsNumber * Math.PI / 180);
    const S = scaleX(stretch.valueAsNumber);
    const trs = multiply(multiply(T, R), S);
    const rts = multiply(multiply(R, T), S);
    byId("trs").value = formatCenter(trs);
    byId("rts").value = formatCenter(rts);
    byId("distance-value").value = distance.valueAsNumber.toFixed(1);
    byId("angle-value").value = `${angle.value}${String.fromCharCode(176)}`;
    byId("stretch-value").value = stretch.valueAsNumber.toFixed(1);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const panelWidth = Math.max(1, Math.floor(canvas.clientWidth * dpr / 2));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    const divider = Math.min(2, panelWidth - 1);
    if (canvas.width !== panelWidth * 2 || canvas.height !== height) {
      canvas.width = panelWidth * 2;
      canvas.height = height;
    }
    gl.clearColor(0.27, 0.36, 0.38, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);
    [trs, rts].forEach((model, i) => {
      const width = panelWidth - divider;
      const x = i === 0 ? 0 : panelWidth + divider;
      const aspect = width / height;
      gl.viewport(x, 0, width, height);
      gl.scissor(x, 0, width, height);
      gl.clearColor(0.071, 0.119, 0.14, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform2f(zoomLocation, 0.43 / Math.max(aspect, 1), 0.43 * Math.min(aspect, 1));
      gl.uniformMatrix4fv(modelLocation, false, identity);
      gl.drawArrays(gl.LINES, cubeCount, grid.length / 6);
      gl.uniformMatrix4fv(modelLocation, false, model);
      gl.drawArrays(gl.TRIANGLES, 0, cubeCount);
    });
    gl.disable(gl.SCISSOR_TEST);
  }

  for (const input of [distance, angle, stretch]) input.addEventListener("input", render);
  axis.addEventListener("change", render);
  new ResizeObserver(render).observe(canvas);
  render();
  byId("controls").disabled = false;
  byId("status").textContent = "Identical geometry and camera; only the matrix order differs.";
}

try {
  const gl = canvas.getContext("webgl");
  if (!gl) throw new Error("Could not create a WebGL context.");
  start(gl);
} catch (error) {
  byId("status").textContent = error.message;
  console.error(error);
}
