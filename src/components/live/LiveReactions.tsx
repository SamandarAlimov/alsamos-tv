import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ThumbsUp, Flame, Star, Laugh, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const REACTIONS = [
  { emoji: '❤️', icon: Heart, label: 'Love', color: 'text-red-400' },
  { emoji: '👍', icon: ThumbsUp, label: 'Like', color: 'text-blue-400' },
  { emoji: '🔥', icon: Flame, label: 'Fire', color: 'text-orange-400' },
  { emoji: '⭐', icon: Star, label: 'Star', color: 'text-yellow-400' },
  { emoji: '😂', icon: Laugh, label: 'Laugh', color: 'text-green-400' },
  { emoji: '⚡', icon: Zap, label: 'Wow', color: 'text-purple-400' },
];

interface FloatingReaction {
  id: number;
  emoji: string;
  x: number;
}

export function LiveReactions({ className }: { className?: string }) {
  const [floating, setFloating] = useState<FloatingReaction[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const handleReaction = useCallback((emoji: string) => {
    const id = Date.now() + Math.random();
    const x = Math.random() * 80 + 10;
    
    setFloating(prev => [...prev, { id, emoji, x }]);
    setCounts(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
    
    setTimeout(() => {
      setFloating(prev => prev.filter(r => r.id !== id));
    }, 2000);
  }, []);

  return (
    <div className={cn("relative", className)}>
      {/* Floating reactions */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {floating.map(r => (
            <motion.div
              key={r.id}
              initial={{ opacity: 1, y: 0, x: `${r.x}%`, scale: 0.5 }}
              animate={{ opacity: 0, y: -120, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              className="absolute bottom-0 text-2xl"
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reaction buttons */}
      <div className="flex items-center gap-1">
        {REACTIONS.map(({ emoji, label, color }) => (
          <motion.button
            key={label}
            whileTap={{ scale: 1.3 }}
            onClick={() => handleReaction(emoji)}
            className={cn(
              "relative w-10 h-10 rounded-full glass-subtle flex items-center justify-center text-lg",
              "hover:bg-[hsl(222_47%_15%/0.6)] transition-colors"
            )}
            title={label}
          >
            {emoji}
            {counts[emoji] && counts[emoji] > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center px-1">
                {counts[emoji]}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
