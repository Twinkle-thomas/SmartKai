import { useRef } from 'react';
import { m, useScroll, useTransform } from 'motion/react';
import { FOOD_PHOTOS } from '../data/foodPhotos.js';
import { useHomepageMotion } from './HomepageMotion.jsx';

function MovingImage({ target, imageProps }) {
  const { scrollYProgress } = useScroll({ target, offset: ['start end', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.08, 1]);
  const opacity = useTransform(scrollYProgress, [0, .15, .85, 1], [.9, 1, 1, .9]);
  return <m.img {...imageProps} style={{ ...imageProps.style, scale, opacity }} />;
}

export default function FoodPhoto({ photo = 'fresh', priority = false, className = '', sizes = '(min-width: 1100px) 40vw, (min-width: 761px) 45vw, 90vw' }) {
  const frame = useRef(null);
  const enabled = useHomepageMotion();
  const image = FOOD_PHOTOS[photo];
  const imageProps = {
    src: `/media/food/${image.id}-1024.webp`,
    srcSet: [640, 1024, 1600].map((width) => `/media/food/${image.id}-${width}.webp ${width}w`).join(', '),
    sizes, width: 1600, height: image.height, alt: image.alt,
    loading: priority ? 'eager' : 'lazy', fetchPriority: priority ? 'high' : 'auto', decoding: 'async',
    style: { objectPosition: image.position },
  };
  return <div ref={frame} className={`food-photo ${className}`}>
    {enabled ? <MovingImage target={frame} imageProps={imageProps} /> : <img {...imageProps} />}
  </div>;
}
