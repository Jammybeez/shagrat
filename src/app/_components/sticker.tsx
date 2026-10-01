import Image from "next/image";

// The sticker sheet, cut up and stored in public/shagrat. Sizes are the cropped PNGs' own.
const stickers = [
  { file: "hoarding", width: 336, height: 346, caption: "Mine. All of it. Mine." },
  { file: "chugging", width: 325, height: 329, caption: "Shagrat does not sip." },
  { file: "lurking", width: 293, height: 317, caption: "The Eye watches the fridge." },
  { file: "jug-love", width: 309, height: 326, caption: "Precious. My precious." },
  { file: "tankard", width: 300, height: 320, caption: "A captain's ration." },
  { file: "spilled", width: 326, height: 297, caption: "Someone will pay for this." },
  { file: "milk-bath", width: 331, height: 315, caption: "Off duty. Do not disturb." },
  { file: "sunset", width: 300, height: 288, caption: "One last pint before the dark." },
  { file: "teacup", width: 342, height: 319, caption: "Even orcs have standards." },
  { file: "carton", width: 238, height: 329, caption: "Have you seen this orc?" },
  { file: "throne", width: 347, height: 378, caption: "Lord of the Dairy." },
  { file: "calf-hug", width: 343, height: 351, caption: "Supply chain secured." },
  { file: "splash", width: 313, height: 353, caption: "Fully immersed in the milk economy." },
  { file: "bottle-cuddle", width: 334, height: 355, caption: "Do not take the last one." },
  { file: "tantrum", width: 278, height: 360, caption: "WHO FINISHED THE MILK?" },
] as const;

/** A random Shagrat sticker, re-rolled on every request (the page is force-dynamic). */
export function Sticker({ className }: { className?: string }) {
  const sticker = stickers[Math.floor(Math.random() * stickers.length)]!;

  return (
    <Image
      src={`/shagrat/${sticker.file}.png`}
      width={sticker.width}
      height={sticker.height}
      alt={`Shagrat: ${sticker.caption}`}
      title={sticker.caption}
      priority
      className={className}
    />
  );
}
