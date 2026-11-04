// Decode a crisp synthetic EAN-13 fixture with the real ZXing engine.
import assert from 'node:assert/strict';
import zxing from '@zxing/library';
const { MultiFormatReader,RGBLuminanceSource,BinaryBitmap,HybridBinarizer }=zxing;
const code='3017620422003';
const left=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const parity=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'][Number(code[0])];
const invert=bits=>bits.replace(/[01]/g,char=>char==='0'?'1':'0');
let bits='101';
for(let i=1;i<=6;i++){const l=left[Number(code[i])];bits+=parity[i-1]==='L'?l:invert(l).split('').reverse().join('');}
bits+='01010';for(let i=7;i<13;i++)bits+=invert(left[Number(code[i])]);bits+='101';
const width=(bits.length+40)*4,height=200;const pixels=new Uint8ClampedArray(width*height).fill(255);
for(let y=10;y<height-10;y++)for(let i=0;i<bits.length;i++)if(bits[i]==='1')pixels.fill(0,y*width+(i+20)*4,y*width+(i+21)*4);
const result=new MultiFormatReader().decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels,width,height))),new Map());
assert.equal(result.getText(),code);
console.log(JSON.stringify({engine:'ZXing',syntheticBarcode:result.getText(),note:'Local fixture check; phone camera performance still requires device testing.'},null,2));
