export function ImageWithFallback({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`w-full h-full block ${className ?? ""}`}
      style={{ objectFit: "cover" }}
    />
  );
}
