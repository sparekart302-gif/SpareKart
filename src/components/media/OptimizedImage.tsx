import Image, { type ImageProps } from "next/image";

type OptimizedImageProps = ImageProps;

export function OptimizedImage({
  quality = 70,
  sizes,
  ...props
}: OptimizedImageProps) {
  return (
    <Image
      quality={quality}
      sizes={props.fill ? (sizes ?? "100vw") : sizes}
      {...props}
    />
  );
}
