(function(){
var inp=document.createElement('input');inp.type='file';inp.accept='.csv,.txt,text/csv';
inp.onchange=function(){var f=inp.files[0];if(!f)return;var r=new FileReader();r.onload=function(){try{box.remove();run(r.result,f.name)}catch(e){alert('Chyba: '+e.message)}};r.readAsArrayBuffer(f)};
var box=document.createElement('div');
box.style.cssText='position:fixed;left:0;right:0;top:0;z-index:2147483647;background:#1a56db;color:#fff;padding:16px;font:18px Arial;text-align:center;box-shadow:0 2px 8px #0008';
box.textContent='Vyberte CSV export: ';inp.style.cssText='display:block;margin:12px auto;font-size:16px;max-width:95%;color:#fff';
var x=document.createElement('button');x.textContent='Zavřít';x.style.cssText='padding:8px 16px;font-size:16px';x.onclick=function(){box.remove()};
box.appendChild(inp);box.appendChild(x);document.body.appendChild(box);

function norm(s){return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim()}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function money(n){return n.toLocaleString('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2})}
function num(s){
  s=String(s||'').replace(/[\s ]/g,'').replace(/[^\d,.\-+()]/g,'');if(!s)return 0;
  var neg=/^\(.*\)$/.test(s)||s.charAt(0)=='-';s=s.replace(/[()+\-]/g,'');
  var lc=s.lastIndexOf(','),ld=s.lastIndexOf('.');
  if(lc>ld)s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'');
  var v=parseFloat(s);if(isNaN(v))v=0;return neg?-v:v}
function pdate(s){
  s=String(s).trim();
  var m=s.match(/^(\d{1,2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{4})/);if(m)return{y:+m[3],m:+m[2],d:+m[1]};
  m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return{y:+m[1],m:+m[2],d:+m[3]};
  return null}
function dec(buf){
  var s=new TextDecoder('utf-8').decode(buf);
  if(s.indexOf('�')>=0)s=new TextDecoder('windows-1250').decode(buf);
  return s.replace(/^﻿/,'')}
function parse(t){
  var first=t.split(/\r?\n/)[0];
  var d=[';',',','\t'].map(function(c){return[c,first.split(c).length]}).sort(function(a,b){return b[1]-a[1]})[0][0];
  var rows=[],row=[],c='',q=false;
  for(var k=0;k<t.length;k++){
    var ch=t[k];
    if(q){if(ch=='"'){if(t[k+1]=='"'){c+='"';k++}else q=false}else c+=ch}
    else if(ch=='"')q=true;
    else if(ch==d){row.push(c);c=''}
    else if(ch=='\n'||ch=='\r'){if(ch=='\r'&&t[k+1]=='\n')k++;row.push(c);c='';rows.push(row);row=[]}
    else c+=ch}
  if(c!==''||row.length){row.push(c);rows.push(row)}
  return rows.filter(function(r){return r.some(function(x){return x.trim()})})}

function run(buf,fname){
  var rows=parse(dec(buf));
  if(rows.length<2)throw new Error('CSV neobsahuje data');
  var h=rows[0].map(norm);
  function col(re){for(var k=0;k<h.length;k++)if(re.test(h[k]))return k;return -1}
  var cD=col(/datum|date/),
      cMD=col(/(^|\s)(md|ma dati|debet|debit)(\s|$)/),
      cDAL=col(/(^|\s)(dal|kredit|credit)(\s|$)/),
      cA=col(/castka|amount|objem|suma|hodnota/),
      cT=col(/popis|text|zprava|description|poznamka|nazev/),
      cDoc=col(/doklad|variabil|^cislo$/),
      cU=col(/kategorie|category|zarazeni|ucet|account/);
  if(cD<0)throw new Error('Nenalezen sloupec s datem');
  var cV=col(/^dph$/),cCe=col(/^cena$/),cPr=col(/produkt/),cPay=col(/zpusob/),cSt=col(/status/),cVy=col(/vydano/),cAu=col(/automat/);
  var mode=cV>=0&&cCe>=0?'V':cMD>=0&&cDAL>=0&&cA>=0?'A':cA>=0?'B':cMD>=0&&cDAL>=0?'C':'';
  if(!mode)throw new Error('Nenalezen sloupec s částkou (ani MD/DAL). Hlavička: '+rows[0].join(' | '));
  if(mode=='B'&&(cU==cMD||cU==cDAL))cU=-1;

  var items=[],skipped=0,months={};
  rows.slice(1).forEach(function(r){
    var dt=pdate(r[cD]||'');if(!dt){skipped++;return}
    var it={dt:dt,doc:cDoc>=0?r[cDoc]:'',txt:cT>=0?r[cT]:'',md:'',dal:'',acct:'',amt:0};
    if(mode=='V'){it.amt=num(r[cCe]);it.rate=num(r[cV]);it.txt=cPr>=0?(r[cPr]||'').trim():'';it.pay=cPay>=0?(r[cPay]||'').trim():'';
      it.paid=cSt<0||/zaplac/.test(norm(r[cSt]||''));it.vyd=cVy<0||/^(true|1|ano)$/.test(norm(r[cVy]||''));it.aut=cAu>=0?(r[cAu]||'').trim():''}
    else if(mode=='A'){it.amt=num(r[cA]);it.md=(r[cMD]||'').trim();it.dal=(r[cDAL]||'').trim()}
    else if(mode=='B'){it.amt=num(r[cA]);it.acct=cU>=0?(r[cU]||'').trim():''}
    else{it.amt=num(r[cDAL])-num(r[cMD]);it.acct=cU>=0&&cU!=cMD&&cU!=cDAL?(r[cU]||'').trim():''}
    items.push(it);var key=it.dt.y+'-'+('0'+it.dt.m).slice(-2);months[key]=(months[key]||0)+1});
  if(!items.length)throw new Error('Žádný řádek s platným datem');
  var def=Object.keys(months).sort(function(a,b){return months[b]-months[a]})[0];
  var inpM=prompt('Za který měsíc vytvořit uzávěrku? (RRRR-MM)\nNalezeno: '+Object.keys(months).sort().join(', '),def);
  if(!inpM)return;
  var y,m,mm=inpM.trim().match(/^(\d{4})\D+(\d{1,2})$/);
  if(mm){y=+mm[1];m=+mm[2]}else if((mm=inpM.trim().match(/^(\d{1,2})\D+(\d{4})$/))){m=+mm[1];y=+mm[2]}else throw new Error('Neplatný měsíc');
  var sel=items.filter(function(i){return i.dt.y==y&&i.dt.m==m}).sort(function(a,b){return a.dt.d-b.dt.d});
  if(!sel.length)throw new Error('Za '+m+'/'+y+' nejsou žádné záznamy');

  var summary='',tot={a:0,b:0};
  var detailMode=mode;
  if(mode=='V'){
    var ok=sel.filter(function(i){return i.paid}),bad=sel.length-ok.length;
    var vat={},pay={},prod={},day={},aut={},sum=0,sumV=0;
    ok.forEach(function(i){
      var b=i.amt/(1+i.rate/100),v=i.amt-b;sum+=i.amt;sumV+=v;
      var o=vat[i.rate]=vat[i.rate]||{b:0,v:0,t:0,n:0};o.b+=b;o.v+=v;o.t+=i.amt;o.n++;
      var p=pay[i.pay||'?']=pay[i.pay||'?']||{t:0,n:0};p.t+=i.amt;p.n++;
      var q=prod[i.txt]=prod[i.txt]||{t:0,n:0};q.t+=i.amt;q.n++;
      var dd=day[i.dt.d]=day[i.dt.d]||{t:0,n:0};dd.t+=i.amt;dd.n++;
      var a=aut[i.aut||'?']=aut[i.aut||'?']||{t:0,n:0};a.t+=i.amt;a.n++});
    function tb(head,obj,keyf){return'<table><tr>'+head.map(function(x,k){return'<th'+(k?' class=n':'')+'>'+x+'</th>'}).join('')+'</tr>'+keyf+'</table>'}
    var rowsOf=function(obj,order,label){return Object.keys(obj).sort(order).map(function(k){var o=obj[k];return'<tr><td>'+esc(label?label(k):k)+'</td><td class=n>'+o.n+'</td><td class=n>'+money(o.t)+'</td></tr>'}).join('')};
    summary='<h2>Souhrn</h2><table class=s><tr><td>Počet zaplacených prodejů</td><td class=n>'+ok.length+'</td></tr><tr><td>Tržba celkem (s DPH)</td><td class=n>'+money(sum)+'</td></tr><tr><td>Základ daně</td><td class=n>'+money(sum-sumV)+'</td></tr><tr class=t><td>DPH celkem</td><td class=n>'+money(sumV)+'</td></tr></table>'+
      '<h2>Rekapitulace DPH</h2><table><tr><th>Sazba</th><th class=n>Počet</th><th class=n>Základ</th><th class=n>DPH</th><th class=n>Celkem</th></tr>'+
      Object.keys(vat).sort(function(a,b){return b-a}).map(function(k){var o=vat[k];return'<tr><td>'+k+' %</td><td class=n>'+o.n+'</td><td class=n>'+money(o.b)+'</td><td class=n>'+money(o.v)+'</td><td class=n>'+money(o.t)+'</td></tr>'}).join('')+
      '<tr class=t><td>Celkem</td><td class=n>'+ok.length+'</td><td class=n>'+money(sum-sumV)+'</td><td class=n>'+money(sumV)+'</td><td class=n>'+money(sum)+'</td></tr></table>'+
      '<h2>Podle způsobu platby</h2>'+tb(['Způsob','Počet','Tržba'],pay,rowsOf(pay,function(a,b){return a<b?-1:1}))+
      (Object.keys(aut).length>1||Object.keys(aut)[0]!='?'?'<h2>Podle automatu</h2>'+tb(['Automat','Počet','Tržba'],aut,rowsOf(aut,function(a,b){return a<b?-1:1})):'')+
      '<h2>Denní tržby</h2>'+tb(['Den','Počet','Tržba'],day,rowsOf(day,function(a,b){return a-b},function(k){return k+'. '+m+'. '+y}))+
      '<h2>Podle produktů</h2>'+tb(['Produkt','Ks','Tržba'],prod,rowsOf(prod,function(a,b){return prod[b].t-prod[a].t}));
    var nv=ok.filter(function(i){return!i.vyd});
    if(nv.length||bad)summary+='<h2>Upozornění ke kontrole</h2><ul>'+(bad?'<li>Nezaplacené objednávky vyřazené z tržby: <b>'+bad+'</b></li>':'')+
      (nv.length?'<li>Zaplaceno, ale nevydáno: <b>'+nv.length+'</b> ks, '+money(nv.reduce(function(a,i){return a+i.amt},0))+' Kč (zahrnuto v tržbě, zvažte reklamaci/storno):<br>'+nv.map(function(i){return i.dt.d+'.'+i.dt.m+'. – '+esc(i.txt)+' ('+money(i.amt)+')'}).join('<br>')+'</li>':'')+'</ul>';
    sel=ok;
  }else if(mode=='A'){
    var ac={};
    sel.forEach(function(i){
      (ac[i.md]=ac[i.md]||{md:0,dal:0}).md+=i.amt;
      (ac[i.dal]=ac[i.dal]||{md:0,dal:0}).dal+=i.amt;tot.a+=i.amt});
    summary='<h2>Obratová předvaha</h2><table><tr><th>Účet</th><th class=n>Obrat MD</th><th class=n>Obrat DAL</th><th class=n>Zůstatek</th></tr>'+
      Object.keys(ac).sort().map(function(k){var o=ac[k],z=o.md-o.dal;
        return'<tr><td>'+esc(k||'(bez účtu)')+'</td><td class=n>'+money(o.md)+'</td><td class=n>'+money(o.dal)+'</td><td class=n>'+money(Math.abs(z))+(z>=0?' MD':' DAL')+'</td></tr>'}).join('')+
      '<tr class=t><td>Celkem</td><td class=n>'+money(tot.a)+'</td><td class=n>'+money(tot.a)+'</td><td></td></tr></table>'+
      '<p class=ok>Kontrola MD = DAL: '+'souhlasí'+' ('+sel.length+' zápisů)</p>';
  }else{
    var cat={},inc=0,exp=0;
    sel.forEach(function(i){var k=i.acct||'(nezařazeno)';var o=cat[k]=cat[k]||{p:0,v:0};
      if(i.amt>=0){o.p+=i.amt;inc+=i.amt}else{o.v-=i.amt;exp-=i.amt}});
    summary='<h2>Souhrn</h2><table class=s><tr><td>Příjmy</td><td class=n>'+money(inc)+'</td></tr><tr><td>Výdaje</td><td class=n>'+money(exp)+'</td></tr><tr class=t><td>Výsledek (příjmy − výdaje)</td><td class=n>'+money(inc-exp)+'</td></tr></table>'+
      '<h2>Podle '+(cU>=0&&mode=='B'?'kategorií':'zařazení')+'</h2><table><tr><th>Položka</th><th class=n>Příjmy</th><th class=n>Výdaje</th><th class=n>Saldo</th></tr>'+
      Object.keys(cat).sort().map(function(k){var o=cat[k];
        return'<tr><td>'+esc(k)+'</td><td class=n>'+money(o.p)+'</td><td class=n>'+money(o.v)+'</td><td class=n>'+money(o.p-o.v)+'</td></tr>'}).join('')+
      '<tr class=t><td>Celkem</td><td class=n>'+money(inc)+'</td><td class=n>'+money(exp)+'</td><td class=n>'+money(inc-exp)+'</td></tr></table>';
  }

  var mn=['leden','únor','březen','duben','květen','červen','červenec','srpen','září','říjen','listopad','prosinec'][m-1];
  var detail='<h2>Přehled zápisů</h2><table class=d><tr><th>Datum</th><th>Doklad</th><th>Popis</th>'+
    (mode=='A'?'<th>MD</th><th>DAL</th>':mode=='V'?'<th>DPH</th><th>Platba</th>':'<th>Zařazení</th>')+'<th class=n>Částka</th></tr>'+
    sel.map(function(i){return'<tr><td>'+i.dt.d+'.'+i.dt.m+'.'+i.dt.y+'</td><td>'+esc(i.doc)+'</td><td>'+esc(i.txt)+'</td>'+
      (mode=='A'?'<td>'+esc(i.md)+'</td><td>'+esc(i.dal)+'</td>':mode=='V'?'<td>'+i.rate+' %</td><td>'+esc(i.pay)+'</td>':'<td>'+esc(i.acct)+'</td>')+'<td class=n>'+money(i.amt)+'</td></tr>'}).join('')+'</table>';
  var css='@page{size:A4;margin:15mm}body{font:11px/1.4 Arial,sans-serif;color:#111;margin:0}h1{font-size:20px;margin:0 0 2px}h2{font-size:14px;margin:18px 0 6px;border-bottom:1px solid #999}'+
    '.m{color:#555;margin-bottom:8px}table{width:100%;border-collapse:collapse}th,td{padding:3px 6px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}th{background:#eee}'+
    '.n{text-align:right;white-space:nowrap}tr.t td{font-weight:bold;border-top:2px solid #333}table.s{width:60%}.ok{color:#176b2c}.d{font-size:10px}tr{page-break-inside:avoid}'+
    '.sig{margin-top:50px;display:flex;justify-content:space-between}.sig div{width:40%;border-top:1px solid #333;padding-top:4px;text-align:center}';
  var doc='<!doctype html><html lang=cs><head><meta charset=utf-8><title>Účetní uzávěrka '+y+'-'+('0'+m).slice(-2)+'</title><style>'+css+'</style></head><body>'+
    '<h1>Měsíční účetní uzávěrka</h1><div class=m>Období: <b>'+mn+' '+y+'</b> &nbsp;|&nbsp; Zdroj: '+esc(fname)+' &nbsp;|&nbsp; Vytvořeno: '+new Date().toLocaleDateString('cs-CZ')+
    (skipped?' &nbsp;|&nbsp; Přeskočeno řádků bez data: '+skipped:'')+'</div>'+summary+detail+
    '<div class=sig><div>Sestavil</div><div>Schválil</div></div></body></html>';

  var bar='<div class=np style="position:sticky;top:0;background:#222;padding:8px"><button style="padding:10px 18px;font-size:16px" onclick="window.print()">Uložit jako PDF / Tisk</button> <button style="padding:10px 18px;font-size:16px" onclick="location.reload()">Znovu</button></div><style>@media print{.np{display:none}}</style>';
  document.open();document.write(doc.replace('<body>','<body>'+bar));document.close();
}
})();
