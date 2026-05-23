import { MapPin, Phone, Clock, Instagram, ArrowUpRight } from "lucide-react";
import { Reveal } from "./Reveal";
import { ImageWithFallback } from "./ImageWithFallback";
import storefront from "@/assets/storefront.jpg";
import { type AppSettings } from "@/lib/booking-domain";

const MAP_URL = "https://maps.app.goo.gl/bhPrN4T7EjUigAFB9";

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("90")) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  }
  return value;
}

function getInstagramLabel(url: string): string {
  const match = url.match(/instagram\.com\/([^/?#]+)/i);
  return match ? `@${match[1]}` : url;
}

export function Contact({ settings }: { settings: AppSettings }) {
  return (
    <section
      id="iletisim"
      className="relative py-28 lg:py-36 bg-navy-2 border-t border-border-soft"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-16">
        <div>
          <Reveal>
            <p className="font-sub text-xs tracking-[0.3em] uppercase text-gold mb-6">
              <span className="inline-block w-8 h-px bg-gold align-middle mr-3" />
              Bizi Ziyaret Edin
            </p>
            <h2 className="font-display text-6xl lg:text-8xl text-bone mb-12 leading-[0.9]">
              KONUM & <br />
              <span className="text-gold">İLETİŞİM</span>
            </h2>
          </Reveal>

          <div className="space-y-8">
            {[
              { Icon: MapPin, label: "Adres", value: settings.address },
              { Icon: Phone, label: "Telefon", value: formatPhone(settings.mainWhatsappNumber) },
              {
                Icon: Clock,
                label: "Çalışma Saatleri",
                value: settings.workingHours
                  .split("\n")
                  .map((line) => <div key={line}>{line}</div>),
              },
              {
                Icon: Instagram,
                label: "Instagram",
                value: settings.instagramUrl ? getInstagramLabel(settings.instagramUrl) : "-",
              },
            ].map(({ Icon, label, value }, i) => (
              <Reveal key={label} delay={i * 0.08}>
                <div className="flex gap-5 border-b border-border-soft pb-6">
                  <div className="flex-shrink-0 w-12 h-12 border border-gold/40 flex items-center justify-center text-gold">
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="font-sub text-[10px] tracking-[0.25em] uppercase text-gold mb-1">
                      {label}
                    </div>
                    <div className="text-bone text-base leading-relaxed">{value}</div>
                  </div>
                </div>
              </Reveal>
            ))}

            <Reveal delay={0.4}>
              <a
                href={MAP_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 border border-gold text-gold font-sub text-xs tracking-[0.25em] uppercase px-7 py-4 mt-4 hover:bg-gold hover:text-navy transition-colors"
              >
                Haritada Gör <ArrowUpRight size={16} />
              </a>
            </Reveal>
          </div>
        </div>

        <Reveal delay={0.15}>
          <div className="lg:sticky lg:top-32">
            <div className="relative aspect-square overflow-hidden bg-navy-3">
              <ImageWithFallback src={storefront} alt="Okan Yıldız Barber's Club — Başakşehir" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center gap-3">
                <MapPin size={20} className="text-gold" strokeWidth={1.5} />
                <div>
                  <p className="font-display text-2xl text-bone tracking-wider">BAŞAKŞEHİR</p>
                  <p className="font-sub text-[10px] tracking-[0.3em] uppercase text-gold">
                    İstanbul, Türkiye
                  </p>
                </div>
              </div>
              <div className="absolute inset-3 border border-gold/20 pointer-events-none" />
            </div>
            <a
              href={MAP_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-6 w-full inline-flex items-center justify-center gap-3 bg-gold text-navy font-sub text-xs tracking-[0.25em] uppercase py-4 hover:bg-gold-light transition-colors"
            >
              Haritada Gör <ArrowUpRight size={16} />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
