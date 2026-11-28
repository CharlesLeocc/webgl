# 2026Q4 学习进度

学习路线见[季度计划](plan.md)。

**当前：第 1 至 3 周学习已完成，第 4 周待开始。** 第 3 周完成变换顺序的引导实验和独立推导，未单独验收代码实现。

| 完成了什么 | 如何验证 | 证据链接 | 还差什么 |
|---|---|---|---|
| 第 1 周：完成两道绘制预测 | 学习者回答片元颜色来自顶点颜色插值，调节亮度只改颜色、不需要重传顶点 | [预测题与实验说明](../../../projects/webgl-lab/experiments/pipeline-check/README.md) | 无 |
| 第 1 周：独立实现亮度交互三角形 | 学习者确认独立完成渲染闭环，并通过亮度预测与 uniform 设置顺序问答。参考 Demo 的 Chrome WebGL 像素读回结果为：亮度 `1.0`、`0.5`、`0.0` 时中心 RGB 分别为 `(115, 70, 71)`、`(57, 35, 35)`、`(0, 0, 0)`，背景未变；两次调节未增加顶点上传，始终共上传 1 次 | [Day6-7 整合与盲写](../../../Week1/Day6-7/index.html)、[盲写清单与薄弱点记录](../../../Week1/Day6-7/盲写清单与薄弱点记录.md)、[参考 Demo](../../../projects/webgl-lab/experiments/pipeline-check/index.html) | 无 |
| 第 1 周：通过交错缓冲布局换序题 | 在纸面推导中，给定 `[r, g, b, x, y]`，学习者正确算出两个 stride 都是 20 字节，位置 offset 为 12 字节、颜色 offset 为 0 | [实验源码](../../../projects/webgl-lab/experiments/pipeline-check/main.js) | 无 |
| 第 1 周：通过光栅化与亮度的对照题 | 学习者判断三个顶点同色时插值结果相同，并正确预测亮度为 `0` 时仍生成片元、画面显示黑色三角形 | [实验说明](../../../projects/webgl-lab/experiments/pipeline-check/README.md)、[着色器源码](../../../projects/webgl-lab/experiments/pipeline-check/main.js) | 无 |
| 第 1 周：通过 uniform 与绘制顺序的排错迁移题 | 在同一个程序连续绘制两个三角形的口头推演中，正确指出两次绘制都会使用 `0.5`，并将第二次 uniform 设置移到两次绘制之间 | [Demo 中设置后再绘制的源码](../../../projects/webgl-lab/experiments/pipeline-check/main.js) | 无 |
| 第 1 周：完成渲染数据流学习 | 学习者口述了主要顺序，经讲解补齐光栅化确定覆盖范围、片元着色器将插值颜色乘以亮度，随后确认已掌握 | [实验讲解](../../../projects/webgl-lab/experiments/pipeline-check/README.md) | 无 |
| 第 2 周：完成向量光照 Demo（引导实现） | Chrome WebGL 像素读回：法线朝 `+Z` 时，指向光源的方向角 `0°`、`60°`、`90°`、`180°` 对应漫反射系数 `1`、`0.5`、`0`、`0`；保持 `180°` 并交换 B、C，法线反转，漫反射系数恢复为 `1` | [实验](../../../projects/webgl-lab/experiments/vector-light/index.html)、[源码](../../../projects/webgl-lab/experiments/vector-light/main.js)、[已有 GLSL 函数练习](../../../Week3/Day2/index.html) | 未验收代码独立实现 |
| 第 2 周：完成方向光明暗对照 | 学习者正确预测 `0°` 最亮、`90°` 与 `180°` 都为黑色；经讨论区分了方向光与点光源，并说明交换顶点顺序后为什么原来背向的一侧可受光 | [向量光照实验](../../../projects/webgl-lab/experiments/vector-light/index.html) | 无 |
| 第 2 周：理解右手定则与叉积方向 | 结合 3D 动画区分了固定坐标轴与拇指所指的叉积结果；学习者确认已理解交换两条边的顺序会翻转法线 | [三维右手动画](../../../projects/webgl-lab/experiments/vector-light/right-hand-3d.html) | 无 |
| 第 2 周：通过归一化对照题 | 将三角形的一条边长度加倍，学习者正确判断原始点积从 `2` 变 `4`，归一化后漫反射亮度不变 | [光照实验源码](../../../projects/webgl-lab/experiments/vector-light/main.js) | 无 |
| 第 2 周：通过坐标基换算题 | 已知物体局部 `+Z` 对应世界 `+X`，学习者正确将世界光源方向 `(1, 0, 0)` 写成局部方向 `(0, 0, 1)` | [光照实验源码](../../../projects/webgl-lab/experiments/vector-light/main.js)（同一坐标空间中的点积示例） | 无 |
| 第 2 周：通过倾斜三角形综合推导 | 学习者正确从两条边求得法线 `(0, -1, 1)`，算出长度 `sqrt(2)`，归一化后与 `+Z` 方向做点积并截取非负值，得到漫反射系数 `sqrt(2)/2` | [光照实验源码](../../../projects/webgl-lab/experiments/vector-light/main.js)（同一计算流程） | 无 |
| 第 3 周：完成 3D 矩阵顺序对照 Demo（引导实现） | 在 Chrome 的桌面与窄屏视口验证：默认参数下两种顺序的中心分别为 `(1, 0, 0)`、`(0, 1, 0)`，画面位置不同；只改局部缩放时形状变化但中心不变；取消平移时中心重合 | [矩阵顺序实验](../../../projects/webgl-lab/experiments/matrix-order/index.html)、[矩阵实现](../../../projects/webgl-lab/experiments/matrix-order/main.js)、[已有 2D 变换练习](../../../Week2/Day5/index.html) | 未单独验收代码实现 |
| 第 3 周：通过平移与旋转的矩阵顺序题 | 学习者判断平移为 `0` 时两边中心和朝向均相同，并正确用 `R × T × p` 表示先平移再旋转 | [矩阵顺序实验](../../../projects/webgl-lab/experiments/matrix-order/index.html) | 无 |
| 第 3 周：通过缩放与平移顺序题 | 对点 `(1, 0, 0)`，学习者正确算出先沿 X 缩放两倍再平移得到 `(3, 0, 0)`，先平移再缩放得到 `(4, 0, 0)` | [平移、缩放和矩阵乘法源码](../../../projects/webgl-lab/experiments/matrix-order/main.js)（两种顺序为纸面推演） | 无 |
| 第 3 周：通过三种变换的综合推导 | 学习者正确写出列向量表达式 `T × R × S × p`，并按缩放、旋转、平移将 `(1, 0, 0)` 依次变换为 `(2, 0, 0)`、`(0, 2, 0)`、`(1, 2, 0)` | [组合变换源码](../../../projects/webgl-lab/experiments/matrix-order/main.js)（同一组合顺序） | 无 |
