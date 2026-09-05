// 全局背景动效装饰层：几何形状漂浮（drift）/ 极光流动（aurora）两种模式共用的元素。
//
// bug 由来：这些装饰 div（.shard / .aurora-layer）之前只在首页 src/app/page.tsx 里
// 手写了一份。但导航栏上的"🎨 皮肤"设置面板（可以切换背景动效模式）是挂在 NavBar 里的，
// 只出现在记忆/学习/检测这些登录后才能进入的页面——而这些页面完全没有渲染
// .shard/.aurora-layer 元素。globals.css 里的选择器规则
// （:root[data-bg-effect="drift"] .drift、:root[data-bg-effect="aurora"] .aurora-layer）
// 本身没问题，只是页面上根本不存在被选中的元素，所以用户切换动效时"什么都没发生"。
//
// 修复思路：把这层装饰抽成一个不依赖具体页面的共享组件，挂在根布局 layout.tsx 里，
// 用 fixed 定位铺满整个视口、放在所有页面内容的下方（负 z-index），
// 这样无论用户在哪个页面，背景动效都能正常显示，不用每个页面各自重复实现一份。
//
// 这个组件本身不需要任何客户端交互逻辑（不读取 state、不监听事件），
// 动效是否播放完全由 <html data-bg-effect="..."> 这个属性驱动（ThemeProvider 负责设置），
// 所以可以是普通的服务端组件，不用加 "use client"。
export function AmbientBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* drift 模式：三个几何切角形状缓慢漂浮，只在 data-bg-effect="drift" 时播放动画 */}
      <div className="shard shard-hex drift absolute -left-16 top-24 h-56 w-56 sm:h-72 sm:w-72" />
      <div className="shard shard-diamond drift absolute right-[-4rem] top-[8rem] h-40 w-40 sm:h-56 sm:w-56" />
      <div className="shard shard-hex drift absolute bottom-[-3rem] left-1/3 h-64 w-64 opacity-70" />

      {/* aurora 模式：大片渐变色缓慢流动，只在 data-bg-effect="aurora" 时可见（见 globals.css） */}
      <div className="aurora-layer" />
    </div>
  );
}
