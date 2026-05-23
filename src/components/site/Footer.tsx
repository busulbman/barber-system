import { type AppSettings } from "@/lib/booking-domain";

const links = [
  { label: "Hakkımızda", href: "#hakkimizda" },
  { label: "Hizmetler", href: "#hizmetler" },
  { label: "Berberlerimiz", href: "#berberlerimiz" },
  { label: "Galeri", href: "#galeri" },
  { label: "İletişim", href: "#iletisim" },
];

function getInstagramLabel(url: string): string {
  const match = url.match(/instagram\.com\/([^/?#]+)/i);
  return match ? `@${match[1]}` : "Instagram";
}

export function Footer({ settings }: { settings: AppSettings }) {
  return (
    <footer className="bg-navy border-t border-border-soft">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14 grid md:grid-cols-3 gap-10 items-center">
        <a href="#top" className="flex flex-col leading-none">
          <span className="font-display text-3xl tracking-wider text-gold">
            {settings.businessName.replace(" Barber's Club", "").toUpperCase()}
          </span>
          <span className="font-sub text-[10px] tracking-[0.3em] text-bone/60 mt-1">
            BARBER'S CLUB
          </span>
        </a>

        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-sub text-[11px] tracking-[0.2em] uppercase text-bone/70 hover:text-gold transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <a
          href={settings.instagramUrl || "#iletisim"}
          target="_blank"
          rel="noreferrer"
          className="md:justify-self-end font-sub text-xs tracking-[0.2em] uppercase text-gold hover:text-gold-light transition-colors"
        >
          {getInstagramLabel(settings.instagramUrl || "")}
        </a>
      </div>
      <div className="border-t border-border-soft">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 flex flex-col md:flex-row gap-2 justify-between font-sub text-[10px] tracking-[0.2em] uppercase text-bone/40">
          <span>© 2026 {settings.businessName}. Tum haklari saklidir.</span>
          <span>{settings.address}</span>
        </div>
      </div>
    </footer>
  );
}
