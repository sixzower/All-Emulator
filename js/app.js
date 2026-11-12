/* All-Emulator — หน้าคลังเครื่อง + หน้าเล่นทดสอบ (ใช้ EmulatorJS เป็นแกนอีมู) */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var CDN = 'https://cdn.emulatorjs.org/stable/data/';
  var LOCAL = 'emulatorjs/data/';   // ถ้าดาวน์โหลดไว้เอง (ดู README) จะใช้ตัวนี้ก่อน ทำงานออฟไลน์ได้
  var current = null;               // { file, system, key }
  var shots = [], shotSeq = 0;
  var db;
  var DEMO = /[?&]demo/.test(location.search);   // โหมดตัวอย่าง: จอเกมจำลอง ไม่ต้องใช้อีมูหรือรอม

  /* ---------- ไอคอนเครื่อง (รูปทรงต้นฉบับ ไม่ใช้โลโก้จริง) ---------- */
  var GLYPH = {
    tall: '<svg viewBox="0 0 64 64"><rect x="16" y="6" width="32" height="52" rx="6" fill="#fff" fill-opacity=".92"/><rect x="21" y="11" width="22" height="20" rx="2" fill="#000" fill-opacity=".35"/><path d="M24 42h8M28 38v8" stroke="#000" stroke-opacity=".4" stroke-width="3" stroke-linecap="round"/><circle cx="40" cy="40" r="2.6" fill="#000" fill-opacity=".4"/><circle cx="44" cy="46" r="2.6" fill="#000" fill-opacity=".4"/></svg>',
    wide: '<svg viewBox="0 0 64 64"><rect x="4" y="16" width="56" height="32" rx="9" fill="#fff" fill-opacity=".92"/><rect x="18" y="21" width="28" height="22" rx="2" fill="#000" fill-opacity=".35"/><path d="M11 32h8M15 28v8" stroke="#000" stroke-opacity=".4" stroke-width="2.6" stroke-linecap="round"/><circle cx="52" cy="29" r="2.4" fill="#000" fill-opacity=".4"/><circle cx="52" cy="36" r="2.4" fill="#000" fill-opacity=".4"/></svg>',
    dual: '<svg viewBox="0 0 64 64"><rect x="12" y="4" width="40" height="56" rx="7" fill="#fff" fill-opacity=".92"/><rect x="17" y="9" width="30" height="20" rx="2" fill="#000" fill-opacity=".35"/><rect x="17" y="35" width="30" height="20" rx="2" fill="#000" fill-opacity=".35"/><rect x="12" y="30" width="40" height="3" fill="#000" fill-opacity=".18"/></svg>',
    pad:  '<svg viewBox="0 0 64 64"><path d="M14 20h36c6 0 10 6 11 14l1 10c.6 5-4 8-8 5l-8-7H18l-8 7c-4 3-8.600 0-8-5l1-10c1-8 5-14 11-14z" fill="#fff" fill-opacity=".92"/><path d="M19 29v10M14 34h10" stroke="#000" stroke-opacity=".4" stroke-width="3" stroke-linecap="round"/><circle cx="42" cy="31" r="2.8" fill="#000" fill-opacity=".4"/><circle cx="48" cy="37" r="2.8" fill="#000" fill-opacity=".4"/></svg>',
    cart: '<svg viewBox="0 0 64 64"><path d="M14 8h36a4 4 0 0 1 4 4v38a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z" fill="#fff" fill-opacity=".92"/><rect x="17" y="14" width="30" height="20" rx="3" fill="#000" fill-opacity=".3"/><rect x="20" y="42" width="24" height="8" rx="2" fill="#000" fill-opacity=".25"/></svg>',
    disc: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="25" fill="#fff" fill-opacity=".92"/><circle cx="32" cy="32" r="8" fill="#000" fill-opacity=".35"/><circle cx="32" cy="32" r="18" fill="none" stroke="#000" stroke-opacity=".15" stroke-width="2"/></svg>'
  };
  function icon(s, off) {
    var c = s.c || ['#9aa', '#566'];
    return '<span class="icon" style="background:linear-gradient(160deg,' + c[0] + ',' + c[1] + ')">' + GLYPH[s.glyph] + '<em>' + s.short + '</em></span>';
  }

  /* ---------- หน้าคลัง ---------- */
  function buildHome() {
    var html = '';
    GROUPS.forEach(function (g) {
      var items = SYSTEMS.filter(function (s) { return s.group === g.id; });
      html += '<section class="group"><h2>' + g.title + '</h2><div class="grid card">';
      items.forEach(function (s) {
        html += '<button class="app" data-id="' + s.id + '" data-q="' + (s.name + ' ' + s.short).toLowerCase() + '">' + icon(s) + '<span class="lbl">' + s.name + '</span>' + (s.heavy ? '<span class="sub">ใช้แรงเครื่อง</span>' : '') + '</button>';
      });
      html += '</div></section>';
    });
    html += '<section class="group"><h2>ยังรันในเว็บไม่ได้</h2><div class="grid card">';
    UNSUPPORTED.forEach(function (s) {
      html += '<button class="app off" data-off="' + s.id + '" data-q="' + (s.name + ' ' + s.short).toLowerCase() + '">' + icon({ glyph: s.glyph, short: s.short, c: ['#8a90a0', '#4a4f5e'] }) + '<span class="lbl">' + s.name + '</span></button>';
    });
    html += '</div></section>';
    $('#groups').innerHTML = html;

    document.querySelectorAll('.app[data-id]').forEach(function (b) {
      var sys = SYSTEMS.filter(function (s) { return s.id === b.dataset.id; })[0];
      b.addEventListener('click', function () { pickFile(sys); });
      b.addEventListener('dragover', function (e) { e.preventDefault(); b.classList.add('drop'); });
      b.addEventListener('dragleave', function () { b.classList.remove('drop'); });
      b.addEventListener('drop', function (e) {
        e.preventDefault(); b.classList.remove('drop');
        if (e.dataTransfer.files[0]) launch(sys, e.dataTransfer.files[0]);
      });
    });
    document.querySelectorAll('.app[data-off]').forEach(function (b) {
      var u = UNSUPPORTED.filter(function (s) { return s.id === b.dataset.off; })[0];
      b.addEventListener('click', function () {
        sheet(u.name + ' รันในเว็บไม่ได้',
          'เครื่องนี้หนักเกินกว่าที่เบราว์เซอร์จะจำลองได้ แนะนำให้ใช้ ' + u.app + ' บนเครื่อง แล้วค่อยกลับมาใช้หน้านี้กับเกมเครื่องอื่น',
          u.url, u.url ? 'เปิดเว็บ ' + u.app : '');
      });
    });
  }

  function pickFile(sys) {
    var inp = document.createElement('input');       // ต้องสร้างและคลิกในจังหวะที่ผู้ใช้กด
    inp.type = 'file';
    inp.accept = sys.ext.concat(['zip', '7z']).map(function (e) { return '.' + e; }).join(',');
    inp.onchange = function () { if (inp.files[0]) launch(sys, inp.files[0]); };
    inp.click();
  }

  /* ---------- เปิดเกม ---------- */
  function launch(sys, file) {
    current = { file: file, system: sys, key: sys.id + ':' + file.name };
    $('#home').hidden = true;
    $('#play').hidden = false;
    $('#gameTitle').textContent = file.name.replace(/\.[^.]+$/, '');
    $('#gameSys').textContent = sys.name;
    loadNotes(); renderSlots();
    if (sys.heavy) toast('เครื่องนี้ใช้แรงเครื่อง ถ้ากระตุกลองปิดแท็บอื่นก่อน');

    if (DEMO) return demoGame();
    probe(LOCAL + 'loader.js').then(function (hasLocal) {
      var base = hasLocal ? LOCAL : CDN;
      window.EJS_player = '#ejs';
      window.EJS_core = sys.core;
      window.EJS_gameName = file.name.replace(/\.[^.]+$/, '');
      window.EJS_gameUrl = file;                 // ส่งเป็นไฟล์ตรงๆ ไม่ผ่านเซิร์ฟเวอร์
      window.EJS_pathtodata = base;
      window.EJS_startOnLoaded = true;
      window.EJS_color = '#0a84ff';
      window.EJS_threads = !!(sys.threads && window.crossOriginIsolated);
      window.EJS_onGameStart = function () { $('#loading').hidden = true; };
      var s = document.createElement('script');
      s.src = base + 'loader.js';
      s.onerror = function () { $('#loading').textContent = 'โหลดอีมูเลเตอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ต หรือดูวิธีใช้ออฟไลน์ใน README'; };
      document.body.appendChild(s);
    });
  }
  function probe(url) {
    return fetch(url, { method: 'HEAD' }).then(function (r) { return r.ok; }, function () { return false; });
  }
  function emu() { return window.EJS_emulator; }

  /* ---------- ปุ่มบนแถบ ---------- */
  $('#btnBack').onclick = function () { location.reload(); };   // รีโหลดเพื่อคืนหน่วยความจำให้หมด
  $('#btnPanel').onclick = function () { $('#playBody').classList.toggle('nopanel'); };
  $('#btnFull').onclick = function () {
    var el = $('.screen');
    (el.requestFullscreen ? el.requestFullscreen() : toast('เบราว์เซอร์นี้ไม่รองรับเต็มจอ'));
  };
  var fast = false;
  $('#btnFast').onclick = function () {
    try { fast = !fast; emu().gameManager.toggleFastForward(fast ? 1 : 0); $('#btnFast').classList.toggle('on', fast); }
    catch (e) { fast = false; toast('ใช้ปุ่มเร่งความเร็วในแถบควบคุมของอีมูแทน'); }
  };
  $('#btnShot').onclick = function () {
    var done = function (blob) {
      if (!blob) return toast('แคปไม่สำเร็จ ลองใช้ปุ่มแคปในแถบของอีมู');
      addShot(blob); toast('เก็บภาพแล้ว (แท็บ "ภาพแคป")');
    };
    try {
      var r = emu().gameManager.screenshot();
      Promise.resolve(r).then(function (d) { done(d instanceof Blob ? d : new Blob([d], { type: 'image/png' })); }, function () { canvasShot(done); });
    } catch (e) { canvasShot(done); }
  };
  function canvasShot(cb) { var c = document.querySelector('#ejs canvas'); c ? c.toBlob(cb, 'image/png') : cb(null); }
  function baseName() { return current.file.name.replace(/\.[^.]+$/, ''); }
  function addShot(blob) {
    shotSeq++;
    shots.unshift({ blob: blob, url: URL.createObjectURL(blob), name: baseName() + '-' + String(shotSeq).padStart(3, '0') + '.png' });
    renderShots();
  }
  function renderShots() {
    var n = shots.length, cnt = $('#shotCount');
    cnt.hidden = !n; cnt.textContent = n;
    $('#btnSaveAll').disabled = !n; $('#btnClearAll').disabled = !n;
    $('#shotHint').hidden = !!n;
    $('#shotGrid').innerHTML = shots.map(function (s, i) {
      return '<button data-i="' + i + '" aria-label="เปิดภาพที่ ' + (n - i) + '"><img src="' + s.url + '" alt=""><b>' + (n - i) + '</b></button>';
    }).join('');
    $('#shotGrid').querySelectorAll('button').forEach(function (b) { b.onclick = function () { openLB(+b.dataset.i); }; });
  }
  function download(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.hidden = true; document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(a.href); }, 4000);
  }
  $('#btnSaveAll').onclick = function () {
    if (shots.length === 1) return download(shots[0].blob, shots[0].name);
    toast('กำลังรวมไฟล์…');
    var list = shots.slice().reverse();   // เรียงจากภาพแรกไปล่าสุด
    Promise.all(list.map(function (s) { return s.blob.arrayBuffer().then(function (b) { return { name: s.name, data: new Uint8Array(b) }; }); }))
      .then(function (files) { download(makeZip(files), baseName() + '-screenshots.zip'); toast('บันทึก ' + files.length + ' ภาพแล้ว'); });
  };
  $('#btnClearAll').onclick = function () {
    confirmSheet('ลบภาพแคปทั้งหมด?', 'ภาพ ' + shots.length + ' ภาพจะถูกลบและกู้คืนไม่ได้', 'ลบทั้งหมด', function () {
      shots.forEach(function (s) { URL.revokeObjectURL(s.url); }); shots = []; renderShots();
    });
  };

  /* ---------- ดูภาพเต็มจอ ---------- */
  var lbi = -1;
  function openLB(i) { lbi = i; $('#lb').hidden = false; showLB(); $('#lbClose').focus(); }
  function closeLB() { $('#lb').hidden = true; lbi = -1; }
  function showLB() {
    var n = shots.length; if (!n) return closeLB();
    lbi = Math.max(0, Math.min(lbi, n - 1));
    $('#lbImg').src = shots[lbi].url; $('#lbImg').alt = 'ภาพแคปที่ ' + (n - lbi);
    $('#lbCount').textContent = (n - lbi) + ' / ' + n;
    $('#lbPrev').disabled = lbi >= n - 1; $('#lbNext').disabled = lbi <= 0;   // ใหม่สุดอยู่ซ้ายสุดของกริด
  }
  function stepLB(d) { lbi += d; showLB(); }
  function delLB() {
    confirmSheet('ลบภาพนี้?', 'ภาพจะถูกลบและกู้คืนไม่ได้', 'ลบภาพ', function () {
      URL.revokeObjectURL(shots[lbi].url); shots.splice(lbi, 1); renderShots(); showLB(); toast('ลบภาพแล้ว');
    });
  }
  $('#lbClose').onclick = closeLB;
  $('#lbPrev').onclick = function () { stepLB(1); };
  $('#lbNext').onclick = function () { stepLB(-1); };
  $('#lbDel').onclick = delLB;
  $('#lbSave').onclick = function () { download(shots[lbi].blob, shots[lbi].name); };
  $('#lb').addEventListener('click', function (e) { if (e.target === this || e.target.classList.contains('lb-top')) closeLB(); });
  var tx = null;
  $('#lb').addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  $('#lb').addEventListener('touchend', function (e) {
    if (tx === null) return; var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) stepLB(dx < 0 ? -1 : 1);
  });
  document.addEventListener('keydown', function (e) {
    if (lbi < 0 || !$('#sheetWrap').hidden) return;
    if (e.key === 'Escape') closeLB();
    else if (e.key === 'ArrowLeft') stepLB(-1);
    else if (e.key === 'ArrowRight') stepLB(1);
    else if (e.key === 'Delete' || e.key === 'Backspace') delLB();
  });

  /* ---------- สร้างไฟล์ ZIP (แบบไม่บีบอัด ภาพ PNG บีบมาแล้ว) ---------- */
  var crcT = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = -1; for (var i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
  function makeZip(files) {
    var enc = new TextEncoder(), parts = [], cen = [], off = 0, cenSize = 0;
    files.forEach(function (f) {
      var nm = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true); lh.setUint16(26, nm.length, true);
      parts.push(lh, nm, f.data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true);
      ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
      cen.push(ch, nm); cenSize += 46 + nm.length; off += 30 + nm.length + sz;
    });
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cenSize, true); end.setUint32(16, off, true);
    return new Blob(parts.concat(cen, [end]), { type: 'application/zip' });
  }

  /* ---------- แท็บแผงข้าง ---------- */
  document.querySelectorAll('.seg button').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('.seg button').forEach(function (x) { x.classList.toggle('on', x === b); });
      ['notes', 'shots', 'slots'].forEach(function (t) { $('#tab-' + t).hidden = t !== b.dataset.tab; });
    };
  });

  /* ---------- โน้ตทดสอบ (เก็บใน localStorage ตามไฟล์เกม) ---------- */
  var notes = [];
  function nkey() { return 'ae-notes:' + current.key; }
  function loadNotes() { try { notes = JSON.parse(localStorage.getItem(nkey())) || []; } catch (e) { notes = []; } renderNotes(); }
  function saveNotes() { try { localStorage.setItem(nkey(), JSON.stringify(notes)); } catch (e) { toast('บันทึกโน้ตไม่ได้ (พื้นที่เบราว์เซอร์เต็มหรือถูกปิด)'); } }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function renderNotes() {
    $('#noteList').innerHTML = notes.length ? notes.map(function (n, i) {
      return '<li><div class="m"><span class="tag ' + esc(n.tag) + '">' + esc(n.tag) + '</span><span>' + esc(n.time) + ' <button class="x" data-i="' + i + '">ลบ</button></span></div>' + esc(n.text) + '</li>';
    }).join('') : '<li class="hint">ยังไม่มีโน้ต พิมพ์จุดที่เจอปัญหาแล้วกด "เพิ่ม"</li>';
    $('#noteList').querySelectorAll('.x').forEach(function (b) { b.onclick = function () { notes.splice(b.dataset.i, 1); saveNotes(); renderNotes(); }; });
  }
  $('#noteForm').onsubmit = function (e) {
    e.preventDefault();
    var t = $('#noteText').value.trim(); if (!t) return;
    var d = new Date();
    notes.unshift({ tag: $('#noteTag').value, text: t, time: d.toLocaleDateString('th-TH') + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) });
    $('#noteText').value = ''; saveNotes(); renderNotes();
  };
  $('#btnExport').onclick = function () {
    var txt = 'โน้ตทดสอบ: ' + current.file.name + ' (' + current.system.name + ')\n\n' + notes.slice().reverse().map(function (n) { return '[' + n.tag + '] ' + n.text + '  (' + n.time + ')'; }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
    a.download = 'notes-' + current.file.name.replace(/\.[^.]+$/, '') + '.txt'; a.click();
  };

  /* ---------- เซฟด่วน 4 ช่อง (IndexedDB) ---------- */
  function openDB() {
    return new Promise(function (res, rej) {
      if (db) return res(db);
      var r = indexedDB.open('all-emulator', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('states'); };
      r.onsuccess = function () { db = r.result; res(db); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idb(mode, fn) {
    return openDB().then(function (d) { return new Promise(function (res, rej) { var rq = fn(d.transaction('states', mode).objectStore('states')); rq.onsuccess = function () { res(rq.result); }; rq.onerror = function () { rej(rq.error); }; }); });
  }
  function renderSlots() {
    var h = '';
    for (var i = 1; i <= 4; i++) h += '<div class="slot"><b>ช่อง ' + i + '</b><small id="sl' + i + '">ว่าง</small><div class="r"><button data-s="' + i + '" data-a="save">เซฟ</button><button data-s="' + i + '" data-a="load">โหลด</button></div></div>';
    $('#slotList').innerHTML = h;
    for (var k = 1; k <= 4; k++) (function (n) {
      idb('readonly', function (st) { return st.get(current.key + '#' + n); }).then(function (v) { if (v) $('#sl' + n).textContent = v.time; }, function () {});
    })(k);
    $('#slotList').querySelectorAll('button').forEach(function (b) {
      b.onclick = function () { b.dataset.a === 'save' ? slotSave(b.dataset.s) : slotLoad(b.dataset.s); };
    });
  }
  function slotSave(n) {
    try {
      var st = emu().gameManager.getState();
      var time = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      idb('readwrite', function (s) { return s.put({ data: st, time: time }, current.key + '#' + n); })
        .then(function () { $('#sl' + n).textContent = time; toast('เซฟช่อง ' + n + ' แล้ว'); }, function () { toast('เซฟไม่สำเร็จ'); });
    } catch (e) { toast('เกมยังไม่เริ่ม หรือเวอร์ชันอีมูไม่รองรับ ใช้ปุ่มเซฟในแถบของอีมูแทน'); }
  }
  function slotLoad(n) {
    idb('readonly', function (s) { return s.get(current.key + '#' + n); }).then(function (v) {
      if (!v) return toast('ช่อง ' + n + ' ยังว่าง');
      try { emu().gameManager.loadState(v.data); toast('โหลดช่อง ' + n + ' แล้ว'); } catch (e) { toast('โหลดไม่สำเร็จ ใช้ปุ่มโหลดในแถบของอีมูแทน'); }
    }, function () { toast('โหลดไม่สำเร็จ'); });
  }

  /* ---------- แผ่น / ข้อความ (iOS action sheet) ---------- */
  var sheetCb = null;
  function openSheet(title, body, o) {
    o = o || {};
    $('#sheetTitle').textContent = title; $('#sheetBody').textContent = body;
    var a = $('#sheetLink'); a.hidden = !o.link; if (o.link) { a.href = o.link; a.textContent = o.linkText; }
    var ok = $('#sheetOk'); ok.textContent = o.ok || 'ตกลง'; ok.classList.toggle('destructive', !!o.destructive);
    $('#sheetCancel').hidden = !o.cb; sheetCb = o.cb || null;
    $('#sheetWrap').hidden = false; ok.focus();
  }
  function sheet(title, body, link, linkText) { openSheet(title, body, { link: link, linkText: linkText }); }
  function confirmSheet(title, body, okText, cb) { openSheet(title, body, { ok: okText, destructive: true, cb: cb }); }
  function closeSheet() { $('#sheetWrap').hidden = true; sheetCb = null; }
  $('#sheetOk').onclick = function () { var cb = sheetCb; closeSheet(); if (cb) cb(); };
  $('#sheetCancel').onclick = closeSheet;
  $('#sheetWrap').addEventListener('click', function (e) { if (e.target === this) closeSheet(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#sheetWrap').hidden) closeSheet(); });
  var tt;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, 3200); }


  /* ---------- โหมดตัวอย่าง (?demo) ---------- */
  var DEMO_LINES = ['ยินดีต้อนรับ นักเดินทาง!\nวันนี้มีดาบเล่มใหม่มาถึงพอดี', 'ถ้าเจอมังกรอย่าลืมเก็บ\nน้ำผึ้งไว้รักษาแผลด้วยนะ', 'ขอบคุณที่ช่วยหมู่บ้านของเรา\nเชิญพักที่โรงเตี๊ยมได้เลย'];
  function drawDemo(c, i) {
    var g = c.getContext('2d'), w = c.width, h = c.height;
    var sky = g.createLinearGradient(0, 0, 0, h * .6); sky.addColorStop(0, ['#1b3a66', '#5a2d6b', '#2d6a8f'][i % 3]); sky.addColorStop(1, ['#4f95c9', '#e9876a', '#9fd6e8'][i % 3]);
    g.fillStyle = sky; g.fillRect(0, 0, w, h * .6);
    g.fillStyle = ['#2f6b3a', '#3d5a2a', '#2b7a55'][i % 3]; g.fillRect(0, h * .6, w, h * .4);
    g.fillStyle = '#1f4a28'; for (var x = 0; x < w; x += 16) g.fillRect(x, h * .6 + ((x / 16) % 2) * 6, 8, 4);
    g.fillStyle = '#e8c07a'; g.fillRect(w * .42, h * .38, 22, 26); g.fillStyle = '#c0392b'; g.fillRect(w * .42, h * .38 + 14, 22, 12);
    g.fillStyle = '#222'; g.fillRect(w * .42 + 5, h * .38 + 6, 3, 3); g.fillRect(w * .42 + 14, h * .38 + 6, 3, 3);
    g.fillStyle = 'rgba(10,14,40,.94)'; g.fillRect(10, h - 58, w - 20, 48);
    g.strokeStyle = '#e8ecff'; g.lineWidth = 2; g.strokeRect(11, h - 57, w - 22, 46);
    g.fillStyle = '#ffd166'; g.font = '10px "Noto Sans Thai",sans-serif'; g.fillText(['พ่อค้า', 'ชาวบ้าน', 'ผู้ใหญ่บ้าน'][i % 3], 18, h - 44);
    g.fillStyle = '#fff'; g.font = '11px "Noto Sans Thai",sans-serif';
    DEMO_LINES[i % 3].split('\n').forEach(function (t, k) { g.fillText(t, 18, h - 30 + k * 13); });
  }
  function demoGame() {
    var c = document.createElement('canvas'); c.width = 240; c.height = 160; c.className = 'demo';
    $('#ejs').appendChild(c); $('#loading').hidden = true; drawDemo(c, 0);
    var tmp = document.createElement('canvas'); tmp.width = 240; tmp.height = 160;
    var chain = Promise.resolve();
    [2, 1, 0].forEach(function (i) {
      chain = chain.then(function () { drawDemo(tmp, i); return new Promise(function (r) { tmp.toBlob(function (b) { addShot(b); r(); }, 'image/png'); }); });
    });
    notes = [{ tag: 'ฟอนต์', text: 'ร้านค้า: สระบนซ้อนทับบรรทัดบน', time: 'วันนี้ 14:02' }, { tag: 'ข้อความล้น', text: 'เมนูเริ่มต้น: "ดำเนินการต่อ" ยาวเกินช่อง', time: 'วันนี้ 14:05' }, { tag: 'ผ่าน', text: 'บทนำ: แสดงผลปกติทั้งฉาก', time: 'วันนี้ 14:09' }];
    renderNotes();
  }

  buildHome();

  /* ---------- ธีม สว่าง / มืด / อัตโนมัติ ---------- */
  var THEME_ICONS = {
    auto: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" class="solid"/>',
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    dark: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'
  };
  var THEME_NAME = { auto: 'อัตโนมัติ', light: 'สว่าง', dark: 'มืด' };
  var theme = 'auto';
  try { var tsv = localStorage.getItem('ae-theme'); if (tsv === 'light' || tsv === 'dark') theme = tsv; } catch (e) {}
  function applyTheme(m, say) {
    theme = m;
    if (m === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', m);
    try { if (m === 'auto') localStorage.removeItem('ae-theme'); else localStorage.setItem('ae-theme', m); } catch (e) {}
    document.querySelectorAll('[data-theme-set]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.themeSet === m ? 'true' : 'false'); });
    var tb = document.querySelector('#btnTheme svg'); if (tb) tb.innerHTML = THEME_ICONS[m];
    if (say) toast('ธีม: ' + THEME_NAME[m]);
  }
  document.querySelectorAll('[data-theme-set]').forEach(function (b) { b.onclick = function () { applyTheme(b.dataset.themeSet); }; });
  $('#btnTheme').onclick = function () { applyTheme({ auto: 'light', light: 'dark', dark: 'auto' }[theme], true); };
  applyTheme(theme);

  /* ---------- ค้นหาเครื่อง + แถบบนที่โปร่งเมื่อเลื่อน ---------- */
  $('#sysCount').textContent = SYSTEMS.length;
  $('#search').addEventListener('input', function () {
    var q = this.value.trim().toLowerCase(), any = false;
    document.querySelectorAll('.app').forEach(function (a) { var ok = !q || a.dataset.q.indexOf(q) > -1; a.hidden = !ok; if (ok) any = true; });
    document.querySelectorAll('.group').forEach(function (g) { g.hidden = !g.querySelector('.app:not([hidden])'); });
    $('#empty').hidden = any;
  });
  function onScroll() { $('#homeBar').classList.toggle('scrolled', window.scrollY > 70); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (DEMO) launch(SYSTEMS.filter(function (x) { return x.id === 'gba'; })[0], new File(['x'], 'ตำนานดาบสุดท้าย (แปลไทย).gba'));
})();
