import { Star, ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";
import { ImageWithFallback } from "./ImageWithFallback";
import okanPhoto from "@/assets/barber-portrait.jpg";
import workingPhoto from "@/assets/working.jpg";
import teamGroupPhoto from "@/assets/team-group.jpg";
import { type Barber } from "@/lib/booking-domain";

const fallbackPhotos = [okanPhoto, workingPhoto, teamGroupPhoto];

function resolvePhoto(barber: Barber, index: number): string {
  if (barber.photoUrl.trim()) return barber.photoUrl;
  return fallbackPhotos[index % fallbackPhotos.length] || okanPhoto;
}

export function Team({ barbers }: { barbers: Barber[] }) {
  return (
    <section id="berberlerimiz" className="relative py-28 lg:py-36 bg-navy">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <p className="font-sub text-xs tracking-[0.3em] uppercase text-gold mb-6">
            <span className="inline-block w-8 h-px bg-gold align-middle mr-3" />
            Ustalarımız
          </p>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
            <h2 className="font-display text-6xl lg:text-8xl text-bone">
              EKİBİ<span className="text-gold">MİZ</span>
            </h2>
            <p className="text-bone/60 max-w-md">
              Okan Yıldız Barber's Club ailesi, sadece saç kesen değil, ilişki kuran ustalardan
              oluşur.
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {barbers.map((barber, index) => (
            <Reveal key={barber.id} delay={index * 0.08}>
              <article className="group bg-card-dark border border-border-soft rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-gold/40">
                <div className="p-5 lg:p-6">
                  <div
                    className="relative w-full rounded-lg overflow-hidden bg-navy-3"
                    style={{ aspectRatio: "3 / 4" }}
                  >
                    <ImageWithFallback src={resolvePhoto(barber, index)} alt={barber.name} />
                    {index === 0 && (
                      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-navy/90 backdrop-blur-sm text-bone font-sub text-xs px-3 py-1.5 rounded-full border border-border-soft">
                        <Star size={12} className="text-gold" fill="currentColor" strokeWidth={0} />
                        <span className="tracking-wider">5.0</span>
                        <span className="text-bone/50">(203)</span>
                      </span>
                    )}
                  </div>

                  <div className="pt-6">
                    <h3 className="font-display text-3xl tracking-wider text-bone">
                      {barber.name.toUpperCase()}
                    </h3>
                    <p className="font-sub text-[11px] tracking-[0.25em] uppercase text-gold mt-2">
                      {barber.title || "Uzman Berber"}
                    </p>

                    <div className="mt-4 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-sub text-xs tracking-[0.2em] uppercase text-bone/70">
                        Bugun musait
                      </span>
                    </div>

                    <p className="text-bone/50 text-sm mt-3">
                      {barber.bio || "Kisisel bakim ve detay odakli premium servis deneyimi."}
                    </p>

                    <a
                      href="#randevu"
                      className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-gold text-navy font-sub text-[11px] tracking-[0.25em] uppercase py-3.5 rounded hover:bg-gold-light transition-colors"
                    >
                      Randevu Al <ArrowRight size={14} />
                    </a>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
