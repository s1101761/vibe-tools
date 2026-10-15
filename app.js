const $ = (id) => document.getElementById(id);
const money = n => "NT$ " + Math.round(Number(n)||0).toLocaleString("zh-TW");
const uid = () => "s" + Math.random().toString(36).slice(2,10);
const defaultAlternatives = [
  {name:"檜意森活村",type:"景點",icon:"🏡",area:"嘉義市",cost:0,km:0,duration:60,note:"營業資訊待確認"},
  {name:"奇美博物館",type:"景點",icon:"🏛️",area:"台南市",cost:400,km:0,duration:120,note:"門票與開放時間待確認"},
  {name:"漁光島",type:"景點",icon:"🌅",area:"台南市",cost:0,km:0,duration:60,note:"留意天候與停車狀況"},
  {name:"老屋咖啡廳",type:"咖啡廳",icon:"☕",area:"台南市",cost:300,km:0,duration:60,note:"示範分類，店家需自行確認"}
];
const demoTrip = {
 origin:"台中市", destinations:"嘉義、台南", startDate:"", days:3, people:2, budgetMode:"person", budget:8000,
 vehicle:"一般轎車", efficiency:13, fuelPrice:30, driveLimit:3, preferences:["自然景觀","在地美食","咖啡甜點"], special:"",
 itinerary:[
  [
   {id:uid(),time:"09:00",name:"台中市出發",type:"交通",duration:120,cost:0,km:105,note:"行車時間為示範估算"},
   {id:uid(),time:"11:00",name:"檜意森活村",type:"景點",duration:75,cost:0,km:0,note:"營業時間待確認"},
   {id:uid(),time:"12:30",name:"嘉義在地午餐",type:"餐飲",duration:60,cost:700,km:5,note:"餐廳待選，可依喜好替換"},
   {id:uid(),time:"14:00",name:"嘉義公園散步",type:"景點",duration:60,cost:0,km:3,note:"戶外景點，留意天候"},
   {id:uid(),time:"16:00",name:"前往台南住宿區",type:"交通",duration:75,cost:0,km:65,note:"路線時間待確認"},
   {id:uid(),time:"18:00",name:"台南住宿（建議區域）",type:"住宿",duration:60,cost:2600,km:0,note:"價格與空房待確認"}
  ],
  [
   {id:uid(),time:"09:00",name:"台南早餐／在地小吃",type:"餐飲",duration:60,cost:400,km:3,note:"店家營業資訊待確認"},
   {id:uid(),time:"10:30",name:"安平老街周邊",type:"景點",duration:100,cost:100,km:5,note:"停車費用另行估算"},
   {id:uid(),time:"12:30",name:"台南特色午餐",type:"餐飲",duration:70,cost:700,km:4,note:"保留用餐時間"},
   {id:uid(),time:"14:00",name:"巷弄咖啡與甜點",type:"咖啡廳",duration:75,cost:500,km:3,note:"店家為示範類型，需自行選定"},
   {id:uid(),time:"16:00",name:"藍晒圖文創園區",type:"景點",duration:60,cost:0,km:4,note:"開放狀態待確認"},
   {id:uid(),time:"18:00",name:"台南住宿（第 2 晚）",type:"住宿",duration:60,cost:2600,km:0,note:"價格與空房待確認"}
  ],
  [
   {id:uid(),time:"09:00",name:"退房與台南早餐",type:"餐飲",duration:60,cost:400,km:3,note:"住宿退房時間待確認"},
   {id:uid(),time:"10:30",name:"四草綠色隧道周邊",type:"景點",duration:90,cost:600,km:12,note:"活動班次與費用待確認"},
   {id:uid(),time:"12:30",name:"台南午餐",type:"餐飲",duration:60,cost:600,km:5,note:"依當日位置調整"},
   {id:uid(),time:"14:00",name:"返回台中市",type:"交通",duration:180,cost:0,km:180,note:"預留返程時間，實際路況以導航為準"}
  ]
 ],
 alternatives:defaultAlternatives
};
let trip = structuredClone(demoTrip), activeDay = 0, toastTimer;
function datePlus(date, n){const d=new Date((date||new Date().toISOString().slice(0,10))+"T12:00:00");d.setDate(d.getDate()+n);return d;}
function fmtDate(date,n){return datePlus(date,n).toLocaleDateString("zh-TW",{month:"numeric",day:"numeric",weekday:"short"});}
function tripDays(){return Math.max(1,Number(trip.days)||1);}
function ensureDays(){while(trip.itinerary.length<tripDays())trip.itinerary.push([]);trip.itinerary=trip.itinerary.slice(0,tripDays());}
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600);}
function prefs(){return [...document.querySelectorAll("#preferences input:checked")].map(x=>x.value);}
function formToTrip(){trip.origin=$("origin").value.trim();trip.destinations=$("destinations").value.trim();trip.startDate=$("startDate").value;trip.days=Number($("days").value);trip.people=Math.max(1,Number($("people").value)||1);trip.budgetMode=$("budgetMode").value;trip.budget=Math.max(0,Number($("budget").value)||0);trip.vehicle=$("vehicle").value;trip.efficiency=Math.max(1,Number($("efficiency").value)||13);trip.fuelPrice=Math.max(0,Number($("fuelPrice").value)||30);trip.driveLimit=Number($("driveLimit").value);trip.preferences=prefs();trip.special=$("special").value;ensureDays();}

