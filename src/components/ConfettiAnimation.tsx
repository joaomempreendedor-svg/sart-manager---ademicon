import React from 'react';
import useWindowSize from 'react-use/lib/useWindowSize';
import Confetti from 'react-confetti';

interface ConfettiAnimationProps {
  run: boolean;
  onConfettiComplete?: () => void;
}

export const ConfettiAnimation: React.FC<ConfettiAnimationProps> = ({ run, onConfettiComplete }) => {
  const { width, height } = useWindowSize();

  if (!run) return null;

  return (
    <Confetti
      width={width}
      height={height}
      recycle={false} // Only run once
      numberOfPieces={200}
      gravity={0.15}
      initialVelocityY={5}
      tweenDuration={5000}
      onConfettiComplete={onConfettiComplete}
      colors={['#ff7a00', '#00b8d4', '#ffc107', '#4caf50', '#9c27b0']} // Cores da Ademicon e complementares
    />
  );
};