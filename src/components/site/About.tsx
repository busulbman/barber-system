import { Reveal } from "./Reveal";
import { ImageWithFallback } from "./ImageWithFallback";
import poster from "@/assets/poster.jpg";

export function About() {
  return (
    <section id="hakkimizda" className="relative py-28 lg:py-36 bg-navy">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        {/* Image */}
        <Reveal className="relative">
          <div className="relative aspect-[4/5] overflow-hidden bg-navy-3">
            <ImageWithFallback src={poster} alt="Okan Yıldız Barber's Club" />
          </div>
          <div className="absolute -top-5 -left-5 w-24 h-24 border-2 border-gold pointer-events-none" />
          <div className="absolute -bottom-5 -right-5 w-32 h-32 border-2 border-gold/60 pointer-events-none" />
        </Reveal>

        <div>
          <Reveal>
            <p className="font-sub text-xs tracking-[0.3em] uppercase text-gold mb-6">
              <span className="inline-block w-8 h-px bg-gold align-middle mr-3" />
              Hakkımızda
            </p>
            <h2 className="font-display text-7xl lg:text-8xl text-bone leading-[0.9] mb-10">
              OKAN <br />
              <span className="text-gold">YILDIZ</span>
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mb-8">
              <h3 className="font-sub text-sm tracking-[0.2em] uppercase text-bone mb-3">
                Biz Kimiz
              </h3>
              <p className="text-bone/70 leading-relaxed">
                Okan Yıldız Barber's Club, premium erkek bakımında yeni bir standart belirlemek
                üzere Başakşehir'de kurulmuştur. Deneyimli berberlerimiz, her müşterimize kişisel ve
                özel bir deneyim sunar.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mb-8">
              <h3 className="font-sub text-sm tracking-[0.2em] uppercase text-bone mb-3">
                Farkımız
              </h3>
              <p className="text-bone/70 leading-relaxed">
                Sadece berber değil — tam anlamıyla bir premium bakım deneyimi. VIP oda, sauna,
                buhar odası, cilt bakımı ve çok daha fazlası tek çatı altında.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.3}>
            <blockquote className="border-l-2 border-gold pl-6 py-2 my-10">
              <p className="text-bone/90 italic text-lg leading-relaxed mb-3">
                "Her müşterimiz için sadece saç değil, özgüven ve kimlik yaratıyoruz."
              </p>
              <footer className="font-sub text-xs tracking-[0.2em] uppercase text-gold">
                — Okan Yıldız, Kurucu
              </footer>
            </blockquote>
          </Reveal>

          <Reveal delay={0.4}>
            <div className="grid grid-cols-3 gap-4 mt-10">
              {[
                { n: "10+", l: "Yıl Deneyim" },
                { n: "5K+", l: "Mutlu Müşteri" },
                { n: "15+", l: "Hizmet Çeşidi" },
              ].map((s) => (
                <div key={s.l} className="border border-border-soft bg-card-dark p-5 text-center">
                  <div className="font-display text-4xl lg:text-5xl text-gold">{s.n}</div>
                  <div className="font-sub text-[10px] tracking-[0.2em] uppercase text-bone/60 mt-2">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
