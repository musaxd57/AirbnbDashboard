// ============================================================
//  AIRBNB PMS — Kod.gs  (Temiz versiyon)
//  10 daire · Telegram · n8n · AI · Envanter · Gelir
// ============================================================

var CFG = {
  TIMEZONE:    "Europe/Istanbul",
  DAYS_BACK:   30,
  DAYS_AHEAD:  180,
  VAC_WINDOW:  60,
  N8N_WEBHOOK: "https://jnskqwan.rpcl.app/webhook/airbnb-pms",
  EXCLUDE:     ["birthday","doğum","task","görev","holidays","türkiye","musa"],
  SHEETS: {
    DASHBOARD:  "Dashboard",
    TODAY:      "Today",
    VACANCY:    "Vacancy",
    AI_SIGNALS: "AI_Signals",
    APARTMENTS: "Apartments",
    LOG:        "Log",
    ENVANTER:   "Envanter"
  },
  C: {
    BLACK:"#111111", WHITE:"#ffffff", DARK:"#1a1a1a",
    GRAY:"#f6f6f6",  GRAY2:"#eeeeee",
    CHECKIN:"#1b5e20",  CHECKIN_BG:"#e8f5e9",
    CHECKOUT:"#b71c1c", CHECKOUT_BG:"#ffebee",
    STAYING:"#0d47a1",  STAYING_BG:"#e3f2fd",
    UPCOMING:"#e65100", UPCOMING_BG:"#fff3e0",
    PAST:"#757575",     PAST_BG:"#f5f5f5",
    CRIT:"#b71c1c",     CRIT_BG:"#ffcdd2",
    HIGH:"#bf360c",     HIGH_BG:"#ffe0b2",
    MED:"#f57f17",      MED_BG:"#fff9c4",
    LOW:"#1b5e20",      LOW_BG:"#c8e6c9",
    TODAY_FG:"#0d47a1", TODAY_BG:"#e3f2fd"
  }
};

// ─────────────────────────────────────────────
// MENÜ
// ─────────────────────────────────────────────
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("🏠 Airbnb PMS")
      .addItem("🚀 Hepsini Çalıştır",           "runAll")
      .addSeparator()
      .addItem("📅 Dashboard",                  "runDashboard")
      .addItem("📋 Bugün",                      "runToday")
      .addItem("📊 Boşluk Analizi",             "runVacancy")
      .addItem("🤖 AI Sinyalleri + n8n",        "runAISignals")
      .addSeparator()
      .addItem("📦 Envanter Sayfası Kur",       "setupEnvanter")
      .addItem("📦 Envanteri Aç",               "openEnvanter")
      .addItem("📋 Takvim Adlarını Listele",    "listCalendars")
      .addItem("⏰ Sabah Tetikleyici Kur",      "setupTrigger")
      .addToUi();
  } catch(e) {}
}

function runAll() {
  runDashboard();
  runToday();
  runVacancy();
  runAISignals();
  colorTabs();
}

// ─────────────────────────────────────────────
// APARTMENT MAP
// ─────────────────────────────────────────────
function buildAptMap() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CFG.SHEETS.APARTMENTS);
  var nameMap  = {};
  var priceMap = {};
  var metaMap  = {};
  if (!sheet) return { nameMap:nameMap, priceMap:priceMap, metaMap:metaMap };

  sheet.getDataRange().getValues().slice(1).forEach(function(r) {
    var key   = txt(r[0]);
    var name  = txt(r[1]) || key;
    var price = parseFloat(r[3]) || 80;
    if (!key) return;
    nameMap[key]   = name;
    priceMap[name] = price;
    metaMap[name]  = { price:price, group:txt(r[2])||"STANDARD", active:txt(r[5]).toUpperCase()!=="FALSE" };
  });
  return { nameMap:nameMap, priceMap:priceMap, metaMap:metaMap };
}

// ─────────────────────────────────────────────
// TAKVİM OKUMA
// ─────────────────────────────────────────────
function readReservations() {
  var aptData  = buildAptMap();
  var nameMap  = aptData.nameMap;
  var metaMap  = aptData.metaMap;
  var today    = midnight(new Date());
  var start    = offsetD(today, -CFG.DAYS_BACK);
  var end      = offsetD(today,  CFG.DAYS_AHEAD);
  var rows     = [];

  CalendarApp.getAllCalendars().forEach(function(cal) {
    var raw = cal.getName();
    if (isExcluded(raw)) return;
    var apt  = nameMap[raw.trim()] || raw.trim();
    var meta = metaMap[apt] || { price:80, active:true };
    if (!meta.active) return;

    cal.getEvents(start, end).forEach(function(ev) {
      var title = ev.getTitle();
      if (title.toLowerCase().indexOf("reserved") < 0) return;
      var cIn    = midnight(ev.getStartTime());
      var cOut   = midnight(ev.getEndTime());
      var nights = diffDays(cIn, cOut);
      var status = getStatus(cIn, cOut, today);
      var guest  = extractGuest(ev.getDescription() || "", title);
      rows.push({
        apt:apt, guest:guest,
        cIn:cIn, cOut:cOut,
        checkIn:fmtTR(cIn), checkOut:fmtTR(cOut),
        nights:nights, status:status,
        kalan:kalanGun(cIn,today),
        price:meta.price
      });
    });
  });

  rows.sort(function(a,b){ return a.cIn - b.cIn; });
  return rows;
}

