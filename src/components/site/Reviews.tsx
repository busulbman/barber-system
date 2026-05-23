import { Star } from "lucide-react";
import { Reveal } from "./Reveal";

const reviews = [
  {
    t: "Başakşehir'in en iyi berberi kesinlikle. Hem saç hem sakal konusunda gerçekten ustalar. VIP oda deneyimi çok farklı.",
    n: "Ahmet K.",
  },
  {
    t: "Okan Bey ve ekibi işinin gerçek ustası. Her gittiğimde ayrı bir özen görüyorum. Kesinlikle tavsiye ediyorum.",
    n: "Mert Y.",
  },
  {
    t: "Çocuk traşı için de gidiyoruz artık. Hem temiz hem profesyonel bir ortam. Fiyatlar da gayet makul.",
    n: "Can D.",
  },
];

export function Reviews() {
  return (
    <section className="relative py-28 lg:py-36 bg-navy">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <p className="font-sub text-xs tracking-[0.3em] uppercase text-gold mb-6">
            <span className="inline-block w-8 h-px bg-gold align-middle mr-3" />
            Yorumlar
          </p>
          <h2 className="font-display text-6xl lg:text-8xl text-bone mb-16">
            MÜŞTERİ<span className="text-gold">LERİMİZ</span>
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((r, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <article className="border border-border-soft bg-card-dark p-8 h-full flex flex-col">
                <div className="flex gap-1 text-gold mb-5">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} size={16} fill="currentColor" strokeWidth={0} />
                  ))}
                </div>
                <p className="text-bone/80 leading-relaxed flex-1">"{r.t}"</p>
                <footer className="mt-6 pt-6 border-t border-border-soft flex items-center justify-between">
                  <span className="font-sub text-xs tracking-[0.2em] uppercase text-bone">
                    {r.n}
                  </span>
                  <span className="font-sub text-[10px] tracking-[0.2em] uppercase text-gold">
                    Google Yorumu
                  </span>
                </footer>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
