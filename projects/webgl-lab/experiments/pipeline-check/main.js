import { createProgram } from "../../../../shared/gl-utils.js";

const vertexSource = `
attribute vec2 a_position;
attribute vec3 a_color;
varying mediump vec3 v_color;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_color = a_color;
}
`;

const fragmentSource = `
precision mediump float;
varying mediump vec3 v_color;
uniform float u_brightness;

void main() {
  gl_FragColor = vec4(v_color * u_brightness, 1.0);
}
`;

const canvas = document.getElementById("canvas");
const status = document.getElementById("status");
const brightness = document.getElementById("brightness");
const brightnessValue = document.getElementById("brightness-value");
const gl = canvas.getContext("webgl");

if (!gl) {
  status.textContent = "Could not create a WebGL context.";
  brightness.disabled = true;
} else {
  try {
    start(gl);
  } catch (error) {
    status.textContent = "WebGL setup failed. See the console for details.";
    brightness.disabled = true;
    console.error(error);
  }
}

function start(gl) {
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0.06, 0.10, 0.16, 1);

  const program = createProgram(gl, vertexSource, fragmentSource);
  const positionLocation = gl.getAttribLocation(program, "a_position");
  const colorLocation = gl.getAttribLocation(program, "a_color");
  const brightnessLocation = gl.getUniformLocation(program, "u_brightness");
  if (positionLocation < 0 || colorLocation < 0 || brightnessLocation === null) {
    throw new Error("Could not find the triangle's shader inputs.");
  }

  // Each vertex stores [x, y, r, g, b] in a single buffer.
  const vertices = new Float32Array([
     0.0,  0.68, 1.0, 0.0, 0.0,
    -0.7, -0.55, 0.0, 1.0, 0.0,
     0.7, -0.55, 0.0, 0.0, 1.0
  ]);
  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new Error("Could not create the vertex buffer.");
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const bytesPerFloat = vertices.BYTES_PER_ELEMENT;
  const stride = 5 * bytesPerFloat;
  gl.useProgram(program);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(colorLocation);
  gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, stride, 2 * bytesPerFloat);

  function render() {
    const level = brightness.valueAsNumber;
    brightnessValue.value = level.toFixed(1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(brightnessLocation, level);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  brightness.addEventListener("input", render);
  render();
  status.textContent = "Move Brightness to change the triangle's color without moving its vertices.";
}
