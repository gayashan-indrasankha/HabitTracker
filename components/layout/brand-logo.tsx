import { cn } from '@/lib/utils/cn';

interface BrandLogoProps {
  className?: string;
  inverted?: boolean;
}

export function BrandLogo({ className, inverted = false }: BrandLogoProps) {
  return (
    <span
      role="img"
      aria-label="LifeOS"
      className={cn('relative inline-block h-12 w-52 shrink-0 overflow-hidden', className)}
    >
      {inverted ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[url('/lifeos-logo-dark.webp')] bg-cover bg-center bg-no-repeat mix-blend-lighten"
        />
      ) : (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[url('/lifeos-logo-light.webp')] bg-cover bg-center bg-no-repeat mix-blend-multiply dark:hidden"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 hidden bg-[url('/lifeos-logo-dark.webp')] bg-cover bg-center bg-no-repeat mix-blend-lighten dark:block"
          />
        </>
      )}
    </span>
  );
}
