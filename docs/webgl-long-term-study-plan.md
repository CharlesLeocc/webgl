# WebGL 长期学习计划：从入门到精通复杂开发

> **目标**：系统掌握 WebGL 核心知识，具备独立处理复杂 3D 渲染、性能优化、特效开发的能力
>
> **总时长**：约 4-5 个月（每天 1-2 小时）
>
> **分为 6 个阶段**，每个阶段有明确的里程碑项目验证学习成果

---

## 学习路径总览

```
阶段1: 渲染管线基础（第1-3周）
  → 从零走通 WebGL 渲染管线，理解 GPU 工作原理
  
阶段2: 3D 数学与变换（第4-6周）
  → 掌握矩阵变换、相机系统、投影，进入真正的 3D 世界

阶段3: 光照与材质（第7-9周）
  → 实现工业级光照模型，理解 PBR 基础

阶段4: 纹理与高级渲染技术（第10-13周）
  → 纹理映射、帧缓冲(FBO)、阴影、后处理

阶段5: 性能优化与工程化（第14-16周）
  → 实例化渲染、批处理、WebGL2 特性、调试工具

阶段6: 综合实战项目（第17-20周）
  → 完成 2-3 个复杂项目，形成可展示的作品集
```

---

## 阶段 1：渲染管线基础（第 1-3 周）

> **目标**：彻底理解 WebGL 渲染管线的每个阶段，能独立编写任意 2D 图形

### 第 1 周：环境搭建与最小闭环

| 天 | 主题 | 核心内容 | 产出 |
|----|------|----------|------|
| 1 | WebGL 上下文与清屏 | canvas / getContext / viewport / clearColor / clear | 纯色背景页面 |
| 2 | Shader 与三角形 | GLSL 基础语法 / VS / FS / createShader / createProgram / drawArrays | 静态三角形 |
| 3 | VBO 与 attribute | createBuffer / bufferData / vertexAttribPointer / stride / offset | 交叉布局的彩色三角形 |
| 4 | Uniform 与动画 | uniform 变量 / requestAnimationFrame / 帧循环 | 颜色动画三角形 |
| 5 | Varying 与插值 | varying 插值原理 / 重心坐标 / UV 概念 | 渐变三角形 + 棋盘格图案 |
| 6-7 | 整合与盲写 | 模块化拆分 / 脱稿重写 / 薄弱点记录 | 盲写完成彩色动画三角形 |

### 第 2 周：图元、索引与交互

| 天 | 主题 | 核心内容 | 产出 |
|----|------|----------|------|
| 1 | NDC 坐标与裁剪 | 标准化设备坐标 / viewport 映射 / 裁剪行为 / scissor 测试 | 分屏渲染 Demo |
| 2 | 7 种图元模式 | POINTS / LINES / LINE_STRIP / LINE_LOOP / TRIANGLES / TRIANGLE_STRIP / TRIANGLE_FAN | 可切换图元展示 |
| 3 | 索引缓冲 EBO | ELEMENT_ARRAY_BUFFER / drawElements / 顶点复用 | EBO 绘制矩形和多边形 |
| 4 | 鼠标键盘交互 | 屏幕坐标→NDC 转换 / 事件驱动渲染 / 交互与渲染分离 | 鼠标跟随 + 键盘控制位置 |
| 5 | 2D 变换矩阵 | 手写平移/旋转/缩放矩阵 / 矩阵乘法 / 列主序 | 键盘控制平移旋转缩放 |
| 6-7 | 阶段整合 | 多图形 + 索引 + 交互 + 变换的综合 Demo | 整合项目 |

### 第 3 周：GLSL 着色器语言深入

| 天 | 主题 | 核心内容 | 产出 |
|----|------|----------|------|
| 1 | GLSL 数据类型 | vec2/3/4 / mat2/3/4 / sampler2D / 向量分量访问(swizzle) | 类型练习 Demo |
| 2 | GLSL 内置函数 | mix / clamp / smoothstep / step / mod / fract / length / dot / cross / normalize / reflect | 各函数的视觉化 Demo |
| 3 | 噪声与程序化纹理 | 伪随机 / 值噪声 / Perlin 噪声原理 / FBM（分形布朗运动） | 噪声纹理生成 |
| 4 | SDF（有符号距离场） | 圆/矩形/线段的 SDF / 布尔运算(并/交/差) / 平滑混合 | SDF 图形绘制 |
| 5 | 片元着色器特效 | 光晕(glow) / 径向模糊 / 色调映射 / 体素化效果 | 3 个以上 shader 特效 |
| 6-7 | Shadertoy 练习 | 在 shadertoy.com 上实现 2-3 个作品 / 分析优秀作品代码 | 可展示的 shader 作品 |

