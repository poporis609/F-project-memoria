import { motion } from 'framer-motion';

interface LandingOverlayProps {
  onStart: () => void;
}

const LandingOverlay = ({ onStart }: LandingOverlayProps) => {
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Overlay background */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, hsl(25 30% 8% / 0.6) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-8">
        {/* Title */}
        <motion.h1
          className="font-display text-5xl md:text-7xl font-medium mb-6"
          style={{
            color: 'hsl(40 40% 85%)',
            textShadow: '0 4px 20px hsl(25 40% 10% / 0.5)',
          }}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          내 기억의 도서관
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="font-serif text-lg md:text-xl mb-12"
          style={{ color: 'hsla(42, 16%, 88%, 1.00)' }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          기억을 기록하고, 조용히 보관하세요.
        </motion.p>

        {/* Start button */}
        <motion.button
          onClick={onStart}
          className="relative group px-10 py-4 font-serif text-lg rounded-sm overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, hsl(30 45% 28%) 0%, hsl(25 50% 22%) 100%)',
            color: 'hsl(40 40% 88%)',
            boxShadow: `
              0 4px 20px hsl(25 40% 10% / 0.4),
              inset 0 1px 0 hsl(40 35% 40% / 0.2)
            `,
          }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          whileHover={{
            boxShadow: `
              0 8px 30px hsl(25 40% 10% / 0.5),
              inset 0 1px 0 hsl(40 35% 45% / 0.3)
            `,
          }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Button glow on hover */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: 'radial-gradient(ellipse at center, hsl(40 50% 50% / 0.1) 0%, transparent 70%)',
            }}
          />
          <span className="relative z-10">기록 시작</span>
        </motion.button>

        {/* Decorative line */}
        <motion.div
          className="mt-16 flex items-center justify-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
        >
          <div
            className="w-16 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, hsl(40 30% 45% / 0.4))' }}
          />
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: 'hsl(40 40% 55% / 0.5)' }}
          />
          <div
            className="w-16 h-px"
            style={{ background: 'linear-gradient(90deg, hsl(40 30% 45% / 0.4), transparent)' }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LandingOverlay;