// ─────────────────────────────────────────────
// 1. DASHBOARD
// ─────────────────────────────────────────────
function runDashboard() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var rows  = readReservations();
  var today = midnight(new Date());
  var sheet = resetSheet(ss, CFG.SHEETS.DASHBOARD);

  writeTitle(sheet, 1, 7, "📅  AIRBNB DASHBOARD  —  " + fmtLong(today));
  sheet.setRowHeight(1, 44);

  var c = countSt(rows);
  var kpi = ["✅ Giriş: "+c.in, "🔴 Çıkış: "+c.out, "🔵 Konaklama: "+c.stay,
             "🟡 Yaklaşan: "+c.up, "", "Toplam: "+rows.length, ""];
  sheet.getRange(2,1,1,7).setValues([kpi]).setBackground(CFG.C.DARK)
    .setFontColor(CFG.C.WHITE).setFontWeight("bold").setFontSize(11).setNumberFormat("@");
  setBg(sheet.getRange(2,1), CFG.C.CHECKIN_BG,  CFG.C.CHECKIN);
  setBg(sheet.getRange(2,2), CFG.C.CHECKOUT_BG, CFG.C.CHECKOUT);
  setBg(sheet.getRange(2,3), CFG.C.STAYING_BG,  CFG.C.STAYING);
  setBg(sheet.getRange(2,4), CFG.C.UPCOMING_BG, CFG.C.UPCOMING);
  sheet.setRowHeight(2, 36);

  writeColH(sheet, 3, ["Daire","Misafir","Giriş","Çıkış","Gece","Durum","Kalan Gün"]);

  if (rows.length > 0) {
    var vals = rows.map(function(r) {
      return [r.apt, r.guest, r.checkIn, r.checkOut, r.nights, stLabel(r.status), r.kalan];
    });
    sheet.getRange(4,1,vals.length,7).setValues(vals).setNumberFormat("@");

    var stMap = {
      "CHECK-IN":  {bg:CFG.C.CHECKIN_BG,  fg:CFG.C.CHECKIN,  t:"✅  GİRİŞ"},
      "CHECK-OUT": {bg:CFG.C.CHECKOUT_BG, fg:CFG.C.CHECKOUT, t:"🔴  ÇIKIŞ"},
      "STAYING":   {bg:CFG.C.STAYING_BG,  fg:CFG.C.STAYING,  t:"🔵  KONAKLAMA"},
      "UPCOMING":  {bg:CFG.C.UPCOMING_BG, fg:CFG.C.UPCOMING, t:"🟡  YAKLAŞAN"},
      "GEÇMİŞ":   {bg:CFG.C.PAST_BG,     fg:CFG.C.PAST,     t:"⬜  GEÇMİŞ"}
    };

    rows.forEach(function(r, i) {
      var row = 4 + i;
      var s   = stMap[r.status];
      var rng = sheet.getRange(row,1,1,7);
      if (r.status === "CHECK-IN")       rng.setBackground(CFG.C.CHECKIN_BG);
      else if (r.status === "CHECK-OUT") rng.setBackground(CFG.C.CHECKOUT_BG);
      else if (r.status === "STAYING")   rng.setBackground(CFG.C.STAYING_BG);
      else rng.setBackground(i%2===0 ? CFG.C.GRAY : CFG.C.WHITE);
      sheet.getRange(row,1).setFontWeight("bold");
      if (s) setBg(sheet.getRange(row,6).setValue(s.t).setHorizontalAlignment("center"), s.bg, s.fg);
      sheet.setRowHeight(row, 28);
    });
  }

  setWidths(sheet, [160,240,110,110,65,140,100]);
  try { sheet.setFrozenRows(3); } catch(e) {}
  logSys("DASHBOARD", rows.length + " rezervasyon.");
}

// ─────────────────────────────────────────────
// 2. TODAY
// ─────────────────────────────────────────────
function runToday() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var dash = ss.getSheetByName(CFG.SHEETS.DASHBOARD);
  if (!dash) { runDashboard(); return runToday(); }

  var today = midnight(new Date());
  var data  = dash.getDataRange().getValues().slice(3).filter(function(r){return r[0];});
  var ins=[], outs=[], stay=[], yarin=[], sameDay=[];

  data.forEach(function(r) {
    var st  = txt(r[5]);
    var rec = [r[0],r[1],r[2],r[3],r[4]];
    if (st.indexOf("GİRİŞ")>=0)     ins.push(rec);
    if (st.indexOf("ÇIKIŞ")>=0)     outs.push(rec);
    if (st.indexOf("KONAKLAMA")>=0) stay.push(rec);
    var co = parseTR(txt(r[3]));
    if (co && diffDays(today,co)===1) yarin.push(rec);
  });
  outs.forEach(function(o) {
    if (ins.some(function(i){return i[0]===o[0];})) sameDay.push(o);
  });

  var sheet = resetSheet(ss, CFG.SHEETS.TODAY);
  writeTitle(sheet, 1, 6, "📋  BUGÜN OPERASYON  —  " + fmtLong(today));
  sheet.setRowHeight(1, 44);

  var kpi = ["Çıkış",outs.length,"Giriş",ins.length,"Konaklama",stay.length,
             "Yarın Çıkış",yarin.length,"Same-Day",sameDay.length,"",""];
  sheet.getRange(2,1,1,12).setValues([kpi]).setFontWeight("bold")
    .setHorizontalAlignment("center").setNumberFormat("@");
  setBg(sheet.getRange(2,1,1,2), CFG.C.CHECKOUT_BG, CFG.C.CHECKOUT);
  setBg(sheet.getRange(2,3,1,2), CFG.C.CHECKIN_BG,  CFG.C.CHECKIN);
  setBg(sheet.getRange(2,5,1,2), CFG.C.STAYING_BG,  CFG.C.STAYING);
  setBg(sheet.getRange(2,7,1,2), CFG.C.MED_BG,      CFG.C.MED);
  setBg(sheet.getRange(2,9,1,2), CFG.C.CRIT_BG,     CFG.C.CRIT);
  sheet.setRowHeight(2, 38);

  var r = 3;
  r = todayBlock(sheet,r,"🔴  BUGÜN ÇIKIŞLAR",     outs,    CFG.C.CHECKOUT_BG, CFG.C.CHECKOUT);
  r = todayBlock(sheet,r,"✅  BUGÜN GİRİŞLER",      ins,     CFG.C.CHECKIN_BG,  CFG.C.CHECKIN);
  r = todayBlock(sheet,r,"⚡  SAME-DAY TURNOVER",   sameDay, CFG.C.CRIT_BG,     CFG.C.CRIT);
  r = todayBlock(sheet,r,"🔵  KONAKLAMA DEVAM",     stay,    CFG.C.STAYING_BG,  CFG.C.STAYING);
  r = todayBlock(sheet,r,"🔔  YARIN ÇIKIŞLAR",      yarin,   CFG.C.MED_BG,      CFG.C.MED);

  setWidths(sheet, [170,90,250,110,110,70]);
  try { sheet.setFrozenRows(2); } catch(e) {}
  logSys("TODAY", "Today güncellendi.");
}

