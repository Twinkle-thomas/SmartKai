import {useState,useRef,useEffect} from 'react';
import {normalizeBarcode} from '../domain/barcodes.js';
export default function LiveBarcodeCamera({onCode,disabled=false}){
 const [running,setRunning]=useState(false),[error,setError]=useState('');const video=useRef(null),controls=useRef(null),version=useRef(0),stream=useRef(null);
 function stop(){version.current++;controls.current?.stop();controls.current=null;stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;if(video.current)video.current.srcObject=null;setRunning(false);}
 useEffect(()=>()=>{version.current++;controls.current?.stop();stream.current?.getTracks().forEach(track=>track.stop());},[]);
 async function start(){if(running)return;const request=++version.current;setRunning(true);setError('');try{
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access needs HTTPS or localhost and a supported browser. Use a barcode photo or type the number instead.');
  const {BrowserMultiFormatOneDReader}=await import('@zxing/browser');
  if(request!==version.current)return;
  const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
  if(request!==version.current){media.getTracks().forEach(track=>track.stop());return;}stream.current=media;
  const reader=new BrowserMultiFormatOneDReader();
  const scanner=await reader.decodeFromStream(media,video.current,(result,unused,scannerControls)=>{if(result&&request===version.current){try{const code=normalizeBarcode(result.getText());scannerControls.stop();stop();onCode(code);}catch{ /* Continue looking for a supported valid product barcode. */ }}});
  if(request!==version.current)scanner.stop();else controls.current=scanner;
 }catch(failure){if(request===version.current){stop();setError(failure.name==='NotAllowedError'?'Camera permission was denied. Allow camera access or use a photo/manual entry.':failure.name==='NotFoundError'?'No camera was found. Use a photo or manual entry.':failure.message||'Camera could not start. Use a photo or manual entry.');}}}
 return <div className="mt-3"><div className="flex flex-wrap gap-2"><button type="button" className="secondary" disabled={disabled||running} onClick={start}>Scan with live camera</button>{running&&<button type="button" className="secondary" onClick={stop}>Stop camera</button>}</div><video ref={video} muted playsInline aria-label="Live barcode camera preview" className={running?'food-photo-preview mt-3':'hidden'}/>{running&&<p role="status" className="mt-2 text-sm">Point the camera at a product barcode. Scanning stays on this device; lookup is a separate action.</p>}{error&&<p role="alert" className="mt-2">{error}</p>}</div>;
}
