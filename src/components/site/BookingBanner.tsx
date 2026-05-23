import { Phone, Instagram } from "lucide-react";
import { Reveal } from "./Reveal";
import { type AppSettings } from "@/lib/booking-domain";

function toTel(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits ? `tel:+${digits}` : "#iletisim";
}

function getInstagramLabel(url: string): string {
  const match = url.match(/instagram\.com\/([^/?#]+)/i);
  return match ? `@${match[1]}` : "Instagram";
}

export function BookingBanner({ settings }: { settings: AppSettings }) {
  return (
    <section
      id="randevu"
      className="relative py-32 lg:py-44 bg-navy overflow-hidden border-t border-border-soft"
    >
      <div className="absolute inset-0 gold-grid opacity-30 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(245,184,0,0.15), transparent 50%)",
        }}
      />
      <div className="relative max-w-4xl mx-auto px-6 lg:px-10 text-center">
        <Reveal>
          <p className="font-sub text-xs tracking-[0.3em] uppercase text-gold mb-8">
            Hemen Rezervasyon
          </p>
          <h2 className="font-display text-7xl lg:text-[10rem] text-bone leading-[0.85] mb-10">
            RANDEVU <span className="text-gold">AL</span>
          </h2>
          <p className="text-bone/70 text-lg max-w-xl mx-auto mb-12">
            Hizmetinizi ve berberinizi secin, uygun saatleri aninda gorun. Talebiniz sisteme
            kaydedildiginde WhatsApp bilgilendirmesi de otomatik tetiklenir.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
            <a
              href="#randevu"
              className="inline-flex items-center justify-center gap-3 bg-gold text-navy font-sub text-xs tracking-[0.25em] uppercase px-8 py-4 hover:bg-gold-light transition-colors"
            >
              Online Randevu
            </a>
            <a
              href={toTel(settings.mainWhatsappNumber)}
              className="inline-flex items-center justify-center gap-3 border border-gold text-gold font-sub text-xs tracking-[0.25em] uppercase px-8 py-4 hover:bg-gold hover:text-navy transition-colors"
            >
              <Phone size={16} /> Bizi Ara
            </a>
            <a
              href={settings.instagramUrl || "#iletisim"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-3 border border-bone/30 text-bone font-sub text-xs tracking-[0.25em] uppercase px-8 py-4 hover:border-gold hover:text-gold transition-colors"
            >
              <Instagram size={16} /> {getInstagramLabel(settings.instagramUrl || "")}
            </a>
          </div>

          <p className="font-sub text-[10px] tracking-[0.3em] uppercase text-bone/40">
            Fiyat ve berber bilgisi rezervasyon aninda snapshot olarak kaydedilir.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