### 阶段 1 里程碑项目

**项目：2D 粒子系统**
- 1000+ 粒子实时渲染
- 粒子有位置、速度、颜色、生命周期
- 鼠标交互（点击发射、跟随吸引）
- 用 POINTS 图元 + gl_PointSize 绘制
- 验收：60fps 稳定运行，代码结构清晰

---

## 阶段 2：3D 数学与变换（第 4-6 周）

> **目标**：掌握 3D 渲染必需的数学基础，实现完整的 MVP 变换链和交互式相机

### 第 4 周：3D 数学基础

| 天 | 主题 | 核心内容 |
|----|------|----------|
| 1 | 向量运算 | 点积(dot) — 投影与角度 / 叉积(cross) — 法线与方向 / 归一化 |
| 2 | 矩阵运算 | 4x4 矩阵乘法 / 逆矩阵 / 转置矩阵 / 手写 mat4 库（不依赖 gl-matrix） |
| 3 | 模型变换 Model | 3D 平移 / 旋转（绕 X/Y/Z 轴）/ 缩放 / 组合变换 / 变换顺序 TRS |
| 4 | 视图变换 View | 相机概念 / lookAt 矩阵推导 / eye/center/up 参数 |
| 5 | 投影变换 Projection | 正交投影(ortho) / 透视投影(perspective) / 近远裁剪面 / FOV / 宽高比 |
| 6 | MVP 整合 | 手写完整 MVP 链 / 在 VS 中 `gl_Position = projection * view * model * vec4(pos, 1.0)` |
| 7 | 练习 | 旋转立方体（线框）/ 调整相机位置观察 |

**关键产出**：手写 `math.js` 库，包含：
```javascript
// 不使用第三方库，从零实现
mat4.identity()
mat4.translate(out, m, [tx, ty, tz])
mat4.rotateX/Y/Z(out, m, angle)
mat4.scale(out, m, [sx, sy, sz])
mat4.multiply(out, a, b)
mat4.lookAt(out, eye, center, up)
mat4.perspective(out, fov, aspect, near, far)
mat4.ortho(out, left, right, bottom, top, near, far)
mat4.invert(out, m)
```

### 第 5 周：3D 几何与相机系统

| 天 | 主题 | 核心内容 |
|----|------|----------|
| 1 | 3D 图形构建 | 手动构建立方体顶点（position + normal + uv）/ 面法线 vs 顶点法线 |
| 2 | 立方体渲染 | 实体立方体 + 每面不同颜色 / 深度测试 gl.enable(DEPTH_TEST) |
| 3 | 背面剔除 | gl.enable(CULL_FACE) / 正面顺序(CW/CCW) / 性能意义 |
| 4 | 球体生成 | 参数方程生成球体网格 / 经纬线划分 / 法线计算 |
| 5 | 轨道相机 | 鼠标拖拽旋转 / 滚轮缩放 / 右键平移 / 平滑阻尼 |
| 6 | FPS 相机 | 键盘 WASD 移动 / 鼠标控制朝向 / 前向量计算 |
| 7 | 综合 | 场景中放置多个几何体 + 可切换相机模式 |

### 第 6 周：深入变换与层级场景

| 天 | 主题 | 核心内容 |
|----|------|----------|
| 1 | 法线矩阵 | 为什么法线不能直接用 model 矩阵变换 / normalMatrix = transpose(inverse(modelView)) |
| 2 | 场景图 Scene Graph | 父子层级变换 / 世界矩阵 = parent.worldMatrix * local / 递归遍历 |
| 3 | 骨骼层级 | 简单人体骨骼（躯干→上臂→下臂）/ 层级旋转 |
| 4 | 四元数入门 | 欧拉角的万向锁问题 / 四元数基本运算 / slerp 插值 |
| 5 | 射线拾取 Ray Picking | 屏幕坐标→世界射线 / 射线与球体相交检测 / 点击选中物体 |
| 6-7 | 阶段项目 | 太阳系模型：太阳 + 行星 + 卫星层级变换 + 轨道相机 |

### 阶段 2 里程碑项目

**项目：交互式太阳系**
- 太阳（自发光）+ 至少 4 颗行星 + 月球
- 层级变换实现公转和自转
- 轨道相机可自由观察
- 点击行星显示信息
- 验收：MVP 变换正确，相机交互流畅

