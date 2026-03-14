import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'secondary', 
  size = 'md',
  className = '',
  ...props 
}) => {
  const baseStyles = 'border font-normal';
  
  const variantStyles = {
    primary: 'bg-primary text-white border-primary hover:bg-blue-700',
    secondary: 'bg-white text-black border-black hover:bg-gray-100',
    danger: 'bg-danger text-white border-danger hover:bg-red-700',
  };
  
  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
  };
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
