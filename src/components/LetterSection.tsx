import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";

// Seeded random for deterministic fiber generation
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface TearPoint {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
}

// Generate organic jagged edge points between two tear points
function generateJaggedEdge(
  p1: TearPoint,
  p2: TearPoint,
  jaggedness: number,
  segments: number,
  seed: number,
): TearPoint[] {
  const rng = seededRandom(seed);
  const points: TearPoint[] = [p1];
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  // Normal perpendicular to the segment
  const nx = -dy / (len || 1);
  const ny = dx / (len || 1);

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const baseX = p1.x + dx * t;
    const baseY = p1.y + dy * t;
    // Offset perpendicular to the line with organic randomness
    const offset = (rng() - 0.5) * 2 * jaggedness;
    // Add micro-jitter for fiber realism
    const microX = (rng() - 0.5) * jaggedness * 0.3;
    const microY = (rng() - 0.5) * jaggedness * 0.3;
    points.push({
      x: baseX + nx * offset + microX,
      y: baseY + ny * offset + microY,
    });
  }
  points.push(p2);
  return points;
}

// Build an SVG path from points
function pointsToSvgPath(points: TearPoint[], w: number, h: number): string {
  if (points.length === 0) return "";
  const cmds = points.map((p, i) => {
    const x = p.x * w;
    const y = p.y * h;
    return i === 0
      ? `M${x.toFixed(1)},${y.toFixed(1)}`
      : `L${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return cmds.join(" ");
}

// Generate fiber whisker SVG elements along a tear line
function generateFibers(
  tearPoints: TearPoint[],
  w: number,
  h: number,
  count: number,
  seed: number,
): { x1: number; y1: number; x2: number; y2: number; opacity: number }[] {
  const rng = seededRandom(seed);
  const fibers: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    opacity: number;
  }[] = [];
  if (tearPoints.length < 2) return fibers;

  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * (tearPoints.length - 1));
    const p = tearPoints[idx];
    const pNext = tearPoints[idx + 1];
    const t = rng();
    const bx = (p.x + (pNext.x - p.x) * t) * w;
    const by = (p.y + (pNext.y - p.y) * t) * h;
    const angle = rng() * Math.PI * 2;
    const fiberLen = 2 + rng() * 6;
    fibers.push({
      x1: bx,
      y1: by,
      x2: bx + Math.cos(angle) * fiberLen,
      y2: by + Math.sin(angle) * fiberLen,
      opacity: 0.15 + rng() * 0.25,
    });
  }
  return fibers;
}

interface LetterSectionProps {
  onRevealed?: () => void;
}

const LetterSection = ({ onRevealed }: LetterSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tearProgress, setTearProgress] = useState(0);
  const [tearPath, setTearPath] = useState<TearPoint[]>([]);
  const [completedTear, setCompletedTear] = useState<TearPoint[] | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastPointRef = useRef<TearPoint | null>(null);
  const isMobileRef = useRef(false);

  useEffect(() => {
    isMobileRef.current =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "start 0.3"],
  });

  const letterOpacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const letterY = useTransform(scrollYProgress, [0, 1], [60, 0]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isRevealed) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setMousePos({ x, y });
    }
  };

  const handleMouseLeave = () => setMousePos({ x: 0, y: 0 });

  // Get normalized position within the cover
  const getNormalizedPos = useCallback(
    (clientX: number, clientY: number): TearPoint | null => {
      const el = coverRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
      };
    },
    [],
  );

  const handleCoverPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isRevealed) return;
      const pos = getNormalizedPos(e.clientX, e.clientY);
      if (!pos) return;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      lastPointRef.current = pos;
      setIsDragging(true);
      setTearPath([pos]);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isRevealed, getNormalizedPos],
  );

  const handleCoverPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragStartRef.current || isRevealed) return;

      const pos = getNormalizedPos(e.clientX, e.clientY);
      if (!pos || !lastPointRef.current) return;

      // Only add point if moved enough (prevents clustered points)
      const dx = pos.x - lastPointRef.current.x;
      const dy = pos.y - lastPointRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.012) {
        lastPointRef.current = pos;
        setTearPath((prev) => [...prev, pos]);
      }

      // Progress based on how far the tear has traveled across the cover
      // Use the cover's actual dimensions so you must drag nearly the full height/width
      const el = coverRef.current;
      const coverDiagonal = el
        ? Math.sqrt(el.offsetWidth ** 2 + el.offsetHeight ** 2)
        : 700;
      // Require dragging ~85% of the cover diagonal to complete
      const requiredDist = coverDiagonal * 0.85;

      const totalDx = e.clientX - dragStartRef.current.x;
      const totalDy = e.clientY - dragStartRef.current.y;
      const totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
      const progress = Math.min(totalDist / requiredDist, 1);
      setTearProgress(progress);

      // Also check if the cursor has reached near an edge of the cover
      const nearEdge =
        pos.x <= 0.03 || pos.x >= 0.97 || pos.y <= 0.03 || pos.y >= 0.97;

      if (progress >= 1 || (progress >= 0.75 && nearEdge)) {
        finishTear(pos);
      }
    },
    [isDragging, isRevealed, getNormalizedPos],
  );

  const finishTear = useCallback(
    (lastPos?: TearPoint) => {
      setTearPath((currentPath) => {
        // Extend the tear path to reach edges to create a complete cut
        const finalPath = [...currentPath];
        if (lastPos) finalPath.push(lastPos);

        if (finalPath.length >= 2) {
          const first = finalPath[0];
          const last = finalPath[finalPath.length - 1];

          // Extend start point to nearest edge
          const startEdge = extendToEdge(
            first,
            finalPath.length > 1 ? finalPath[1] : first,
            true,
          );
          // Extend end point to nearest edge
          const endEdge = extendToEdge(
            last,
            finalPath.length > 1 ? finalPath[finalPath.length - 2] : last,
            false,
          );

          const completePath = [startEdge, ...finalPath, endEdge];
          setCompletedTear(completePath);
        }
        return finalPath;
      });

      setIsRevealed(true);
      setIsDragging(false);
      dragStartRef.current = null;
      lastPointRef.current = null;
      onRevealed?.();
    },
    [onRevealed],
  );

  const handleCoverPointerUp = useCallback(() => {
    if (isRevealed) return;

    // Check if the last point is near an edge — if so, they tore all the way across
    const lastPt = lastPointRef.current;
    const nearEdge = lastPt
      ? lastPt.x <= 0.04 ||
        lastPt.x >= 0.96 ||
        lastPt.y <= 0.04 ||
        lastPt.y >= 0.96
      : false;

    if (tearProgress >= 0.85 || (tearProgress >= 0.6 && nearEdge)) {
      // Tore far enough — finish
      finishTear();
    } else {
      // Not enough — snap back
      setTearPath([]);
      setTearProgress(0);
    }
    setIsDragging(false);
    dragStartRef.current = null;
    lastPointRef.current = null;
  }, [tearProgress, isRevealed, finishTear]);

  // Tap to open fallback for mobile
  const handleTapOpen = useCallback(() => {
    if (isRevealed || isDragging) return;
    if (!isMobileRef.current) return;

    // Simulate a diagonal tear
    const fakeTear: TearPoint[] = [];
    const rng = seededRandom(42);
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      fakeTear.push({
        x: 0.1 + t * 0.8 + (rng() - 0.5) * 0.03,
        y: 0.3 + t * 0.4 + (rng() - 0.5) * 0.03,
      });
    }
    setTearPath(fakeTear);
    setTearProgress(1);
    setCompletedTear([{ x: 0, y: 0.28 }, ...fakeTear, { x: 1, y: 0.72 }]);
    setIsRevealed(true);
    onRevealed?.();
  }, [isRevealed, isDragging, onRevealed]);

  // Compute the jagged tear line from the raw tear path
  const jaggedTearPoints = useMemo(() => {
    const source = completedTear || (tearPath.length >= 2 ? tearPath : null);
    if (!source || source.length < 2) return [];

    const allJagged: TearPoint[] = [];
    for (let i = 0; i < source.length - 1; i++) {
      const jagged = generateJaggedEdge(
        source[i],
        source[i + 1],
        0.012 + tearProgress * 0.008,
        4,
        i * 137 + 7,
      );
      // Skip first point of subsequent segments to avoid duplicates
      if (i === 0) allJagged.push(...jagged);
      else allJagged.push(...jagged.slice(1));
    }
    return allJagged;
  }, [tearPath, completedTear, tearProgress]);

  // Fibers along the tear line
  const tearFibers = useMemo(() => {
    if (jaggedTearPoints.length < 2) return [];
    return generateFibers(
      jaggedTearPoints,
      100,
      100,
      Math.floor(tearProgress * 40),
      999,
    );
  }, [jaggedTearPoints, tearProgress]);

  // Deterministic paper texture fibers
  const paperTexture = useMemo(() => {
    const rng = seededRandom(12345);
    const lines: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      opacity: number;
    }[] = [];
    for (let i = 0; i < 50; i++) {
      const x1 = rng() * 100;
      const y1 = rng() * 100;
      lines.push({
        x1,
        y1,
        x2: x1 + (rng() - 0.5) * 12,
        y2: y1 + (rng() - 0.5) * 5,
        opacity: 0.02 + rng() * 0.04,
      });
    }
    return lines;
  }, []);

  // Build clip paths for the two torn halves
  const { topClip, bottomClip } = useMemo(() => {
    if (jaggedTearPoints.length < 2) {
      return { topClip: "", bottomClip: "" };
    }

    // Top piece: from top-left, along top edge, down right side, along tear line reversed, back up left side
    const tearPathStr = jaggedTearPoints
      .map((p) => `${(p.x * 100).toFixed(1)}% ${(p.y * 100).toFixed(1)}%`)
      .join(", ");
    const tearPathReversed = [...jaggedTearPoints]
      .reverse()
      .map((p) => `${(p.x * 100).toFixed(1)}% ${(p.y * 100).toFixed(1)}%`)
      .join(", ");

    const top = `polygon(0% 0%, 100% 0%, 100% 100%, ${tearPathReversed}, 0% 100%)`;
    const bottom = `polygon(0% 0%, ${tearPathStr}, 100% 0%, 100% 100%, 0% 100%)`;

    // Top half: everything above the tear line
    // We construct: top-left corner → top-right corner → walk down right edge to tear start on right → follow tear reversed → down left edge from tear start on left → top-left
    // Simplified: use the tear line to split

    const firstTear = jaggedTearPoints[0];
    const lastTear = jaggedTearPoints[jaggedTearPoints.length - 1];

    const topPath = `polygon(0% 0%, 100% 0%, 100% ${(lastTear.y * 100).toFixed(1)}%, ${tearPathReversed}, 0% ${(firstTear.y * 100).toFixed(1)}%)`;
    const bottomPath = `polygon(0% ${(firstTear.y * 100).toFixed(1)}%, ${tearPathStr}, 100% ${(lastTear.y * 100).toFixed(1)}%, 100% 100%, 0% 100%)`;

    return { topClip: topPath, bottomClip: bottomPath };
  }, [jaggedTearPoints]);

  return (
    <section
      id="letter-section"
      ref={sectionRef}
      className="flex min-h-screen items-center justify-center bg-background px-4 py-10 sm:px-6 sm:py-20"
    >
      <motion.div
        style={{ opacity: letterOpacity, y: letterY }}
        className="w-full max-w-2xl"
      >
        <div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="perspective-[1200px]"
        >
          <div className="relative">
            {/* ========== THE LETTER ========== */}
            <motion.div
              className="rounded-sm bg-parchment px-6 py-8 sm:px-14 sm:py-12"
              animate={{
                rotateY: isRevealed ? mousePos.x * 22 : 0,
                rotateX: isRevealed ? mousePos.y * -22 : 0,
                x: isRevealed ? mousePos.x * 18 : 0,
                y: isRevealed ? mousePos.y * 14 : 0,
                boxShadow: !isRevealed
                  ? "0 8px 40px -12px hsl(350 40% 60% / 0.2), 0 2px 12px -4px hsl(350 30% 50% / 0.08)"
                  : mousePos.x === 0 && mousePos.y === 0
                    ? "0 8px 40px -12px hsl(350 40% 60% / 0.2), 0 2px 12px -4px hsl(350 30% 50% / 0.08)"
                    : `${-mousePos.x * 30}px ${-mousePos.y * 20 + 16}px 50px -10px hsl(350 40% 60% / 0.3), ${-mousePos.x * 12}px ${-mousePos.y * 8 + 6}px 16px -4px hsl(350 30% 50% / 0.12)`,
              }}
              transition={{
                type: "spring",
                stiffness: 80,
                damping: 18,
                mass: 1,
              }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <p className="mb-5 text-right font-body text-sm tracking-wide text-muted-foreground sm:mb-8">
                February 14, 2026
              </p>
              <p className="mb-4 font-script text-xl text-primary sm:mb-6 sm:text-3xl">
                My Dearest Rain,
              </p>
              <div className="space-y-3 font-body text-sm leading-relaxed tracking-wide text-ink sm:space-y-5 sm:text-lg sm:leading-relaxed">
                <p>
                  There are words I carry with me that I've never quite been
                  able to say out loud. So I wrote them here, for you. I
                  apologize for the delay, but I did my best to make it within
                  the Valentine's Day.
                </p>
                <p>
                  And then you came into my life not to change me overnight, not
                  to demand anything, but to stay. You stood beside me through
                  the confusion, through my mistakes, through days when I wasn't
                  my best self. You chose patience when I made things difficult,
                  and forgiveness when I didn't always deserve it.
                </p>
                <p>
                  Thank you for believing in me even when I struggled to believe
                  in myself. Thank you for staying, for understanding, and for
                  loving me with a kind of grace I will never take for granted.
                </p>
                <p>
                  I want to make things right. I want to walk a better path, not
                  just for me, but for us. I want to build something honest,
                  steady, and beautiful with you. Let's turn our plans into
                  memories, our dreams into reality, and choose each other every
                  day for the rest of our lives. I can't wait to be with you.
                </p>
                <p>
                  And if I may ask for one small favor…
                </p>
                <p>
                  Let me buy you a flower.
                </p>
              </div>
              <div className="mt-6 text-right sm:mt-10">
                <p className="font-body text-sm tracking-wide text-muted-foreground">
                  Forever Yours,
                </p>
                <p className="mt-1 font-script text-xl text-primary sm:text-2xl">
                  Pierce
                </p>
              </div>
              <div className="mx-auto mt-6 h-px w-16 bg-primary/20 sm:mt-10" />
            </motion.div>

            {/* ========== PAPER COVER ========== */}
            <AnimatePresence>
              {!isRevealed ? (
                /* ---- Pre-tear: single cover with live tear preview ---- */
                <motion.div
                  ref={coverRef}
                  className="absolute inset-0 z-10 select-none overflow-hidden rounded-sm"
                  onPointerDown={handleCoverPointerDown}
                  onPointerMove={handleCoverPointerMove}
                  onPointerUp={handleCoverPointerUp}
                  onClick={handleTapOpen}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.4, ease: "easeOut" },
                  }}
                  style={{
                    touchAction: "none",
                    cursor: isDragging ? "grabbing" : "grab",
                    background:
                      "linear-gradient(135deg, hsl(350 55% 42%) 0%, hsl(350 50% 38%) 40%, hsl(348 48% 34%) 100%)",
                  }}
                >
                  {/* Paper texture */}
                  <svg className="pointer-events-none absolute inset-0 h-full w-full">
                    {paperTexture.map((line, i) => (
                      <line
                        key={i}
                        x1={`${line.x1}%`}
                        y1={`${line.y1}%`}
                        x2={`${line.x2}%`}
                        y2={`${line.y2}%`}
                        stroke="hsl(350 30% 55%)"
                        strokeWidth="0.5"
                        opacity={line.opacity}
                      />
                    ))}
                  </svg>

                  {/* Subtle vignette */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(ellipse at center, transparent 40%, hsl(350 50% 25% / 0.15) 100%)",
                    }}
                  />

                  {/* Live tear preview line */}
                  {isDragging && jaggedTearPoints.length >= 2 && (
                    <svg
                      className="pointer-events-none absolute inset-0 h-full w-full"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      {/* Tear gap — slightly transparent strip along tear */}
                      <path
                        d={pointsToSvgPath(jaggedTearPoints, 100, 100)}
                        fill="none"
                        stroke="hsl(350 40% 25% / 0.6)"
                        strokeWidth={0.3 + tearProgress * 0.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* White gap showing through */}
                      <path
                        d={pointsToSvgPath(jaggedTearPoints, 100, 100)}
                        fill="none"
                        stroke="hsl(35 30% 92% / 0.4)"
                        strokeWidth={tearProgress * 0.5}
                        strokeLinecap="round"
                      />
                      {/* Fibers along the tear */}
                      {tearFibers.map((f, i) => (
                        <line
                          key={i}
                          x1={f.x1}
                          y1={f.y1}
                          x2={f.x2}
                          y2={f.y2}
                          stroke="hsl(350 35% 55% / 0.5)"
                          strokeWidth="0.15"
                          opacity={f.opacity}
                        />
                      ))}
                    </svg>
                  )}

                  {/* Wax seal */}
                  <motion.div
                    className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-4"
                    animate={{
                      opacity: 1 - tearProgress * 1.5,
                      scale: 1 - tearProgress * 0.08,
                    }}
                  >
                    <div
                      className="flex h-24 w-24 flex-col items-center justify-center rounded-full sm:h-28 sm:w-28"
                      style={{
                        background:
                          "radial-gradient(circle at 40% 35%, hsl(350 70% 50%), hsl(350 65% 35%) 70%)",
                        boxShadow:
                          "0 4px 20px -4px hsl(350 50% 30% / 0.5), inset 0 1px 2px hsl(350 60% 60% / 0.3)",
                      }}
                    >
                      <span className="font-script text-sm leading-tight text-primary-foreground/90 sm:text-base">
                        Tear
                      </span>
                      <span className="font-script text-sm leading-tight text-primary-foreground/90 sm:text-base">
                        me
                      </span>
                    </div>
                  </motion.div>

                  {/* Drag hint */}
                  <motion.div
                    className="pointer-events-none absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-2"
                    animate={{
                      opacity: isDragging ? 0 : [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <span className="font-body text-xs tracking-[0.15em] uppercase text-primary-foreground/40 sm:text-sm">
                      click & drag to tear
                    </span>
                  </motion.div>
                </motion.div>
              ) : completedTear && jaggedTearPoints.length >= 2 ? (
                /* ---- Post-tear: two halves separating ---- */
                <>
                  {/* Top torn piece — drifts up and fades */}
                  <motion.div
                    className="absolute inset-0 z-10 overflow-visible rounded-sm"
                    initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                    animate={{ x: -30, y: -60, rotate: -3, opacity: 0 }}
                    transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                    style={{
                      clipPath: topClip,
                      background:
                        "linear-gradient(135deg, hsl(350 55% 42%) 0%, hsl(350 50% 38%) 40%, hsl(348 48% 34%) 100%)",
                    }}
                  >
                    <svg className="pointer-events-none absolute inset-0 h-full w-full">
                      {paperTexture.map((line, i) => (
                        <line
                          key={i}
                          x1={`${line.x1}%`}
                          y1={`${line.y1}%`}
                          x2={`${line.x2}%`}
                          y2={`${line.y2}%`}
                          stroke="hsl(350 30% 55%)"
                          strokeWidth="0.5"
                          opacity={line.opacity}
                        />
                      ))}
                    </svg>
                    {/* Torn edge fiber fringe */}
                    <svg
                      className="pointer-events-none absolute inset-0 h-full w-full"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      {tearFibers.map((f, i) => (
                        <line
                          key={i}
                          x1={f.x1}
                          y1={f.y1}
                          x2={f.x2}
                          y2={f.y2}
                          stroke="hsl(350 40% 60% / 0.6)"
                          strokeWidth="0.2"
                          opacity={f.opacity}
                        />
                      ))}
                    </svg>
                  </motion.div>

                  {/* Bottom torn piece — drifts down and fades */}
                  <motion.div
                    className="absolute inset-0 z-10 overflow-visible rounded-sm"
                    initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                    animate={{ x: 25, y: 50, rotate: 2.5, opacity: 0 }}
                    transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                    style={{
                      clipPath: bottomClip,
                      background:
                        "linear-gradient(135deg, hsl(350 55% 42%) 0%, hsl(350 50% 38%) 40%, hsl(348 48% 34%) 100%)",
                    }}
                  >
                    <svg className="pointer-events-none absolute inset-0 h-full w-full">
                      {paperTexture.map((line, i) => (
                        <line
                          key={i}
                          x1={`${line.x1}%`}
                          y1={`${line.y1}%`}
                          x2={`${line.x2}%`}
                          y2={`${line.y2}%`}
                          stroke="hsl(350 30% 55%)"
                          strokeWidth="0.5"
                          opacity={line.opacity}
                        />
                      ))}
                    </svg>
                    <svg
                      className="pointer-events-none absolute inset-0 h-full w-full"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      {tearFibers.map((f, i) => (
                        <line
                          key={i}
                          x1={f.x1}
                          y1={f.y1}
                          x2={f.x2}
                          y2={f.y2}
                          stroke="hsl(350 40% 60% / 0.6)"
                          strokeWidth="0.2"
                          opacity={f.opacity}
                        />
                      ))}
                    </svg>
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

// Extend a point toward the nearest edge based on direction
function extendToEdge(
  point: TearPoint,
  neighbor: TearPoint,
  isStart: boolean,
): TearPoint {
  const dx = isStart ? point.x - neighbor.x : point.x - neighbor.x;
  const dy = isStart ? point.y - neighbor.y : point.y - neighbor.y;

  // Find which edge to extend to
  // Project the direction outward to hit an edge
  const candidates: TearPoint[] = [];

  if (dx !== 0) {
    // Left edge
    const tLeft = -point.x / dx;
    if (tLeft > 0) candidates.push({ x: 0, y: point.y + dy * tLeft });
    // Right edge
    const tRight = (1 - point.x) / dx;
    if (tRight > 0) candidates.push({ x: 1, y: point.y + dy * tRight });
  }
  if (dy !== 0) {
    // Top edge
    const tTop = -point.y / dy;
    if (tTop > 0) candidates.push({ x: point.x + dx * tTop, y: 0 });
    // Bottom edge
    const tBottom = (1 - point.y) / dy;
    if (tBottom > 0) candidates.push({ x: point.x + dx * tBottom, y: 1 });
  }

  // Pick the closest valid edge point
  let best = { x: Math.max(0, Math.min(1, point.x)), y: 0 }; // fallback: top edge
  let bestDist = Infinity;
  for (const c of candidates) {
    if (c.x >= -0.01 && c.x <= 1.01 && c.y >= -0.01 && c.y <= 1.01) {
      const d = (c.x - point.x) ** 2 + (c.y - point.y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = {
          x: Math.max(0, Math.min(1, c.x)),
          y: Math.max(0, Math.min(1, c.y)),
        };
      }
    }
  }
  return best;
}

export default LetterSection;
