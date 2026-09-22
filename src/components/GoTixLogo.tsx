import React from 'react';
import { IwacuTixLogo, IwacuTixLogoProps, IwacuTixLogoSVG } from './IwacuTixLogo';

export type GoTixLogoProps = IwacuTixLogoProps;

export const GoTixLogo: React.FC<GoTixLogoProps> = (props) => {
  return <IwacuTixLogo {...props} />;
};

export { IwacuTixLogo, IwacuTixLogoSVG };
export default GoTixLogo;
