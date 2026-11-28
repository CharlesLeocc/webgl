import { createProgram, createBufferWithData } from "../../../../shared/gl-utils.js";

const vertexSource = `
attribute vec3 a_position;
void main() {
  gl_Position = vec4(a_position, 1.0);
}
`;

const fragmentSource = `
precision mediump float;
uniform vec3 u_normal;
uniform vec3 u_light;
void main() {
  float diffuse = max(dot(u_normal, u_light), 0.0);
  gl_FragColor = vec4(vec3(0.32, 0.78, 0.95) * diffuse, 1.0);
}
`;

const canvas = document.getElementById("canvas");
const controls = document.getElementById("controls");
const angle = document.getElementById("angle");
const flip = document.getElementById("flip");
const status = document.getElementById("status");
const degrees = document.getElementById("degrees");
const normalReadout = document.getElementById("normal");
const lightReadout = document.getElementById("light");
const dotReadout = document.getElementById("dot");
const diffuseReadout = document.getElementById("diffuse");

const A = [-0.6, -0.48, 0];
const B = [0.6, -0.48, 0];
const C = [0, 0.65, 0];

function subtract(a, b) {
  return a.map((component, i) => component - b[i]);
}

function cross([ax, ay, az], [bx, by, bz]) {
  return [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
}

function normalize(vector) {
  const length = Math.hypot(...vector);
  if (length === 0) throw new Error("A zero vector does not have a direction.");
  return vector.map((component) => component / length);
}

function format(value) {
  return (Math.abs(value) < 0.0005 ? 0 : value).toFixed(3);
}

function start(gl) {
  const program = createProgram(gl, vertexSource, fragmentSource);
  const position = gl.getAttribLocation(program, "a_position");
  const normalLocation = gl.getUniformLocation(program, "u_normal");
  const lightLocation = gl.getUniformLocation(program, "u_light");

  // Store both vertex orders once. Selecting either uses the same geometry.
  createBufferWithData(gl, new Float32Array([...A, ...B, ...C, ...A, ...C, ...B]));
  gl.useProgram(program);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0.10, 0.13, 0.17, 1);
  gl.disable(gl.CULL_FACE);

  function render() {
    const [second, third] = flip.checked ? [C, B] : [B, C];
    const normal = normalize(cross(subtract(second, A), subtract(third, A)));
    const radians = angle.valueAsNumber * Math.PI / 180;
    const light = normalize([Math.sin(radians), 0, Math.cos(radians)]);
    const dot = normal.reduce((sum, component, i) => sum + component * light[i], 0);

    degrees.value = angle.value;
    normalReadout.textContent = normal.map(format).join(", ");
    lightReadout.textContent = light.map(format).join(", ");
    dotReadout.textContent = format(dot);
    diffuseReadout.textContent = format(Math.max(dot, 0));

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform3fv(normalLocation, normal);
    gl.uniform3fv(lightLocation, light);
    gl.drawArrays(gl.TRIANGLES, flip.checked ? 3 : 0, 3);
  }

  angle.addEventListener("input", render);
  flip.addEventListener("change", render);
  render();
  controls.disabled = false;
  status.textContent = "Ready. Compare 0, 90, and 180 degrees, then swap B and C.";
}

try {
  const gl = canvas.getContext("webgl");
  if (!gl) throw new Error("Could not create a WebGL context.");
  start(gl);
} catch (error) {
  status.textContent = error.message;
  console.error(error);
}
