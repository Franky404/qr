import { createClient } from "@supabase/supabase-js";
export function supabaseAdmin() {
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error("Server Supabase environment variables are missing.");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function cors(req,res){
  const allowed=(process.env.ALLOWED_ORIGINS||"").split(",").map(x=>x.trim()).filter(Boolean);
  const origin=req.headers.origin;
  if(origin && (allowed.length===0 || allowed.includes(origin))) res.setHeader("Access-Control-Allow-Origin",origin);
  res.setHeader("Vary","Origin");res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization, x-webhook-signature");
  if(req.method==="OPTIONS"){res.status(204).end();return true;}return false;
}
export function json(res,status,body){res.status(status).setHeader("Content-Type","application/json").send(JSON.stringify(body));}
export function fail(res,status,message){return json(res,status,{error:message});}
export function makeOrderNumber(){return "KD"+Date.now().toString().slice(-9)+Math.floor(Math.random()*90+10);}
