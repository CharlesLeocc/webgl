# 2026Q4 学习进度

学习路线见[季度计划](plan.md)。

**当前：第 1 周学习已完成，第 2 周待开始。** 学习者确认第 1 周各项均已完成。下表记录独立实现、问答和参考 Demo 的验证情况。

| 完成了什么 | 如何验证 | 证据链接 | 还差什么 |
|---|---|---|---|
| 第 1 周：完成两道绘制预测 | 学习者回答片元颜色来自顶点颜色插值，调节亮度只改颜色、不需要重传顶点 | [预测题与实验说明](../../../projects/webgl-lab/experiments/pipeline-check/README.md) | 无 |
| 第 1 周：独立实现亮度交互三角形 | 学习者确认独立完成渲染闭环，并通过亮度预测与 uniform 设置顺序问答。参考 Demo 的 Chrome WebGL 像素读回结果为：亮度 `1.0`、`0.5`、`0.0` 时中心 RGB 分别为 `(115, 70, 71)`、`(57, 35, 35)`、`(0, 0, 0)`，背景未变；两次调节未增加顶点上传，始终共上传 1 次 | [Day6-7 整合与盲写](../../../Week1/Day6-7/index.html)、[盲写清单与薄弱点记录](../../../Week1/Day6-7/盲写清单与薄弱点记录.md)、[参考 Demo](../../../projects/webgl-lab/experiments/pipeline-check/index.html) | 无 |
| 第 1 周：通过交错缓冲布局换序题 | 在纸面推导中，给定 `[r, g, b, x, y]`，学习者正确算出两个 stride 都是 20 字节，位置 offset 为 12 字节、颜色 offset 为 0 | [实验源码](../../../projects/webgl-lab/experiments/pipeline-check/main.js) | 无 |
| 第 1 周：通过光栅化与亮度的对照题 | 学习者判断三个顶点同色时插值结果相同，并正确预测亮度为 `0` 时仍生成片元、画面显示黑色三角形 | [实验说明](../../../projects/webgl-lab/experiments/pipeline-check/README.md)、[着色器源码](../../../projects/webgl-lab/experiments/pipeline-check/main.js) | 无 |
| 第 1 周：通过 uniform 与绘制顺序的排错迁移题 | 在同一个程序连续绘制两个三角形的口头推演中，正确指出两次绘制都会使用 `0.5`，并将第二次 uniform 设置移到两次绘制之间 | [Demo 中设置后再绘制的源码](../../../projects/webgl-lab/experiments/pipeline-check/main.js) | 无 |
| 第 1 周：完成渲染数据流学习 | 学习者口述了主要顺序，经讲解补齐光栅化确定覆盖范围、片元着色器将插值颜色乘以亮度，随后确认已掌握 | [实验讲解](../../../projects/webgl-lab/experiments/pipeline-check/README.md) | 无 |
