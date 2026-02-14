import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const HeroSection = () => {
  const scrollToLetter = () => {
    document.getElementById("letter-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      {/* Subtle floating petals background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-blush opacity-40"
            style={{
              width: 8 + Math.random() * 16,
              height: 8 + Math.random() * 16,
              left: `${15 + Math.random() * 70}%`,
              top: `${10 + Math.random() * 80}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, 10 * (i % 2 === 0 ? 1 : -1), 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 6 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <motion.div
        className="relative z-10 flex flex-col items-center gap-6 px-6 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        <motion.p
          className="font-script text-lg tracking-wide text-rose-soft sm:text-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          a letter for you
        </motion.p>

        <motion.h1
          className="font-display text-5xl font-semibold leading-tight tracking-tight text-primary sm:text-7xl md:text-8xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 1.2 }}
        >
          Happy Valentine's
          <br />
          <span className="font-script text-accent">Rain</span>
        </motion.h1>

        <motion.div
          className="mt-2 h-px w-24 bg-primary/30"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
        />
      </motion.div>

      <motion.button
        onClick={scrollToLetter}
        className="absolute bottom-10 z-10 flex flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        aria-label="Scroll to letter"
      >
        <span className="font-body text-sm tracking-widest uppercase">Read my letter</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </motion.button>
    </section>
  );
};

export default HeroSection;
