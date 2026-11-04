const root='https://lovefoodhatewaste.co.nz/storage-tips/';
export const FOOD_STORAGE=[
 {id:'apples',name:'Apples',aliases:['apple'],category:'Fruit',art:'fruit',location:'Fridge',text:'Keep apples refrigerated; take out a small amount when you want them at room temperature.'},
 {id:'bananas',name:'Bananas',aliases:['banana'],category:'Fruit',art:'banana',location:'Other',text:'Keep bananas cool, outside the fridge and separate from other fruit.'},
 {id:'avocados',name:'Avocados',aliases:['avocado'],category:'Fruit',art:'pack',location:'Other / Fridge',text:'Ripen at room temperature, then refrigerate. Protect the cut surface when storing a cut avocado.'},
 {id:'bread',name:'Bread',aliases:['loaf'],category:'Grains',art:'bread',location:'Freezer',text:'Freeze bread you want to keep for later rather than leaving the whole loaf out.'},
 {id:'broccoli',name:'Broccoli',aliases:[],category:'Vegetables',art:'leaf',location:'Fridge',text:'Store broccoli in the fridge.'},
 {id:'carrots',name:'Carrots',aliases:['carrot'],category:'Vegetables',art:'carrot',location:'Fridge',text:'Use an airtight container lined with paper towel for carrots.'},
 {id:'aubergines',name:'Aubergines',aliases:['aubergine','eggplant','eggplants'],category:'Vegetables',art:'pack',location:'Fridge',text:'Keep aubergines refrigerated.'},
].map(item=>({...item,source:root+item.id+'/'}));
export function storageFoodId(name){const normalized=name.trim().toLowerCase();return FOOD_STORAGE.find(item=>item.name.toLowerCase()===normalized||item.aliases.includes(normalized))?.id;}