---

## 阶段 3：光照与材质（第 7-9 周）

> **目标**：实现从基础到 PBR 的多种光照模型，理解真实感渲染原理

### 第 7 周：基础光照

| 天 | 主题 | 核心内容 |
|----|------|----------|
| 1 | 光照原理 | 环境光 Ambient / 漫反射 Diffuse / 高光 Specular / 自发光 Emissive |
| 2 | Lambert 漫反射 | `diffuse = max(dot(normal, lightDir), 0.0)` / 光源方向计算 |
| 3 | Phong 光照 | 反射向量 reflect() / 视线方向 / 高光指数 shininess |
| 4 | Blinn-Phong | 半程向量 H = normalize(L + V) / 对比 Phong 效果差异 |
| 5 | 多光源 | 点光源 / 方向光 / 聚光灯(spotlight) / 光照衰减(attenuation) |
| 6 | 光照空间 | 世界空间 vs 视图空间光照计算的差异和选择 |
| 7 | 综合 Demo | 可调光照场景：多光源 + 多物体 + UI 面板控制光照参数 |

### 第 8 周：材质系统

| 天 | 主题 | 核心内容 |
|----|------|----------|
| 1 | 材质数据结构 | ambient/diffuse/specular/shininess 封装为 Material 对象 |
| 2 | 多材质渲染 | 同一场景不同物体使用不同材质 / uniform 切换 |
| 3 | 平面着色 vs 平滑着色 | flat shading（面法线）vs smooth shading（顶点法线插值） |
| 4 | Toon 卡通着色 | 离散化漫反射 / 描边效果（法线外扩 + 背面绘制） |
| 5 | 环境映射 | 反射(reflect) / 折射(refract) / Cube Map 概念预习 |
| 6-7 | 材质编辑器 | 实时调整材质参数 / 预设材质库（金属/塑料/玻璃/木材） |

### 第 9 周：PBR 基础

| 天 | 主题 | 核心内容 |
|----|------|----------|
| 1 | PBR 理论 | 微表面模型 / 能量守恒 / 金属度(metallic) / 粗糙度(roughness) |
| 2 | Cook-Torrance BRDF | D(NDF) 法线分布函数 / G 几何遮蔽函数 / F Fresnel 菲涅耳 |
| 3 | GGX 分布 | Trowbridge-Reitz GGX / Smith 几何函数 / Schlick 近似 |
| 4 | IBL 入门 | 基于图像的照明概念 / 预滤波环境贴图 / BRDF LUT |
| 5 | PBR 实现 | 完整 PBR 着色器 / metallic-roughness 工作流 |
| 6-7 | PBR Demo | 材质球阵列（不同金属度×粗糙度）/ 多光源 |

### 阶段 3 里程碑项目

**项目：PBR 材质展示器**
- 加载多种几何体（球/立方体/自定义）
- 支持 Blinn-Phong 和 PBR 两种光照模式切换
- 材质参数面板实时调整（颜色/金属度/粗糙度/高光）
- 多光源控制（位置/颜色/强度）
- 验收：金属和非金属材质视觉正确，帧率稳定

---

## 阶段 4：纹理与高级渲染技术（第 10-13 周）

> **目标**：掌握纹理系统、帧缓冲(FBO)、阴影、后处理等工业级渲染技术

### 第 10 周：纹理系统

| 天 | 主题 | 核心内容 |
|----|------|----------|
| 1 | 纹理基础 | createTexture / texImage2D / 图片加载 / UV 坐标 |
| 2 | 纹理参数 | WRAP(REPEAT/CLAMP) / FILTER(NEAREST/LINEAR) / Mipmap / anisotropic |
| 3 | 多纹理 | 纹理单元(texture unit) / activeTexture / 多 sampler2D / 纹理混合 |
| 4 | 法线贴图 | 切线空间(TBN矩阵) / 法线贴图采样 / 凹凸感效果 |
| 5 | 高度贴图 | 视差映射(Parallax Mapping) / 置换效果 |
| 6 | 其他贴图类型 | 高光贴图(specular map) / 环境遮蔽贴图(AO map) / 自发光贴图(emissive map) |
| 7 | 纹理 Atlas | 精灵图打包 / UV 子区域计算 / 纹理复用策略 |

### 第 11 周：帧缓冲与离屏渲染

