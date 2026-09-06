export function PageLoader({ label = "Loading..." }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-steel" data-testid="page-loader">
      <div className="h-10 w-10 rounded-full border-2 border-bluegrey border-t-navy animate-spin" />
      <p className="font-body text-sm tracking-wide">{label}</p>
    </div>
  );
}
