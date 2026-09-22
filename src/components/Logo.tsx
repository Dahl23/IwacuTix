import React from 'react';
import { IwacuTixLogo } from './IwacuTixLogo';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', showText = true }) => {
  if (!showText) {
    return <IwacuTixLogo variant="icon" size={size} className={className} />;
  }

  return (
    <IwacuTixLogo
      variant="horizontal"
      size={size}
      className={className}
      showTagline={size === 'lg'}
    />
  );
};