function todayBlock(sheet, row, title, data, bg, fg) {
  sheet.getRange(row,1,1,6).setValues([[title,"","","","",""]])
    .setBackground(bg).setFontColor(fg).setFontWeight("bold").setFontSize(11);
  sheet.setRowHeight(row, 28);
  row++;
  writeColH(sheet, row, ["Daire","Misafir","Giriş","Çıkış","Gece",""]);
  row++;
  if (!data.length) {
    sheet.getRange(row,1,1,6).setValues([["—","Kayıt yok","","","",""]])
      .setBackground(CFG.C.GRAY).setNumberFormat("@");
    return row + 2;
  }
  sheet.getRange(row,1,data.length,5).setValues(data).setNumberFormat("@");
  for (var i=0; i<data.length; i++) {
    sheet.getRange(row+i,1,1,6).setBackground(i%2===0?CFG.C.GRAY:CFG.C.WHITE).setFontSize(10);
    sheet.getRange(row+i,1).setFontWeight("bold");
    sheet.setRowHeight(row+i, 26);
  }
  return row + data.length + 2;
}

// ─────────────────────────────────────────────
// 3. VACANCY
// ─────────────────────────────────────────────
function runVacancy() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var dash = ss.getSheetByName(CFG.SHEETS.DASHBOARD);
  if (!dash) { runDashboard(); return runVacancy(); }

  var today = midnight(new Date());
  var limit = offsetD(today, CFG.VAC_WINDOW);
  var data  = dash.getDataRange().getValues().slice(3).filter(function(r){return r[0];});

  var aptMap = {};
  data.forEach(function(r) {
    var apt = txt(r[0]);
    var s   = parseTR(txt(r[2]));
    var e   = parseTR(txt(r[3]));
    if (!apt||!s||!e) return;
    if (!aptMap[apt]) aptMap[apt]=[];
    aptMap[apt].push({s:s,e:e});
  });

  var rows = [];
  Object.keys(aptMap).forEach(function(apt) {
    rows.push(calcVac(apt, aptMap[apt], today, limit));
  });

  var ord = {KRİTİK:0,YÜKSEK:1,ORTA:2,DÜŞÜK:3};
  rows.sort(function(a,b){ return ord[a.risk]-ord[b.risk]; });

  var sheet = resetSheet(ss, CFG.SHEETS.VACANCY);
  writeTitle(sheet, 1, 10, "📊  BOŞLUK ANALİZİ  —  "+CFG.VAC_WINDOW+" Günlük Pencere");
  sheet.setRowHeight(1, 44);

  var crit = rows.filter(function(r){return r.risk==="KRİTİK";}).length;
  var high = rows.filter(function(r){return r.risk==="YÜKSEK";}).length;
  var avg  = rows.length ? Math.round(rows.reduce(function(s,r){return s+r.occ;},0)/rows.length) : 0;
  var kpi2 = ["Kritik",crit,"Yüksek Risk",high,"Ort. Doluluk","%"+avg,"","","",""];
  sheet.getRange(2,1,1,10).setValues([kpi2]).setFontWeight("bold")
    .setHorizontalAlignment("center").setNumberFormat("@");
  setBg(sheet.getRange(2,1,1,2), CFG.C.CRIT_BG,   CFG.C.CRIT);
  setBg(sheet.getRange(2,3,1,2), CFG.C.HIGH_BG,   CFG.C.HIGH);
  setBg(sheet.getRange(2,5,1,2), CFG.C.STAYING_BG,CFG.C.STAYING);
  sheet.setRowHeight(2, 36);

  writeColH(sheet, 3, ["Daire","Doluluk","Boş Gün","Sonraki Başlangıç","Sonraki Bitiş",
                        "Boş Gece","En Uzun Gap","Orphan","Risk","Aksiyon"]);

  if (rows.length>0) {
    var vals = rows.map(function(r){
      return [r.apt,"%"+r.occ,r.empty,r.nextFrom,r.nextTo,r.nextDays,r.longest,r.orphan,r.risk,r.action];
    });
    sheet.getRange(4,1,vals.length,10).setValues(vals).setNumberFormat("@");
    rows.forEach(function(r,i){
      var row = 4+i;
      var bgMap = {KRİTİK:"#fff5f5",YÜKSEK:"#fff8f2",ORTA:"#fffdf0",DÜŞÜK:"#f5fff7"};
      sheet.getRange(row,1,1,10).setBackground(bgMap[r.risk]||(i%2===0?CFG.C.GRAY:CFG.C.WHITE)).setFontSize(10);
      sheet.getRange(row,1).setFontWeight("bold");
      var fgMap = {KRİTİK:CFG.C.CRIT,YÜKSEK:CFG.C.HIGH,ORTA:CFG.C.MED,DÜŞÜK:CFG.C.LOW};
      if (fgMap[r.risk]) setBg(sheet.getRange(row,9).setHorizontalAlignment("center"), fgMap[r.risk], CFG.C.WHITE);
      sheet.setRowHeight(row, 26);
    });
  }

  setWidths(sheet, [160,70,80,130,130,85,100,75,85,380]);
  try { sheet.setFrozenRows(3); } catch(e) {}
  logSys("VACANCY", rows.length+" daire.");
}

