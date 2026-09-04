import Link from "next/link";
import { signOut } from "@/app/login/actions";

const links = [
  { href: "/memorize", label: "记忆" },
  { href: "/quiz/kanji", label: "汉字检测" },
  { href: "/quiz/meaning", label: "词义检测" },
];

export function NavBar({ email }: { email?: string }) {
  return (
    <nav className="sticky top-0 z-10 border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-white font-semibold tracking-wide">
            単語
          </Link>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {email && <span className="text-xs text-white/40">{email}</span>}
          <form action={signOut}>
            <button className="text-xs text-white/50 hover:text-white transition-colors">
              退出
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
