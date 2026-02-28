import Image from "next/image";

export const Icons = {
  logo: ({ className, width = 40, height = 40, ...props }) => (
    <Image
      src="/fruit.png"
      alt="Lychee"
      width={width}
      height={height}
      className={`object-contain ${className || ""}`}
      {...props}
    />
  ),
};
