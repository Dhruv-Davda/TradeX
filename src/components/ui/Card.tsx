import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  glow = false,
  onClick,
}) => {
  const baseClasses = glow ? 'card-glow' : 'card';
  const hoverClasses = hover ? 'card-hover' : '';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { y: -4, scale: 1.02 } : {}}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 20,
        duration: 0.3
      }}
      className={`${baseClasses} ${hoverClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};