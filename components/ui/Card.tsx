import React, { HTMLAttributes, forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover = false, padding = 'md', className = '', children, ...props }, ref) => {
    const baseStyles = 'bg-white border border-gray-200 rounded-xl shadow-sm';
    const hoverStyles = hover ? 'transition-shadow hover:shadow-md' : '';

    const combinedClassName = `${baseStyles} ${hoverStyles} ${paddingStyles[padding]} ${className}`.trim();

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, className = '', children, ...props }) => {
  return (
    <div className={`flex items-center justify-between pb-3 border-b border-gray-100 ${className}`.trim()} {...props}>
      <div>
        {title && <h3 className="text-sm font-bold text-gray-900">{title}</h3>}
        {subtitle && <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>}
        {children}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

export const CardBody: React.FC<CardBodyProps> = ({ className = '', children, ...props }) => {
  return (
    <div className={`pt-4 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};
