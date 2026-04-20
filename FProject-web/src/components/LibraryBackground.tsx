import { motion } from 'framer-motion';
import libraryBg from '@/assets/library-background.jpg';

const LibraryBackground = () => {
  return (
    <div className="fixed inset-0 z-0">
      {/* Main background image */}
      <motion.div
        className="absolute inset-0 ambient-light"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      >
        <img
          src={libraryBg}
          alt="Library interior"
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Warm overlay for depth */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            180deg,
            hsl(35 40% 8% / 0.3) 0%,
            hsl(30 35% 12% / 0.2) 40%,
            hsl(25 40% 10% / 0.4) 100%
          )`,
        }}
      />

      {/* Vignette effect */}
      <div className="absolute inset-0 vignette" />

      {/* Subtle light rays */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(
            ellipse 80% 50% at 50% 20%,
            hsl(40 60% 70% / 0.08) 0%,
            transparent 60%
          )`,
        }}
        animate={{
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};

export default LibraryBackground;