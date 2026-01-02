import { ReactNode } from 'react';
import { Button } from './Button';
import { StatusIndicator } from './StatusIndicator';
import { FiArrowRight } from 'react-icons/fi';

interface HeroSectionProps {
  heading: string;
  subheading: string;
  onPrimaryClick: () => void;
  onSecondaryClick?: () => void;
  primaryText: string;
  secondaryText?: string;
  successText?: string;
  isSuccessConnected?: boolean;
}

export function HeroSection({
  heading,
  subheading,
  onPrimaryClick,
  onSecondaryClick,
  primaryText,
  secondaryText,
  successText = 'Connected',
  isSuccessConnected = false,
}: HeroSectionProps) {
  return (
    <section className="w-full max-w-3xl mx-auto py-16 sm:py-24 flex flex-col items-center text-center bg-white rounded-2xl shadow md:mt-10">
      <div className="flex flex-col gap-4 items-center w-full px-8">
        <h1 className="font-bold text-slate-900 text-4xl sm:text-5xl leading-tight mb-2">{heading}</h1>
        <p className="text-slate-700 text-lg sm:text-xl mb-4">{subheading}</p>

        <div className="flex gap-4 mb-6 flex-wrap justify-center">
          <Button
            variant="primary"
            onClick={onPrimaryClick}
            iconRight={<FiArrowRight />}
          >
            {primaryText}
          </Button>
          {secondaryText && (
            <Button variant="secondary" onClick={onSecondaryClick}>{secondaryText}</Button>
          )}
        </div>

        {isSuccessConnected && (
          <StatusIndicator status="success" className="mt-2">
            {successText}
          </StatusIndicator>
        )}
      </div>
    </section>
  );
}

