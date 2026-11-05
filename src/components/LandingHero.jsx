import ProductPreview from './ProductPreview.jsx';
import FoodPhoto from './FoodPhoto.jsx';
import { useRef } from 'react';
import { m, useScroll, useTransform } from 'motion/react';
import { useHomepageMotion } from './HomepageMotion.jsx';

function HeroScene({ progress }) {
  const y = useTransform(progress, [0, 1], [0, 35]);
  const scale = useTransform(progress, [0, 1], [1, .96]);
  const opacity = useTransform(progress, [0, .7, 1], [1, 1, .7]);
  return <m.div className="hero-product-card" style={{ y, scale, opacity, rotate: -6 }}><ProductPreview type="recommendations" hero /></m.div>;
}

function ScrollHeroScene({ target }) {
  const { scrollYProgress } = useScroll({ target, offset: ['start start', 'end start'] });
  return <HeroScene progress={scrollYProgress} />;
}

export default function LandingHero() {
  const ref = useRef(null);
  const enabled = useHomepageMotion();
  return <section ref={ref} className="hero" aria-labelledby="hero-title">
    <div className="hero-copy">
      <p className="eyebrow hero-eyebrow"><span className="status-dot" /> A little care goes a long way</p>
      <h1 id="hero-title">Less Food Waste.<br /><span>More Food Saved.</span></h1>
      <p className="hero-description">Good food deserves a little thought. Discover your household’s food habits, get personalised guidance and organise your pantry, shopping and meals in one place.</p>
      <div className="hero-actions"><a href="#/dashboard" className="primary">Explore SmartKai <span aria-hidden="true">↗</span></a><a href="#/personalisation" className="secondary hero-recommendations">Get Personalised Recommendations <span aria-hidden="true">↗</span></a></div>
      <p className="hero-caption">Thoughtfully made for life in Aotearoa New Zealand.</p>
    </div>
    <div className="hero-product-scene hero-photography" aria-label="Fresh food and an example of SmartKai guidance">
      <FoodPhoto photo="fresh" priority className="hero-editorial-photo" sizes="(min-width: 1100px) 45vw, (min-width: 761px) 44vw, 90vw" />
      {enabled ? <ScrollHeroScene target={ref} /> : <div className="hero-product-card"><ProductPreview type="recommendations" hero /></div>}
      <div className="hero-photo-caption"><span aria-hidden="true">✳</span><p>Good food.<br /><strong>Worth a little thought.</strong></p></div>
    </div>
  </section>;
}
