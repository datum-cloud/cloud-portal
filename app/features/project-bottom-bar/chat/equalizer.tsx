import { motion } from 'motion/react';

interface EqualizerProps {
  frequencyData: number[];
  className?: string;
}

export function Equalizer({ frequencyData, className }: EqualizerProps) {
  return (
    <div className={`flex h-4 items-center justify-center gap-[3px] ${className ?? ''}`}>
      {frequencyData.map((level, i) => (
        <motion.div
          key={i}
          className="bg-foreground w-[3px] rounded-full"
          animate={{ height: Math.max(3, level * 24) }}
          transition={{ type: 'spring', stiffness: 400, damping: 15, mass: 0.3 }}
        />
      ))}
    </div>
  );
}
