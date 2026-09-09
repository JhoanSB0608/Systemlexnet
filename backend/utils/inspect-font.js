const fs = require('fs');
function readTTFData(p){
  const b = fs.readFileSync(p);
  const numTables = b.readUInt16BE(4);
  const tables = {};
  for (let i=0;i<numTables;i++){ const o=12+i*16; const tag=b.toString('ascii',o,o+4); tables[tag]={offset:b.readUInt32BE(o+8), len:b.readUInt32BE(o+12)}; }
  const upem = tables.head ? b.readUInt16BE(tables.head.offset+18) : 2048;
  const cmap = tables.cmap;
  const n = b.readUInt16BE(cmap.offset+2);
  function gidL4(off, code){
    const segCount = b.readUInt16BE(off+6)/2;
    const endCodes=[]; for (let s=0;s<segCount;s++) endCodes.push(b.readUInt16BE(off+14+s*2));
    const startOff = off+16+segCount*2;
    const startCodes=[]; for (let s=0;s<segCount;s++) startCodes.push(b.readUInt16BE(startOff+s*2));
    const deltaOff = startOff+segCount*2;
    const idDeltas=[]; for (let s=0;s<segCount;s++) idDeltas.push(b.readInt16BE(deltaOff+s*2));
    const roOff = deltaOff+segCount*2;
    const idRangeOffsets=[]; for (let s=0;s<segCount;s++) idRangeOffsets.push(b.readUInt16BE(roOff+s*2));
    for (let s=0;s<segCount;s++){
      if (code>=startCodes[s]&&code<=endCodes[s]){
        if (idRangeOffsets[s]===0) return (code+idDeltas[s]) & 0xFFFF;
        const gAddr = roOff+s*2 + idRangeOffsets[s] + (code-startCodes[s])*2;
        const g = b.readUInt16BE(gAddr);
        return g===0?0:(g+idDeltas[s])&0xFFFF;
      }
    }
    return 0;
  }
  let gidSpace=0, gidNbsp=0;
  for (let i=0;i<n;i++){
    const o = cmap.offset+4+i*8;
    const pid=b.readUInt16BE(o),eid=b.readUInt16BE(o+2),off=b.readUInt32BE(o+4);
    const offAbs=cmap.offset+off;
    const fmt=b.readUInt16BE(offAbs);
    if (fmt===4 && ((pid===3&&eid===1)||(pid===0&&eid===3))){
      gidSpace = gidL4(offAbs,0x20);
      gidNbsp  = gidL4(offAbs,0xA0);
      break;
    }
  }
  const numHM = b.readUInt16BE(tables.hhea.offset+34);
  const adv = g => g===0?null:b.readUInt16BE(tables.hmtx.offset+Math.min(g,numHM-1)*4);
  const pt = u => (u/upem*14);
  console.log(p);
  console.log('  upem', upem, 'numHM', numHM);
  console.log('  space gid', gidSpace, 'units', adv(gidSpace), 'pt@14', adv(gidSpace)&&pt(adv(gidSpace)).toFixed(2));
  console.log('  nbsp  gid', gidNbsp, 'units', adv(gidNbsp), 'pt@14', adv(gidNbsp)&&pt(adv(gidNbsp)).toFixed(2));
}
readTTFData(process.argv[2]);
readTTFData(process.argv[3]);