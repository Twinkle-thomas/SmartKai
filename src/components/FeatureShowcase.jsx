import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import ProductPreview from './ProductPreview.jsx';
import { Reveal, SOFT_EASE, useHomepageMotion } from './HomepageMotion.jsx';
import { showcaseIndex } from '../presentation/scrollShowcase.js';

import { FEATURES } from '../data/features.jsx';
import FoodPhoto from './FoodPhoto.jsx';

function FeatureSection({ feature, index, active, story = false }) {
  return <Reveal as="section" delay={(index % 3) * .05} id={feature.id} className={`feature-section feature-${feature.tone} ${index % 2 ? 'feature-reverse' : ''} ${story ? 'story-step' : ''}`} data-active={active === index ? 'true' : undefined} aria-labelledby={`${feature.id}-title`}>
    <Reveal className="feature-copy" delay={(index % 3) * .06}><Reveal className="feature-meta"><p className="eyebrow">0{index + 1} / {feature.name}</p><span className={`feature-status ${feature.available ? 'available' : ''}`}>{feature.available ? 'Available now' : 'In development'}</span></Reveal>
      <h2 id={`${feature.id}-title`}>{feature.title}</h2><p className="feature-description">{feature.description}</p><p className="feature-detail">{feature.detail}</p>
      {feature.available ? <a className="primary" href={feature.href ?? "#/personalisation"}>{feature.action ?? "Get Personalised Recommendations"} <span aria-hidden="true">↗</span></a> : <span className="coming-note">A look at what’s taking shape <span aria-hidden="true">↗</span></span>}
    </Reveal>
    {story ? <Reveal className="story-context-media" delay={.1}><FoodPhoto photo={feature.type} className="story-context-photo" /><p className="context-photo-caption">{feature.available ? 'Food at home / Available now' : 'Food at home / Tool in development'}</p></Reveal> : <Reveal className="feature-image-reveal" delay={.1 + (index % 3) * .06}><figure className="feature-visual feature-photo-composition"><FoodPhoto photo={feature.type} className="feature-editorial-photo" /><div className="photo-application-preview"><ProductPreview type={feature.type} /></div><figcaption>{feature.available ? 'Illustrative preview · Open the tool to use your own saved data.' : 'Concept preview · This tool is not yet available.'}</figcaption></figure></Reveal>}
  </Reveal>;
}

function usePinLayout() {
  const query = '(min-width: 1100px) and (min-height: 800px)';
  const [fits, setFits] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const update = () => setFits(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return fits;
}

function StickyFeatureStory() {
  const stage = useRef(null);
  const [active, setActive] = useState(0);
  const activeIndex = useRef(0);
  const { scrollYProgress } = useScroll({ target: stage, offset: ['start center', 'end center'] });
  const scale = useTransform(scrollYProgress, [0, .12, .88, 1], [.97, 1, 1, .97]);
  const y = useTransform(scrollYProgress, [0, 1], [12, -12]);
  const opacity = useTransform(scrollYProgress, [0, .08, .92, 1], [.85, 1, 1, .85]);
  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    const next = showcaseIndex(progress, FEATURES.length);
    if (next !== activeIndex.current) { activeIndex.current = next; setActive(next); }
  });
  const feature = FEATURES[active];
  return <div ref={stage} className="scroll-product-story" data-testid="sticky-showcase">
    <div className="story-descriptions">{FEATURES.map((item, index) => <FeatureSection key={item.id} feature={item} index={index} active={active} story />)}</div>
    <aside className="sticky-product-stage" aria-hidden="true">
      <div className="sticky-stage-inner"><p className="eyebrow">A closer look / SmartKai</p>
        <m.div className={`sticky-product-surface sticky-tone-${feature.tone}`} style={{ scale, y, opacity }}>
          <AnimatePresence initial={false}><m.div key={feature.id} className="sticky-product-layer" initial={{ opacity: 0, y: 14, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: .38, ease: SOFT_EASE }}><ProductPreview type={feature.type} /><p className="sticky-preview-caption">{feature.available ? 'Illustrative preview · Available now' : 'Concept preview · In development'}</p></m.div></AnimatePresence>
        </m.div>
        <div className="story-progress">{FEATURES.map((item, index) => <span key={item.id} className={index === active ? 'current' : ''} />)}<span className="story-page-number">0{active + 1} / 06</span></div>
      </div>
    </aside>
  </div>;
}

export default function FeatureShowcase() {
  const enabled = useHomepageMotion();
  const pinLayout = usePinLayout();
  return <div id="features"><Reveal className="product-intro"><p className="eyebrow">The SmartKai way</p><h2>More thought.<br /><span>For every part of food at home.</span></h2><p>Guidance and practical food-management tools you can use today.<br />Keep track of food, plan your week and return to your saved guidance.</p></Reveal>{enabled && pinLayout ? <StickyFeatureStory /> : <div className="feature-stack">{FEATURES.map((feature, index) => <FeatureSection key={feature.id} feature={feature} index={index} />)}</div>}</div>;
}
