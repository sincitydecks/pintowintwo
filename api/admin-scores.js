const {authOk}=require('../lib/admin-auth');
const {json,clean,db,config}=require('../lib/game');
const uuid=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value||'');
function validTime(value){return typeof value==='string'&&Number.isFinite(Date.parse(value))&&Date.parse(value)<=Date.now()+5000;}
function mutationAllowed(req){
  if(req.headers['x-pin-to-win-admin']!=='1'||!String(req.headers['content-type']||'').startsWith('application/json'))return false;
  if(req.headers['sec-fetch-site']==='cross-site')return false;
  try{return !req.headers.origin||new URL(req.headers.origin).host===req.headers.host;}catch{return false;}
}
module.exports=async(req,res)=>{
  if(!authOk(req))return json(res,401,{ok:false,error:'Please sign in as an admin.'});
  const action=clean(req.query?.action||'list',20),conf=config();
  try{
    if(req.method==='GET'){
      if(action==='session')return json(res,200,{ok:true,...conf});
      if(action==='board')return json(res,200,{ok:true,rows:await db('rpc/pin_to_win_all_time_board',{method:'POST',body:{event_key:conf.eventId}}),...conf});
      if(action!=='list')return json(res,400,{ok:false,error:'Unknown action.'});
      const day=clean(req.query?.day,10),visibility=clean(req.query?.visibility||'all',10);
      const offset=Number(req.query?.offset||0),asOf=req.query?.asOf||new Date().toISOString();
      if((day&&!/^\d{4}-\d{2}-\d{2}$/.test(day))||!['all','visible','hidden'].includes(visibility)||!Number.isSafeInteger(offset)||offset<0||!validTime(asOf))return json(res,400,{ok:false,error:'Invalid score filters.'});
      const filter=(day?'&event_day=eq.'+day:'')+(visibility==='all'?'':'&hidden_at='+(visibility==='hidden'?'not.is.null':'is.null'));
      const rows=await db(`pin_to_win_games?event_id=eq.${encodeURIComponent(conf.eventId)}${filter}&started_at=lte.${encodeURIComponent(asOf)}&select=id,full_name,email,score,total_distance,completed,source,started_at,event_day,hidden_at&order=started_at.desc,id.desc&offset=${offset}&limit=101`);
      return json(res,200,{ok:true,rows:rows.slice(0,100),hasMore:rows.length>100,offset,asOf,...conf});
    }
    if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return json(res,405,{ok:false,error:'Method not allowed.'});}
    if(!mutationAllowed(req))return json(res,403,{ok:false,error:'Please use the admin dashboard to change scores.'});
    let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{}
    if(!body||!['hide','restore','clear'].includes(action))return json(res,400,{ok:false,error:'Invalid moderation request.'});
    let filter;
    if(action==='clear'){
      if(body.confirm!=='CLEAR LEADERBOARD'||!validTime(body.asOf))return json(res,400,{ok:false,error:'Type CLEAR LEADERBOARD to confirm.'});
      // Only completed games saved before the preview are archived. New/in-progress games continue normally.
      filter=`completed=eq.true&hidden_at=is.null&updated_at=lte.${encodeURIComponent(body.asOf)}`;
    }else{
      if(!uuid(body.id))return json(res,400,{ok:false,error:'Choose a valid score.'});
      filter=`id=eq.${body.id}`;
    }
    const hiddenAt=action==='restore'?null:new Date().toISOString();
    await db(`pin_to_win_games?event_id=eq.${encodeURIComponent(conf.eventId)}&${filter}`,{method:'PATCH',prefer:'return=minimal',body:{hidden_at:hiddenAt}});
    return json(res,200,{ok:true,hiddenAt});
  }catch(error){console.error('Admin scores request failed:',error.code||error.name);return json(res,503,{ok:false,error:'Could not update or load cloud scores. Please try again.'});}
};
