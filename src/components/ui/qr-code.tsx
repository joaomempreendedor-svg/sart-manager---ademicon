import React from 'react';
import QRCode from 'qrcode.react';

interface QRCodeProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  bgColor?: string;
  fgColor?: string;
  className?: string;
}

export const QRCodeGenerator: React.FC<QRCodeProps> = ({
  value,
  size = 128,
  level = 'H',
  bgColor = '#ffffff',
  fgColor = '#000000',
  className,
}) => {
  return (
    <div className={className}>
      <QRCode
        value={value}
        size={size}
        level={level}
        bgColor={bgColor}
        fgColor={fgColor}
        renderAs="svg"
      />
    </div>
  );
};