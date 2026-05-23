import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { label: "Hakkımızda", href: "#hakkimizda" },
  { label: "Hizmetler", href: "#hizmetler" },
  { label: "Berberlerimiz", href: "#berberlerimiz" },
  { label: "Galeri", href: "#galeri" },
  { label: "İletişim", href: "#iletisim" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-[#0a0f1e]/80 backdrop-blur-md border-b border-[#1e2a3e]" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <a href="#top" className="flex flex-col leading-none">
            <span className="font-display text-2xl tracking-wider text-gold">OKAN YILDIZ</span>
            <span className="font-sub text-[10px] tracking-[0.3em] text-bone/60 mt-0.5">
              BARBER'S CLUB
            </span>
          </a>

          <nav className="hidden lg:flex items-center gap-9">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="font-sub text-xs tracking-[0.2em] uppercase text-bone/80 hover:text-gold transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="#randevu"
              className="hidden sm:inline-block font-sub text-xs tracking-[0.2em] uppercase bg-gold text-navy px-5 py-3 hover:bg-gold-light transition-colors"
            >
              Randevu Al
            </a>
            <button
              className="lg:hidden text-bone p-2"
              onClick={() => setOpen(true)}
              aria-label="Menü"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {open && (
        <div className="fixed inset-0 z-[60] bg-navy flex flex-col">
          <div className="h-20 flex items-center justify-between px-6">
            <span className="font-display text-2xl tracking-wider text-gold">OKAN YILDIZ</span>
            <button className="text-bone p-2" onClick={() => setOpen(false)} aria-label="Kapat">
              <X size={28} />
            </button>
          </div>
          <nav className="flex-1 flex flex-col items-center justify-center gap-8">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="font-display text-5xl tracking-wider text-bone hover:text-gold transition-colors"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#randevu"
              onClick={() => setOpen(false)}
              className="mt-6 font-sub text-sm tracking-[0.25em] uppercase bg-gold text-navy px-8 py-4"
            >
              Randevu Al
            </a>
          </nav>
        </div>
      )}
    </>
  );
}
