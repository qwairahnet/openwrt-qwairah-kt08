'use strict';
'require view';'require form';'require uci';'require fs';

function portLabel(n){
  if(n==='lan1')return 'LAN 1';
  if(n==='lan2')return 'LAN 2';
  if(n==='lan3')return 'LAN 3';
  if(n==='lan4')return 'LAN 4';
  if(n==='eth0')return 'LAN / Port 1 (eth0)';
  if(n==='eth1')return 'WAN / Port 2 (eth1)';
  if(n==='wan')return 'WAN (wan)';
  if(n==='br-lan')return 'Bridge LAN (br-lan)';
  return n;
}

function cableDesc(s,st){
  var n=parseInt(s,10);
  if(st==='down'||isNaN(n)||n<=0){
    return (st==='up')?'مرتبط (سرعة غير محددة — احتمال عطل كابل/منفذ)':'غير مرتبط / مفصول (بدون كابل)';
  }
  if(n>=1000)return 'كابل 1 جيجابت/ث ('+n+' Mbps) — سليم';
  if(n>=100)return 'كابل 100 ميجابت/ث ('+n+' Mbps) — تنبيه: أقل من 1 جيجا';
  return 'كابل 10 ميجابت/ث ('+n+' Mbps) — تحذير: سرعة ضعيفة / احتمال عطل كابل أو منفذ';
}

