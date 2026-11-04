import LandingHero from './LandingHero.jsx';
import FeatureShowcase from './FeatureShowcase.jsx';
import { HomepageMotion, Reveal } from './HomepageMotion.jsx';
import { useEffect } from 'react';
import PhotoCredits from './PhotoCredits.jsx';

export default function HomePage() {
  useEffect(() => {
    if (['#features', '#how-it-works'].includes(window.location.hash)) {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView?.({ block: 'start' });
    }
  }, []);
  return <HomepageMotion>
    <LandingHero />
    <Reveal className="home-manifesto"><span className="manifesto-symbol" aria-hidden="true">✳</span><p>From the food you bring home<br />to the habits that make a difference.</p><a href="#features" className="text-link">Meet the SmartKai way <span aria-hidden="true">↓</span></a></Reveal>
    <FeatureShowcase />
    <section id="how-it-works" className="how-section" aria-labelledby="how-title"><Reveal><p className="eyebrow">Start with a little understanding</p><h2 id="how-title">Small questions.<br />Thoughtful next steps.</h2></Reveal><ol>{[['Reflect','Tell us about five everyday food-management practices.'],['Discover','Explore recommendations matched to your answers.'],['Revisit','Sign in to save your assessment and come back to your guidance.']].map(([title, text], i) => <Reveal as="li" key={title} delay={i * .09}><span>0{i + 1}</span><div><h3>{title}</h3><p>{text}</p></div></Reveal>)}</ol></section>
    <section className="closing-cta" aria-labelledby="closing-title"><p className="eyebrow">Good habits begin somewhere</p><h2 id="closing-title">Make a little room<br />for a fresh perspective.</h2><p>Start with your household’s habits. Find guidance for the next step.</p><a href="#/personalisation" className="primary">Get Personalised Recommendations <span aria-hidden="true">↗</span></a><span className="closing-flower" aria-hidden="true">✳</span></section>
    <PhotoCredits />
  </HomepageMotion>;
}
