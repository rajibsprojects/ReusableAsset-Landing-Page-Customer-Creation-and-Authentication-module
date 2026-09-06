/** Subtle Indian paisley/floral line-art used in corners and as section motifs. */
export function MotifIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className={className} aria-hidden="true">
      <path d="M12 3c2.5 2.6 4 5.2 4 8a4 4 0 0 1-8 0c0-2.8 1.5-5.4 4-8Z" />
      <path d="M12 15v6M8.5 18.5 12 21l3.5-2.5" />
      <circle cx="12" cy="11" r="1.2" />
    </svg>
  );
}

export function FloralCorner({ className = "" }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1" className={className} aria-hidden="true">
      <path d="M10 190c0-60 30-110 90-140 30-15 60-20 90-20" />
      <path d="M10 190c20-70 60-120 120-150" opacity="0.7" />
      <path d="M40 150c10-10 25-12 35-5-8 10-22 14-35 5Z" />
      <path d="M70 110c12-8 26-8 36 0-10 8-24 10-36 0Z" />
      <path d="M105 80c12-6 26-5 36 3-10 7-25 8-36-3Z" />
      <path d="M140 55c12-5 25-3 34 6-11 6-24 6-34-6Z" />
      <path d="M25 170c6-12 16-18 28-18-4 12-14 20-28 18Z" />
      <circle cx="58" cy="147" r="1.6" fill="currentColor" />
      <circle cx="90" cy="110" r="1.6" fill="currentColor" />
      <circle cx="125" cy="82" r="1.6" fill="currentColor" />
      <circle cx="158" cy="59" r="1.6" fill="currentColor" />
      <path d="M20 120c8 2 14 8 16 16" opacity="0.6" />
      <path d="M50 80c8 2 14 8 16 16" opacity="0.6" />
    </svg>
  );
}

export function OrnamentDivider({ className = "", children }) {
  return (
    <div className={`ornament-line ${className}`}>
      {children || <span className="h-1.5 w-1.5 rotate-45 bg-powder" aria-hidden="true" />}
    </div>
  );
}