return view.extend({
  load:function(){
    return Promise.all([
      uci.load('system'),
      uci.load('wireless'),
      fs.read('/proc/meminfo').catch(function(){return '';}),
      fs.read('/tmp/sysinfo/model').catch(function(){return 'KT KM08-708H';}),
      fs.list('/sys/class/net').catch(function(){return [];})
    ]);
  },
  render:function(d){
    var m=d[2]||'',mdl=(d[3]||'KT KM08-708H').trim(),t=0,a=0,f=0;
    m.split(/\r?\n/).forEach(function(l){var x;if((x=l.match(/^MemTotal:\s+(\d+)\s+kB/)))t=+x[1];if((x=l.match(/^MemAvailable:\s+(\d+)\s+kB/)))a=+x[1];if((x=l.match(/^MemFree:\s+(\d+)\s+kB/)))f=+x[1];});
    var banner=E('div',{style:'margin-bottom:12px;padding:10px 14px;background:#022c22;border:1px solid #eab308;border-radius:8px;color:#fef08a;font-weight:bold;'},'QWAIRAH قويره — الموديل: '+mdl+' | المعمارية: MT7621 (2.4GHz=radio0، 5.8GHz=radio1)');
    var ramPre=E('pre',{id:'qw-ram-box',style:'direction:rtl;text-align:right;unicode-bidi:plaintext;'},'الإجمالي: '+(t/1024).toFixed(2)+' MiB | المستخدم: '+Math.max(0,(t-a)/1024).toFixed(2)+' MiB ('+(t?(((t-a)/t)*100).toFixed(1):'0.0')+'%) | المتاح: '+(a/1024).toFixed(2)+' MiB (Free: '+(f/1024).toFixed(2)+' MiB)');
    var portPre=E('pre',{id:'qw-ports-box',style:'direction:rtl;text-align:right;unicode-bidi:plaintext;'},'جاري فحص منافذ LAN و WAN والكوابل...');

    var map=new form.Map('wireless',_('QWAIRAH Quick Setup — البرمجة السريعة (KT KM08-708H)'));

    var s0=map.section(form.NamedSection,'default_radio0','wifi-iface',_('كرت 2.4GHz (radio0 — QWAIRAH 2.4G)'));
    var o=s0.option(form.ListValue,'mode',_('الوضع (Mode)'));
    o.value('ap','Access Point WDS');
    o.value('sta','Client WDS');
    o.value('mesh','802.11s Mesh');
    o=s0.option(form.Flag,'wds',_('تفعيل WDS'));o.default='1';
    o=s0.option(form.Value,'ssid',_('اسم الشبكة (SSID)'));o.default='QWAIRAH 2.4G';
    o=s0.option(form.ListValue,'encryption',_('التشفير'));
    o.value('none','مفتوحة بدون كلمة سر');
    o.value('psk2','WPA2-PSK');
    o.value('sae-mixed','WPA2/WPA3');
    o=s0.option(form.Value,'key',_('كلمة السر'));o.depends('encryption','psk2');o.depends('encryption','sae-mixed');

    var r0=map.section(form.NamedSection,'radio0','wifi-device',_('إعدادات البث 2.4GHz (radio0)'));
    o=r0.option(form.ListValue,'country',_('الدولة'));o.value('PA','Panama (PA)');o.value('DE','Germany (DE)');o.value('US','United States (US)');o.value('GB','United Kingdom (GB)');o.value('JP','Japan (JP)');
    o=r0.option(form.Value,'channel',_('القناة (1-13)'));o.default='6';
    o=r0.option(form.ListValue,'htmode',_('عرض القناة'));
    o.value('HT20','20MHz');o.value('HT40','40MHz');
    o=r0.option(form.Value,'txpower',_('قوة البث (1-40 dBm)'));o.default='30';

    var s1=map.section(form.NamedSection,'default_radio1','wifi-iface',_('كرت 5.8GHz (radio1 — QWAIRAH 5.8G)'));
    o=s1.option(form.ListValue,'mode',_('الوضع (Mode)'));
    o.value('ap','Access Point WDS');
    o.value('sta','Client WDS');
    o.value('mesh','802.11s Mesh');
    o=s1.option(form.Flag,'wds',_('تفعيل WDS'));o.default='1';
    o=s1.option(form.Value,'ssid',_('اسم الشبكة (SSID)'));o.default='QWAIRAH 5.8G';
    o=s1.option(form.ListValue,'encryption',_('التشفير'));
    o.value('none','مفتوحة بدون كلمة سر');
    o.value('psk2','WPA2-PSK');
    o.value('sae-mixed','WPA2/WPA3');
    o=s1.option(form.Value,'key',_('كلمة السر'));o.depends('encryption','psk2');o.depends('encryption','sae-mixed');

    var r1=map.section(form.NamedSection,'radio1','wifi-device',_('إعدادات البث 5.8GHz (radio1)'));
    o=r1.option(form.ListValue,'country',_('الدولة'));o.value('PA','Panama (PA)');o.value('DE','Germany (DE)');o.value('US','United States (US)');o.value('GB','United Kingdom (GB)');o.value('JP','Japan (JP)');
    o=r1.option(form.Value,'channel',_('القناة (1-200 / 5520=104)'));o.default='104';
    o=r1.option(form.ListValue,'htmode',_('عرض القناة'));
    o.value('HT20','20MHz');o.value('HT40','40MHz');o.value('VHT80','80MHz');o.value('VHT160','160MHz');
    o=r1.option(form.Value,'txpower',_('قوة البث (1-40 dBm)'));o.default='30';

    var present={};
    (d[4]||[]).forEach(function(it){if(it&&it.name)present[it.name]=true;});
    var fixed=['lan1','lan2','lan3','lan4','eth0','eth1','wan','br-lan'];
    var extra=Object.keys(present).filter(function(k){return fixed.indexOf(k)===-1 && /^(lan\d+|eth\d+|wan\d*)$/.test(k);}).sort();
    var portsList=fixed.concat(extra);

    return map.render().then(function(el){
      el.insertBefore(banner,el.firstChild);
      el.appendChild(E('div',{class:'cbi-section',style:'direction:rtl;text-align:right;'},[E('h3',{},'Ports & Cable Speed (حالة المنافذ والكوابل)'),portPre]));
      el.appendChild(E('div',{class:'cbi-section',style:'direction:rtl;text-align:right;'},[E('h3',{},'RAM Status (حالة الرام)'),ramPre]));
      Promise.all(portsList.map(function(n){
        if(!present[n])return Promise.resolve('⚪ '+portLabel(n)+' ['+n+']: غير متوفر في هذا الجهاز');
        return Promise.all([
          fs.read('/sys/class/net/'+n+'/operstate').catch(function(){return 'unknown';}),
          fs.read('/sys/class/net/'+n+'/speed').catch(function(){return '';}),
          fs.read('/sys/class/net/'+n+'/duplex').catch(function(){return '';})
        ]).then(function(v){
          var st=(v[0]||'unknown').trim(),sp=(v[1]||'').trim(),dp=(v[2]||'').trim();
          var ic=(st==='up')?'🟢':'🔴';
          var dupTxt=(dp&&st==='up')?' | Duplex: '+dp:'';
          return ic+' '+portLabel(n)+' ['+n+']: الحالة = '+st+' | الكابل = '+cableDesc(sp,st)+dupTxt;
        });
      })).then(function(lines){portPre.textContent=lines.join('\n');});
      return el;
    });
  }
});
