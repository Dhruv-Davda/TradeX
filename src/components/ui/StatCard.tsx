import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card } from './Card';
import { STAT_VARIANTS, StatVariant } from '../../lib/constants';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  variant?: StatVariant;
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
  subtitle?: React.ReactNode;
  animationDelay?: number;
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  variant = 'default',
  trend,
  subtitle,
  animationDelay = 0,
  className = '',
  onClick,
}) => {
  const colors = STAT_VARIANTS[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: animationDelay }}
      className={className}
    >
      <Card
        hover={!!onClick}
        className={`p-5 h-full ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-400 mb-1 font-medium">{label}</p>
            <p className="text-2xl font-bold text-white truncate">{value}</p>
            {trend && (
              <div className={`flex items-center mt-1.5 text-xs font-medium ${
                trend.direction === 'up' ? 'text-green-400' : 'text-red-400'
              }`}>
                <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
                <span className="ml-1">{trend.value}</span>
              </div>
            )}
            {subtitle && <div className="mt-1.5">{subtitle}</div>}
          </div>
          <div className={`p-3 rounded-xl ${colors.bg} shrink-0 ml-3`}>
            <Icon className={`w-6 h-6 ${colors.text}`} />
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
