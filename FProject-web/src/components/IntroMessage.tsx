import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface IntroMessageProps {
  onComplete: () => void;
}

const IntroMessage = ({ onComplete }: IntroMessageProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 800);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Dimmed background */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'hsl(25 30% 8% / 0.7)',
            }}
          />

          {/* Parchment message */}
          <motion.div
            className="relative max-w-lg mx-8 p-12 text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              background: 'hsl(40 30% 92%)',
              borderRadius: '6px',
              boxShadow: `
                0 12px 28px hsl(25 40% 10% / 0.45),
                0 0 0 1px hsl(38 30% 80% / 0.6),
                inset 0 1px 0 hsl(40 60% 96% / 0.6)
              `,
            }}
          >
            {/* Decorative corner flourishes */}
            <div
              className="absolute top-4 left-4 w-8 h-8 opacity-35"
              style={{
                borderTop: '2px solid hsl(35 25% 55%)',
                borderLeft: '2px solid hsl(35 25% 55%)',
              }}
            />
            <div
              className="absolute top-4 right-4 w-8 h-8 opacity-35"
              style={{
                borderTop: '2px solid hsl(35 25% 55%)',
                borderRight: '2px solid hsl(35 25% 55%)',
              }}
            />
            <div
              className="absolute bottom-4 left-4 w-8 h-8 opacity-35"
              style={{
                borderBottom: '2px solid hsl(35 25% 55%)',
                borderLeft: '2px solid hsl(35 25% 55%)',
              }}
            />
            <div
              className="absolute bottom-4 right-4 w-8 h-8 opacity-35"
              style={{
                borderBottom: '2px solid hsl(35 25% 55%)',
                borderRight: '2px solid hsl(35 25% 55%)',
              }}
            />

            {/* Message text */}
            <motion.p
              className="font-serif text-xl md:text-2xl leading-relaxed mb-4"
              style={{
                color: 'hsl(32 35% 42%)',
                textShadow: '0 1px 2px hsl(30 30% 20% / 0.25)',
              }}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              여기는 내 기억의 도서관입니다.
            </motion.p>

            <motion.p
              className="font-serif text-lg md:text-xl leading-relaxed"
              style={{
                color: 'hsl(34 25% 48%)',
                textShadow: '0 1px 1px hsl(30 25% 18% / 0.2)',
              }}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              한 줄씩 기록하면 페이지가 쌓입니다.
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroMessage;