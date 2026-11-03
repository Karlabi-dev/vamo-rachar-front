import { useMemo } from 'react';
import QRCode from 'qrcode';

// Encodes text only. It does not point to a real table, URL, or backend session.
export default function DemoQr({tableId, session, size=160}){
  const qr=useMemo(()=>QRCode.create(`VamoRachar DEMONSTRACAO LOCAL | Mesa ${tableId} | Sessao ${session} | Sem validade operacional`,{errorCorrectionLevel:'M'}),[tableId,session]);
  const dimension=qr.modules.size;
  const paths=[];
  for(let row=0;row<dimension;row++)for(let col=0;col<dimension;col++)if(qr.modules.get(row,col))paths.push(`M${col+4},${row+4}h1v1h-1z`);
  return <svg className="floor-qr" width={size} height={size} viewBox={`0 0 ${dimension+8} ${dimension+8}`} role="img" aria-label={`QR Code demonstrativo da Mesa ${tableId}`} shapeRendering="crispEdges"><title>QR Code demonstrativo da Mesa {tableId}</title><rect width="100%" height="100%" fill="white"/><path d={paths.join('')} fill="#173247"/></svg>;
}
