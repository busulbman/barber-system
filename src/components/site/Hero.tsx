import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section id="top" className="relative min-h-screen flex items-center overflow-hidden bg-navy">
      {/* Gold left stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-gold z-10" />

      {/* Grid overlay */}
      <div className="absolute inset-0 gold-grid opacity-40 pointer-events-none" />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 75% 50%, rgba(245,184,0,0.12), transparent 55%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto w-full px-6 lg:px-10 pt-32 pb-24">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="font-sub text-[11px] sm:text-xs tracking-[0.3em] uppercase text-gold mb-8"
        >
          <span className="inline-block w-8 h-px bg-gold align-middle mr-3" />
          Premium Erkek Kuaförü & Berber Stüdyosu — Başakşehir, İstanbul
        </motion.p>

        <h1 className="font-display text-bone leading-[0.85] mb-10">
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="block text-[18vw] sm:text-[14vw] lg:text-[11vw]"
          >
            TARZINI
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
            className="block text-gold text-[18vw] sm:text-[14vw] lg:text-[11vw]"
          >
            YÜKSELTİYORUZ
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.7 }}
          className="max-w-xl text-bone/70 text-base lg:text-lg mb-10 text-balance"
        >
          Geleneksel berberlik sanatı ile modern styling'in buluştuğu yer. Her kesim, bir imza. Her
          müşteri, bir aile.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <a
            href="#randevu"
            className="group inline-flex items-center justify-center gap-3 bg-gold text-navy font-sub tracking-[0.2em] uppercase text-xs px-8 py-4 hover:bg-gold-light transition-colors"
          >
            Randevu Al
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="#hizmetler"
            className="inline-flex items-center justify-center gap-3 border border-bone/30 text-bone font-sub tracking-[0.2em] uppercase text-xs px-8 py-4 hover:border-gold hover:text-gold transition-colors"
          >
            Hizmetlerimiz
          </a>
        </motion.div>
      </div>

      {/* Bottom strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="absolute bottom-0 left-0 right-0 border-t border-border-soft bg-navy/60 backdrop-blur-sm"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-5 overflow-x-auto">
          <p className="font-sub text-[10px] sm:text-xs tracking-[0.25em] uppercase text-bone/60 whitespace-nowrap">
            Saç Kesimi <span className="text-gold mx-3">—</span>
            Sakal Bakımı <span className="text-gold mx-3">—</span>
            VIP Oda <span className="text-gold mx-3">—</span>
            Sauna <span className="text-gold mx-3">—</span>
            Cilt Bakımı <span className="text-gold mx-3">—</span>
            Buhar Odası <span className="text-gold mx-3">—</span>
            Çocuk Traşı
          </p>
        </div>
      </motion.div>
    </section>
  );
}