// Prototype itinerary builder: regenerate the plan whenever the route-defining inputs change.
// Distances and travel times remain unconfirmed until a real routing service is connected.
const cityIdeas = {
  "台北市":["大稻埕／迪化街周邊","中正紀念堂周邊","象山步道／信義商圈","華山文創園區周邊","饒河街夜市周邊","北投溫泉／地熱谷"],
  "新北市":["淡水老街周邊","九份老街周邊","十分老街／瀑布周邊","三峽老街周邊","野柳地質公園周邊","碧潭風景區周邊"],
  "基隆市":["正濱漁港周邊","廟口夜市周邊","和平島地質公園周邊","潮境公園周邊"],
  "桃園市":["大溪老街周邊","虎頭山周邊","Xpark／青埔周邊","石門水庫周邊","中壢老街溪周邊"],
  "新竹市":["城隍廟周邊","新竹公園周邊","南寮漁港周邊","青草湖周邊"],
  "苗栗縣":["三義木雕街周邊","南庄老街周邊","勝興車站周邊","通霄海線景觀周邊"],
  "台中市":["審計新村周邊","草悟道周邊","逢甲商圈周邊","高美濕地周邊","后豐鐵馬道周邊","東勢林場周邊"],
  "彰化縣":["鹿港老街周邊","扇形車庫周邊","田尾公路花園周邊","王功漁港周邊"],
  "南投縣":["日月潭周邊","埔里市區周邊","清境農場周邊","車埕老街周邊","溪頭自然教育園區周邊"],
  "雲林縣":["北港老街周邊","斗六市區周邊","古坑綠色隧道周邊","成龍濕地周邊"],
  "嘉義市":["檜意森活村周邊","嘉義公園周邊","文化路夜市周邊","森林之歌周邊","蘭潭風景區周邊"],
  "嘉義縣":["太保市區周邊","阿里山景區周邊","東石漁人碼頭周邊","故宮南院周邊","奮起湖老街周邊"],
  "台南市":["安平老街周邊","藍晒圖文創園區周邊","四草綠色隧道周邊","奇美博物館周邊","神農街／海安路周邊","漁光島周邊"],
  "高雄市":["駁二藝術特區周邊","西子灣周邊","蓮池潭周邊","旗津老街／海岸周邊","衛武營藝術文化中心周邊","美濃老街周邊"],
  "屏東縣":["屏東市區周邊","東港老街周邊","勝利星村周邊","車城／海生館周邊","恆春老街周邊","大鵬灣周邊"],
  "宜蘭縣":["羅東林業文化園區周邊","宜蘭市區周邊","礁溪溫泉周邊","冬山河親水公園周邊","蘭陽博物館周邊"],
  "花蓮縣":["花蓮市區周邊","七星潭周邊","鯉魚潭周邊","松園別館周邊","東大門夜市周邊"],
  "台東縣":["台東森林公園周邊","鐵花村周邊","三仙台周邊","鹿野高台周邊","池上伯朗大道周邊"],
  "澎湖縣":["馬公市區周邊","觀音亭周邊","跨海大橋周邊","山水沙灘周邊"]
};
function normalizeCity(value){
  const raw=String(value||"").trim().replace(/台灣|臺灣/g,"").replace(/臺/g,"台");
  const aliases={"台北":"台北市","新北":"新北市","桃園":"桃園市","新竹":"新竹市","台中":"台中市","彰化":"彰化縣","南投":"南投縣","雲林":"雲林縣","嘉義":"嘉義市","台南":"台南市","高雄":"高雄市","屏東":"屏東縣","宜蘭":"宜蘭縣","花蓮":"花蓮縣","台東":"台東縣","基隆":"基隆市","苗栗":"苗栗縣"};
  const short=raw.replace(/(市|縣)$/,"" );
  return aliases[short]||raw;
}
function splitDestinations(text){return String(text||"").split(/[、，,／/\n]+/).map(x=>normalizeCity(x)).filter(Boolean);}
function ideasFor(city){return cityIdeas[normalizeCity(city)]||[`${city}在地景點（待選）`,`${city}特色景點（待確認）`,`${city}在地市集／街區散步`,`${city}公園或自然景觀`];}
function buildItineraryFromInputs(){
  const origin=normalizeCity(trip.origin||"出發地");
  const destinations=[...new Set(splitDestinations(trip.destinations).filter(c=>c!==origin))];
  const days=Math.max(1,Number(trip.days)||1), wantsFood=trip.preferences.includes("在地美食"), wantsCafe=trip.preferences.includes("咖啡甜點");
  const result=[], cityVisitCount={};
  const addItem=(items,time,name,type,duration=60,cost=0,note="資料待確認",km=0)=>items.push({id:uid(),time,name,type,duration,cost,km,note});
  const foodCost=(n)=>Math.round(trip.people*n);
  const transferMinutes=(from,to)=>{
    if(from===to)return 0;
    // 原型示範值：未串接地圖服務，實際時間仍須以導航為準。
    const southNorth={"高雄市":0,"屏東縣":1,"台南市":2,"嘉義市":3,"嘉義縣":3,"雲林縣":4,"彰化縣":5,"台中市":6,"苗栗縣":7,"新竹市":8,"桃園市":9,"新北市":10,"台北市":11};
    if(from in southNorth&&to in southNorth)return Math.max(60,Math.abs(southNorth[from]-southNorth[to])*35);
    return 120;
  };
  const timeAt=(minutes)=>`${String(Math.floor(minutes/60)%24).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`;
  for(let d=0;d<days;d++){
    const items=[],isFirst=d===0,isLast=d===days-1;
    // 第一天先玩出發縣市；晚上移動到第一個目的地。之後每天早上若要換縣市，先安排交通再吃早餐。
    // Day 1 is the origin city. Day 2 must visit destinations[0] (the first destination),
    // not skip directly to destinations[1]. Each following day advances one destination.
    const city=isFirst?origin:(destinations.length?destinations[Math.min(d-1,destinations.length-1)]:origin);
    // Day 1 ends overnight in destinations[0]. Day 2 stays in that same city,
    // and only the following day transfers to destinations[1]. Keep the overnight
    // city aligned with the previous day's actual lodging location.
    const previousOvernight=isFirst?origin:(destinations.length?destinations[Math.min(Math.max(0,d-2),destinations.length-1)]:origin);
    const needsMorningTransfer=!isFirst&&city!==previousOvernight;
    const visitNo=cityVisitCount[city]||0; cityVisitCount[city]=visitNo+1;
    const ideas=ideasFor(city), ideaA=ideas[(visitNo*2)%ideas.length], ideaB=ideas[(visitNo*2+1)%ideas.length];
    if(days===1){
      addItem(items,"09:00",`${origin}市區早餐／出發準備`,"餐飲",45,wantsFood?foodCost(180):0,"可依出發時間調整；店家營業資訊待確認");
      addItem(items,"10:00",ideasFor(origin)[0],"景點",90,0,"先安排起點城市活動；景點開放時間待確認");
      if(wantsFood)addItem(items,"12:00",`${origin}在地午餐`,"餐飲",60,foodCost(250),"餐廳尚未指定，費用為示範估算");
      addItem(items,"14:00",ideasFor(origin)[1],"景點",90,0,"起點城市景點；開放時間待確認");
      if(wantsCafe)addItem(items,"16:00",`${origin}咖啡／甜點`,"咖啡廳",60,foodCost(150),"店家尚未指定，費用為示範估算");
      addItem(items,"18:00",`${origin}晚餐`,"餐飲",75,foodCost(300),"餐廳尚未指定；營業時間與費用待確認");
      addItem(items,"20:00",`返回住處／${origin}休息睡覺`,"休息",0,0,"返程時間以實際導航為準；當日行程以休息結尾");
    }else{
      if(isFirst){
        addItem(items,"09:00",`${origin}早餐／出發準備`,"餐飲",45,wantsFood?foodCost(180):0,"先在起點城市用餐；店家營業資訊待確認");
        addItem(items,"10:00",ideaA,"景點",90,0,"起點城市活動；景點開放時間待確認");
        if(wantsFood)addItem(items,"12:00",`${origin}在地午餐`,"餐飲",60,foodCost(250),"餐廳尚未指定，費用為示範估算");
        addItem(items,"13:30",ideaB,"景點",90,0,"起點城市活動；景點開放時間待確認");
        if(wantsCafe)addItem(items,"15:15",`${origin}咖啡／甜點或休息時間`,"咖啡廳",60,foodCost(150),"店家尚未指定，費用為示範估算");
        if(destinations.length){
          const next=destinations[0],mins=transferMinutes(origin,next);
          addItem(items,"16:30",`從${origin}出發，開車前往${next}`,"交通",mins,0,`跨縣市移動示範估時約 ${mins} 分鐘；請以導航確認`);
          addItem(items,"18:30",`${next}晚餐`,"餐飲",60,foodCost(300),"抵達目的地後用餐；餐廳與營業時間待確認");
          addItem(items,"19:45",`${next}住宿／休息睡覺`,"住宿",60,foodCost(1300),"住宿區域、價格與空房待確認");
        }else{
          addItem(items,"18:00",`${origin}晚餐`,"餐飲",60,foodCost(300),"餐廳尚未指定；營業時間與費用待確認");
          addItem(items,"19:30",`${origin}住宿／休息睡覺`,"住宿",60,foodCost(1300),"住宿區域、價格與空房待確認");
        }
      }else{
        // 最後一天使用獨立排程：只退房一次、避免景點與返程重疊，並把晚餐放在起始縣市。
        if(isLast){
          const mins=city===origin?0:transferMinutes(city,origin);
          // 以 20:00 前抵達起始縣市為目標，預留 15 分鐘抵達後前往餐廳；返程最晚 16:00 出發。
          const departMinutes=city===origin?16*60:Math.min(16*60,20*60-mins-75);
          const departSafe=Math.max(12*60,departMinutes);
          addItem(items,"08:00",`從${previousOvernight}住宿退房，整理行李並準備出發` ,"其他",30,0,"最後一天只安排一次退房；請確認住宿退房時間並預留整理行李時間");
          addItem(items,"08:30",`${city}早餐／出發準備`,"餐飲",45,wantsFood?foodCost(180):0,"店家與營業資訊待確認");
          addItem(items,"09:30",ideaA,"景點",90,0,"最後一天上午景點；請確認開放時間與交通時間");
          addItem(items,"11:15",`${city}在地午餐`,"餐飲",60,foodCost(250),"餐廳尚未指定；費用為示範估算");
          if(departSafe>=14*60){
            addItem(items,"12:30",ideaB,"景點",90,0,"依返程時間安排；請確認開放時間");
          }
          if(wantsCafe && departSafe>=16*60){
            addItem(items,"14:15",`${city}咖啡／甜點或休息時間`,"咖啡廳",45,foodCost(150),"返程前彈性休息；店家尚未指定");
          }
          if(city===origin){
            addItem(items,"16:00",`${origin}自由活動／返家準備`,"休息",30,0,"已在起始縣市，不需安排跨縣市返程");
            addItem(items,"18:00",`${origin}晚餐（起始縣市）`,"餐飲",60,foodCost(300),"最後一天晚餐安排在起始縣市，目標於 21:00 前用餐");
            addItem(items,"19:30",`返回住處／${origin}休息睡覺`,"休息",0,0,"晚餐後回家休息");
          }else{
            const departTime=timeAt(departSafe);
            const arrivalMinutes=departSafe+mins;
            const dinnerMinutes=arrivalMinutes+15;
            addItem(items,departTime,`從${city}啟程，開車返回起始縣市${origin}`,"交通",mins,0,`依示範車程約 ${mins} 分鐘安排返程，目標在 21:00 前吃到晚餐；請以導航確認實際路況`);
            addItem(items,timeAt(dinnerMinutes),`${origin}晚餐（回到起始縣市後用餐）`,"餐飲",60,foodCost(300),dinnerMinutes+60<=21*60?"晚餐安排在起始縣市，預計 21:00 前用餐完畢":"依示範車程可能無法在 21:00 前用餐，建議提早出發或縮短行程");
            addItem(items,timeAt(dinnerMinutes+60),`返回住處／${origin}休息睡覺`,"休息",0,0,"晚餐後回家休息；時間為示範估算");
          }
          result.push(items);
          continue;
        }
        let firstActivityTime="11:00", lunchTime="12:45", secondActivityTime="14:15", cafeTime="16:00", dinnerTime="18:00";
        if(isLast){
          addItem(items,needsMorningTransfer?"06:00":"08:00",`從${previousOvernight}住宿退房，整理行李並準備出發` ,"其他",30,0,"最後一天先辦理退房；若一早需跨縣市移動，請提前確認住宿退房安排");
        }
        if(needsMorningTransfer){
          const mins=transferMinutes(previousOvernight,city);
          const departTime=mins>=240?"06:30":mins>=180?"07:00":mins>=120?"07:30":"08:00";
          const departMins=Number(departTime.slice(0,2))*60+Number(departTime.slice(3));
          const arrivalMins=departMins+mins;
          let mealTime,mealName,mealType;
          if(arrivalMins<=10*60+15){mealTime="10:00";mealName=`${city}早餐／在地小吃`;mealType="早餐";firstActivityTime="11:00";lunchTime="12:45";secondActivityTime="14:15";cafeTime="16:00";dinnerTime="18:00";}
          else if(arrivalMins<=11*60+30){mealTime="11:30";mealName=`${city}早午餐／在地小吃`;mealType="早午餐";firstActivityTime="12:30";lunchTime="";secondActivityTime="14:15";cafeTime="16:00";dinnerTime="18:00";}
          else if(arrivalMins<=13*60){mealTime="13:00";mealName=`${city}午餐／抵達後用餐`;mealType="午餐";firstActivityTime="14:00";lunchTime="";secondActivityTime="15:30";cafeTime="16:45";dinnerTime="18:00";}
          else{mealTime="14:00";mealName=`${city}晚午餐／抵達後用餐`;mealType="午餐";firstActivityTime="15:00";lunchTime="";secondActivityTime="16:30";cafeTime="";dinnerTime="18:00";}
          addItem(items,departTime,`從${previousOvernight}住宿地退房出發，開車前往${city}`,"交通",mins,0,`先安排跨縣市交通再開始當地行程；示範估時約 ${mins} 分鐘，請以導航確認`);
          addItem(items,mealTime,mealName,"餐飲",50,wantsFood?foodCost(180):0,"依預估抵達時間安排用餐；店家營業資訊待確認");
        }else{
          if(isLast){
            addItem(items,"08:30",`從${previousOvernight}住宿退房，整理行李並準備出發`,"其他",30,0,"最後一天先辦理退房；請確認住宿退房時間並預留整理行李時間");
          }
          addItem(items,"09:00",`${city}早餐／出發準備`,"餐飲",50,wantsFood?foodCost(180):0,"店家與營業資訊待確認");
        }
        addItem(items,firstActivityTime,ideaA,"景點",90,0,"依當天安排不同候選景點；開放時間待確認");
        if(wantsFood&&lunchTime)addItem(items,lunchTime,`${city}在地午餐`,"餐飲",60,foodCost(250),"餐廳尚未指定，費用為示範估算");
        addItem(items,secondActivityTime,ideaB,"景點",90,0,"依當天安排不同候選景點；開放時間待確認");
        if(wantsCafe&&cafeTime)addItem(items,cafeTime,`${city}咖啡／甜點或休息時間`,"咖啡廳",60,foodCost(150),"店家尚未指定，費用為示範估算");
        if(isLast){
          if(city===origin){
            addItem(items,"18:00",`${origin}晚餐`,"餐飲",60,foodCost(300),"最後一天已在起始縣市，直接安排晚餐");
            addItem(items,"19:30",`返回住處／${origin}休息睡覺`,"休息",0,0,"晚餐後回家休息");
          }else{
            const mins=transferMinutes(city,origin);
            const departMinutes=16*60;
            const dinnerMinutes=departMinutes+mins+15;
            const homeMinutes=dinnerMinutes+75;
            addItem(items,"16:00",`從${city}啟程，開車返回起始縣市${origin}`,"交通",mins,0,`安排在 18:00 前啟程；返程示範估時約 ${mins} 分鐘，實際路況以導航為準`);
            addItem(items,timeAt(dinnerMinutes),`${origin}晚餐（回到起始縣市後用餐）`,"餐飲",60,foodCost(300),"最後一天晚餐固定安排在起始縣市；實際抵達時間依路況調整");
            addItem(items,timeAt(homeMinutes),`返回住處／${origin}休息睡覺`,"休息",0,0,"晚餐後回家休息；時間為示範估算");
          }
        }else{
          addItem(items,dinnerTime,`${city}晚餐`,"餐飲",75,foodCost(300),"餐廳尚未指定；營業時間與費用待確認");
          addItem(items,"19:30",`${city}住宿／休息睡覺`,"住宿",60,foodCost(1300),"住宿區域、價格與空房待確認");
        }
      }
    }
    result.push(items);
  }
  trip.itinerary=result;
  const allCities=[origin,...destinations];
  trip.alternatives=allCities.flatMap(city=>ideasFor(city).slice(0,3).map((name,i)=>({name,type:"景點",icon:i===0?"📍":i===1?"🌿":"☕",area:city,cost:0,km:0,duration:60,note:"示範候選地點；請確認地址、開放時間及是否適合路線"}))).slice(0,8);
  activeDay=0;
}
function tripToForm(){["origin","destinations","startDate","days","people","budgetMode","budget","vehicle","efficiency","fuelPrice","driveLimit","special"].forEach(k=>{if($(k))$(k).value=trip[k]??"";});document.querySelectorAll("#preferences input").forEach(x=>x.checked=(trip.preferences||[]).includes(x.value));}
function estimate(){let km=0,drive=0,food=0,stay=0,activities=0,parking=0,toll=0;trip.itinerary.forEach(day=>day.forEach(s=>{km+=Number(s.km)||0;drive+=(Number(s.km)||0)/60; if(s.type==="餐飲"||s.type==="咖啡廳")food+=Number(s.cost)||0;else if(s.type==="住宿")stay+=Number(s.cost)||0;else activities+=Number(s.cost)||0;}));const fuel=km/(Number(trip.efficiency)||13)*(Number(trip.fuelPrice)||30);parking=Math.round(km/100)*80;toll=Math.round(km/100)*45;const total=Math.round(fuel+parking+toll+food+stay+activities);const cap=trip.budgetMode==="person"?trip.budget*trip.people:trip.budget;return {km,drive,fuel:Math.round(fuel),parking,toll,food,stay,activities,total,cap,perPerson:total/(trip.people||1)};}
function render(){ensureDays();const e=estimate();$("tripTitle").textContent=`${trip.origin||"出發地"}出發・${trip.destinations||"自由探索"}`;$("tripSubtitle").textContent=`${tripDays()} 天 ${Math.max(0,tripDays()-1)} 夜 · ${trip.people} 位旅人 · ${trip.preferences?.length?trip.preferences.join("、"):"依照你的步調旅行"}`;$("totalKm").innerHTML=`${Math.round(e.km).toLocaleString()} <small>km</small>`;$("driveHours").innerHTML=`${e.drive.toFixed(1)} <small>小時</small>`;$("totalCost").textContent=money(e.total);$("perPerson").textContent=`每人約 ${money(e.perPerson)}`;const remain=e.cap-e.total;$("budgetStatus").textContent=remain>=0?"預算內":"超出預算";$("budgetStatus").style.color=remain>=0?"var(--green)":"#c05d45";$("budgetDetail").textContent=remain>=0?`尚有 ${money(remain)}`:`超出 ${money(-remain)}`;$("budgetTotalSmall").textContent=money(e.total);
 const rows=[["燃油費",e.fuel],["停車費（估算）",e.parking],["道路通行費（估算）",e.toll],["住宿費",e.stay],["餐飲費",e.food],["門票與活動",e.activities]];
 $("budgetBreakdown").innerHTML=rows.map(([n,v])=>`<div class="budget-row"><span>${n}</span><b>${money(v)}</b></div>`).join("");const pct=e.cap>0?Math.min(100,e.total/e.cap*100):0;$("budgetProgress").style.width=pct+"%";$("budgetProgress").style.background=e.total>e.cap?"#d9826a":"#6ba78e";$("budgetProgressText").textContent=trip.budgetMode==="person"?`每人預算 ${money(trip.budget)} · 全團上限 ${money(e.cap)}`:`全團預算上限 ${money(e.cap)}`;
 renderTabs();renderTimeline();renderAlternatives();renderPending();$("returnText").textContent=`最後一天需返回 ${trip.origin||"原始出發地"}。請確認返程交通時間，避免將估算當成即時路況。`;updateDayMapLink();}
