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
    html += '<section class="group"><h2>เปิดด้วยโปรแกรมในเครื่อง</h2><div class="grid card">';
    NATIVE.forEach(function (n) {
      html += '<button class="app" data-native="' + n.id + '" data-q="' + (n.name + ' ' + n.short + ' ' + n.app).toLowerCase() + '">' + icon(n) + '<span class="lbl">' + n.name + '</span><span class="sub">หน้าต่างแยก · ' + n.app + '</span></button>';
    });
    html += '</div></section>';
    $('#groups').innerHTML = html;

    document.querySelectorAll('.app[data-id]').forEach(function (b) {
      var sys = SYSTEMS.filter(function (s) { return s.id === b.dataset.id; })[0];
      b.addEventListener('click', function () {
        var st = nativeStatus && sys.native && nativeStatus[sys.native];
        if (st && st.exe_ok && st.games_ok) {
          var alt = NATIVE_ALT[sys.native];
          openSheet(sys.name, 'เล่นในเว็บ (ใช้แรงเครื่อง) หรือเปิดด้วย ' + alt.app + ' ที่ลงไว้ในเครื่อง (เบาและเสถียรกว่า)', {
            ok: 'เล่นในเว็บ', cb: function () { pickFile(sys); },
            alt: { text: 'เปิดด้วย ' + alt.app, cb: function () { openNative({ id: sys.native, name: sys.name, app: alt.app, url: alt.url }); } } });
        } else pickFile(sys);
      });
      b.addEventListener('dragover', function (e) { e.preventDefault(); b.classList.add('drop'); });
      b.addEventListener('dragleave', function () { b.classList.remove('drop'); });
      b.addEventListener('drop', function (e) {
        e.preventDefault(); b.classList.remove('drop');
        if (e.dataTransfer.files[0]) launch(sys, e.dataTransfer.files[0]);
      });
    });
    document.querySelectorAll('.app[data-native]').forEach(function (b) {
      var n = NATIVE.filter(function (x) { return x.id === b.dataset.native; })[0];
      b.addEventListener('click', function () { openNative(n); });
    });
  }

  /* ---------- เปิดด้วยโปรแกรมในเครื่อง (ผ่าน serve.py) ---------- */
  var nativeStatus = null, nCur = null, nGames = [];
  function api(path, opt) {
    if (DEMO) return Promise.resolve(demoApi(path));
    opt = opt || {}; opt.headers = Object.assign({ 'X-AE': '1' }, opt.headers || {});
    return fetch(path, opt).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j; }); });
  }
  function loadNativeStatus() { return api('/api/native').then(function (j) { nativeStatus = j; return j; }, function () { nativeStatus = null; return null; }); }
  function showHome() { $('#native').hidden = true; $('#home').hidden = false; window.scrollTo(0, 0); }
  $('#nBack').onclick = showHome;
  function sizeText(b) { return b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : Math.max(1, Math.round(b / 1048576)) + ' MB'; }

  function openNative(n) {
    nCur = n;
    $('#home').hidden = true; $('#native').hidden = false; window.scrollTo(0, 0);
    $('#nTitle').textContent = n.name; $('#nSub').textContent = 'เปิดด้วย ' + n.app;
    $('#nSearch').value = ''; $('#nList').innerHTML = ''; $('#nSearchWrap').hidden = true;
    stateCard('<p class="hint">กำลังตรวจสอบ…</p>');
    loadNativeStatus().then(function (st) {
      if (!st) return stateCard(stateHtml('เปิดผ่าน serve.py เท่านั้น',
        'ฟีเจอร์นี้ต้องเปิดเว็บจาก <code>python serve.py</code> (แล้วเข้า <code>http://localhost:8000</code>) ไม่ใช่การดับเบิลคลิก index.html'));
      var e = st[n.id];
      if (!e) return stateCard(stateHtml('ยังไม่ได้ตั้งค่า ' + n.name, 'เปิดไฟล์ <code>emulators.json</code> แล้วเพิ่มส่วน <code>"' + n.id + '"</code> ตามตัวอย่างเครื่องอื่น'));
      if (!e.exe_ok || !e.games_ok) {
        var li = '';
        if (!e.exe_ok) li += '<li>ไม่พบโปรแกรมอีมูที่ <code>' + esc(e.exe) + '</code><br><small>แก้ค่า <code>exe</code> ให้ตรงกับที่ติดตั้ง ' + esc(n.app) + (n.url ? ' (<a href="' + n.url + '" target="_blank" rel="noopener">ดาวน์โหลด</a>)' : '') + '</small></li>';
        if (!e.games_ok) li += '<li>ไม่พบโฟลเดอร์เกมที่ <code>' + esc(e.games) + '</code><br><small>แก้ค่า <code>games</code> เป็นโฟลเดอร์ที่เก็บไฟล์เกม</small></li>';
        return stateCard(stateHtml('ตั้งค่าอีกนิดเดียว', 'แก้ในไฟล์ <code>emulators.json</code> แล้วกดกลับมาที่หน้านี้อีกครั้ง (ไม่ต้องรีสตาร์ท)') + '<ul class="steps">' + li + '</ul>');
      }
      return api('/api/native/' + n.id + '/games').then(function (j) {
        nGames = j.games; stateCard(null); $('#nSearchWrap').hidden = false; renderGames();
        if (!nGames.length) stateCard(stateHtml('ไม่พบไฟล์เกม', 'ในโฟลเดอร์ <code>' + esc(e.games) + '</code> ยังไม่มีไฟล์ที่เป็นนามสกุลที่รองรับ'));
      }, function (err) { stateCard(stateHtml('อ่านรายการเกมไม่ได้', esc(err.message))); });
    });
  }
  function stateHtml(t, b) { return '<h3>' + t + '</h3><p>' + b + '</p>'; }
  function stateCard(h) { var c = $('#nState'); c.hidden = h === null; if (h !== null) c.innerHTML = h; }
  function renderGames() {
    var q = $('#nSearch').value.trim().toLowerCase();
    var list = nGames.filter(function (g) { return !q || g.path.toLowerCase().indexOf(q) > -1; });
    $('#nList').innerHTML = list.map(function (g, i) {
      var dir = g.path.indexOf('/') > -1 ? g.path.replace(/\/[^\/]*$/, '') + ' · ' : '';
      return '<li><button data-p="' + esc(g.path) + '"><span class="gname">' + esc(g.name.replace(/\.[^.]+$/, '')) + '</span><small>' + esc(dir) + sizeText(g.size) + '</small><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button></li>';
    }).join('') || (nGames.length ? '<li class="hint pad">ไม่พบเกมที่ค้นหา</li>' : '');
    $('#nList').hidden = !list.length && !nGames.length;
    $('#nList').querySelectorAll('button').forEach(function (b) { b.onclick = function () { launchNative(b.dataset.p, b); }; });
  }
  $('#nSearch').addEventListener('input', renderGames);
  function launchNative(path, btn) {
    btn.disabled = true; toast('กำลังเปิด ' + nCur.app + '…');
    api('/api/native/' + nCur.id + '/launch', { method: 'POST', body: JSON.stringify({ path: path }) })
      .then(function () { toast('สั่งเปิด ' + nCur.app + ' แล้ว หน้าต่างอีมูอาจใช้เวลาโหลดสักครู่'); },
            function (err) { toast('เปิดไม่สำเร็จ: ' + err.message); })
      .then(function () { setTimeout(function () { btn.disabled = false; }, 1500); });
  }
  function demoApi(path) {
    if (/\/games$/.test(path)) return { games: [
      { path: 'ตำนานดาบสุดท้าย (แปลไทย).3ds', name: 'ตำนานดาบสุดท้าย (แปลไทย).3ds', size: 1610612736 },
      { path: 'RPG/ดินแดนมังกรฟ้า v0.8.cia', name: 'ดินแดนมังกรฟ้า v0.8.cia', size: 734003200 },
      { path: 'RPG/เมืองใต้เงา.cci', name: 'เมืองใต้เงา.cci', size: 2147483648 } ] };
    if (/launch$/.test(path)) return { ok: true };
    if (/\/api\/bios/.test(path)) return { psx: { name: 'scph5501.bin', size: 524288 } };
    var o = {}; NATIVE.forEach(function (n) { o[n.id] = { exe: 'C:\\Emulators\\' + n.app, games: 'C:\\Games\\' + n.short, exe_ok: n.id === '3ds', games_ok: n.id === '3ds' }; });
    o.psp = { exe_ok: true, games_ok: true }; return o;
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
    ensureBios(sys, function (biosUrl) { launchNow(sys, file, biosUrl); });
  }
  function launchNow(sys, file, biosUrl) {
    current = { file: file, system: sys, key: sys.id + ':' + file.name };
    $('#home').hidden = true;
    $('#play').hidden = false;
    $('#gameTitle').textContent = file.name.replace(/\.[^.]+$/, '');
    $('#gameSys').textContent = sys.name;
    loadNotes(); renderSlots(); loadShots(); applyZoom();
    if (sys.heavy) toast('เครื่องนี้ใช้แรงเครื่อง ถ้ากระตุกลองปิดแท็บอื่นก่อน');

    if (DEMO) return demoGame();
    probe(LOCAL + 'loader.js').then(function (hasLocal) {
      var base = hasLocal ? LOCAL : CDN;
      window.EJS_player = '#ejs';
      window.EJS_core = sys.core;
      window.EJS_gameName = file.name.replace(/\.[^.]+$/, '');
      window.EJS_gameUrl = file;                 // ส่งเป็นไฟล์ตรงๆ ไม่ผ่านเซิร์ฟเวอร์
      if (biosUrl) window.EJS_biosUrl = biosUrl;
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
    var id = ++shotSeq;
    var sh = { id: id, blob: blob, url: URL.createObjectURL(blob), name: baseName() + '-' + String(id).padStart(3, '0') + '.png', time: Date.now() };
    shots.unshift(sh); renderShots(); persistShot(sh); return sh;
  }
  function skey(id) { return current.key + '|' + id; }
  function persistShot(sh) {
    if (DEMO) return;
    idb('readwrite', function (st) { return st.put({ id: sh.id, blob: sh.blob, name: sh.name, time: sh.time }, skey(sh.id)); }, 'shots').catch(function () {});
  }
  function unpersistShot(sh) {
    if (DEMO) return;
    idb('readwrite', function (st) { return st.delete(skey(sh.id)); }, 'shots').catch(function () {});
  }
  function loadShots() {          // ภาพแคปเก็บไว้ในเบราว์เซอร์ ปิด/เปิดใหม่หรือกด "กลับคลัง" แล้วยังอยู่
    if (DEMO) return;
    idb('readonly', function (st) { return st.getAll(IDBKeyRange.bound(current.key + '|', current.key + '|￿')); }, 'shots').then(function (list) {
      list.sort(function (a, b) { return b.id - a.id; });
      list.forEach(function (r) { shotSeq = Math.max(shotSeq, r.id); shots.push({ id: r.id, blob: r.blob, url: URL.createObjectURL(r.blob), name: r.name, time: r.time }); });
      renderShots(); renderNotes();
    }, function () {});
  }
  function shotById(id) { return shots.filter(function (x) { return x.id === id; })[0]; }
  function renderShots() {
    var n = shots.length, cnt = $('#shotCount');
    cnt.hidden = !n; cnt.textContent = n;
    $('#btnSaveAll').disabled = !n; $('#btnClearAll').disabled = !n;
    $('#shotHint').hidden = !!n;
    $('#shotGrid').innerHTML = shots.map(function (s, i) {
      return '<button data-i="' + i + '" aria-label="เปิดภาพ #' + s.id + '"><img src="' + s.url + '" alt=""><b>' + s.id + '</b></button>';
    }).join('');
    $('#shotGrid').querySelectorAll('button').forEach(function (b) { b.onclick = function () { openLB(+b.dataset.i); }; });
    renderAttach();
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
      shots.forEach(function (s) { URL.revokeObjectURL(s.url); unpersistShot(s); }); shots = []; setAttach(null); renderShots(); renderNotes();
    });
  };

  /* ---------- ดูภาพเต็มจอ ---------- */
  var lbi = -1;
  function openLB(i) { lbi = i; $('#lb').hidden = false; showLB(); $('#lbClose').focus(); }
  function closeLB() { if (ann) annEnd(); $('#lb').hidden = true; lbi = -1; }
  function showLB() {
    var n = shots.length; if (!n) return closeLB();
    lbi = Math.max(0, Math.min(lbi, n - 1));
    $('#lbImg').src = shots[lbi].url; $('#lbImg').alt = 'ภาพแคป #' + shots[lbi].id;
    $('#lbCount').textContent = '#' + shots[lbi].id + ' · ' + (n - lbi) + ' / ' + n;
    $('#lbPrev').disabled = lbi >= n - 1; $('#lbNext').disabled = lbi <= 0;   // ใหม่สุดอยู่ซ้ายสุดของกริด
  }
  function stepLB(d) { lbi += d; showLB(); }
  function delLB() {
    confirmSheet('ลบภาพนี้?', 'ภาพจะถูกลบและกู้คืนไม่ได้', 'ลบภาพ', function () {
      var gone = shots[lbi]; URL.revokeObjectURL(gone.url); unpersistShot(gone); shots.splice(lbi, 1);
      if (attachId === gone.id) attachId = null;
      renderShots(); renderNotes(); showLB(); toast('ลบภาพแล้ว');
    });
  }
  $('#lbClose').onclick = closeLB;
  $('#lbPrev').onclick = function () { stepLB(1); };
  $('#lbNext').onclick = function () { stepLB(-1); };
  $('#lbDel').onclick = delLB;
  $('#lbSave').onclick = function () { download(shots[lbi].blob, shots[lbi].name); };
  $('#lb').addEventListener('click', function (e) { if (ann) return; if (e.target === this || e.target.classList.contains('lb-top')) closeLB(); });
  var tx = null;
  $('#lb').addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  $('#lb').addEventListener('touchend', function (e) {
    if (tx === null) return; var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) stepLB(dx < 0 ? -1 : 1);
  });
  document.addEventListener('keydown', function (e) {
    if (lbi < 0 || !$('#sheetWrap').hidden) return;
    if (ann) {
      if (e.key === 'Escape') { e.preventDefault(); annEnd(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); annUndo(); }
      return;
    }
    if (e.key === 'Escape') closeLB();
    else if (e.key === 'ArrowLeft') stepLB(-1);
    else if (e.key === 'ArrowRight') stepLB(1);
    else if (e.key === 'Delete' || e.key === 'Backspace') delLB();
  });

  /* ---------- วาดบนภาพ (วงกลม/ขีดเส้นชี้จุดที่ผิด) ---------- */
  var ann = null;
  function annStart() {
    var img = $('#lbImg'), c = $('#lbDraw');
    if (!img.naturalWidth) return;
    c.width = img.naturalWidth; c.height = img.naturalHeight; c.hidden = false;
    ann = { strokes: [], color: '#ff3b30', cur: null };
    $('#lbAnn').hidden = false; $('#lb').classList.add('annotating'); annRedraw();
  }
  function annEnd() { ann = null; $('#lbDraw').hidden = true; $('#lbAnn').hidden = true; $('#lb').classList.remove('annotating'); }
  function annRedraw() {
    var c = $('#lbDraw'), g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
    drawStrokes(g, c.width, ann.strokes.concat(ann.cur ? [ann.cur] : []));
  }
  function drawStrokes(g, w, list) {
    g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = Math.max(2, w / 90);
    list.forEach(function (st) {
      g.strokeStyle = g.fillStyle = st.color;
      if (st.pts.length === 1) { g.beginPath(); g.arc(st.pts[0].x, st.pts[0].y, g.lineWidth / 2, 0, 7); g.fill(); return; }
      g.beginPath(); g.moveTo(st.pts[0].x, st.pts[0].y); st.pts.slice(1).forEach(function (p) { g.lineTo(p.x, p.y); }); g.stroke();
    });
  }
  function annUndo() { if (ann) { ann.strokes.pop(); annRedraw(); } }
  (function () {
    var c = $('#lbDraw');
    function pt(e) { var r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * c.width / r.width, y: (e.clientY - r.top) * c.height / r.height }; }
    c.addEventListener('pointerdown', function (e) { if (!ann) return; c.setPointerCapture(e.pointerId); ann.cur = { color: ann.color, pts: [pt(e)] }; annRedraw(); });
    c.addEventListener('pointermove', function (e) { if (ann && ann.cur) { ann.cur.pts.push(pt(e)); annRedraw(); } });
    ['pointerup', 'pointercancel'].forEach(function (ev) { c.addEventListener(ev, function () { if (ann && ann.cur) { ann.strokes.push(ann.cur); ann.cur = null; annRedraw(); } }); });
  })();
  $('#lbEdit').onclick = annStart;
  $('#annUndo').onclick = annUndo;
  $('#annCancel').onclick = annEnd;
  document.querySelectorAll('#lbAnn .swatch').forEach(function (b) {
    b.onclick = function () { if (!ann) return; ann.color = b.dataset.c; document.querySelectorAll('#lbAnn .swatch').forEach(function (x) { x.classList.toggle('on', x === b); }); };
  });
  $('#annDone').onclick = function () {
    if (!ann) return;
    var img = $('#lbImg'), out = document.createElement('canvas'); out.width = img.naturalWidth; out.height = img.naturalHeight;
    var g = out.getContext('2d'); g.drawImage(img, 0, 0); drawStrokes(g, out.width, ann.strokes);
    var sh = shots[lbi];
    out.toBlob(function (blob) {
      if (!blob) return toast('บันทึกภาพที่วาดไม่สำเร็จ');
      URL.revokeObjectURL(sh.url); sh.blob = blob; sh.url = URL.createObjectURL(blob); persistShot(sh);
      annEnd(); renderShots(); renderNotes(); showLB(); toast('บันทึกภาพที่วาดแล้ว');
    }, 'image/png');
  };
  $('#lbNote').onclick = function () {
    var id = shots[lbi].id; closeLB(); showTab('notes'); $('#playBody').classList.remove('nopanel'); setAttach(id); $('#noteText').focus();
  };

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
  function showTab(t) {
    document.querySelectorAll('.seg button').forEach(function (x) { x.classList.toggle('on', x.dataset.tab === t); });
    ['notes', 'shots', 'slots'].forEach(function (k) { $('#tab-' + k).hidden = k !== t; });
  }
  document.querySelectorAll('.seg button').forEach(function (b) { b.onclick = function () { showTab(b.dataset.tab); }; });

  /* ---------- โน้ตทดสอบ (เก็บใน localStorage ตามไฟล์เกม) ---------- */
  var notes = [];
  function nkey() { return 'ae-notes:' + current.key; }
  function loadNotes() { try { notes = JSON.parse(localStorage.getItem(nkey())) || []; } catch (e) { notes = []; } renderNotes(); }
  function saveNotes() { try { localStorage.setItem(nkey(), JSON.stringify(notes)); } catch (e) { toast('บันทึกโน้ตไม่ได้ (พื้นที่เบราว์เซอร์เต็มหรือถูกปิด)'); } }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function renderNotes() {
    $('#noteList').innerHTML = notes.length ? notes.map(function (n, i) {
      var sh = n.shot != null && shotById(n.shot);
      var thumb = sh ? '<button class="nthumb" data-s="' + sh.id + '" aria-label="ดูภาพ #' + sh.id + '"><img src="' + sh.url + '" alt=""></button>' : '';
      return '<li' + (sh ? ' class="has-shot"' : '') + '><div class="m"><span class="tag ' + esc(n.tag) + '">' + esc(n.tag) + '</span><span>' + esc(n.time) + ' <button class="x" data-i="' + i + '">ลบ</button></span></div><div class="nbody"><span>' + esc(n.text) + '</span>' + thumb + '</div></li>';
    }).join('') : '<li class="hint">ยังไม่มีโน้ต พิมพ์จุดที่เจอปัญหาแล้วกด "เพิ่ม"</li>';
    $('#noteList').querySelectorAll('.x').forEach(function (b) { b.onclick = function () { notes.splice(b.dataset.i, 1); saveNotes(); renderNotes(); }; });
    $('#noteList').querySelectorAll('.nthumb').forEach(function (b) { b.onclick = function () { openLB(shots.indexOf(shotById(+b.dataset.s))); }; });
  }
  var attachId = null;
  function setAttach(id) { attachId = id; renderAttach(); }
  function renderAttach() {
    var r = $('#attachRow'), sh = attachId != null && shotById(attachId);
    if (sh) {
      r.innerHTML = '<img src="' + sh.url + '" alt=""><span>แนบภาพ #' + sh.id + ' ไปกับโน้ตนี้</span><button type="button" class="x" id="attachX" aria-label="เอาภาพออก">✕</button>';
      $('#attachX').onclick = function () { setAttach(null); };
    } else {
      attachId = null;
      r.innerHTML = shots.length ? '<button type="button" class="linkbtn" id="attachLast">＋ แนบภาพล่าสุด (#' + shots[0].id + ')</button>' : '';
      if (shots.length) $('#attachLast').onclick = function () { setAttach(shots[0].id); };
    }
  }
  /* ---------- ดรอปดาวน์ประเภทโน้ต (แบบ iOS pop-up menu) ---------- */
  var ddOpts = Array.prototype.slice.call(document.querySelectorAll('#ddMenu [role=option]'));
  function ddSelect(o) {
    $('#noteTag').value = o.dataset.v; $('#ddLabel').textContent = o.dataset.v;
    $('#ddBtn .dot').className = 'dot ' + o.dataset.c;
    ddOpts.forEach(function (x) { x.setAttribute('aria-selected', x === o ? 'true' : 'false'); });
  }
  function ddOpen() {
    var btn = $('#ddBtn'), m = $('#ddMenu'), r = btn.getBoundingClientRect();
    m.hidden = false; m.style.width = Math.max(r.width, 200) + 'px';
    var h = m.offsetHeight, below = innerHeight - r.bottom, up = below < h + 12 && r.top > below;
    m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + 'px';
    m.style.top = (up ? r.top - h - 6 : r.bottom + 6) + 'px';
    m.style.transformOrigin = up ? 'bottom left' : 'top left';
    btn.setAttribute('aria-expanded', 'true');
    (ddOpts.filter(function (x) { return x.getAttribute('aria-selected') === 'true'; })[0] || ddOpts[0]).focus();
  }
  function ddClose(refocus) { $('#ddMenu').hidden = true; $('#ddBtn').setAttribute('aria-expanded', 'false'); if (refocus) $('#ddBtn').focus(); }
  $('#ddBtn').onclick = function () { $('#ddMenu').hidden ? ddOpen() : ddClose(); };
  ddOpts.forEach(function (o, i) {
    o.onclick = function () { ddSelect(o); ddClose(true); };
    o.onkeydown = function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); ddOpts[(i + 1) % ddOpts.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); ddOpts[(i + ddOpts.length - 1) % ddOpts.length].focus(); }
      else if (e.key === 'Escape') { e.stopPropagation(); ddClose(true); }
      else if (e.key === 'Tab') ddClose();
    };
  });
  document.addEventListener('pointerdown', function (e) { if (!$('#ddMenu').hidden && !e.target.closest('#ddMenu, #ddBtn')) ddClose(); });
  window.addEventListener('resize', function () { ddClose(); });
  $('#panel').addEventListener('scroll', function () { ddClose(); });
  ddSelect(ddOpts[0]);
  $('#noteForm').onsubmit = function (e) {
    e.preventDefault();
    var t = $('#noteText').value.trim(); if (!t) return;
    var d = new Date();
    notes.unshift({ tag: $('#noteTag').value, text: t, shot: attachId, time: d.toLocaleDateString('th-TH') + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) });
    $('#noteText').value = ''; setAttach(null); saveNotes(); renderNotes();
  };
  $('#btnExport').onclick = function () {
    var txt = 'โน้ตทดสอบ: ' + current.file.name + ' (' + current.system.name + ')\n\n' + notes.slice().reverse().map(function (n) { return '[' + n.tag + '] ' + n.text + '  (' + n.time + ')'; }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
    a.download = 'notes-' + current.file.name.replace(/\.[^.]+$/, '') + '.txt'; a.click();
  };

  /* ---------- ส่งออกรายงาน (ไฟล์ HTML ไฟล์เดียว มีโน้ตและภาพ ส่งต่อได้) ---------- */
  function toDataURL(b) { return new Promise(function (r) { var f = new FileReader(); f.onload = function () { r(f.result); }; f.readAsDataURL(b); }); }
  $('#btnReport').onclick = function () {
    toast('กำลังสร้างรายงาน…');
    Promise.all(shots.map(function (s) { return toDataURL(s.blob).then(function (u) { return { id: s.id, url: u }; }); })).then(function (imgs) {
      var map = {}; imgs.forEach(function (i) { map[i.id] = i.url; });
      var list = notes.slice().reverse(), counts = {}, COL = { 'ฟอนต์': '#ff3b30', 'คำผิด': '#ff3b30', 'ข้อความล้น': '#ff9500', 'สระ/วรรณยุกต์': '#ff9500', 'ผ่าน': '#34c759' };
      list.forEach(function (n) { counts[n.tag] = (counts[n.tag] || 0) + 1; });
      var chips = Object.keys(counts).map(function (t) { return '<span class="chip" style="--c:' + (COL[t] || '#888') + '">' + esc(t) + ' ' + counts[t] + '</span>'; }).join('');
      var rows = list.map(function (n, i) {
        return '<li><div class="top"><b>' + (i + 1) + '.</b><span class="tag" style="--c:' + (COL[n.tag] || '#888') + '">' + esc(n.tag) + '</span><span class="time">' + esc(n.time) + '</span></div><p>' + esc(n.text) + '</p>' +
          (n.shot != null && map[n.shot] ? '<figure><img src="' + map[n.shot] + '" alt="ภาพ #' + n.shot + '"><figcaption>ภาพ #' + n.shot + '</figcaption></figure>' : '') + '</li>';
      }).join('') || '<li><p>ยังไม่มีโน้ต</p></li>';
      var all = shots.slice().reverse().map(function (s) { return '<figure><img src="' + map[s.id] + '" alt=""><figcaption>#' + s.id + '</figcaption></figure>'; }).join('');
      var d = new Date(), title = baseName();
      var css = ':root{color-scheme:light dark;--bg:#f2f2f7;--card:#fff;--fg:#111;--mut:#666}@media(prefers-color-scheme:dark){:root{--bg:#000;--card:#1c1c1e;--fg:#f5f5f7;--mut:#999}}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 -apple-system,"Noto Sans Thai","Sukhumvit Set",system-ui,sans-serif;padding:24px 16px}main{max-width:820px;margin:0 auto}h1{font-size:28px;margin:0 0 4px}h2{margin:32px 0 10px;font-size:19px}.meta{color:var(--mut);margin:0 0 14px}.chip,.tag{display:inline-block;font-size:12px;font-weight:600;padding:1px 10px;border-radius:99px;color:var(--c);background:color-mix(in srgb,var(--c) 15%,transparent);margin:0 6px 6px 0}ol{list-style:none;margin:0;padding:0;display:grid;gap:12px}li{background:var(--card);border-radius:16px;padding:14px 16px}.top{display:flex;gap:8px;align-items:center}.time{margin-left:auto;color:var(--mut);font-size:12px}p{margin:6px 0}figure{margin:8px 0 0}img{max-width:100%;border-radius:10px;image-rendering:pixelated;background:#000}figcaption{font-size:12px;color:var(--mut)}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}.grid figure{margin:0}';
      var html = '<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>รายงานทดสอบ ' + esc(title) + '</title><style>' + css + '</style><main><h1>รายงานทดสอบการแปล</h1><p class="meta">' + esc(title) + ' · ' + esc(current.system.name) + ' · ' + d.toLocaleDateString('th-TH') + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + '</p><div>' + chips + '</div><h2>รายการโน้ต (' + list.length + ')</h2><ol>' + rows + '</ol>' + (all ? '<h2>ภาพแคปทั้งหมด (' + shots.length + ')</h2><div class="grid">' + all + '</div>' : '') + '</main>';
      download(new Blob([html], { type: 'text/html;charset=utf-8' }), 'report-' + title + '.html');
      toast('ส่งออกรายงานแล้ว');
    });
  };

  /* ---------- เซฟด่วน 4 ช่อง (IndexedDB) ---------- */
  function openDB() {
    return new Promise(function (res, rej) {
      if (db) return res(db);
      var r = indexedDB.open('all-emulator', 2);
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains('states')) d.createObjectStore('states');
        if (!d.objectStoreNames.contains('shots')) d.createObjectStore('shots');
      };
      r.onsuccess = function () { db = r.result; res(db); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idb(mode, fn, store) {
    store = store || 'states';
    return openDB().then(function (d) { return new Promise(function (res, rej) { var rq = fn(d.transaction(store, mode).objectStore(store)); rq.onsuccess = function () { res(rq.result); }; rq.onerror = function () { rej(rq.error); }; }); });
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
  var sheetCb = null, sheetAlt = null;
  function openSheet(title, body, o) {
    o = o || {};
    $('#sheetTitle').textContent = title; $('#sheetBody').textContent = body;
    var a = $('#sheetLink'); a.hidden = !o.link; if (o.link) { a.href = o.link; a.textContent = o.linkText; }
    var ok = $('#sheetOk'); ok.textContent = o.ok || 'ตกลง'; ok.classList.toggle('destructive', !!o.destructive);
    $('#sheetCancel').hidden = !o.cb; sheetCb = o.cb || null;
    var alt = $('#sheetAlt'); alt.hidden = !o.alt; sheetAlt = o.alt ? o.alt.cb : null; if (o.alt) alt.textContent = o.alt.text;
    $('#sheetWrap').hidden = false; ok.focus();
  }
  function sheet(title, body, link, linkText) { openSheet(title, body, { link: link, linkText: linkText }); }
  function confirmSheet(title, body, okText, cb) { openSheet(title, body, { ok: okText, destructive: true, cb: cb }); }
  function closeSheet() { $('#sheetWrap').hidden = true; sheetCb = null; sheetAlt = null; }
  $('#sheetOk').onclick = function () { var cb = sheetCb; closeSheet(); if (cb) cb(); };
  $('#sheetAlt').onclick = function () { var cb = sheetAlt; closeSheet(); if (cb) cb(); };
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
  loadNativeStatus();

  /* ---------- BIOS (เก็บเป็นไฟล์ในโฟลเดอร์ bios/ ผ่าน serve.py) ---------- */
  function biosPath(id, info) { return 'bios/' + id + '/' + encodeURIComponent(info.name); }
  function pickBios(id, done) {
    var inp = document.createElement('input'); inp.type = 'file';
    inp.onchange = function () {
      var f = inp.files[0]; if (!f) return;
      api('/api/bios/' + id + '?name=' + encodeURIComponent(f.name), { method: 'POST', body: f })
        .then(function (j) { toast('บันทึก BIOS แล้ว'); done(j); }, function (e) { toast('บันทึก BIOS ไม่สำเร็จ: ' + e.message); });
    };
    inp.click();
  }
  function ensureBios(sys, go) {
    var b = BIOS[sys.id];
    if (!b || DEMO) return go(null);
    api('/api/bios').then(function (info) {
      if (info[sys.id]) return go(biosPath(sys.id, info[sys.id]));
      openSheet(b.optional ? 'ใส่ BIOS ไหม? (ไม่บังคับ)' : 'เครื่องนี้ต้องใช้ BIOS',
        (b.optional ? 'เล่นได้โดยไม่ใช้ BIOS แต่บางเกมจะทำงานได้ดีกว่าถ้ามี' : 'เลือกไฟล์ BIOS ของ ' + b.label + ' ที่คุณมี') + ' (' + b.hint + ') ไฟล์จะถูกเก็บไว้ในโฟลเดอร์ bios/ ในเครื่องคุณ ครั้งหน้าไม่ต้องเลือกซ้ำ',
        { ok: 'เลือกไฟล์ BIOS', cb: function () { pickBios(sys.id, function (j) { go(biosPath(sys.id, j)); }); },
          alt: b.optional ? { text: 'เล่นโดยไม่ใช้ BIOS', cb: function () { go(null); } } : null });
    }, function () { go(null); });   // เปิดไม่ผ่าน serve.py ก็เล่นต่อโดยไม่ใช้ BIOS
  }
  function openBiosMgr() {
    $('#biosWrap').hidden = false; $('#biosClose').focus();
    var ul = $('#biosList'); ul.innerHTML = '<li><span class="nokey">กำลังตรวจสอบ…</span></li>';
    api('/api/bios').then(function (info) {
      ul.innerHTML = Object.keys(BIOS).map(function (id) {
        var i = info[id], b = BIOS[id];
        return '<li><span class="lbl">' + esc(b.label) + '<small>' + (i ? esc(i.name) + ' · ' + sizeText(i.size) : (b.optional ? 'ยังไม่มี (ไม่บังคับ)' : 'ยังไม่มี (จำเป็น)')) + '</small></span><span class="b-act"><button data-a="pick" data-id="' + id + '">' + (i ? 'เปลี่ยน' : 'เลือกไฟล์') + '</button>' + (i ? '<button class="danger" data-a="del" data-id="' + id + '">ลบ</button>' : '') + '</span></li>';
      }).join('');
      ul.querySelectorAll('button').forEach(function (bt) {
        bt.onclick = function () {
          if (bt.dataset.a === 'pick') pickBios(bt.dataset.id, openBiosMgr);
          else api('/api/bios/' + bt.dataset.id, { method: 'DELETE' }).then(function () { toast('ลบ BIOS แล้ว'); openBiosMgr(); }, function (e) { toast('ลบไม่สำเร็จ: ' + e.message); });
        };
      });
    }, function () { ul.innerHTML = '<li><span class="nokey">ต้องเปิดเว็บผ่าน python serve.py ถึงจะจัดการ BIOS ได้</span></li>'; });
  }
  $('#btnBios').onclick = openBiosMgr;
  $('#biosClose').onclick = function () { $('#biosWrap').hidden = true; };
  $('#biosWrap').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('#biosWrap').hidden = true; });

  /* ---------- ขนาดภาพ: พอดี / พิกเซลคม / ×2 ×3 ×4 ---------- */
  var ZOOMS = ['fit', 'int', 2, 3, 4], zoomI = 0;
  try { var zv = localStorage.getItem('ae-zoom'); if (zv && ZOOMS.indexOf(isNaN(+zv) ? zv : +zv) > -1) zoomI = ZOOMS.indexOf(isNaN(+zv) ? zv : +zv); } catch (e) {}
  function zoomLabel(m) { return m === 'fit' ? 'พอดี' : m === 'int' ? 'พิกเซลคม' : '×' + m; }
  function applyZoom(say) {
    var m = ZOOMS[zoomI], box = $('.screen'), el = $('#ejs'), res = current && RES[current.system.id];
    $('#zoomLbl').textContent = zoomLabel(m);
    if (m === 'fit' || !res) { el.style.cssText = ''; box.classList.remove('pix'); window.dispatchEvent(new Event('resize')); if (say) toast('ขนาดภาพ: พอดีกับหน้าจอ'); return; }
    var max = Math.max(1, Math.floor(Math.min(box.clientWidth / res[0], box.clientHeight / res[1])));
    var n = m === 'int' ? max : Math.min(m, max);
    el.style.cssText = 'inset:auto;left:50%;top:50%;transform:translate(-50%,-50%);width:' + res[0] * n + 'px;height:' + res[1] * n + 'px';
    box.classList.add('pix'); window.dispatchEvent(new Event('resize'));
    if (say) toast('ขนาดภาพ: ' + zoomLabel(m) + (m !== 'int' && m > max ? ' (จอไม่พอ ใช้ ×' + n + ')' : ' = ' + res[0] * n + '×' + res[1] * n));
  }
  $('#btnZoom').onclick = function () {
    zoomI = (zoomI + 1) % ZOOMS.length;
    try { localStorage.setItem('ae-zoom', ZOOMS[zoomI]); } catch (e) {}
    applyZoom(true);
  };
  if (window.ResizeObserver) new ResizeObserver(function () { if (current && ZOOMS[zoomI] !== 'fit') applyZoom(); }).observe($('.screen'));

  /* ---------- ปุ่มลัดคีย์บอร์ดของเว็บ ---------- */
  document.addEventListener('keydown', function (e) {
    if ($('#play').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!$('#lb').hidden || !$('#sheetWrap').hidden || !$('#ctlWrap').hidden || !$('#biosWrap').hidden) return;
    var t = e.target; if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    var act = { F6: function () { slotSave(1); }, F7: function () { slotLoad(1); }, F8: function () { $('#btnShot').click(); }, F9: function () { $('#btnFast').click(); } }[e.key];
    if (act) { e.preventDefault(); act(); }
  });

  /* ---------- ปุ่มควบคุมของเครื่อง ---------- */
  var KEYS_DEF = { 0: 'X', 1: 'S', 2: 'V', 3: 'Enter', 4: '↑', 5: '↓', 6: '←', 7: '→', 8: 'Z', 9: 'A', 10: 'Q', 11: 'E' };
  var KC = { 8: 'Backspace', 9: 'Tab', 13: 'Enter', 16: 'Shift', 17: 'Ctrl', 18: 'Alt', 27: 'Esc', 32: 'Space', 37: '←', 38: '↑', 39: '→', 40: '↓', 186: ';', 188: ',', 190: '.', 191: '/' };
  function keyLabel(v) {
    if (typeof v === 'number') return KC[v] || ((v >= 48 && v <= 90) ? String.fromCharCode(v) : null);
    if (typeof v === 'string' && v) { var m = { 'up arrow': '↑', 'down arrow': '↓', 'left arrow': '←', 'right arrow': '→', enter: 'Enter', space: 'Space', tab: 'Tab', shift: 'Shift' }[v.toLowerCase()]; return m || (v.length === 1 ? v.toUpperCase() : v); }
    return null;
  }
  function keyFor(i) {
    try { var c = emu().controls[0][i]; var l = c && keyLabel(c.value); if (l) return l; } catch (e) {}   // อ่านค่าที่ตั้งอยู่จริงในอีมูก่อน
    return KEYS_DEF[i] || null;
  }
  function openControls() {
    if (!current) return;
    var sys = current.system, pad = PADS[sys.id] || { keys: [] };
    var rows = '<li><span class="lbl">ทิศทาง (D-pad)</span><span class="keys"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd></span></li>';
    pad.keys.forEach(function (k) {
      var key = keyFor(k[1]);
      rows += '<li><span class="lbl">' + esc(k[0]) + '</span><span class="keys">' + (key ? '<kbd>' + esc(key) + '</kbd>' : '<span class="nokey">ตั้งในเมนูอีมู</span>') + '</span></li>';
    });
    var notes = (pad.notes || []).slice();
    if (pad.approx) notes.unshift('ชื่อปุ่มตรงกับเครื่องจริง แต่คีย์ที่ตรงกันอาจต่างตามเกม ถ้าไม่ตรงให้ดูในเมนูควบคุมของอีมู');
    notes.push('เสียบจอยแล้วใช้ได้ทันที · เปลี่ยนปุ่มได้ที่ไอคอนจอยในแถบควบคุมของอีมู (ใต้จอเกม)');
    $('#ctlTitle').textContent = 'ปุ่มควบคุม · ' + sys.name;
    var web = [['เซฟด่วน (ช่อง 1)', 'F6'], ['โหลดเซฟด่วน (ช่อง 1)', 'F7'], ['แคปจอ', 'F8'], ['เร่งความเร็ว เปิด/ปิด', 'F9']].map(function (r) { return '<li><span class="lbl">' + r[0] + '</span><span class="keys"><kbd>' + r[1] + '</kbd></span></li>'; }).join('');
    $('#ctlBody').innerHTML = '<ul class="ctl-list">' + rows + '</ul><div class="ctl-note">' + notes.map(function (n) { return '<span>' + esc(n) + '</span>'; }).join('') + '</div><p class="ctl-sub">ปุ่มลัดของเว็บ (ใช้ได้ตอนเล่น)</p><ul class="ctl-list">' + web + '</ul>';
    $('#ctlWrap').hidden = false; $('#ctlClose').focus();
  }
  $('#btnCtl').onclick = openControls;
  $('#ctlClose').onclick = function () { $('#ctlWrap').hidden = true; };
  $('#ctlWrap').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('#ctlWrap').hidden = true; });

  /* ---------- ธีม สว่าง / มืด (ปุ่มเดียว แตะสลับ · กดค้างเพื่อกลับไปตามระบบ) ---------- */
  var ICON_SUN = '<circle cx="12" cy="12" r="3.6"/><path d="M12 3.5v1.8M12 18.7v1.8M3.5 12h1.8M18.7 12h1.8M6 6l1.3 1.3M16.7 16.7L18 18M6 18l1.3-1.3M16.7 7.3L18 6"/>';
  var ICON_MOON = '<path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7z"/>';
  var darkMQ = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : { matches: false };
  var theme = 'auto';
  try { var tsv = localStorage.getItem('ae-theme'); if (tsv === 'light' || tsv === 'dark') theme = tsv; } catch (e) {}
  function effectiveTheme() { return theme === 'auto' ? (darkMQ.matches ? 'dark' : 'light') : theme; }
  function applyTheme(m, say) {
    theme = m;
    if (m === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', m);
    try { if (m === 'auto') localStorage.removeItem('ae-theme'); else localStorage.setItem('ae-theme', m); } catch (e) {}
    var dark = effectiveTheme() === 'dark';
    document.querySelectorAll('[data-theme-toggle] svg').forEach(function (v) { v.innerHTML = dark ? ICON_MOON : ICON_SUN; });   // แสดงสถานะปัจจุบัน
    if (say) toast(m === 'auto' ? 'ธีม: ตามระบบ' : 'ธีม: ' + (m === 'dark' ? 'มืด' : 'สว่าง'));
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    var timer = null, long = false;
    b.addEventListener('pointerdown', function () { long = false; timer = setTimeout(function () { long = true; applyTheme('auto', true); }, 650); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, function () { clearTimeout(timer); }); });
    b.addEventListener('click', function (e) { if (long) { long = false; return; } applyTheme(effectiveTheme() === 'dark' ? 'light' : 'dark'); });
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  });
  if (darkMQ.addEventListener) darkMQ.addEventListener('change', function () { if (theme === 'auto') applyTheme('auto'); });
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
