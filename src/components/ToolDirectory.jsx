export const HOUSEHOLD_TOOLS=[
  {href:'#/pantry',name:'Pantry Manager',text:'Add, categorise and organise saved food, quantities and locations.'},
  {href:'#/expiry',name:'Food-date Tracker',text:'Review use-by and best-before dates, with configurable approaching-date views.'},
  {href:'#/shopping',name:'Smart Shopping List',text:'Plan quantities, compare recorded stock and tick purchases.'},
  {href:'#/meals',name:'Meal Planner',text:'Plan dated meals and review recipe ideas from pantry ingredient names.'},
  {href:'#/leftovers',name:'Leftover Manager',text:'Plan leftover use and record whole-entry used, frozen or discarded outcomes.'},
  {href:'#/storage',name:'Food Storage Guide',text:'Browse sourced guidance for fridge, freezer, pantry and leftovers.'},
  {href:'#/pantry',name:'Image Pantry Scanner',text:'Optional local AI preview supporting ten food types, with manual review.'},
  {href:'#/barcode',name:'Barcode Scanner',text:'Decode a barcode photo or type a number, look up a catalog product, then review.'},
  {href:'#/sharing',name:'Community Sharing Simulation',text:'Create and manage private demo offers between simulated households.'},
];
export default function ToolDirectory(){return <><div className="workspace-intro"><p className="eyebrow">SmartKai / Your tools</p><h1>A place for every step.<br/><span>From food at home to the next meal.</span></h1><p>Choose a tool, review your records and make it part of your routine.</p></div><div className="tool-directory mb-8">{HOUSEHOLD_TOOLS.map(tool=><section className="panel" key={tool.name}><h2 className="text-2xl font-semibold">{tool.name}</h2><p className="mt-3">{tool.text}</p><a className="primary mt-5" href={tool.href}>Open {tool.name} ↗</a></section>)}</div><section className="panel mb-8"><h2 className="text-xl font-semibold">Keep your routine going</h2><div className="mt-4 flex flex-wrap gap-4"><a className="text-link" href="#/reminders">Weekly reminders ↗</a><a className="text-link" href="#/progress">Monthly check-in ↗</a><a className="text-link" href="#/account">Account and history ↗</a></div></section></>;}