function calcVac(apt, reservations, today, limit) {
  var win = diffDays(today, limit);
  reservations.sort(function(a,b){return a.s-b.s;});
  var gaps=[], ptr=new Date(today);

  reservations.forEach(function(res) {
    var s = res.s > today ? res.s : today;
    var e = res.e < limit ? res.e : limit;
    if (e<=today||s>=limit) return;
    if (s > ptr) {
      var d = diffDays(ptr, s);
      if (d>0) gaps.push({from:new Date(ptr),to:new Date(s),days:d});
    }
    if (res.e > ptr) ptr = new Date(res.e < limit ? res.e : limit);
  });
  if (ptr < limit) {
    var d = diffDays(ptr, limit);
    if (d>0) gaps.push({from:new Date(ptr),to:new Date(limit),days:d});
  }

  var empty   = gaps.reduce(function(s,g){return s+g.days;},0);
  var longest = gaps.length ? Math.max.apply(null,gaps.map(function(g){return g.days;})) : 0;
  var orphan  = gaps.filter(function(g){return g.days<=2;}).length;
  var occ     = Math.max(0,Math.min(100,Math.round(((win-empty)/win)*100)));
  var next    = gaps.length ? gaps[0] : null;

  var score = empty*2 + longest*3 + orphan*8;
  if (occ<40) score+=50; else if (occ<60) score+=35; else if (occ<75) score+=20; else if (occ<85) score+=10;
  score = Math.min(100,Math.round(score));

  var risk = score>=75?"KRİTİK":score>=50?"YÜKSEK":score>=25?"ORTA":"DÜŞÜK";

  var action;
  if (orphan>0)      action="Orphan gap! Min stay=1, last-minute -%20, same-day aç.";
  else if (longest>=14) action="Uzun boşluk: -%20 indirim + haftalık indirim.";
  else if (longest>=7)  action="Orta boşluk: -%10 indirim, min stay esnet.";
  else if (occ>=90)     action="Doluluk güçlü: fiyat artışı test et.";
  else if (occ<60)      action="Düşük doluluk: fiyat + görünürlük optimize et.";
  else                  action="Günlük takip. Instant Book açık kalsın.";

  return {
    apt:apt, occ:occ, empty:empty,
    nextFrom: next?fmtTR(next.from):"—",
    nextTo:   next?fmtTR(next.to):"—",
    nextDays: next?next.days:0,
    longest:longest, orphan:orphan,
    risk:risk, score:score, action:action, gaps:gaps
  };
}

