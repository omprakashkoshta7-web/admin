import { useEffect, useRef, useState } from "react";

interface AnimatedCountProps {
  value: number;
  className?: string;
}

/**
 * Displays a number that animates (counts down/up) when the value changes.
 * Shows a brief flash effect when count decreases (resolved/completed).
 */
const AnimatedCount: React.FC<AnimatedCountProps> = ({ value, className = "" }) => {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState<"decrease" | "increase" | null>(null);
  const prevRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === value) return;

    const direction = value < prev ? "decrease" : "increase";
    setFlash(direction);

    // Animate count step by step
    const steps = Math.abs(value - prev);
    const stepDuration = Math.min(300 / steps, 80); // max 300ms total
    let current = prev;

    const step = () => {
      if (current === value) {
        prevRef.current = value;
        setTimeout(() => setFlash(null), 600);
        return;
      }
      current += value < current ? -1 : 1;
      setDisplay(current);
      rafRef.current = window.setTimeout(step, stepDuration);
    };

    rafRef.current = window.setTimeout(step, 0);
    prevRef.current = value;

    return () => {
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, [value]);

  return (
    <span
      className={`inline-block transition-all duration-300 ${
        flash === "decrease"
          ? "scale-110 opacity-80"
          : flash === "increase"
          ? "scale-105"
          : "scale-100 opacity-100"
      } ${className}`}
    >
      {display}
    </span>
  );
};

export default AnimatedCount;
