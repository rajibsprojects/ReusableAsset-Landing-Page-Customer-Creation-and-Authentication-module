import { MotifIcon } from "./Motifs";

export function SectionHeading({ eyebrow, title, subtitle, align = "left", as: Tag = "h2", testId }) {
  const center = align === "center";
  return (
    <div className={center ? "text-center" : ""} data-testid={testId}>
      {eyebrow && (
        <p className={`eyebrow ${center ? "justify-center" : ""}`}>
          <MotifIcon className="h-4 w-4 text-navy-soft" />
          {eyebrow}
        </p>
      )}
      <Tag className="heading-serif text-3xl sm:text-4xl mt-3 leading-tight">{title}</Tag>
      {subtitle && <p className={`mt-3 text-steel text-sm sm:text-base ${center ? "max-w-xl mx-auto" : "max-w-2xl"}`}>{subtitle}</p>}
    </div>
  );
}
