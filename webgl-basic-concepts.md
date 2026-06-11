# WebGL 基础概念详解

> **用途**：系统理解 WebGL 的几个核心基础概念——渲染管线、坐标系、图形绘制、纹理、着色器。
> 每个概念都标注了与本仓库 `Day1`~`Day4` 学习内容的对应关系，方便边学边查。

---

## 目录

1. [渲染管线（Rendering Pipeline）](#1-渲染管线rendering-pipeline)
2. [坐标系（Coordinate Systems）](#2-坐标系coordinate-systems)
3. [图形绘制（Drawing）](#3-图形绘制drawing)
4. [着色器（Shaders）](#4-着色器shaders)
5. [纹理（Texture）](#5-纹理texture)
6. [一句话串联](#6-一句话把它们串起来)
7. [概念 ↔ Day1~Day4 对照表](#7-概念--day1day4-对照表)

---

## 1. 渲染管线（Rendering Pipeline）

渲染管线 = GPU 把「一堆顶点数据」变成「屏幕上一块块彩色像素」的流水线。

核心阶段（WebGL 里你能直接编程控制的用 ★ 标出）：

```
顶点数据 (VBO)
   ↓
★ 顶点着色器 (Vertex Shader)   —— 对每个顶点跑一次，决定它最终的位置 gl_Position
   ↓
图元装配 (Primitive Assembly)  —— 把顶点按 3 个一组拼成三角形（或点 / 线）
   ↓
光栅化 (Rasterization)         —— 把图元覆盖的区域拆成一个个「片元 / 像素候选」
   ↓
★ 片元着色器 (Fragment Shader) —— 对每个片元跑一次，决定这个像素的颜色 gl_FragColor
   ↓
逐片元测试 (深度测试 / 混合等)  —— 决定到底写不写、怎么写进画布
   ↓
帧缓冲 (Framebuffer) / 屏幕
```

**关键点：**

- 你写代码主要就是在写 ★ 这两个着色器，外加准备数据喂给 GPU。
- GPU 高度并行：成千上万个顶点 / 像素同时计算。
- 中间的「图元装配」「光栅化」「逐片元测试」是固定管线，你只能配置参数（比如开关深度测试），不能写代码改流程。

> **对应仓库内容**：`Day1/pipeline.html`、`Day1/flowchart.html`（管线示意图），以及 `Day2` 把整条管线完整走一遍画出第一个三角形。

---

## 2. 坐标系（Coordinate Systems）

图形从「模型自己的局部空间」一路变换到「屏幕像素」，是一条**变换链**：

```
局部 / 模型空间
   --Model 矩阵-->   世界空间
   --View 矩阵-->    观察 (相机) 空间
   --Projection 矩阵--> 裁剪空间
   --透视除法-->     NDC (标准化设备坐标)
   --视口变换-->     屏幕像素
```

### 关键概念

- **NDC（Normalized Device Coordinates，标准化设备坐标）**
  x / y / z 都在 **-1.0 ~ 1.0** 范围内。这是顶点着色器输出 `gl_Position` 之后 GPU 真正认的坐标系。
  屏幕中心是 `(0, 0)`，左下角 `(-1, -1)`，右上角 `(1, 1)`。

- **Model / View / Projection（合称 MVP）**
  分别回答三个问题：「物体摆在世界的哪里」「相机站在哪、朝哪看」「怎么把 3D 投影成 2D」。
  在顶点着色器里就是经典的那一行：

  ```glsl
  gl_Position = projection * view * model * vec4(pos, 1.0);
  ```

- **视口变换（viewport）**
  把 -1~1 的 NDC 映射到 canvas 的实际像素尺寸，由 `gl.viewport(x, y, width, height)` 控制。

### 投影方式

- **正交投影 (ortho)**：没有近大远小，常用于 2D / UI / 工程图。
- **透视投影 (perspective)**：有近大远小，符合人眼，常用于 3D 场景（参数有 FOV 视野角、宽高比、近 / 远裁剪面）。

> **对应仓库内容**：`Day1` 的 `viewport`；`Day2` 的「NDC 坐标与裁剪 / 屏幕坐标→NDC 转换」。
> **注意**：入门阶段（Day1~Day4）直接给 -1~1 的 NDC 坐标，**还用不到 MVP 矩阵**；完整的坐标系变换链属于后续「3D 数学与变换」阶段。

---

## 3. 图形绘制（Drawing）

GPU 不会直接画「圆 / 方块」，它只画 3 种**基本图元**：**点、线、三角形**。所有复杂模型都是用三角形拼出来的。

### 基本流程

1. **准备顶点数据** → 放进 **VBO（Vertex Buffer Object，顶点缓冲对象）**
   `gl.createBuffer()` / `gl.bufferData()`，把数据从 CPU 上传到 GPU 显存。

2. **告诉 GPU 怎么解读这块数据** → `gl.vertexAttribPointer(...)`
   用 **stride（步长）/ offset（偏移）** 把一块缓冲里交错存放的位置、颜色、UV 等区分开。

3. **发起绘制**
   - `gl.drawArrays(mode, first, count)` —— 按顺序逐个读取顶点。
   - `gl.drawElements(mode, count, type, offset)` —— 配合 **EBO（Element Buffer Object，索引缓冲）**，让顶点能复用。
     例如画一个矩形只需 4 个顶点 + 索引，而不是 6 个重复顶点。

### 图元类型（drawArrays 的 mode）

| 类型 | 含义 |
|------|------|
| `POINTS` | 点 |
| `LINES` | 一段段独立线段 |
| `LINE_STRIP` | 首尾相连的折线 |
| `LINE_LOOP` | 闭合折线 |
| `TRIANGLES` | 一个个独立三角形 |
| `TRIANGLE_STRIP` | 共享边的三角形带 |
| `TRIANGLE_FAN` | 共享一个中心点的扇形三角形 |

> **对应仓库内容**：`Day2`「Shader + Buffer + Draw 画第一个三角形」；`Day3`「Buffer 与 Attribute 深入（位置 + 颜色，交错缓冲 stride / offset）」。
> EBO 索引缓冲与 7 种图元的完整演示属于后续阶段。

---

## 4. 着色器（Shaders）

着色器是**跑在 GPU 上的小程序**，用 **GLSL（OpenGL Shading Language）** 语言编写。每次绘制至少需要两个：

- **顶点着色器（Vertex Shader, VS）**
  对每个顶点跑一次。核心任务是输出 `gl_Position`（顶点的最终位置），也可以把数据传给片元着色器。

- **片元着色器（Fragment Shader, FS）**
  对每个像素（片元）跑一次。核心任务是输出颜色 `gl_FragColor`。

### 着色器之间的三种数据传递

| 关键字 | 含义 | 谁能用 |
|--------|------|--------|
| **attribute** | 每个顶点各不相同的输入（位置、颜色、UV） | 只进 VS |
| **uniform** | 一次绘制中所有顶点 / 像素**共享**的全局常量（时间、变换矩阵、颜色等） | VS 和 FS 都能用 |
| **varying** | VS 输出 → 光栅化时**自动插值** → FS 接收 | VS 写、FS 读 |

> **插值是重点**：如果三角形三个顶点分别给红、绿、蓝，经过 varying 插值后，三角形内部会得到**平滑渐变色**。

### GLSL 常用类型与特性

- 向量：`vec2` / `vec3` / `vec4`
- 矩阵：`mat2` / `mat3` / `mat4`
- 纹理采样器：`sampler2D`
- swizzle（分量访问）：`color.rgb`、`pos.xy`、`v.xxyy` 等灵活组合。

### 最小示例

顶点着色器（VS）：

```glsl
attribute vec2 a_position;   // 每个顶点的位置（来自 VBO）
attribute vec3 a_color;      // 每个顶点的颜色
varying vec3 v_color;        // 传给片元着色器，会被插值

void main() {
  v_color = a_color;
  gl_Position = vec4(a_position, 0.0, 1.0);  // 直接给 NDC 坐标
}
```

片元着色器（FS）：

```glsl
precision mediump float;
varying vec3 v_color;        // 收到的是插值后的颜色

void main() {
  gl_FragColor = vec4(v_color, 1.0);
}
```

> **对应仓库内容**：`Day2`（VS / FS 基础 + 画三角形）；`Day4`「Uniform + requestAnimationFrame」用 uniform 传时间做动画。
> varying 插值的渐变 / 棋盘格案例属于紧接其后的内容（计划中的 Day5）。

---

## 5. 纹理（Texture）

纹理 = 贴在几何体表面的图片（位图数据）。

### 基本流程

1. **加载图片并上传到 GPU**
   `gl.createTexture()` / `gl.texImage2D(...)`。

2. **给每个顶点一个 UV 坐标（纹理坐标）**
   范围 0~1，左下角 `(0, 0)`，右上角 `(1, 1)`，作为一个 attribute 传入。

3. **采样**
   UV 经 varying 插值后传到片元着色器，用 `texture2D(sampler, uv)` 采样出该像素对应的颜色。

   ```glsl
   uniform sampler2D u_texture;
   varying vec2 v_uv;
   void main() {
     gl_FragColor = texture2D(u_texture, v_uv);
   }
   ```

4. **设置采样参数**
   - **过滤方式**：`NEAREST`（像素风、硬边）/ `LINEAR`（平滑）。
   - **环绕方式**：`REPEAT`（平铺重复）/ `CLAMP_TO_EDGE`（拉伸边缘）。

### 进阶：FBO

**FBO（Framebuffer Object，帧缓冲对象）** 可以把渲染结果先画到一张纹理上，而不是直接画到屏幕。
这是**阴影、后处理、ping-pong 模糊**等高级效果的基础。

> **对应仓库内容**：`Day2` 提到的 UV 概念是入口。纹理映射、FBO、后处理的完整内容属于后续「纹理与高级渲染」阶段，Day1~Day4 目录中尚未涉及。

---

## 6. 一句话把它们串起来

> 你给 GPU 一堆**顶点（图形绘制）**，**顶点着色器**把它们摆到 **NDC 坐标系**里，**光栅化**拆成像素，**片元着色器**给每个像素上色（颜色可以从**纹理**里采样），这整条流程就是**渲染管线**。

`Day1`~`Day4` 正好按这个顺序展开：搭环境清屏 → 画三角形 → 喂缓冲 / attribute 数据 → 加 uniform 做动画。

---

## 7. 概念 ↔ Day1~Day4 对照表

| 概念 | Day1~Day4 中覆盖的部分 | 仍属于后续阶段的部分 |
|------|------------------------|----------------------|
| **渲染管线** | Day1 清屏 + 管线示意图；Day2 完整走一遍 | —— |
| **坐标系** | Day1 viewport；用 -1~1 的 NDC 直接给坐标 | 完整 MVP 变换链、相机、透视 / 正交投影（3D 阶段） |
| **图形绘制** | Day2 三角形；Day3 VBO / attribute / stride / offset | EBO 索引缓冲、7 种图元、鼠标交互 |
| **着色器** | Day2 VS / FS 基础；Day4 uniform 动画 | varying 插值渐变 / 棋盘格（计划中的 Day5）、内置函数、特效 |
| **纹理** | Day2 提到 UV 概念 | 纹理上传 / 采样、FBO、后处理（纹理阶段） |

**结论**：`Day1`~`Day4` ≈ 「渲染管线 + 着色器基础 + 图形绘制（缓冲 / attribute）+ uniform 动画」。
其中**坐标系（MVP）** 和**纹理**这两块，当前目录里只触及了最浅的入口（viewport、UV 概念），完整内容在后续阶段。

---

> 想深入某一块（例如 MVP 矩阵推导、varying 插值的可运行最小 demo、第一张纹理的完整代码），可以继续按这份文档的章节逐个攻克。
