import { useState, useCallback, useEffect } from "react";
import HeroSection from "@/components/HeroSection";
import LetterSection from "@/components/LetterSection";
import FlowerSection from "@/components/FlowerSection";
import BackgroundMusic from "@/components/BackgroundMusic";

const Index = () => {
  const [scrollUnlocked, setScrollUnlocked] = useState(false);

  const handleRevealed = useCallback(() => {
    // Wait 5 seconds after the tear before allowing scroll to the flower section
    setTimeout(() => setScrollUnlocked(true), 5000);
  }, []);

  // Always scroll to top on load/reload
  useEffect(() => {
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);

  // Lock/unlock scroll on the body
  useEffect(() => {
    if (!scrollUnlocked) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [scrollUnlocked]);

  return (
    <main className="bg-background">
      <BackgroundMusic />
      <HeroSection />
      <LetterSection onRevealed={handleRevealed} />
      {scrollUnlocked && <FlowerSection />}
    </main>
  );
};

export default Index;
