import { ArrowRight, Clock } from "lucide-react";
import { Reveal } from "./Reveal";
import { formatDuration, formatPrice, type ServiceItem } from "@/lib/booking-domain";

export function Services({ services }: { services: ServiceItem[] }) {
  return (
    <section
      id="hizmetler"
      className="relative py-28 lg:py-36 bg-navy-2 border-y border-border-soft"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <p className="font-sub text-xs tracking-[0.3em] uppercase text-gold mb-6">
            <span className="inline-block w-8 h-px bg-gold align-middle mr-3" />
            Ne Sunuyoruz
          </p>
          <h2 className="font-display text-6xl lg:text-8xl text-bone mb-16 max-w-4xl">
            HİZMET<span className="text-gold">LERİMİZ</span>
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-5">
          {services.map((service, index) => (
            <Reveal key={service.id} delay={index * 0.04}>
              <article className="group relative bg-card-dark border border-border-soft rounded-lg p-7 lg:p-8 h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:border-gold/40">
                <div className="flex items-start justify-between gap-6 mb-3">
                  <h3 className="font-display text-3xl lg:text-4xl tracking-wider text-bone">
                    {service.name}
                  </h3>
                  <span className="flex-shrink-0 inline-flex items-center gap-1.5 font-sub text-[10px] tracking-[0.2em] uppercase text-bone/60 border border-border-soft px-3 py-1.5 rounded">
                    <Clock size={11} /> {formatDuration(service.durationMinutes)}
                  </span>
                </div>
                <p className="text-bone/60 text-sm leading-relaxed mb-10 pr-2">
                  {service.description}
                </p>
                <div className="flex items-end justify-between">
                  <a
                    href="#randevu"
                    className="inline-flex items-center gap-2 font-sub text-[11px] tracking-[0.25em] uppercase text-bone/70 group-hover:text-gold transition-colors"
                  >
                    Randevu Al <ArrowRight size={14} />
                  </a>
                  <span className="font-display text-2xl tracking-wider bg-gold text-navy px-4 py-1.5 rounded">
                    {formatPrice(service.price)}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gold group-hover:w-full transition-all duration-500" />
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="text-center font-sub text-xs tracking-[0.2em] uppercase text-bone/50 mt-12">
            Fiyatlar ve süreler admin panelden yönetilir. Rezervasyon sırasında seçilen fiyat geçmiş
            randevuya snapshot olarak kaydedilir.
          </p>
        </Reveal>

        <Reveal delay={0.25}>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
            <a
              href="#randevu"
              className="inline-flex items-center justify-center gap-3 bg-gold text-navy font-sub tracking-[0.2em] uppercase text-xs px-8 py-4 hover:bg-gold-light transition-colors"
            >
              Randevu Al <ArrowRight size={16} />
            </a>
            <a
              href="#berberlerimiz"
              className="inline-flex items-center justify-center gap-3 border border-bone/30 text-bone font-sub tracking-[0.2em] uppercase text-xs px-8 py-4 hover:border-gold hover:text-gold transition-colors"
            >
              Ekibimizi Gör
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
