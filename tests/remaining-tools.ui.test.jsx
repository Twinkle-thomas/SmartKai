import React from 'react';
import {beforeEach,expect,test,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pantry from '../src/components/Pantry.jsx';
import StorageGuide from '../src/components/StorageGuide.jsx';
import BarcodeImport from '../src/components/BarcodeImport.jsx';
import SharingSimulation from '../src/components/SharingSimulation.jsx';
import ToolDirectory from '../src/components/ToolDirectory.jsx';
import {readRoute} from '../src/navigation.js';
const mocks=vi.hoisted(()=>({pantry:vi.fn(),saveFood:vi.fn(),sharing:vi.fn(),saveOffer:vi.fn(),act:vi.fn(),remove:vi.fn(),lookup:vi.fn(),decode:vi.fn(),outcome:vi.fn()}));
vi.mock('../src/services/pantry.js',()=>({createPantryService:()=>({list:mocks.pantry,save:mocks.saveFood})}));
vi.mock('../src/services/inventory.js',()=>({createInventoryService:()=>({outcome:mocks.outcome})}));
vi.mock('../src/services/sharing.js',()=>({createSharingService:()=>({list:mocks.sharing,save:mocks.saveOffer,act:mocks.act,remove:mocks.remove})}));
vi.mock('../src/services/barcodes.js',()=>({lookupBarcode:mocks.lookup,decodeBarcode:mocks.decode}));
beforeEach(()=>{vi.resetAllMocks();mocks.pantry.mockResolvedValue([]);mocks.sharing.mockResolvedValue([]);});
test('food-date filters distinguish passed use-by from approaching best-before and preparation dates',async()=>{
  mocks.pantry.mockResolvedValue([
    {id:'old',name:'Old milk',quantity:1,unit:'bottle',location:'Fridge',date_type:'Use by',food_date:'2000-01-01',is_leftover:false},
    {id:'prepared',name:'Prepared soup',quantity:2,unit:'portions',location:'Fridge',date_type:'Prepared on',food_date:'2000-01-01',is_leftover:true},
  ]);
  const user=userEvent.setup();render(<Pantry client={{}} userId="A" view="expiry"/>);
  await screen.findByText('Use by date passed');
  expect(screen.getByText('Preparation date recorded')).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Filter dates'),'Date passed');
  expect(screen.getByRole('heading',{name:'Old milk'})).toBeInTheDocument();
  expect(screen.queryByRole('heading',{name:'Prepared soup'})).not.toBeInTheDocument();
});
test('leftover outcomes persist and used entries appear in history rather than active food',async()=>{
  let entries=[{id:'soup',name:'Soup',quantity:2,unit:'portions',location:'Fridge',date_type:'Not recorded',food_date:null,is_leftover:true,leftover_status:'Available',planned_use_date:'2099-11-06',notes:''}];
  mocks.pantry.mockImplementation(async()=>entries);mocks.outcome.mockImplementation(async()=>{entries=[{...entries[0],leftover_status:'Used'}];});
  const user=userEvent.setup();render(<Pantry client={{}} userId="A" view="leftovers" initialFilter="Leftovers"/>);
  await user.click(await screen.findByRole('button',{name:'Record consumption or disposal'}));
  await user.click(screen.getByRole('button',{name:'Confirm outcome'}));
  await screen.findByText('No food items in this view yet.');
  await user.selectOptions(screen.getByLabelText('Show food'),'Leftover history');
  expect(await screen.findByRole('heading',{name:'Soup'})).toBeInTheDocument();
  expect(mocks.outcome).toHaveBeenCalledWith('soup','2','Used','');
});
test('storage guide filters topics and keeps source links available',async()=>{
  const user=userEvent.setup();render(<StorageGuide/>);
  await user.selectOptions(screen.getByLabelText('Storage topic'),'Freezer');
  expect(screen.getByRole('heading',{name:'Thawing and reheating'})).toBeInTheDocument();
  expect(screen.getByRole('link',{name:/New Zealand Food Safety/})).toHaveAttribute('href',expect.stringContaining('mpi.govt.nz'));
  await user.type(screen.getByLabelText('Search storage guidance'),'nomatch');
  expect(screen.getByText(/No guidance matches/)).toBeInTheDocument();
});
test('barcode lookup requires deliberate review and missing catalog products offer manual entry',async()=>{
  mocks.lookup.mockResolvedValueOnce({code:'3017620422003',name:'Demo product',brand:'Example',pack:'200 g'}).mockResolvedValueOnce(null);
  const review=vi.fn();const user=userEvent.setup();render(<BarcodeImport onReview={review}/>);
  await user.click(screen.getByText('Add food using a barcode').closest('summary'));
  await user.type(screen.getByLabelText('Product barcode'),'3017620422003');
  await user.click(screen.getByRole('button',{name:'Look up product'}));
  await user.click(await screen.findByRole('button',{name:'Review barcode product'}));
  expect(review).toHaveBeenCalledWith(expect.objectContaining({name:'Demo product',quantity:'',unit:'',food_date:''}));
  await user.click(screen.getByRole('button',{name:'Look up product'}));
  expect(await screen.findByText(/No product found/)).toBeInTheDocument();
});
test('barcode photo decoding remains local until an explicit catalog lookup',async()=>{
  const previousCreate=URL.createObjectURL,previousRevoke=URL.revokeObjectURL;
  URL.createObjectURL=vi.fn(()=> 'blob:barcode-test');URL.revokeObjectURL=vi.fn();
  mocks.decode.mockResolvedValue('3017620422003');
  const user=userEvent.setup();const view=render(<BarcodeImport onReview={vi.fn()}/>);
  try{
    await user.click(screen.getByText('Add food using a barcode').closest('summary'));
    await user.upload(screen.getByLabelText('Barcode photo'),new File(['barcode'],'barcode.png',{type:'image/png'}));
    fireEvent.load(await screen.findByAltText('Selected barcode for local decoding'));
    await user.click(screen.getByRole('button',{name:'Read barcode photo'}));
    await waitFor(()=>expect(screen.getByLabelText('Product barcode')).toHaveValue('3017620422003'));
    expect(mocks.lookup).not.toHaveBeenCalled();
  }finally{view.unmount();URL.createObjectURL=previousCreate;URL.revokeObjectURL=previousRevoke;}
});
test('sharing simulation creates, reserves, collects and deletes a demo offer with explicit actors',async()=>{
  let offers=[];
  mocks.sharing.mockImplementation(async()=>offers);
  mocks.saveOffer.mockImplementation(async item=>{offers=[{...item,id:'offer-1',status:'Available',recipient:null,condition:'Unopened shelf-stable'}];});
  mocks.act.mockImplementation(async(offer,action,actor)=>{offers=[{...offer,status:action==='reserve'?'Reserved':'Collected',recipient:actor}];});
  mocks.remove.mockImplementation(async()=>{offers=[];});
  const user=userEvent.setup();render(<SharingSimulation client={{}} userId="A"/>);
  await screen.findByText('No demo offers in this view.');
  await user.click(screen.getByRole('button',{name:'Load demo rice scenario'}));
  await user.click(screen.getByRole('checkbox',{name:/Simulation only/}));
  await user.click(screen.getByRole('button',{name:'Create demo offer'}));
  await screen.findByText('Demo offer created.');
  await user.selectOptions(screen.getByLabelText('Act as demo household'),'Demo household B');
  await user.click(await screen.findByRole('button',{name:'Simulate reservation'}));
  await screen.findByText('Demo offer reserved.');
  await user.click(await screen.findByRole('button',{name:'Simulate collection'}));
  await screen.findByText('Demo collection recorded.');
  await user.selectOptions(screen.getByLabelText('Act as demo household'),'Demo household A');
  await user.click(await screen.findByRole('button',{name:'Delete demo Surplus rice'}));
  expect(mocks.remove).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button',{name:'Confirm demo deletion'}));
  await screen.findByText('Demo offer deleted.');
});
test('sharing failures do not fabricate successful actions and signed-out access reads no records',async()=>{
  mocks.sharing.mockRejectedValueOnce(new Error('offline'));
  const view=render(<SharingSimulation client={{}} userId="A"/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load demo offers');
  view.unmount();mocks.sharing.mockClear();render(<SharingSimulation client={{}}/>);
  expect(screen.getByRole('link',{name:'Sign in to simulate sharing'})).toHaveAttribute('href','#/login');
  expect(mocks.sharing).not.toHaveBeenCalled();
});
test('all nine advertised tool links resolve to implemented routes',()=>{
  render(<ToolDirectory/>);
  const links=screen.getAllByRole('link',{name:/^Open /});expect(links).toHaveLength(9);
  for(const link of links)expect(readRoute(link.getAttribute('href'))).not.toBe('not-found');
});
