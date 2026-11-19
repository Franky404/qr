import { cors,fail,json } from "./_lib.js";
// Do not mark orders paid here until the exact GoPay webhook signature scheme
// and event payload are confirmed from official merchant documentation.
export default async function handler(req,res){
  if(cors(req,res))return;
  if(req.method!=="POST")return fail(res,405,"Method not allowed");
  return fail(res,501,"Webhook belum diaktifkan. Implementasikan verifikasi signature sesuai dokumentasi resmi GoPay terlebih dahulu.");
}
