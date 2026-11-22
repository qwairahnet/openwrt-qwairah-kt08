'use strict';
'require view';'require fs';'require ui';

function parseConf(t){
  var c={BOT_TOKEN:'7905762136:AAF1BeNXsjLnvOcxdv7e9PHK_CRoy06qBVE',CHAT_ID:'1017548476',NODE_NAME:'قويره'};
  (t||'').split(/\r?\n/).forEach(function(l){
    var m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if(m)c[m[1]]=m[2];
  });
  return c;
}

function buildConf(tokInp, chatInp, nodeInp){
  var tok=(tokInp.value||'').trim();
  var cid=(chatInp.value||'').trim();
  var nod=(nodeInp.value||'').trim()||'قويره';
  return 'BOT_TOKEN="'+tok+'"\nCHAT_ID="'+cid+'"\nNODE_NAME="'+nod+'"\n';
}

function runNotifyTest(out){
  return fs.exec('/usr/bin/qwairah-tg-notify.sh',['test']).catch(function(){
    return fs.exec('/bin/sh',['/usr/bin/qwairah-tg-notify.sh','test']);
  }).then(function(r){
    var res=(((r&&r.stdout)||'')+((r&&r.stderr)||'')).trim();
    if(res.indexOf('"ok":true')!==-1){
      out.textContent='تم إرسال التقرير إلى البوت بنجاح.';
      ui.addNotification(null,E('p','تم إرسال التقرير إلى البوت بنجاح.'),'info');
    } else {
      out.textContent=res||(r&&r.code===0?'تم إرسال التقرير إلى البوت.':'تعذر الإرسال (رمز الخروج: '+(r?r.code:'?')+')');
    }
  });
}

return view.extend({
  load:function(){
    return fs.read('/etc/qwairah_tg.conf').catch(function(){
      return 'BOT_TOKEN="7905762136:AAF1BeNXsjLnvOcxdv7e9PHK_CRoy06qBVE"\nCHAT_ID="1017548476"\nNODE_NAME="قويره"\n';
    });
  },
  render:function(txt){
    var c=parseConf(txt);
    var tokInp=E('input',{
      id:'qw-tg-token',
      type:'text',
      dir:'ltr',
      value:c.BOT_TOKEN||'',
      placeholder:'7905762136:AAF1BeNXsjLnvOcxdv7e9PHK_CRoy06qBVE',
      style:'width:100%;box-sizing:border-box;font-family:monospace;direction:ltr;text-align:left;unicode-bidi:bidi-override;'
    });
    var chatInp=E('input',{
      id:'qw-tg-chatid',
      type:'text',
      dir:'ltr',
      value:c.CHAT_ID||'',
      placeholder:'1017548476',
      style:'width:100%;box-sizing:border-box;font-family:monospace;direction:ltr;text-align:left;'
    });
    var nodeInp=E('input',{
      id:'qw-tg-node',
      type:'text',
      dir:'rtl',
      value:c.NODE_NAME||'قويره',
      placeholder:'قويره',
      style:'width:100%;box-sizing:border-box;direction:rtl;text-align:right;'
    });

    var out=E('pre',{id:'qw-tg-out',dir:'rtl',style:'direction:rtl;text-align:right;unicode-bidi:plaintext;'},'أدخل البيانات ثم اضغط حفظ المعلومات أو إرسال التقرير إلى البوت.');

    var saveB=E('button',{class:'btn cbi-button-save',click:function(){
      var content=buildConf(tokInp,chatInp,nodeInp);
      return fs.write('/etc/qwairah_tg.conf',content).then(function(){
        out.textContent='تم حفظ المعلومات بنجاح.';
        ui.addNotification(null,E('p','تم حفظ المعلومات بنجاح.'),'info');
      }).catch(function(e){
        out.textContent='تعذر الحفظ: '+(e&&e.message?e.message:String(e));
      });
    }},'حفظ المعلومات');

    var testB=E('button',{class:'btn cbi-button-apply',style:'margin-right:8px;',click:function(){
      var tok=(tokInp.value||'').trim();
      var cid=(chatInp.value||'').trim();
      if(!tok||!cid){
        out.textContent='يرجى إدخال توكن بوت التيليجرام وآي دي التيليجرام أولاً.';
        return;
      }
      var content=buildConf(tokInp,chatInp,nodeInp);
      out.textContent='جاري حفظ المعلومات وإرسال التقرير إلى البوت...';
      return fs.write('/etc/qwairah_tg.conf',content).then(function(){
        return runNotifyTest(out);
      }).catch(function(e){
        out.textContent='تعذر الإرسال: '+(e&&e.message?e.message:String(e));
      });
    }},'إرسال التقرير إلى البوت');

    return E('div',{class:'cbi-map',dir:'rtl',style:'direction:rtl;text-align:right;'},[
      E('h2',{style:'direction:rtl;text-align:right;'},'إعدادات بوت التيليجرام'),
      E('div',{class:'cbi-section',style:'direction:rtl;text-align:right;'},[
        E('div',{class:'cbi-value'},[
          E('label',{class:'cbi-value-title',for:'qw-tg-token',style:'direction:rtl;text-align:right;'},'توكن بوت التيليجرام'),
          E('div',{class:'cbi-value-field',style:'direction:ltr;text-align:left;'},tokInp)
        ]),
        E('div',{class:'cbi-value'},[
          E('label',{class:'cbi-value-title',for:'qw-tg-chatid',style:'direction:rtl;text-align:right;'},'آي دي التيليجرام'),
          E('div',{class:'cbi-value-field',style:'direction:ltr;text-align:left;'},chatInp)
        ]),
        E('div',{class:'cbi-value'},[
          E('label',{class:'cbi-value-title',for:'qw-tg-node',style:'direction:rtl;text-align:right;'},'اسم المودم'),
          E('div',{class:'cbi-value-field',style:'direction:rtl;text-align:right;'},nodeInp)
        ]),
        E('p',{style:'margin-top:12px;direction:rtl;text-align:right;'},[saveB,testB]),
        out
      ])
    ]);
  },
  handleSaveApply:null,handleSave:null,handleReset:null
});
