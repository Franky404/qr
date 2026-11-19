import { cors,fail } from "./_lib.js";
// Intentionally disabled until GoPay provides official merchant API credentials,
// API documentation, and the correct signing/webhook requirements for this account.
export default async function handler(req,res){
  if(cors(req,res))return;
  if(req.method!=="POST")return fail(res,405,"Method not allowed");
  return res.status(501).json({
    error:"GoPay Merchant API belum dikonfigurasi.",
    next_step:"Minta aktivasi akses QRIS dinamis/API dan dokumentasi integrasi resmi dari GoPay. Jangan gunakan endpoint atau signature tebakan."
  });
}
