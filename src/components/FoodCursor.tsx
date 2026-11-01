import React, { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

const FOOD_EMOJIS = ['☕', '🥐', '🍜', '🍰', '🥑', '🍔', '🍕', '🍣', '🥩', '🍨'];

export default function FoodCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [cursorText, setCursorText] = useState('');
  const [cursorEmoji, setCursorEmoji] = useState('☕');
  const [clickScale, setClickScale] = useState(1);

  // Motion values for smooth spring tracking
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Spring configuration for premium "magnetic" trail effect
  const springConfig = { damping: 30, stiffness: 220, mass: 0.6 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  // Slightly slower lag-spring for the floating food emoji to create a lovely organic path
  const emojiSpringConfig = { damping: 20, stiffness: 130, mass: 0.8 };
  const emojiX = useSpring(mouseX, emojiSpringConfig);
  const emojiY = useSpring(mouseY, emojiSpringConfig);

  useEffect(() => {
    // Only enable custom cursor on non-touch devices
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    setIsVisible(true);

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    const handleMouseLeaveWindow = () => setIsVisible(false);
    const handleMouseEnterWindow = () => setIsVisible(true);

    const handleMouseDown = () => setClickScale(0.85);
    const handleMouseUp = () => setClickScale(1);

    // Dynamic hover detector for premium tactile feedback
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Find closest interactive parent
      const interactiveEl = target.closest('button, a, [role="button"], .group, input, select, textarea') as HTMLElement | null;
      
      if (interactiveEl) {
        setIsHovered(true);
        
        // Extract customized cursor properties from attributes if available
        const emojiAttr = interactiveEl.getAttribute('data-cursor-emoji');
        const textAttr = interactiveEl.getAttribute('data-cursor-text');
        
        if (emojiAttr) {
          setCursorEmoji(emojiAttr);
        } else {
          // If no specific emoji, cycle based on elements
          if (interactiveEl.tagName === 'BUTTON') {
            if (interactiveEl.id?.includes('add') || interactiveEl.className?.includes('plus')) {
              setCursorEmoji('🥞');
            } else if (interactiveEl.id?.includes('book') || interactiveEl.id?.includes('reserve')) {
              setCursorEmoji('🥂');
            } else {
              setCursorEmoji('✨');
            }
          } else if (interactiveEl.tagName === 'A') {
            setCursorEmoji('🧭');
          } else {
            setCursorEmoji('🍽️');
          }
        }

        if (textAttr) {
          setCursorText(textAttr);
        } else {
          setCursorText(interactiveEl.tagName === 'BUTTON' ? 'TAP' : 'VIEW');
        }
      } else {
        setIsHovered(false);
        setCursorText('');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeaveWindow);
    document.addEventListener('mouseenter', handleMouseEnterWindow);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeaveWindow);
      document.removeEventListener('mouseenter', handleMouseEnterWindow);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [mouseX, mouseY]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-9999 mix-blend-normal">
      {/* Outer elegant ring representing luxury gold thread */}
      <motion.div
        style={{
          x: cursorX,
          y: cursorY,
          translateX: '-50%',
          translateY: '-50%',
          scale: isHovered ? 1.5 : 1,
        }}
        animate={{
          scale: isHovered ? 1.5 * clickScale : 1 * clickScale,
          backgroundColor: isHovered ? 'rgba(17, 47, 36, 0.08)' : 'rgba(212, 175, 55, 0.05)',
          borderColor: isHovered ? '#112F24' : '#D4AF37',
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-10 h-10 rounded-full border border-[#D4AF37] absolute flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.2)] backdrop-blur-[0.5px]"
      >
        {/* Glowing luxury center dot */}
        <motion.div
          animate={{
            scale: isHovered ? 0.3 : 1,
            backgroundColor: isHovered ? '#112F24' : '#D4AF37',
          }}
          className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"
        />

        {/* Tactile interaction word displayed inside the expanded ring */}
        {isHovered && cursorText && (
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute font-sans text-[7px] tracking-widest font-extrabold text-[#112F24] uppercase"
          >
            {cursorText}
          </motion.span>
        )}
      </motion.div>

      {/* Floating 3D food emoji that follows with an organic delay trail */}
      <motion.div
        style={{
          x: emojiX,
          y: emojiY,
          translateX: '16px',
          translateY: '16px',
        }}
        animate={{
          scale: isHovered ? 1.3 : 1,
          rotate: isHovered ? [0, 15, -15, 0] : 0,
        }}
        transition={{
          rotate: isHovered ? { repeat: Infinity, duration: 2.5, ease: 'easeInOut' } : { duration: 0.3 }
        }}
        className="absolute text-sm select-none drop-shadow-[0_4px_6px_rgba(17,47,36,0.3)] filter contrast-125 brightness-110"
      >
        {cursorEmoji}
      </motion.div>
    </div>
  );
}