// ─────────────────────────────────────────────
// 4. AI SIGNALS
// ─────────────────────────────────────────────
function runAISignals() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var vac = ss.getSheetByName(CFG.SHEETS.VACANCY);
  if (!vac) { runVacancy(); return runAISignals(); }

  var today   = midnight(new Date());
  var vacData = vac.getDataRange().getValues().slice(3).filter(function(r){return r[0];});
  var signals = [];

  vacData.forEach(function(r) {
    var apt     = txt(r[0]); if (!apt) return;
    var occ     = parseInt((txt(r[1])).replace(/[^0-9]/g,""))||0;
    var empty   = parseInt(r[2])||0;
    var nFrom   = txt(r[3]);
    var nTo     = txt(r[4]);
    var nDays   = parseInt(r[5])||0;
    var longest = parseInt(r[6])||0;
    var orphan  = parseInt(r[7])||0;
    var risk    = txt(r[8]);
    var action  = txt(r[9]);

    if (risk==="KRİTİK"||risk==="YÜKSEK") {
      signals.push(mkSig({
        apt:apt, type:"BOŞLUK_UYARISI", pri:risk,
        msg:apt+" — Doluluk: %"+occ+" | Boş: "+empty+" gün | En uzun: "+longest+" gün | Orphan: "+orphan+" | Sonraki: "+nFrom+" → "+nTo+" ("+nDays+" gece)",
        action:action, range:nFrom+"→"+nTo, occ:"%"+occ
      }));
    }
    if (orphan>0) {
      signals.push(mkSig({
        apt:apt, type:"BOŞ_GÜN_FIRSATI", pri:"KRİTİK",
        msg:apt+": "+orphan+" orphan gap (1-2 gece). İlk: "+nFrom,
        action:"Min stay=1, -%20 indirim, same-day aç.", range:nFrom, occ:"%"+occ
      }));
    }
    if (occ>=90) {
      signals.push(mkSig({
        apt:apt, type:"FİYAT_OPTİMİZASYONU", pri:"BİLGİ",
        msg:apt+" %"+occ+" dolulukta — fiyat artışı fırsatı.",
        action:"Fiyatı %5–12 artırmayı test et.", range:"—", occ:"%"+occ
      }));
    }
  });

  var dash = ss.getSheetByName(CFG.SHEETS.DASHBOARD);
  if (dash) {
    var dashData = dash.getDataRange().getValues().slice(3).filter(function(r){return r[0];});
    var cikisApt = [];

    dashData.forEach(function(r) {
      var st    = txt(r[5]);
      var apt   = txt(r[0]);
      var guest = txt(r[1]);
      var cIn   = txt(r[2]);
      var cOut  = txt(r[3]);
      var gece  = parseInt(r[4])||0;
      var isIn  = st.indexOf("GİRİŞ")>=0;
      var isOut = st.indexOf("ÇIKIŞ")>=0;
      if (!isIn&&!isOut) return;

      signals.push(mkSig({
        apt:apt, type:isIn?"GİRİŞ_BUGÜN":"ÇIKIŞ_BUGÜN", pri:"BUGÜN",
        msg:apt+": "+(isIn?"GİRİŞ":"ÇIKIŞ")+" — "+cIn+" → "+cOut+", "+gece+" gece. Misafir: "+guest,
        action:isIn?"Karşılama mesajı + kilit kodu gönder":"Temizlik ata + yorum talebi yap.",
        range:cIn+" → "+cOut, occ:""
      }));

      if (isOut) cikisApt.push(apt);

      var co = parseTR(cOut);
      if (co && diffDays(today,co)===1) {
        signals.push(mkSig({
          apt:apt, type:"YARIN_ÇIKIŞ", pri:"BUGÜN",
          msg:apt+": Yarın çıkış ("+cOut+"), "+gece+" gece.",
          action:"Temizlik planla + misafire check-out hatırlatması yap.", range:cOut, occ:""
        }));
      }
    });

    if (cikisApt.length>0) {
      signals.push(mkSig({
        apt:"TÜM DAİRELER", type:"TEMİZLİK_BUGÜN", pri:"BUGÜN",
        msg:"Bugün temizlik: "+cikisApt.join(", "),
        action:"Temizlikçiye mesaj gönder.",
        range:fmtTR(today), occ:"", checkouts:cikisApt
      }));
    }
  }

  var sheet = resetSheet(ss, CFG.SHEETS.AI_SIGNALS);
  writeTitle(sheet, 1, 6, "🤖  AI SİNYALLERİ  —  "+fmtLong(today));
  sheet.setRowHeight(1, 44);

  var bugun  = signals.filter(function(s){return s.priority==="BUGÜN";}).length;
  var kritik = signals.filter(function(s){return s.priority==="KRİTİK";}).length;
  var kpi3   = ["Toplam",signals.length,"Bugün",bugun,"Kritik",kritik];
  sheet.getRange(2,1,1,6).setValues([kpi3]).setFontWeight("bold")
    .setHorizontalAlignment("center").setNumberFormat("@");
  setBg(sheet.getRange(2,1,1,2), CFG.C.DARK,    CFG.C.WHITE);
  setBg(sheet.getRange(2,3,1,2), CFG.C.TODAY_BG,CFG.C.TODAY_FG);
  setBg(sheet.getRange(2,5,1,2), CFG.C.CRIT_BG, CFG.C.CRIT);
  sheet.setRowHeight(2, 36);

  writeColH(sheet, 3, ["Daire","Tip","Öncelik","Mesaj","Aksiyon","Tarih"]);

  if (signals.length>0) {
    var vals = signals.map(function(s){
      return [s.apartment,s.type,s.priority,s.message,s.action,s.date_range];
    });
    sheet.getRange(4,1,vals.length,6).setValues(vals).setNumberFormat("@");
    signals.forEach(function(s,i){
      var row=4+i;
      var bgMap={BUGÜN:CFG.C.TODAY_BG,KRİTİK:"#fff5f5",YÜKSEK:"#fff8f2",ORTA:"#fffdf0"};
      var fgMap={BUGÜN:CFG.C.TODAY_FG,KRİTİK:CFG.C.CRIT,YÜKSEK:CFG.C.HIGH,ORTA:CFG.C.MED};
      sheet.getRange(row,1,1,6).setBackground(bgMap[s.priority]||(i%2===0?CFG.C.GRAY:CFG.C.WHITE)).setFontSize(10);
      sheet.getRange(row,1).setFontWeight("bold");
      if (fgMap[s.priority]) setBg(sheet.getRange(row,3).setHorizontalAlignment("center"),fgMap[s.priority],CFG.C.WHITE);
      sheet.setRowHeight(row, 28);
    });
  }

  setWidths(sheet, [160,170,90,480,320,160]);
  try { sheet.setFrozenRows(3); } catch(e) {}

  sendN8N(signals);
  logSys("AI_SIGNALS", signals.length+" sinyal.");
}

