import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BackgroundMusic = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [entered, setEntered] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  // Called once on the very first click — this is the user gesture that unlocks audio
  const enter = useCallback(() => {
    if (entered) return;

    const audio = new Audio("/a-thousand-years.mp3");
    audio.loop = true;
    audio.volume = 0.2;
    audioRef.current = audio;

    audio.addEventListener("pause", () => setUserPaused(true));
    audio.addEventListener("play", () => setUserPaused(false));

    // This play() call is inside a direct click handler — browsers will allow it
    audio.play().catch(() => {});

    setEntered(true);
  }, [entered]);

  const toggleMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  return (
    <>
      {/* Gate screen — click anywhere to enter and start music */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            className="fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-background"
            onClick={enter}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <motion.p
              className="font-body text-sm tracking-[0.2em] uppercase text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              tap to begin
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating toggle button — visible after entering */}
      {entered && (
        <motion.button
          onClick={toggleMusic}
          className="fixed bottom-5 right-5 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-background/80 text-primary/60 shadow-lg backdrop-blur-sm transition-colors hover:border-primary/40 hover:text-primary"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          aria-label={userPaused ? "Play music" : "Pause music"}
        >
          {!userPaused ? (
            <div className="flex items-end gap-[3px]" style={{ height: 16 }}>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-full bg-current"
                  animate={{ height: [4, 14, 6, 12, 4] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </motion.button>
      )}
    </>
  );
};

export default BackgroundMusic;
