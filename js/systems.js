/* รายการเครื่องเล่นทั้งหมด — เพิ่มเครื่องใหม่ได้ที่นี่ที่เดียว
   core = ชื่อ core ของ EmulatorJS · glyph = รูปทรงไอคอน · c = สีไล่เฉด */
window.SYSTEMS = [
  /* ---- แบบพกพา ---- */
  { id:'gb',   group:'handheld', name:'Game Boy / Color', short:'GB',  core:'gb',   glyph:'tall', c:['#9bbc0f','#4a6b12'], ext:['gb','gbc'] },
  { id:'gba',  group:'handheld', name:'Game Boy Advance', short:'GBA', core:'gba',  glyph:'wide', c:['#7b5cff','#2c1c8a'], ext:['gba'] },
  { id:'nds',  group:'handheld', name:'Nintendo DS',      short:'DS',  core:'nds',  glyph:'dual', c:['#d9dde4','#7a8190'], ext:['nds'] },
  { id:'psp',  group:'handheld', name:'PlayStation Portable', short:'PSP', core:'psp', glyph:'wide', c:['#2b2f3a','#0d0f14'], ext:['iso','cso','pbp'], heavy:true, threads:true, native:'psp' },
  { id:'gg',   group:'handheld', name:'Game Gear',        short:'GG',  core:'segaGG', glyph:'wide', c:['#4f6bff','#12206b'], ext:['gg'] },
  { id:'ngp',  group:'handheld', name:'Neo Geo Pocket',   short:'NGP', core:'ngp',  glyph:'wide', c:['#ff7a59','#8a2a12'], ext:['ngp','ngc'] },
  { id:'ws',   group:'handheld', name:'WonderSwan',       short:'WS',  core:'ws',   glyph:'tall', c:['#35c2b3','#0f5b54'], ext:['ws','wsc'] },
  /* ---- เครื่องเล่นบ้าน ---- */
  { id:'nes',  group:'home', name:'Famicom / NES',   short:'NES',  core:'nes',  glyph:'pad',  c:['#ff5a5f','#8b1620'], ext:['nes','unf','unif'] },
  { id:'snes', group:'home', name:'Super Famicom / SNES', short:'SNES', core:'snes', glyph:'pad', c:['#b9a8ff','#4a3a9a'], ext:['sfc','smc','swc','fig'] },
  { id:'n64',  group:'home', name:'Nintendo 64',     short:'N64',  core:'n64',  glyph:'pad',  c:['#3ecf8e','#0f6b45'], ext:['z64','n64','v64'], heavy:true },
  { id:'psx',  group:'home', name:'PlayStation 1',   short:'PS1',  core:'psx',  glyph:'disc', c:['#8e96a8','#3a4050'], ext:['cue','bin','iso','chd','pbp','img','m3u'] },
  { id:'md',   group:'home', name:'Mega Drive / Genesis', short:'MD', core:'segaMD', glyph:'pad', c:['#2a2d3a','#000000'], ext:['md','gen','smd','bin'] },
  { id:'sms',  group:'home', name:'Master System',   short:'SMS',  core:'segaMS', glyph:'cart', c:['#ff4d4d','#7a0f0f'], ext:['sms'] },
  { id:'scd',  group:'home', name:'Mega CD',         short:'MCD',  core:'segaCD', glyph:'disc', c:['#5aa9ff','#12408a'], ext:['cue','bin','iso','chd'] },
  { id:'sat',  group:'home', name:'Sega Saturn',     short:'SAT',  core:'segaSaturn', glyph:'disc', c:['#7aa2c8','#2b4a6a'], ext:['cue','bin','iso','chd'], heavy:true },
  { id:'pce',  group:'home', name:'PC Engine',       short:'PCE',  core:'pce',  glyph:'cart', c:['#f2b84b','#8a5a0a'], ext:['pce'] },
  { id:'a26',  group:'home', name:'Atari 2600',      short:'2600', core:'atari2600', glyph:'cart', c:['#c9803a','#5a3410'], ext:['a26','bin'] },
  { id:'arc',  group:'home', name:'อาร์เคด (Neo Geo / CPS)', short:'ARC', core:'arcade', glyph:'cart', c:['#ff3d9a','#6a0f45'], ext:['zip'] },
];

/* เครื่องหนักที่รันในเว็บไม่ได้ — เปิดด้วยโปรแกรมอีมูในเครื่องผ่าน serve.py (ตั้งค่าใน emulators.json) */
window.NATIVE = [
  { id:'3ds', name:'Nintendo 3DS',    short:'3DS', glyph:'dual', c:['#ff6a4d','#8a1d0c'], app:'Azahar',  url:'https://azahar-emu.org' },
  { id:'ps2', name:'PlayStation 2',   short:'PS2', glyph:'disc', c:['#4a5de0','#141a66'], app:'PCSX2',   url:'https://pcsx2.net' },
  { id:'gc',  name:'GameCube / Wii',  short:'Wii', glyph:'disc', c:['#9b78e6','#3b2475'], app:'Dolphin', url:'https://dolphin-emu.org' },
  { id:'ns',  name:'Nintendo Switch', short:'NSW', glyph:'tall', c:['#ff5a5a','#3f4bc4'], app:'อีมู Switch ที่คุณมี', url:'' },
  { id:'dc',  name:'Dreamcast',       short:'DC',  glyph:'disc', c:['#ffae5a','#8a3d0a'], app:'Flycast', url:'https://github.com/flyinghead/flycast' },
];
/* PSP เล่นในเว็บได้ แต่ถ้าตั้ง PPSSPP ไว้ จะมีตัวเลือกเปิดด้วยโปรแกรมในเครื่องด้วย */
window.NATIVE_ALT = { psp: { app:'PPSSPP', url:'https://www.ppsspp.org' } };