function mkSig(o) {
  return {
    apartment:  o.apt||"",
    type:       o.type||"",
    priority:   o.pri||"",
    message:    o.msg||"",
    action:     o.action||"",
    date_range: o.range||"",
    occupancy_pct: o.occ||"",
    checkouts:  o.checkouts||[],
    all_types:  o.type||""
  };
}

// ─────────────────────────────────────────────
// N8N PAYLOAD — Gerçek fiyatlarla
// ─────────────────────────────────────────────
function sendN8N(signals) {
  var url = CFG.N8N_WEBHOOK;
  if (!url) return;

  try {
    // Gerçek daire fiyatları
    var aptData  = buildAptMap();
    var priceMap = aptData.priceMap;

    // Envanter
    var inventory = getInventory();
    var revenue   = calcRevenue();

    // Envanter uyarıları
    var alerts = [];
    var todayCikis = signals.filter(function(s){
      return (s.all_types||"").indexOf("ÇIKIŞ_BUGÜN")>=0||(s.all_types||"").indexOf("TEMİZLİK")>=0;
    }).length;
    var carshaf = parseInt(inventory["Temiz Çarşaf Seti"])||0;
    var havlu   = parseInt(inventory["Temiz Havlu (kişi)"])||0;
    var deterjan= parseFloat(inventory["Deterjan (kg)"])||0;
    if (carshaf>0 && carshaf < todayCikis*2) alerts.push("⚠️ Çarşaf azalıyor: "+carshaf+" set, "+todayCikis+" daire temizlenecek.");
    if (havlu>0   && havlu   < todayCikis*3) alerts.push("⚠️ Havlu azalıyor: "+havlu+" adet.");
    if (deterjan>0&& deterjan< 2)            alerts.push("🔴 Deterjan kritik: "+deterjan+"kg, alım gerekiyor.");

    // 10'da 1 stok kontrolü
    var logSheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CFG.SHEETS.LOG);
    var logCount   = logSheet ? logSheet.getLastRow()-1 : 0;
    var sendStock  = logCount>0 && logCount%10===0;

    var payload = {
      timestamp:         new Date().toISOString(),
      signal_count:      signals.length,
      signals:           signals,
      apartment_prices:  priceMap,
      inventory:         inventory,
      inventory_alerts:  alerts,
      revenue:           revenue,
      send_stock_check:  sendStock
    };

    UrlFetchApp.fetch(url, {
      method:"post", contentType:"application/json",
      payload:JSON.stringify(payload), muteHttpExceptions:true
    });
    logSys("N8N", signals.length+" sinyal gönderildi.");
  } catch(e) {
    logSys("N8N_ERR", e.message);
  }
}

// ─────────────────────────────────────────────
// ENVANTER
// ─────────────────────────────────────────────
function setupEnvanter() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CFG.SHEETS.ENVANTER);
  if (!sheet) sheet = ss.insertSheet(CFG.SHEETS.ENVANTER);
  else sheet.clear();

  sheet.setTabColor("#006064");
  sheet.getRange(1,1,1,3).setValues([["Kalem","Adet","Not"]])
    .setBackground(CFG.C.BLACK).setFontColor(CFG.C.WHITE).setFontWeight("bold");

  var items = [
    ["Temiz Çarşaf Seti",     0, "1 set = nevresim+çarşaf+2 yastık kılıfı"],
    ["Kirli Çarşaf Seti",     0, "Yıkanmayı bekliyor"],
    ["Temiz Havlu (kişi)",    0, "Büyük banyo havlusu"],
    ["Kirli Havlu",           0, "Yıkanmayı bekliyor"],
    ["El Havlusu (temiz)",    0, ""],
    ["Sabun (adet)",          0, ""],
    ["Şampuan (adet)",        0, ""],
    ["Tuvalet Kağıdı (rulo)", 0, ""],
    ["Çöp Torbası (adet)",    0, ""],
    ["Deterjan (kg)",         0, "Çamaşır deterjanı"],
    ["Yumuşatıcı (lt)",       0, ""]
  ];

  sheet.getRange(2,1,items.length,3).setValues(items);
  sheet.setColumnWidth(1,200); sheet.setColumnWidth(2,80); sheet.setColumnWidth(3,300);
  try { sheet.setFrozenRows(1); } catch(e) {}

  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sheet);
  logSys("ENVANTER","Envanter sayfası oluşturuldu.");
}

function openEnvanter() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CFG.SHEETS.ENVANTER);
  if (!sheet) { setupEnvanter(); return; }
  ss.setActiveSheet(sheet);
}

function getInventory() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CFG.SHEETS.ENVANTER);
  if (!sheet) return {};
  var result = {};
  sheet.getDataRange().getValues().slice(1).forEach(function(r) {
    var k = txt(r[0]), v = parseInt(r[1])||0;
    if (k) result[k] = v;
  });
  return result;
}

// ─────────────────────────────────────────────
// GELİR TAHMİNİ
// ─────────────────────────────────────────────
function calcRevenue() {
  var ss       = SpreadsheetApp.getActiveSpreadsheet();
  var dash     = ss.getSheetByName(CFG.SHEETS.DASHBOARD);
  var aptData  = buildAptMap();
  var priceMap = aptData.priceMap;

  if (!dash) return {};

  var today     = midnight(new Date());
  var thisMonth = today.getMonth();
  var thisYear  = today.getFullYear();
  var weekEnd   = offsetD(today, 7);
  var nextMS    = new Date(thisYear, thisMonth+1, 1);
  var nextME    = new Date(thisYear, thisMonth+2, 0);

  var thisM=0, nextM=0, thisW=0;

  dash.getDataRange().getValues().slice(3).forEach(function(r) {
    var apt    = txt(r[0]);
    var cIn    = parseTR(txt(r[2]));
    var nights = parseInt(r[4])||0;
    var price  = priceMap[apt] || 80;
    if (!cIn||nights<=0) return;
    var rev = nights * price;
    if (cIn.getMonth()===thisMonth && cIn.getFullYear()===thisYear) thisM += rev;
    if (cIn>=nextMS && cIn<=nextME) nextM += rev;
    if (cIn>=today  && cIn<weekEnd) thisW += rev;
  });

  return { this_month:thisM, next_month:nextM, this_week:thisW, currency:"EUR" };
}

