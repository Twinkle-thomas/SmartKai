import {PROFILE_ACTIONS} from '../domain/toolActions.js';
import {FOOD_PHOTOS} from '../data/foodPhotos.js';

const visuals={
  Overbuyer:{photo:'shopping',tool:'Shopping list'},
  'Food Forgetter':{photo:'pantry',tool:'Food-date tracker'},
  'Poor Meal Planner':{photo:'meals',tool:'Meal planner'},
  'Leftover Discarder':{photo:'leftovers',tool:'Leftover manager'},
  'Storage Learner':{photo:'storage',tool:'Storage guide'},
};

export default function SuggestedActions({profiles=[]}){
  const actions=[...new Set(profiles)].filter(profile=>PROFILE_ACTIONS[profile]);
  return <section className="panel suggested-actions mb-6" aria-labelledby="suggested-actions-title">
    <header className="suggested-actions-heading"><div><p className="eyebrow">A little guidance, made personal</p><h2 id="suggested-actions-title">Suggested actions for your household</h2></div><p>Practical next steps, shaped around your food habits.</p></header>
    {actions.length?<ul className="suggested-action-grid">{actions.map((profile,index)=>{
      const action=PROFILE_ACTIONS[profile],visual=visuals[profile],photo=FOOD_PHOTOS[visual.photo];
      const titleId=`suggested-action-${index}`,descriptionId=`suggested-description-${index}`;
      return <li key={profile}><a className="suggested-action-card" href={action.href} aria-labelledby={titleId} aria-describedby={descriptionId}>
        <div className="suggested-action-photo"><img src={`/media/food/${photo.id}-640.webp`} srcSet={[640,1024].map(width=>`/media/food/${photo.id}-${width}.webp ${width}w`).join(', ')} sizes="(min-width: 1000px) 350px, (min-width: 640px) 45vw, 90vw" width={1600} height={photo.height} loading="lazy" decoding="async" alt={photo.alt} style={{objectPosition:photo.position}}/><span className="suggested-profile">{profile}</span></div>
        <div className="suggested-action-content"><p className="eyebrow">{visual.tool}</p><h3 id={titleId}>{action.label}</h3><p id={descriptionId} className="suggested-action-description">{action.why}</p><span className="suggested-action-cta" aria-hidden="true">Open {visual.tool.toLowerCase()}<span className="suggested-action-arrow">↗</span></span></div>
      </a></li>;
    })}</ul>:<div className="suggested-actions-empty"><p>Start with a pantry check and choose any household tool. Save an assessment for tailored suggestions.</p><a className="text-link" href="#/pantry">Explore your pantry ↗</a></div>}
    <p className="suggested-actions-note"><span aria-hidden="true">✳</span> All tools remain available regardless of your profiles.</p>
  </section>;
}