window.GROUPS = [
  { id:'handheld', title:'เครื่องพกพา' },
  { id:'home',     title:'เครื่องเล่นบ้านและอาร์เคด' },
];

/* ปุ่มควบคุมของแต่ละเครื่อง สำหรับปุ่ม "ควบคุม" ในหน้าเล่น
   แต่ละปุ่ม = [ชื่อปุ่มบนเครื่องจริง, เลขปุ่ม RetroPad ที่ผูกอยู่]
   RetroPad: 0=B 1=Y 2=Select 3=Start 8=A 9=X 10=L 11=R 12=L2 13=R2 · null = ไม่มีปุ่มคีย์บอร์ดตั้งต้น
   approx = ชื่อปุ่มตรงกับเครื่องจริง แต่การผูกกับ RetroPad อาจต่างตามเกม/core */
window.PADS = {
  nes:  { keys:[['A',8],['B',0],['Select',2],['Start',3]] },
  snes: { keys:[['A',8],['B',0],['X',9],['Y',1],['L',10],['R',11],['Select',2],['Start',3]] },
  gb:   { keys:[['A',8],['B',0],['Select',2],['Start',3]] },
  gba:  { keys:[['A',8],['B',0],['L',10],['R',11],['Select',2],['Start',3]] },
  nds:  { keys:[['A',8],['B',0],['X',9],['Y',1],['L',10],['R',11],['Select',2],['Start',3]],
          notes:['จอสัมผัส (จอล่าง): คลิกเมาส์บนจอล่างแทนการแตะ'] },
  n64:  { approx:true, keys:[['A',0],['B',1],['Z',12],['L',10],['R',11],['Start',3]],
          notes:['ปุ่ม C ทั้ง 4 และสติ๊กอนาล็อกตั้งในเมนูควบคุมของอีมู หรือใช้จอยที่มีสติ๊กขวา'] },
  psx:  { keys:[['✕',0],['○',8],['□',1],['△',9],['L1',10],['R1',11],['L2',12],['R2',13],['Select',2],['Start',3]],
          notes:['สติ๊กอนาล็อกและ L3/R3 ใช้ได้กับจอยจริง หรือตั้งคีย์ในเมนูควบคุมของอีมู'] },
  psp:  { keys:[['✕',0],['○',8],['□',1],['△',9],['L',10],['R',11],['Select',2],['Start',3]],
          notes:['สติ๊กอนาล็อกตั้งในเมนูควบคุมของอีมู หรือใช้จอย'] },
  md:   { approx:true, keys:[['A',1],['B',0],['C',8],['Start',3],['Mode',2]], notes:['เกมแบบ 6 ปุ่มใช้ X/Y/Z ตั้งในเมนูควบคุมของอีมู'] },
  scd:  { approx:true, keys:[['A',1],['B',0],['C',8],['Start',3],['Mode',2]] },
  sms:  { approx:true, keys:[['ปุ่ม 1',0],['ปุ่ม 2',8],['Pause/Start',3]] },
  gg:   { approx:true, keys:[['ปุ่ม 1',0],['ปุ่ม 2',8],['Start',3]] },
  sat:  { approx:true, keys:[['A',1],['B',0],['C',8],['X',9],['Y',10],['Z',11],['Start',3]], notes:['L/R ของ Saturn ตั้งในเมนูควบคุมของอีมู'] },
  pce:  { approx:true, keys:[['II',0],['I',8],['Select',2],['Run',3]] },
  ngp:  { approx:true, keys:[['A',8],['B',0],['Option',3]] },
  ws:   { approx:true, keys:[['A',8],['B',0],['Start',3]], notes:['เกมที่ต้องหมุนจอ ใช้ชุดทิศทางอีกชุดที่ตั้งในเมนูควบคุมของอีมู'] },
  a26:  { approx:true, keys:[['Fire',0],['Select',2],['Reset/Start',3]] },
  arc:  { approx:true, keys:[['Coin (หยอดเหรียญ)',2],['Start',3],['ปุ่ม 1',0],['ปุ่ม 2',8],['ปุ่ม 3',1],['ปุ่ม 4',9],['ปุ่ม 5',10],['ปุ่ม 6',11]] }
};

/* เครื่องที่มีช่องใส่ BIOS (ไฟล์ถูกเก็บในโฟลเดอร์ bios/ ในเครื่องคุณ ไม่ถูกอัปโหลดออกไป) */
window.BIOS = {
  psx: { label: 'PlayStation 1', optional: true,  hint: 'เช่น scph5501.bin' },
  scd: { label: 'Mega CD',       optional: false, hint: 'เช่น bios_CD_U.bin' },
  sat: { label: 'Sega Saturn',   optional: false, hint: 'เช่น sega_101.bin' }
};
