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
