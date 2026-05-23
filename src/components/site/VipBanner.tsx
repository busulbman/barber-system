import { Reveal } from "./Reveal";

const tags = [
  "VIP Oda",
  "Sauna",
  "Buhar Odası",
  "Mescid",
  "Manikür",
  "Pedikür",
  "Cilt Bakımı",
  "Çocuk Traşı",
];

export function VipBanner() {
  return (
    <section className="relative bg-gold py-24 lg:py-28 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #0a0f1e 0, #0a0f1e 1px, transparent 1px, transparent 14px)",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <p className="font-sub text-[11px] tracking-[0.3em] uppercase text-navy/70 mb-5">
            — Premium Deneyim
          </p>
          <h2 className="font-display text-6xl lg:text-8xl text-navy leading-[0.9]">
            VIP CLUB <br /> DENEYİMİ
          </h2>
          <p className="text-navy/80 max-w-md mt-6 text-lg">
            Sıradan bir berber ziyaretinin çok ötesinde — sadece size özel.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            {tags.map((t) => (
              <span
                key={t}
                className="font-sub text-xs tracking-[0.2em] uppercase text-navy border border-navy/40 px-5 py-3 hover:bg-navy hover:text-gold transition-colors"
              >
                {t}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
