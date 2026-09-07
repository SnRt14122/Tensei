# React Bits 使用记录

## Count Up

本次使用 React Bits 的 `Count Up` 组件，并放在 `/progress` 的四个总览指标上。组件来源为 [JS-CSS registry](https://reactbits.dev/r/CountUp-JS-CSS.json)，[组件文档](https://reactbits.dev/text-animations/count-up)。依赖 `motion` 已加入项目。

源文件为 `src/components/CountUp.jsx`，保留基于 motion 的弹簧计数逻辑，并适配 Next.js 客户端组件、服务端初始数值、屏幕阅读器标签和减少动态效果偏好。上游许可保存在 `docs/vendor/react-bits-LICENSE.md`。

它只在记录页加载，不参与登录页、记忆页和检测页的首屏渲染。数字进入视口后播放一次；系统开启减少动态效果时直接显示最终值。没有检测记录时正确率显示 `-`，其余计数为 `0`。没有新增常驻动画循环、WebGL 场景或外部图片请求。

## 记录页功能

- 周视图展示每日单词、语法、检测数量，支持前后翻周、回到本周和按日筛选。未到来的日期不可选。
- 回想自测从当前筛选或某一天的已有词语/语法记录生成去重题目，显示答案后可标记是否记牢，完成后支持仅重练待巩固内容。
- 自测面板点击时才加载；原生 dialog 支持键盘焦点限制和 Esc 关闭，退出后恢复按钮焦点。
- 自测结果只用于本次练习，不写入 Supabase，不修改词语掌握状态或真实检测正确率。重新打开即开始新一轮。

周视图沿用 `getLearningActivity` 返回的数据范围，不补造历史数据。单词与语法按已有掌握时间归日，检测只包含已同步到云端的最近 1000 条数据；单词和语法查询仍受 Supabase 返回条数限制。它不是逐次学习行为的完整事件日志。自测跳过缺少释义的内容，不从缺少正确答案的错题记录生成题目。

数据逻辑测试：`node --test tests/activityPractice.test.mjs tests/activityView.test.mjs`。

## Border Glow 与经典光晕

来源：[Border Glow 文档](https://reactbits.dev/components/border-glow)、[JS-CSS registry](https://reactbits.dev/r/BorderGlow-JS-CSS.json)。registry 无额外依赖，源码保存在 `src/components/BorderGlow.jsx` 和 `BorderGlow.css`，使用现有 `docs/vendor/react-bits-LICENSE.md` 许可文件。

`StudyCard` 将其用于单词记忆卡、语法记忆卡和词条卡，替换原卡片外壳，不额外嵌套玻璃卡片。参数沿用请求配置：edgeSensitivity 30、glowColor `40 80 80`、backgroundColor `#120F17`、borderRadius 28、glowRadius 40、glowIntensity 1、coneSpread 25、animated false、三种颜色 `#c084fc` / `#f472b6` / `#38bdf8`。

适配项：增加客户端标记、独立禁用开关与内容样式入口；补充可选扫光动画的卸载清理；触屏和减少动态效果模式不显示发光；窄屏外发光范围限制为 12px，避免撑宽页面。`animated={false}` 保证本站没有自动扫光循环。

皮肤设置的“鼠标效果”提供液态玻璃、经典光晕和关闭三种选择。“卡片边缘光效”独立控制 Border Glow，二者都随自定义预设保存。经典光晕复用历史版本中心透明度 0.16 的径向渐变，并改为全局覆盖，不限制在 `.glass-panel` 内部。直径已按反馈从 320px 缩小至 160px，使用百分比偏移保持居中。它只在鼠标事件后更新位置，不启动 Three.js 或网页截图，不拦截按钮输入；离开窗口、触屏操作和减少动态效果时隐藏。

老版本设置和自定义预设缺少新字段时，保留原有玻璃开关状态；原来关闭特效的预设也默认关闭边缘光效。水合阶段先保持服务端默认外观，随后应用浏览器保存的设置，防止 className 不匹配。

测试：`node --test tests/*.test.mjs`；生产构建后运行 `scripts/check-cursor-performance.mjs` 可验证玻璃与光晕模式的懒加载和空闲行为（需设置 `PLAYWRIGHT_MODULE`、`TEST_BASE_URL`）。

## Pill Nav

来源：[组件文档](https://reactbits.dev/components/pill-nav)、[JS-CSS registry](https://reactbits.dev/r/PillNav-JS-CSS.json)。源文件为 `PillNav.jsx` 和 `PillNav.css`，依赖 `gsap`。

`NavBar` 保留记忆、学习、检测、记录入口以及皮肤、同步、退出工具。PillNav 采用请求中的黑白配色和 power2 缓出曲线，保留原版圆形填充与文字上移的悬停动画。不播放首屏宽度/Logo 入场动画，避免导航布局跳动。Logo 沿用本站“単語”字样，没有使用示例占位图。

原 registry 的 `react-router-dom` 链接已替换为 Next.js `Link`，不安装第二套路由库。增加键盘焦点反馈、`aria-current` 子路由选中状态、减少动态效果支持和 GSAP 卸载清理。手机菜单使用 Lucide 图标，支持同链接点击、路由切换、Esc、点击外部和切换至桌面布局时关闭；菜单不遮挡顶部工具按钮。

## Specular Button

来源：[组件文档](https://reactbits.dev/components/specular-button)、[JS-CSS registry](https://reactbits.dev/r/SpecularButton-JS-CSS.json)。源文件为 `SpecularButton.jsx` 和 `SpecularButton.css`，新增依赖 `ogl`。保留官方圆角矩形 SDF 高光着色器及鼠标角度/距离算法。

`StarButton` 用它替换单词记忆、语法记忆、词条卡片的收藏按钮。固定 44px 正方形触摸尺寸，圆角 18px；其它光效参数沿用请求配置。空心星为未收藏、琥珀色实心星为已收藏，通过 `aria-pressed`、标签、tooltip 暴露状态。收藏动作与失败回滚沿用原逻辑，保存中禁用按钮避免重复请求。

性能适配：鼠标进入 proximity 范围后才创建 WebGL2 上下文；`autoAnimate=false` 时角度与亮度稳定后停止 requestAnimationFrame，页面隐藏/按钮离屏时停止绘制。卸载时释放程序、几何和上下文。触屏、减少动态效果或无 WebGL2 时保留可操作的静态按钮。桌面与窄屏截图、画布像素差异、Firefox、键盘、触屏、无 WebGL 回退和空闲绘制检查均通过；浏览器测试使用临时本地数据页面，不进行真实收藏数据写入。