function updateDayMapLink(){
 const day=trip.itinerary[activeDay]||[];
 const previousDay=activeDay>0?(trip.itinerary[activeDay-1]||[]):[];
 const lastStay=[...previousDay].reverse().find(s=>s.type==="住宿");
 const cityFromName=text=>{const m=String(text||"").match(/([\u4e00-\u9fff]{2,3}[市縣])/);return m?m[1]:"";};
 const start=activeDay===0?(trip.origin||""):(cityFromName(lastStay?.name)||trip.origin||"");
 // 只把當天可導航的餐飲與景點放進路線，避免把「退房／出發／住宿休息」等描述當成地點。
 const stops=day.filter(s=>s.type!=="交通"&&s.type!=="住宿"&&!/退房|出發|返回|返程|休息睡覺|住宿地/.test(s.name||"")&&String(s.name||"").trim());
 const locations=stops.map(s=>String(s.name).trim()).filter(Boolean);
 const origin=start||locations[0]||trip.origin||"台灣";
 const destination=locations.length?locations[locations.length-1]:origin;
 const waypoints=locations.slice(0,-1);
 const params=new URLSearchParams({api:"1",origin,destination,travelmode:"driving"});
 if(waypoints.length)params.set("waypoints",waypoints.join("|"));
 $("mapLink").href="https://www.google.com/maps/dir/?"+params.toString();
 $("mapLink").setAttribute("aria-label",`在 Google 地圖查看第 ${activeDay+1} 天行程路線`);
}
function renderTabs(){const box=$("dayTabs");box.innerHTML=trip.itinerary.map((day,i)=>`<button class="day-tab ${i===activeDay?"active":""}" data-day="${i}"><b>第 ${i+1} 天</b><small>${fmtDate(trip.startDate,i)}</small></button>`).join("");box.querySelectorAll("button").forEach(b=>b.onclick=()=>{activeDay=Number(b.dataset.day);render();});}
function typeClass(type){return type==="住宿"?"lodging":(type==="餐飲"||type==="咖啡廳")?"meal":"";}
function renderTimeline(){const day=trip.itinerary[activeDay]||[];const km=day.reduce((a,s)=>a+(Number(s.km)||0),0),mins=day.reduce((a,s)=>a+(Number(s.duration)||0),0),cost=day.reduce((a,s)=>a+(Number(s.cost)||0),0);$("daySummary").innerHTML=`<strong>⌁ ${Math.round(km)} km 路線估算</strong><span>◷ 停留時間約 ${Math.floor(mins/60)} 小時 ${mins%60} 分</span><span>＄ 當日已列費用 ${money(cost)}</span>`;
 if(!day.length){$("timeline").innerHTML='<div class="empty-state">這一天還沒有安排項目，點選「新增項目」開始規劃。</div>';return;}
 $("timeline").innerHTML=day.map((s,i)=>`<div class="stop ${typeClass(s.type)}"><div class="stop-card"><div class="stop-top"><div class="stop-time">${esc(s.time||"--:--")}</div><div class="stop-main"><h4>${esc(s.name)}</h4><p>${esc(s.note||"尚無備註")}</p><div class="stop-tags"><span class="tag">${esc(s.type)}</span><span class="tag">停留 ${Number(s.duration)||0} 分鐘</span>${s.note&&/待確認|估算/.test(s.note)?'<span class="tag pending">待確認</span>':""}${Number(s.cost)>0?`<span class="tag">${money(s.cost)}</span>`:""}</div></div><div class="stop-actions"><button class="tiny-btn" title="編輯" data-edit="${s.id}">✎</button><button class="tiny-btn" title="刪除" data-delete="${s.id}">×</button></div></div></div></div>`).join("");
 $("timeline").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openEdit(activeDay,b.dataset.edit));$("timeline").querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteStop(activeDay,b.dataset.delete));}