// ─────────────────────────────────────────────
// WEB APP
// ─────────────────────────────────────────────
// ============================================================
//  Kod.gs'teki doGet fonksiyonunu bu versiyonla değiştir
// ============================================================

function doGet(e) {
  // ?api=1 → JSON döndür (standalone HTML için)
  if (e && e.parameter && e.parameter.api) {
    var data = getWebAppData();
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Normal erişim → HTML döndür
  try {
    return HtmlService.createHtmlOutputFromFile("airbnb_pms_webapp")
      .setTitle("Airbnb PMS")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getWebAppData() {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var today = midnight(new Date());

    function safeRow(row) {
      return row.map(function(cell) {
        if (cell instanceof Date)
          return Utilities.formatDate(cell, CFG.TIMEZONE, "dd.MM.yyyy");
        if (cell===null||cell===undefined) return "";
        return cell;
      });
    }

    var dashSheet = ss.getSheetByName(CFG.SHEETS.DASHBOARD);
    var dashRows  = dashSheet
      ? dashSheet.getDataRange().getValues().slice(3)
          .filter(function(r){return r[0];}).map(safeRow)
      : [];

    var cleaning = {};
    dashRows.forEach(function(r) {
      var apt=txt(r[0]), st=txt(r[5]);
      if (!apt) return;
      if (st.indexOf("ÇIKIŞ")>=0)     cleaning[apt]="Kirli";
      else if (st.indexOf("GİRİŞ")>=0  && !cleaning[apt]) cleaning[apt]="Hazır";
      else if (st.indexOf("KONAKLAMA")>=0 && !cleaning[apt]) cleaning[apt]="Temiz";
    });

    var ins=[], outs=[], stay=[], yarin=[];
    dashRows.forEach(function(r) {
      var st=txt(r[5]), rec=[r[0],r[1],r[2],r[3],r[4]];
      if (st.indexOf("GİRİŞ")>=0)     ins.push(rec);
      if (st.indexOf("ÇIKIŞ")>=0)     outs.push(rec);
      if (st.indexOf("KONAKLAMA")>=0) stay.push(rec);
      var co=parseTR(txt(r[3]));
      if (co && diffDays(today,co)===1) yarin.push(rec);
    });

    var vacSheet = ss.getSheetByName(CFG.SHEETS.VACANCY);
    var vacRows  = vacSheet
      ? vacSheet.getDataRange().getValues().slice(3)
          .filter(function(r){return r[0];}).map(safeRow)
      : [];

    var sigSheet = ss.getSheetByName(CFG.SHEETS.AI_SIGNALS);
    var sigRows  = sigSheet
      ? sigSheet.getDataRange().getValues().slice(3)
          .filter(function(r){return r[0];}).map(safeRow)
      : [];

    return {
      dashboard: dashRows,
      today:     {checkins:ins, checkouts:outs, staying:stay, yarin:yarin},
      vacancy:   vacRows,
      signals:   sigRows,
      cleaning:  cleaning,
      logs:      getLogs(),
      inventory: getInventory(),
      revenue:   calcRevenue()
    };
  } catch(e) {
    logSys("WEBAPP_ERR", e.message);
    return {
      dashboard:[], today:{checkins:[],checkouts:[],staying:[],yarin:[]},
      vacancy:[], signals:[], cleaning:{}, logs:[], inventory:{}, revenue:{},
      error: e.message
    };
  }
}

// ─────────────────────────────────────────────
// LOG
// ─────────────────────────────────────────────
function logSys(source, msg) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CFG.SHEETS.LOG);
    if (!sheet) {
      sheet = ss.insertSheet(CFG.SHEETS.LOG);
      sheet.getRange(1,1,1,3).setValues([["Tarih/Saat","Kaynak","Mesaj"]])
        .setBackground(CFG.C.BLACK).setFontColor(CFG.C.WHITE).setFontWeight("bold");
      sheet.setTabColor("#4e342e");
    }
    var ts = Utilities.formatDate(new Date(), CFG.TIMEZONE, "dd.MM.yyyy HH:mm");
    sheet.appendRow([ts, source, msg]);
    var last = sheet.getLastRow();
    if (last>201) sheet.deleteRow(2);
  } catch(e) {}
}

function logAction(apartment, action) {
  logSys(apartment, action);
  return true;
}

function getLogs() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CFG.SHEETS.LOG);
    if (!sheet) return [];
    return sheet.getDataRange().getValues().slice(1).reverse().slice(0,50);
  } catch(e) { return []; }
}

// ─────────────────────────────────────────────
// TETİKLEYİCİ
// ─────────────────────────────────────────────
function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction()==="runAll") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("runAll").timeBased().everyDays(1).atHour(8).create();
  logSys("TRIGGER","Sabah 08:00 tetikleyici kuruldu.");
  SpreadsheetApp.getUi().alert("Sabah 08:00 tetikleyicisi kuruldu!");
}

