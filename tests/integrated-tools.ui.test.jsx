import React from 'react';
import {beforeEach,afterEach,expect,test,vi} from 'vitest';
import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PurchaseTransfer from '../src/components/PurchaseTransfer.jsx';
import MealConsumption from '../src/components/MealConsumption.jsx';
import InventoryOutcome from '../src/components/InventoryOutcome.jsx';
import InventoryHistory from '../src/components/InventoryHistory.jsx';
import ExpiryCalendar from '../src/components/ExpiryCalendar.jsx';
import LiveBarcodeCamera from '../src/components/LiveBarcodeCamera.jsx';
import FoodStorageLibrary from '../src/components/FoodStorageLibrary.jsx';
import MealShoppingReview from '../src/components/MealShoppingReview.jsx';
import Dashboard from '../src/components/Dashboard.jsx';
const food={id:'rice',name:'Rice',quantity:4,unit:'bags',location:'Pantry',date_type:'Best before',food_date:'2099-11-05',category:'Grains',leftover_status:'Available'};
const camera=vi.hoisted(()=>({decode:vi.fn()}));
vi.mock('@zxing/browser',()=>({BrowserMultiFormatOneDReader:class{decodeFromStream(...args){return camera.decode(...args);}}}));
beforeEach(()=>{vi.clearAllMocks();window.history.replaceState(null,'','/#/storage');});
afterEach(()=>vi.unstubAllGlobals());
test('purchased stock transfers only after reviewed confirmation with entered date and amount',async()=>{
 const client={rpc:vi.fn().mockResolvedValue({data:'new-id',error:null})},saved=vi.fn(),user=userEvent.setup();
 render(<PurchaseTransfer item={{...food,purchased:true}} client={client} userId="A" onSaved={saved}/>);
 await user.click(screen.getByRole('button',{name:'Add purchased item to pantry'}));expect(client.rpc).not.toHaveBeenCalled();
 await user.clear(screen.getByLabelText('Purchased quantity'));await user.type(screen.getByLabelText('Purchased quantity'),'2');
 await user.selectOptions(screen.getByLabelText('Purchased date type'),'Best before');await user.type(screen.getByLabelText('Purchased food date'),'2099-11-05');
 await user.click(screen.getByRole('button',{name:'Confirm purchase into pantry'}));
 await waitFor(()=>expect(saved).toHaveBeenCalledOnce());
 expect(client.rpc).toHaveBeenCalledWith('transfer_shopping_to_pantry',expect.objectContaining({p_id:'rice',p_food:expect.objectContaining({quantity:2,food_date:'2099-11-05'})}));
});
test('meal confirmation uses explicit amounts and excludes past use-by food',async()=>{
 const user=userEvent.setup(),client={rpc:vi.fn().mockResolvedValue({error:null})},saved=vi.fn();
 render(<MealConsumption meal={{id:'meal',name:'Rice dinner'}} stock={[food,{...food,id:'milk',name:'Expired milk',date_type:'Use by',food_date:'2000-01-01'}]} client={client} userId="A" onSaved={saved}/>);
 await user.click(screen.getByRole('button',{name:'Record meal consumed'}));
 expect(screen.queryByLabelText(/Expired milk/)).not.toBeInTheDocument();expect(client.rpc).not.toHaveBeenCalled();
 await user.type(screen.getByLabelText(/Rice: amount used/),'1.25');await user.click(screen.getByRole('button',{name:'Confirm consumed meal'}));
 await waitFor(()=>expect(saved).toHaveBeenCalledOnce());expect(client.rpc).toHaveBeenCalledWith('confirm_meal_consumption',{p_meal:'meal',p_items:[{id:'rice',quantity:1.25}]});
});
test('disposal requires an explanation and records a partial quantity',async()=>{
 const user=userEvent.setup(),client={rpc:vi.fn().mockResolvedValue({error:null})};render(<InventoryOutcome item={food} client={client} userId="A" onSaved={vi.fn()}/>);
 await user.click(screen.getByRole('button',{name:'Record consumption or disposal'}));await user.selectOptions(screen.getByLabelText('Outcome'),'Discarded');
 await user.click(screen.getByRole('button',{name:'Confirm outcome'}));expect(client.rpc).not.toHaveBeenCalled();
 await user.type(screen.getByLabelText('Disposal reason'),'Damaged packaging');await user.clear(screen.getByLabelText('Amount in bags'));await user.type(screen.getByLabelText('Amount in bags'),'0.5');
 await user.click(screen.getByRole('button',{name:'Confirm outcome'}));await waitFor(()=>expect(client.rpc).toHaveBeenCalledWith('record_food_outcome',{p_id:'rice',p_quantity:0.5,p_outcome:'Discarded',p_reason:'Damaged packaging'}));
});
test('expiry calendar links a recorded date to the editable food entry',async()=>{
 const user=userEvent.setup(),edit=vi.fn();render(<ExpiryCalendar items={[food]} onEdit={edit}/>);
 await user.clear(screen.getByLabelText('Calendar month'));await user.type(screen.getByLabelText('Calendar month'),'2099-11');
 await user.click(screen.getByRole('button',{name:/Rice/}));expect(edit).toHaveBeenCalledWith(food);
});
test('camera permission failure offers manual/photo fallback without fabricating a result',async()=>{
 vi.stubGlobal('isSecureContext',true);Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:vi.fn().mockRejectedValue(Object.assign(new Error('Denied'),{name:'NotAllowedError'}))}});
 const user=userEvent.setup(),code=vi.fn();render(<LiveBarcodeCamera onCode={code}/>);await user.click(screen.getByRole('button',{name:'Scan with live camera'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Camera permission was denied');expect(code).not.toHaveBeenCalled();
});
test('a delayed camera permission result is released after unmount',async()=>{
 vi.stubGlobal('isSecureContext',true);let resolve;const request=new Promise(done=>{resolve=done;});const stop=vi.fn();Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:vi.fn(()=>request)}});
 const user=userEvent.setup(),view=render(<LiveBarcodeCamera onCode={vi.fn()}/>);await user.click(screen.getByRole('button',{name:'Scan with live camera'}));await waitFor(()=>expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled());view.unmount();resolve({getTracks:()=>[{stop}]});await waitFor(()=>expect(stop).toHaveBeenCalled());expect(camera.decode).not.toHaveBeenCalled();
});
test('a real camera decode result stops scanning and still requires a separate product lookup',async()=>{
 vi.stubGlobal('isSecureContext',true);const stop=vi.fn(),stopScanner=vi.fn(),code=vi.fn();Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:vi.fn().mockResolvedValue({getTracks:()=>[{stop}]})}});
 camera.decode.mockImplementation(async(media,video,callback)=>{queueMicrotask(()=>callback({getText:()=> '3017620422003'},null,{stop:stopScanner}));return {stop:stopScanner};});
 const user=userEvent.setup();render(<LiveBarcodeCamera onCode={code}/>);await user.click(screen.getByRole('button',{name:'Scan with live camera'}));await waitFor(()=>expect(code).toHaveBeenCalledWith('3017620422003'));expect(stop).toHaveBeenCalled();expect(stopScanner).toHaveBeenCalled();
});
test('a shopping entry transferred earlier cannot be transferred again after its stock record is removed',()=>{
 render(<PurchaseTransfer item={{...food,purchased:true,pantry_item_id:null,pantry_added_at:'2026-11-05T00:00:00Z'}} client={{}} userId="A" onSaved={vi.fn()}/>);
 expect(screen.getByText(/entry later removed/)).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Add purchased item to pantry'})).not.toBeInTheDocument();
});
test('dashboard explains relevant profile actions while retaining access to every tool',()=>{
 render(<Dashboard result={{profiles:['Overbuyer','Storage Learner']}}/>);
 expect(screen.getByRole('link',{name:/Check stock before shopping/})).toHaveAttribute('href','#/shopping');expect(screen.getByText('Your answers suggest frequent extra buying. Compare the list with pantry stock first.')).toBeInTheDocument();expect(screen.getByText('Overbuyer',{exact:true})).toBeInTheDocument();expect(screen.getByRole('link',{name:'Explore all tools'})).toHaveAttribute('href','#/tools');
});
test('food storage has searchable categories and a food detail route with source attribution',async()=>{
 const user=userEvent.setup(),view=render(<FoodStorageLibrary/>);await user.type(screen.getByLabelText('Find a food in the storage library'),'carrot');
 expect(screen.getByRole('link',{name:/Open carrots guidance/})).toHaveAttribute('href','#/storage?food=carrots');expect(screen.queryByRole('heading',{name:'Apples'})).not.toBeInTheDocument();
 view.unmount();window.history.replaceState(null,'','/#/storage?food=carrots');render(<FoodStorageLibrary/>);expect(screen.getByRole('link',{name:/Love Food Hate Waste NZ: Carrots/})).toHaveAttribute('href','https://lovefoodhatewaste.co.nz/storage-tips/carrots/');
});
test('meal shopping review distinguishes exact stock matches and opens an explicit addition',async()=>{
 const user=userEvent.setup(),choose=vi.fn();render(<MealShoppingReview meal={{ingredients:'Rice: 1 bag\nCarrots: 200 g'}} stock={[food]} onChoose={choose}/>);
 await user.click(screen.getByRole('button',{name:'Review meal ingredients for shopping'}));expect(screen.getByText(/Name recorded in pantry/)).toBeInTheDocument();expect(screen.getByText(/No exact pantry name match/)).toBeInTheDocument();await user.click(screen.getByRole('button',{name:'Review shopping addition: Carrots'}));expect(choose).toHaveBeenCalledWith('Carrots');
});
test('inventory history handles failures and can reload confirmed partial outcomes',async()=>{
 const limit=vi.fn().mockResolvedValueOnce({error:new Error('Offline')}).mockResolvedValueOnce({data:[{id:'event',food_name:'Rice',quantity:0.5,unit:'bags',outcome:'Discarded',reason:'Damaged',created_at:'2026-11-05T00:00:00Z'}]});const query={select:()=>query,eq:()=>query,order:()=>query,limit};const user=userEvent.setup();render(<React.StrictMode><InventoryHistory client={{from:()=>query}} userId="A"/></React.StrictMode>);
 await user.click(screen.getByRole('button',{name:'Load outcome history'}));expect(await screen.findByRole('alert')).toHaveTextContent('Could not load');await user.click(screen.getByRole('button',{name:'Refresh outcome history'}));expect(await screen.findByText(/Damaged/)).toBeInTheDocument();
});