function renderAlternatives(){$("alternatives").innerHTML=(trip.alternatives||defaultAlternatives).map((a,i)=>`<div class="alternative"><span class="alternative-icon">${a.icon||"📍"}</span><div class="alternative-text"><b>${esc(a.name)}</b><small>${esc(a.area||"台灣")} · ${esc(a.note||"資料待確認")}</small></div><button class="add-alt" data-alt="${i}">＋ 加入</button></div>`).join("");$("alternatives").querySelectorAll("[data-alt]").forEach(b=>b.onclick=()=>{const a=trip.alternatives[Number(b.dataset.alt)];openEdit(activeDay,null,a);});}
function renderPending(){const all=trip.itinerary.flat();const pending=[...new Set(all.filter(s=>/待確認|估算/.test(s.note||"")).map(s=>`${s.name}：${s.note}`))];const base=["確認景點營業時間與休館日","確認住宿價格及空房","確認停車與門票費用"];const list=[...pending,...base].slice(0,6);$("pendingCount").textContent=list.length;$("pendingList").innerHTML=list.map(x=>`<li>${esc(x)}</li>`).join("");}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function openEdit(dayIndex,id=null,alt=null){$("editForm").reset();$("editDay").value=dayIndex;$("editId").value=id||"";let s=id?trip.itinerary[dayIndex].find(x=>x.id===id):alt;if(!s)s={time:"10:00",name:"",type:"景點",duration:60,cost:0,km:0,note:"資料待確認"};$("editTime").value=s.time||"10:00";$("editName").value=s.name||"";$("editType").value=s.type||"景點";$("editDuration").value=s.duration??60;$("editCost").value=s.cost??0;$("editKm").value=s.km??0;$("editNote").value=s.note||"";$("modalTitle").textContent=id?"編輯行程項目":"新增行程項目";$("editDialog").showModal();}
function saveEdit(e){e.preventDefault();if(e.submitter&&e.submitter.value==="cancel"){ $("editDialog").close(); return; }const di=Number($("editDay").value),id=$("editId").value;const s={id:id||uid(),time:$("editTime").value,name:$("editName").value.trim(),type:$("editType").value,duration:Number($("editDuration").value)||0,cost:Number($("editCost").value)||0,km:Number($("editKm").value)||0,note:$("editNote").value.trim()||"資料待確認"};if(!s.name){toast("請輸入項目名稱");return;}if(id){const index=trip.itinerary[di].findIndex(x=>x.id===id);const old=trip.itinerary[di][index];const diff=[];["time","name","type","duration","cost","km","note"].forEach(k=>{if(String(old[k]??"")!==String(s[k]??""))diff.push(k);});if(diff.length&&!confirm(`確認套用這次修改？\n\n項目：${old.name}\n變更欄位：${diff.join("、")}\n\n系統會重新計算時間摘要與預算。`))return;trip.itinerary[di][index]=s;}else trip.itinerary[di].push(s);trip.itinerary[di].sort((a,b)=>(a.time||"").localeCompare(b.time||""));activeDay=di;$("editDialog").close();afterChange(id?"行程已更新並重新計算":"已新增行程項目");}
function deleteStop(day,id){const s=trip.itinerary[day].find(x=>x.id===id);if(!s)return;if(!confirm(`確定刪除「${s.name}」？\n刪除後將重新計算行程摘要與預算。`))return;trip.itinerary[day]=trip.itinerary[day].filter(x=>x.id!==id);afterChange("已刪除項目並重新計算");}
function afterChange(msg){render();saveLocal();toast(msg);}
function saveLocal(){try{localStorage.setItem("taiwanRoadtripV1",JSON.stringify(trip));}catch(e){}}
function loadLocal(){try{const s=localStorage.getItem("taiwanRoadtripV1");if(s){const parsed=JSON.parse(s);if(parsed&&Array.isArray(parsed.itinerary)){trip=parsed;ensureDays();return true;}}}catch(e){}return false;}
function loadDemo(){trip=structuredClone(demoTrip);trip.startDate=$("startDate").value||new Date().toISOString().slice(0,10);tripToForm();formToTrip();buildItineraryFromInputs();render();saveLocal();toast("已載入含晚餐與睡覺結尾的示範行程");}
function downloadJSON(){const blob=new Blob([JSON.stringify({...trip,exportedAt:new Date().toISOString(),schemaVersion:1},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="台灣自駕行程備份.json";a.click();URL.revokeObjectURL(a.href);toast("已下載行程備份");}
function importJSON(file){const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!data||!Array.isArray(data.itinerary)||!data.origin)throw Error("格式錯誤");if(!confirm("匯入會以備份內容取代目前行程，確定繼續嗎？"))return;trip=data;ensureDays();activeDay=0;tripToForm();render();saveLocal();toast("備份匯入成功");}catch(e){alert("無法匯入此檔案。請選擇本工具下載的有效 JSON 備份。");}};reader.readAsText(file);}
function shareSnapshot(){const snap={...trip,sharedSnapshot:true,snapshotAt:new Date().toISOString()};const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(snap))));const url=new URL(location.href);url.searchParams.set("trip",encoded);$("shareUrl").value=url.href;$("shareDialog").showModal();}
function readShare(){const p=new URLSearchParams(location.search).get("trip");if(!p)return false;try{const d=JSON.parse(decodeURIComponent(escape(atob(p))));if(d&&Array.isArray(d.itinerary)&&d.origin){trip=d;ensureDays();return true;}}catch(e){}return false;}
$("tripForm").addEventListener("submit",e=>{
  e.preventDefault();
  const oldRoute={origin:trip.origin,destinations:trip.destinations,days:Number(trip.days)||1};
  const newRoute={origin:$("origin").value.trim(),destinations:$("destinations").value.trim(),days:Number($("days").value)||1};
  const routeChanged=oldRoute.origin!==newRoute.origin||oldRoute.destinations!==newRoute.destinations||oldRoute.days!==newRoute.days;
  if(routeChanged&&!confirm(`你已修改旅遊路線條件：\n\n出發地：${oldRoute.origin} → ${newRoute.origin}\n目的地：${oldRoute.destinations} → ${newRoute.destinations}\n天數：${oldRoute.days} 天 → ${newRoute.days} 天\n\n確認後會重新產生初步行程，原本手動編輯的行程項目將被替換。`))return;
  formToTrip();
  if(routeChanged){buildItineraryFromInputs();toast("已依新的出發地、目的地與天數重新產生初步行程");}
  else toast("旅遊條件已更新，行程項目未變更");
  activeDay=Math.min(activeDay,trip.itinerary.length-1);render();saveLocal();
});
$("editForm").addEventListener("submit",saveEdit);$("applyEditBtn").addEventListener("click",e=>{e.preventDefault();$("editForm").requestSubmit();});document.querySelectorAll("#editDialog button[value='cancel']").forEach(b=>b.addEventListener("click",e=>{e.preventDefault();$("editDialog").close();}));
$("addStopBtn").onclick=()=>openEdit(activeDay);$("loadDemoBtn").onclick=loadDemo;$("saveBtn").onclick=()=>{saveLocal();downloadJSON();};$("exportPdfBtn").onclick=()=>window.print();$("importBtn").onclick=()=>$("importFile").click();$("importFile").onchange=e=>{if(e.target.files[0])importJSON(e.target.files[0]);e.target.value="";};$("shareBtn").onclick=shareSnapshot;$("copyShareBtn").onclick=async()=>{try{await navigator.clipboard.writeText($("shareUrl").value);toast("分享網址已複製");}catch(e){$("shareUrl").select();document.execCommand("copy");toast("分享網址已複製");}};$("dismissNotice").onclick=()=>$("notice").remove();
$("startDate").value=new Date().toISOString().slice(0,10);
// 每次一般開啟網頁都清除上次的搜尋／行程紀錄；分享快照網址則保留網址內的快照內容。
const openedSharedSnapshot=readShare();
if(!openedSharedSnapshot){
  try{localStorage.removeItem("taiwanRoadtripV1");}catch(e){}
  trip=structuredClone(demoTrip);
  trip.startDate=$("startDate").value;
  activeDay=0;
}
tripToForm();render();
if(openedSharedSnapshot)saveLocal();