// ─────────────────────────────────────────────
// YARDIMCI FONKSİYONLAR
// ─────────────────────────────────────────────
function midnight(d)     { var r=new Date(d); r.setHours(0,0,0,0); return r; }
function offsetD(d,days) { var r=new Date(d); r.setDate(r.getDate()+days); return r; }
function diffDays(a,b)   { return Math.round((b-a)/864e5); }
function txt(v)          { return (v===null||v===undefined)?"":String(v).trim(); }

function isExcluded(name) {
  var l = name.toLowerCase();
  return CFG.EXCLUDE.some(function(x){return l.indexOf(x)>=0;});
}

function fmtTR(d) {
  if (!(d instanceof Date)) return "";
  return Utilities.formatDate(d, CFG.TIMEZONE, "dd.MM.yyyy");
}

function fmtLong(d) {
  if (!(d instanceof Date)) d=new Date(d);
  var ay  = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
             "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  var gun = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
  return gun[d.getDay()]+", "+d.getDate()+" "+ay[d.getMonth()]+" "+d.getFullYear();
}

function parseTR(v) {
  if (!v) return null;
  if (v instanceof Date) return midnight(v);
  var s=v.toString().trim(), p=s.split(".");
  if (p.length===3&&p[0].length<=2) return new Date(+p[2],+p[1]-1,+p[0]);
  return null;
}

function getStatus(cIn, cOut, today) {
  var ti=cIn.getTime(), to=cOut.getTime(), tt=today.getTime();
  if (ti===tt) return "CHECK-IN";
  if (to===tt) return "CHECK-OUT";
  if (ti<tt&&to>tt) return "STAYING";
  if (ti>tt) return "UPCOMING";
  return "GEÇMİŞ";
}

function stLabel(st) {
  return {
    "CHECK-IN":"✅  GİRİŞ","CHECK-OUT":"🔴  ÇIKIŞ",
    "STAYING":"🔵  KONAKLAMA","UPCOMING":"🟡  YAKLAŞAN","GEÇMİŞ":"⬜  GEÇMİŞ"
  }[st]||st;
}

function kalanGun(cIn, today) {
  var d=diffDays(today,cIn);
  if (d<0) return "—"; if (d===0) return "Bugün"; return d+" gün";
}

function extractGuest(desc, fallback) {
  if (!desc) return fallback;
  var lines=desc.split("\n");
  for (var i=0;i<lines.length;i++) {
    var l=lines[i].toLowerCase();
    if (l.indexOf("guest")>=0||l.indexOf("misafir")>=0)
      return lines[i].replace(/guest[:\s]*/i,"").replace(/misafir[:\s]*/i,"").trim();
  }
  return fallback;
}

function countSt(rows) {
  var c={in:0,out:0,stay:0,up:0};
  rows.forEach(function(r) {
    if (r.status==="CHECK-IN")  c.in++;
    else if (r.status==="CHECK-OUT") c.out++;
    else if (r.status==="STAYING")   c.stay++;
    else if (r.status==="UPCOMING")  c.up++;
  });
  return c;
}

function getOrCreate(ss, name) {
  return ss.getSheetByName(name)||ss.insertSheet(name);
}

function resetSheet(ss, name) {
  var sheet=ss.getSheetByName(name);
  if (!sheet) return ss.insertSheet(name);
  try{sheet.getTables().forEach(function(t){t.remove();});}catch(e){}
  try{var f=sheet.getFilter();if(f)f.remove();}catch(e){}
  try{sheet.getBandings().forEach(function(b){b.remove();});}catch(e){}
  try{sheet.clear();}catch(e){}
  try{sheet.clearConditionalFormatRules();}catch(e){}
  try{sheet.setFrozenRows(0);}catch(e){}
  return sheet;
}

function writeTitle(sheet, row, cols, text) {
  var arr=[text]; for(var i=1;i<cols;i++) arr.push("");
  sheet.getRange(row,1,1,cols).setValues([arr])
    .setBackground(CFG.C.BLACK).setFontColor(CFG.C.WHITE)
    .setFontWeight("bold").setFontSize(13)
    .setHorizontalAlignment("left").setVerticalAlignment("middle").setNumberFormat("@");
}

function writeColH(sheet, row, headers) {
  sheet.getRange(row,1,1,headers.length).setValues([headers])
    .setBackground("#2d2d2d").setFontColor(CFG.C.WHITE)
    .setFontWeight("bold").setFontSize(10)
    .setHorizontalAlignment("center").setNumberFormat("@");
  sheet.setRowHeight(row, 26);
}

function setBg(range, bg, fg) {
  return range.setBackground(bg).setFontColor(fg).setFontWeight("bold");
}

function setWidths(sheet, widths) {
  for (var i=0;i<widths.length;i++) sheet.setColumnWidth(i+1,widths[i]);
  try{sheet.getDataRange().setWrap(false);}catch(e){}
}

function colorTabs() {
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  var c={Dashboard:"#1b5e20",Today:"#0d47a1",Vacancy:"#b71c1c",
         AI_Signals:"#4a148c",Apartments:"#37474f",Log:"#4e342e",Envanter:"#006064"};
  Object.keys(c).forEach(function(n){
    var s=ss.getSheetByName(n); if(s) s.setTabColor(c[n]);
  });
}

function listCalendars() {
  CalendarApp.getAllCalendars().forEach(function(c){Logger.log(c.getName());});
}