| 天 | 主题 | 核心内容 |
|----|------|----------|
| 1 | FBO 基础 | createFramebuffer / 渲染到纹理(Render To Texture) / 颜色附件 |
| 2 | 深度/模板附件 | Renderbuffer / 深度纹理 / 模板缓冲 |
| 3 | 后处理管线 | 全屏四边形(full-screen quad) / ping-pong 双缓冲技术 |
| 4 | 模糊效果 | 高斯模糊(Gaussian Blur) / 分离式两遍模糊(separable) |
| 5 | 辉光效果 Bloom | 亮度提取 → 模糊 → 叠加 / HDR 阈值 |
| 6 | 更多后处理 | 色调映射(Tone Mapping) / 晕影(Vignette) / 色差(Chromatic Aberration) / FXAA 反锯齿 |
| 7 | MRT 入门 | 多渲染目标(WebGL2 drawBuffers) / G-Buffer 概念 |

### 第 12 周：阴影技术

| 天 | 主题 | 核心内容 |
|----|------|----------|
| 1 | Shadow Map 原理 | 从光源视角渲染深度 / 深度比较 / 阴影判定 |
| 2 | 基础 Shadow Map | 方向光阴影 / 正交投影深度纹理 / 阴影矩阵 |
| 3 | 阴影质量 | Shadow acne / Peter panning / 偏移(bias)调优 |
| 4 | PCF 软阴影 | 百分比近邻过滤(Percentage Closer Filtering) / 采样核大小 |
| 5 | 点光源阴影 | Cube Map 阴影 / 六面渲染 / Omnidirectional Shadow |
| 6 | CSM 级联阴影 | Cascaded Shadow Map 原理 / 分割方案 / 大场景适用 |
| 7 | 综合阴影 Demo | 方向光 + 点光源阴影 / 多物体投射与接收 |

### 第 13 周：高级渲染策略

| 天 | 主题 | 核心内容 |
|----|------|----------|
| 1 | 透明与混合 | gl.blendFunc / 渲染顺序问题 / 先渲染不透明再渲染透明 |
| 2 | 深度排序 | 画家算法 / OIT(Order-Independent Transparency) 概念 |
| 3 | 天空盒 Skybox | Cube Map 纹理 / 立方体采样 / 环境贴图反射 |
| 4 | 延迟渲染入门 | Forward vs Deferred / G-Buffer(位置/法线/颜色) / 光照 Pass |
| 5 | 环境光遮蔽 SSAO | 屏幕空间环境光遮蔽原理 / 采样核 / 噪声纹理 / 模糊 |
| 6-7 | 综合 Demo | 完整场景：天空盒 + 光照 + 阴影 + 后处理 |

### 阶段 4 里程碑项目

**项目：室内场景渲染器**
- 手动构建一个房间（墙壁/地板/物体）
- 带纹理的墙壁和物体（漫反射贴图 + 法线贴图）
- 方向光从窗户射入 + Shadow Map 阴影
- 后处理：Bloom + 色调映射 + FXAA
- 天空盒透过窗户可见
- 验收：光影效果真实，后处理管线完整

---

## 阶段 5：性能优化与工程化（第 14-16 周）

> **目标**：掌握 WebGL 性能优化核心技术，过渡到 WebGL2，建立工程化开发能力

### 第 14 周：WebGL2 核心特性

| 天 | 主题 | 核心内容 |
|----|------|----------|
| 1 | WebGL2 概述 | WebGL1 vs WebGL2 差异 / GLSL ES 3.00 / 获取 webgl2 context |
| 2 | VAO | Vertex Array Object / 一次绑定多次使用 / 减少状态切换 |
| 3 | UBO | Uniform Buffer Object / 共享 uniform 块 / std140 布局 |
| 4 | Transform Feedback | GPU 端顶点数据回写 / 粒子系统 GPU 更新 |
| 5 | 纹理增强 | 3D 纹理 / 纹理数组(Texture Array) / 不可变纹理(texStorage) |
| 6 | MRT 与整数纹理 | drawBuffers 原生支持 / 整数纹理格式 / G-Buffer 优化 |
| 7 | 其他特性 | sampler 对象 / 同步对象(Sync/Fence) / 遮挡查询 |

### 第 15 周：性能优化

