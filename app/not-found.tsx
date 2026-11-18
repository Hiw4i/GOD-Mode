import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import { ArrowLeft } from "lucide-react";
import images from "@/lib/generated-image-assets.json";
import "./not-found.css";

const displayFont = localFont({
  src: "./fonts/archivo-black.ttf",
  weight: "400",
  display: "swap",
});

export default function NotFound() {
  const statue = images.statues["not-found"];
  const image = statue.variants[statue.variants.length - 1];

  return <main className="not-found-page">
    <h1 className={`${displayFont.className} not-found-art`}>
      <span className="not-found-code">404</span>
      <span className="not-found-portrait" aria-hidden="true">
        <Image
          src={image.src}
          alt=""
          width={image.width}
          height={image.height}
          preload
        />
      </span>
      <span className="not-found-title">Not found</span>
    </h1>
    <Link className="not-found-back" href="/">
      <ArrowLeft size={18} strokeWidth={1.5} aria-hidden="true" />
      Back to GOD Mode
    </Link>
  </main>;
}
