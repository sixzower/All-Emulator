/* All-Emulator — หน้าคลังเครื่อง + หน้าเล่นทดสอบ (ใช้ EmulatorJS เป็นแกนอีมู) */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var CDN = 'https://cdn.emulatorjs.org/stable/data/';
  var LOCAL = 'emulatorjs/data/';   // ถ้าดาวน์โหลดไว้เอง (ดู README) จะใช้ตัวนี้ก่อน ทำงานออฟไลน์ได้
  var current = null;               // { file, system, key }
  var shots = [];
  var db;

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
      html += '<section class="group"><h2>' + g.title + '</h2><div class="grid glass">';
      items.forEach(function (s) {
        html += '<button class="app" data-id="' + s.id + '">' + icon(s) + '<span class="lbl">' + s.name + '</span>' + (s.heavy ? '<span class="sub">ใช้แรงเครื่อง</span>' : '') + '</button>';
      });
      html += '</div></section>';
    });
    html += '<section class="group"><h2>ยังรันในเว็บไม่ได้</h2><div class="grid glass">';
    UNSUPPORTED.forEach(function (s) {
      html += '<button class="app off" data-off="' + s.id + '">' + icon({ glyph: s.glyph, short: s.short, c: ['#8a90a0', '#4a4f5e'] }) + '<span class="lbl">' + s.name + '</span></button>';
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
      shots.unshift({ url: URL.createObjectURL(blob), name: (current.file.name.replace(/\.[^.]+$/, '')) + '-' + Date.now() + '.png' });
      renderShots(); toast('เก็บภาพแล้ว (แท็บ "ภาพแคป")');
    };
    try {
      var r = emu().gameManager.screenshot();
      Promise.resolve(r).then(function (d) { done(d instanceof Blob ? d : new Blob([d], { type: 'image/png' })); }, function () { canvasShot(done); });
    } catch (e) { canvasShot(done); }
  };
  function canvasShot(cb) { var c = document.querySelector('#ejs canvas'); c ? c.toBlob(cb, 'image/png') : cb(null); }
  function renderShots() {
    $('#shotGrid').innerHTML = shots.map(function (s, i) { return '<img src="' + s.url + '" data-i="' + i + '" alt="ภาพแคป ' + (i + 1) + '">'; }).join('');
    $('#shotGrid').querySelectorAll('img').forEach(function (im) {
      im.onclick = function () { var a = document.createElement('a'); a.href = shots[im.dataset.i].url; a.download = shots[im.dataset.i].name; a.click(); };
    });
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

  /* ---------- แผ่น / ข้อความ ---------- */
  function sheet(title, body, link, linkText) {
    $('#sheetTitle').textContent = title; $('#sheetBody').textContent = body;
    var a = $('#sheetLink'); a.hidden = !link; if (link) { a.href = link; a.textContent = linkText; }
    $('#sheetWrap').hidden = false; $('#sheetClose').focus();
  }
  $('#sheetClose').onclick = function () { $('#sheetWrap').hidden = true; };
  $('#sheetWrap').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('#sheetWrap').hidden = true; });
  var tt;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, 3200); }

  buildHome();
})();