| 天 | 主题 | 核心内容 |
|----|------|----------|
| 1 | GPU 瓶颈分析 | CPU bound vs GPU bound / Draw Call 开销 / 状态切换成本 |
| 2 | 实例化渲染 | drawArraysInstanced / drawElementsInstanced / 实例属性(divisor) |
| 3 | 批处理 Batching | 几何合并 / 纹理 Atlas / 减少 draw call |
| 4 | LOD 层级细节 | 距离判断切换模型精度 / 平滑过渡 |
| 5 | 视锥体裁剪 | Frustum Culling / AABB 包围盒 / 快速剔除不可见物体 |
| 6 | 着色器优化 | 避免 FS 中的分支 / 精度选择(lowp/mediump/highp) / 预计算 |
| 7 | 调试与剖析 | Spector.js / WebGL Inspector / Chrome GPU 性能面板 / gl.getError() |

### 第 16 周：工程化与架构

| 天 | 主题 | 核心内容 |
|----|------|----------|
| 1 | 渲染器架构 | Renderer / Scene / Mesh / Material / Camera 类设计 |
| 2 | 资源管理 | Shader 缓存 / 纹理管理器 / 异步加载队列 |
| 3 | 模型加载 | OBJ 格式解析 / glTF 2.0 格式（JSON + 二进制块）/ 骨骼动画数据 |
| 4 | glTF 渲染 | 解析 glTF 场景树 / 材质 / 网格 / 纹理引用 / 渲染完整模型 |
| 5 | 骨骼动画 | 骨骼层级 / 蒙皮(Skinning) / 关键帧插值 / 顶点着色器中的骨骼变换 |
| 6 | 状态排序 | 按 shader → 材质 → 纹理 排序减少切换 / 渲染队列设计 |
| 7 | 总结 | 代码架构审查 / 性能基准测试 / 可维护性评估 |

### 阶段 5 里程碑项目

**项目：glTF 模型查看器**
- 加载并渲染 glTF 2.0 模型
- PBR 材质渲染（metallic-roughness）
- 骨骼动画播放
- 轨道相机 + 环境光照
- 实例化渲染（在场景中放置多个同模型实例）
- 性能监控面板（FPS / Draw Calls / 三角形数量）
- 验收：流畅加载渲染标准 glTF 测试模型

---

## 阶段 6：综合实战项目（第 17-20 周）

> **目标**：完成复杂项目，形成可展示的作品集，验证所有技能融合能力

### 项目 A：3D 地形引擎（第 17-18 周）

**技术栈**：高度图 + 多纹理混合 + LOD + 水面反射

| 周 | 内容 |
|----|------|
| 第 17 周 | 高度图加载 → 地形网格生成 → 多纹理混合（草地/岩石/雪地按高度/坡度混合）→ 法线计算 → 光照 |
| 第 18 周 | 地形 LOD（距离越远网格越粗）→ 水面平面反射(FBO + 翻转渲染)→ 天空盒 → 雾效(Fog) → 鼠标交互地形拾取 |

**验收标准**：
- 大尺寸地形流畅渲染（至少 256x256 网格）
- 多纹理过渡自然
- 水面有镜面反射效果
- LOD 切换无明显跳变

### 项目 B：粒子特效系统（第 19 周）

**技术栈**：GPU 粒子(Transform Feedback) + 实例化 + 混合 + 后处理

| 内容 |
|------|
| 粒子发射器设计（点/球/锥体）→ GPU 端粒子更新(Transform Feedback / 或纹理存储) → 10 万级粒子渲染 → 多种预设效果（火焰/烟雾/水花/星尘）→ 粒子排序(透明混合) → Bloom 后处理让粒子发光 |

**验收标准**：
- 10 万粒子 60fps
- 至少 3 种视觉效果预设
- 粒子参数可 UI 调节

### 项目 C：Mini 3D 引擎（第 19-20 周）

**技术栈**：所有已学技术的综合

| 引擎核心模块 |
|-------------|
| **Renderer**：WebGL2 渲染器，自动批处理，状态排序 |
| **Scene Graph**：场景树，层级变换，组件化 |
| **Material System**：Phong + PBR，支持纹理贴图 |
| **Camera**：轨道 + FPS 两种模式 |
| **Light**：方向光 + 点光源 + 聚光灯，Shadow Map |
| **Loader**：OBJ / glTF 加载 |
| **Post-Processing**：Bloom + Tone Mapping + FXAA |
| **Debug**：性能面板 + Wireframe 模式 + 法线可视化 |

**验收标准**：
- 场景中包含多种几何体、多种材质、多种光源
- Shadow Map 阴影正常
- 后处理管线完整
- 性能面板实时监控
- 代码架构清晰可维护

---

## 附录 A：每周学习节奏建议

