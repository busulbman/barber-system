import { Reveal } from "./Reveal";
import { ImageWithFallback } from "./ImageWithFallback";
import interior from "@/assets/interior.jpg";
import cut1 from "@/assets/cut-1.jpg";
import cut2 from "@/assets/cut-2.jpg";
import cut3 from "@/assets/cut-3.jpg";
import storefront from "@/assets/storefront.jpg";

const items = [
  { src: interior, c: "Hassasiyet ve sanat burada yaşar", large: true },
  { src: cut1, c: "Modern centilmen için imza görünümler" },
  { src: cut2, c: "Her detay, mükemmellik için" },
  { src: cut3, c: "Geleneksel ustalık, modern dokunuş" },
  { src: storefront, c: "Başakşehir'de premium adres" },
];

export function Gallery() {
  return (
    <section id="galeri" className="relative py-28 lg:py-36 bg-navy-2 border-y border-border-soft">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <p className="font-sub text-xs tracking-[0.3em] uppercase text-gold mb-6">
            <span className="inline-block w-8 h-px bg-gold align-middle mr-3" />
            The Craft
          </p>
          <h2 className="font-display text-6xl lg:text-8xl text-bone mb-16">
            USTA<span className="text-gold">LIK</span>
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {items.map((it, i) => (
            <Reveal
              key={i}
              delay={i * 0.07}
              className={it.large ? "lg:col-span-1 lg:row-span-2" : ""}
            >
              <figure
                className={`group relative overflow-hidden bg-navy-3 ${
                  it.large ? "h-full min-h-[500px]" : "aspect-[4/3]"
                }`}
              >
                <ImageWithFallback src={it.src} alt={it.c} />
                <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <figcaption className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none">
                  <p className="font-sub text-xs tracking-[0.2em] uppercase text-gold">{it.c}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
