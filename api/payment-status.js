import { supabaseAdmin,cors,json,fail } from "./_lib.js";
export default async function handler(req,res){
  if(cors(req,res))return;
  if(req.method!=="GET")return fail(res,405,"Method not allowed");
  const id=String(req.query?.order_number||"");
  if(!/^KD[0-9]{11}$/.test(id))return fail(res,400,"Nomor pesanan tidak valid.");
  try{
    const {data,error}=await supabaseAdmin().from("orders").select("order_number,status,total,created_at").eq("order_number",id).maybeSingle();
    if(error)throw error;if(!data)return fail(res,404,"Pesanan tidak ditemukan.");
    return json(res,200,data);
  }catch(e){console.error(e);return fail(res,500,"Gagal memeriksa status pesanan.");}
}