```
周一到周五（每天 60-90 分钟）：
  ├── 15 min  概念学习（阅读 + 理解原理）
  ├── 45-60 min  编码实践（跟着计划写代码）
  └── 10-15 min  复盘记录

周六（90-120 分钟）：
  └── 里程碑项目开发 / 综合练习

周日（30-60 分钟）：
  ├── 本周知识回顾
  ├── 薄弱点针对练习
  └── 预习下周内容
```

---

## 附录 B：推荐学习资源

### 核心教程

| 资源 | 特点 | 链接 |
|------|------|------|
| **WebGL Fundamentals** | 最佳入门，有中文版，从原理讲起 | https://webglfundamentals.org/webgl/lessons/zh_cn/ |
| **WebGL2 Fundamentals** | WebGL2 专项，建议阶段 5 使用 | https://webgl2fundamentals.org/ |
| **Learn OpenGL** | OpenGL 教程，概念与 WebGL 通用，讲解深度最佳 | https://learnopengl-cn.github.io/ |
| **The Book of Shaders** | GLSL 交互式教程，阶段 1 GLSL 深入时使用 | https://thebookofshaders.com/ |

### GLSL 练习平台

| 平台 | 用途 |
|------|------|
| **Shadertoy** | 海量 shader 作品，学习 + 练习 | https://www.shadertoy.com/ |
| **GLSL Sandbox** | 更简单的在线 shader 编辑器 | https://glslsandbox.com/ |
| **Shader Editor (VS Code 插件)** | 本地实时预览 GLSL |

### 工具与调试

| 工具 | 用途 |
|------|------|
| **Spector.js** | WebGL 调用捕获与分析（Chrome 插件） |
| **gl-matrix** | 高性能矩阵运算库（阶段 2 后可引入替代手写） |
| **dat.GUI / lil-gui** | 快速创建参数面板 |
| **stats.js** | FPS 监控 |

### 参考书籍

| 书名 | 说明 |
|------|------|
| 《WebGL 编程指南》| 经典入门书，适合阶段 1-2 |
| 《Real-Time Rendering (4th Edition)》| 实时渲染圣经，阶段 3-4 深度参考 |
| 《Fundamentals of Computer Graphics》| 图形学数学基础 |
| 《GPU Gems》系列 | 高级渲染技术论文集，阶段 5-6 参考 |

---

## 附录 C：核心知识点检查清单

完成所有阶段后，你应该能够自信回答以下问题：

### 渲染管线
- [ ] 完整描述从 JS 调用到像素输出的每个阶段
- [ ] 区分可编程阶段（VS/FS）和固定功能阶段
- [ ] 解释光栅化和插值的工作原理

### 着色器
- [ ] 熟练编写 GLSL 着色器（VS/FS）
- [ ] 使用 attribute / uniform / varying 正确传递数据
- [ ] 实现程序化纹理（噪声/SDF/图案）
- [ ] 编写 PBR 着色器

### 3D 数学
- [ ] 手写 MVP 矩阵链
- [ ] 实现 lookAt / perspective / ortho
- [ ] 理解法线矩阵的推导
- [ ] 用四元数表示旋转

### 渲染技术
- [ ] 实现 Shadow Map（方向光 + 点光源）
- [ ] 搭建后处理管线（FBO + 全屏 quad）
- [ ] 实现 Bloom / 模糊 / SSAO
- [ ] 正确处理透明物体渲染

### 性能优化
- [ ] 使用实例化渲染绘制大量物体
- [ ] 实现视锥体裁剪
- [ ] 优化 Draw Call 数量
- [ ] 使用 WebGL2 特性（VAO/UBO）

### 工程能力
- [ ] 设计清晰的渲染器类架构
- [ ] 加载并渲染 glTF 模型
- [ ] 实现骨骼动画
- [ ] 使用调试工具定位性能瓶颈

---

## 附录 D：从 WebGL 到未来

完成本计划后的进阶方向：

```
WebGL 精通之后
├── Three.js / Babylon.js — 生产级 3D 框架（理解底层后学框架事半功倍）
├── WebGPU — 下一代 Web 图形 API（Compute Shader / 现代管线）
├── WebXR — VR/AR 开发
├── 图形学进阶
│   ├── 全局光照 — 路径追踪 / 光线步进(Ray Marching)
│   ├── 体积渲染 — 体素 / 体积雾 / 医学影像
│   └── 物理模拟 — 流体 / 布料 / 刚体（GPU 加速）
├── GIS/地图引擎 — Cesium / Mapbox GL 底层原理
└── 游戏引擎原理 — ECS 架构 / 空间划分(BVH/Octree) / 物理引擎
```
