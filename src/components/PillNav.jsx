"use client";

// Adapted from React Bits PillNav JS-CSS. License: docs/vendor/react-bits-LICENSE.md.
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { gsap } from 'gsap';
import './PillNav.css';

export default function PillNav({
  logo = '',
  logoAlt = '単語',
  items,
  activeHref = '/',
  className = '',
  ease = 'power2.out',
  baseColor = '#000000',
  pillColor = '#ffffff',
  hoveredPillTextColor = '#ffffff',
  pillTextColor = '#000000',
  initialLoadAnimation = false,
}) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState(null);
  const mobileOpen = openPath === pathname;
  const menuId = useId();
  const root = useRef(null);
  const trigger = useRef(null);
  const circles = useRef([]);
  const timelines = useRef([]);
  const activeTweens = useRef([]);
  const reduced = useRef(false);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const scope = root.current;
    const timelineList = timelines.current;
    const tweenList = activeTweens.current;
    let disposed = false;
    // Keep the registry's expanding circle and rolling labels, without resizing the nav.
    const context = gsap.context(() => {}, scope);
    function layout() {
      if (disposed) return;
      reduced.current = media.matches;
      context.add(() => circles.current.forEach((circle, index) => {
        if (!circle?.parentElement) return;
        tweenList[index]?.kill();
        timelineList[index]?.kill();
        const pill = circle.parentElement;
        const { width: w, height: h } = pill.getBoundingClientRect();
        if (!w || !h) return;
        const radius = ((w * w) / 4 + h * h) / (2 * h);
        const diameter = Math.ceil(2 * radius) + 2;
        const delta = Math.ceil(radius - Math.sqrt(Math.max(0, radius * radius - (w * w) / 4))) + 1;
        circle.style.width = `${diameter}px`;
        circle.style.height = `${diameter}px`;
        circle.style.bottom = `-${delta}px`;
        gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: `50% ${diameter - delta}px` });
        const label = pill.querySelector('.pill-label');
        const hovered = pill.querySelector('.pill-label-hover');
        gsap.set(label, { y: 0 });
        gsap.set(hovered, { y: h + 100, opacity: 0 });
        const timeline = gsap.timeline({ paused: true });
        timeline.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease }, 0);
        timeline.to(label, { y: -(h + 8), duration: 2, ease }, 0);
        timeline.to(hovered, { y: 0, opacity: 1, duration: 2, ease }, 0);
        timelineList[index] = timeline;
        if (!media.matches && (pill.matches(':hover') || pill === document.activeElement)) timeline.progress(1);
      }));
    }
    layout();
    window.addEventListener('resize', layout);
    media.addEventListener('change', layout);
    document.fonts?.ready.then(layout).catch(() => {});
    if (initialLoadAnimation && !media.matches) {
      context.add(() => gsap.fromTo(scope, { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.4, ease }));
    }
    return () => {
      disposed = true;
      window.removeEventListener('resize', layout);
      media.removeEventListener('change', layout);
      tweenList.forEach(tween => tween?.kill());
      timelineList.forEach(timeline => timeline?.kill());
      context.revert();
    };
  }, [items, ease, initialLoadAnimation]);

  useEffect(() => {
    if (!mobileOpen) return;
    function outside(event) { if (!root.current?.contains(event.target)) setOpenPath(null); }
    function escape(event) {
      if (event.key === 'Escape') { setOpenPath(null); trigger.current?.focus(); }
    }
    function resize() { if (window.innerWidth > 768) setOpenPath(null); }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', resize);
    };
  }, [mobileOpen]);

  function animate(index, entering) {
    if (reduced.current) return;
    const timeline = timelines.current[index];
    if (!timeline) return;
    activeTweens.current[index]?.kill();
    activeTweens.current[index] = timeline.tweenTo(entering ? timeline.duration() : 0, { duration: entering ? 0.3 : 0.2, ease, overwrite: 'auto' });
  }
  const style = { '--base': baseColor, '--pill-bg': pillColor, '--hover-text': hoveredPillTextColor, '--pill-text': pillTextColor };
  return <nav ref={root} className={`pill-nav-container ${className}`} style={style} aria-label="主导航" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpenPath(null);
  }}>
    <div className="pill-nav">
      <Link className="pill-logo" href="/" aria-label="単語，返回首页">
        {logo ? <Image src={logo} alt={logoAlt} width={32} height={32} /> : <span lang="ja">単語</span>}
      </Link>
      <div className="pill-nav-items desktop-only"><ul className="pill-list">
        {items.map((item, index) => <li key={item.href}><Link href={item.href} className={`pill${activeHref === item.href ? ' is-active' : ''}`} aria-current={activeHref === item.href ? 'page' : undefined}
          onMouseEnter={() => animate(index, true)} onMouseLeave={event => { if (event.currentTarget !== document.activeElement) animate(index, false); }}
          onFocus={() => animate(index, true)} onBlur={() => animate(index, false)}>
          <span className="hover-circle" aria-hidden="true" ref={node => { circles.current[index] = node; }} />
          <span className="label-stack"><span className="pill-label">{item.label}</span><span className="pill-label-hover" aria-hidden="true">{item.label}</span></span>
        </Link></li>)}
      </ul></div>
      <button ref={trigger} type="button" className="mobile-menu-button mobile-only" aria-controls={menuId} aria-expanded={mobileOpen} aria-label={mobileOpen ? '关闭导航菜单' : '打开导航菜单'} title={mobileOpen ? '关闭导航菜单' : '打开导航菜单'} onClick={() => setOpenPath(mobileOpen ? null : pathname)}>
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
    </div>
    <div id={menuId} hidden={!mobileOpen} className="mobile-menu-popover mobile-only"><ul className="mobile-menu-list">
      {items.map(item => <li key={item.href}><Link href={item.href} className={`mobile-menu-link${activeHref === item.href ? ' is-active' : ''}`} aria-current={activeHref === item.href ? 'page' : undefined} onClick={() => setOpenPath(null)}>{item.label}</Link></li>)}
    </ul></div>
  </nav>;
}
