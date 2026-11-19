import { supabaseAdmin,cors,json,fail,makeOrderNumber } from "./_lib.js";
export default async function handler(req,res){
  if(cors(req,res))return;
  if(req.method!=="POST")return fail(res,405,"Method not allowed");
  try{
    const {product_id,customer_name,phone,destination=""}=req.body||{};
    if(!product_id||!customer_name||!phone)return fail(res,400,"Lengkapi produk, nama, dan nomor WhatsApp.");
    if(String(customer_name).length>80||String(phone).length>20||String(destination).length>80)return fail(res,400,"Data terlalu panjang.");
    const db=supabaseAdmin();
    const {data:product,error:pErr}=await db.from("products").select("id,name,price,active").eq("id",product_id).eq("active",true).single();
    if(pErr||!product)return fail(res,404,"Produk tidak ditemukan atau tidak aktif.");
    const order_number=makeOrderNumber();
    const {data,error}=await db.from("orders").insert({
      order_number,product_id:product.id,product_name:product.name,customer_name:String(customer_name).trim(),
      phone:String(phone).trim(),destination:String(destination).trim(),total:product.price,status:"pending",payment_provider:"gopay_qris"
    }).select("id,order_number,total,status").single();
    if(error)throw error;
    return json(res,201,{...data,message:"Pesanan tersimpan. Integrasi QRIS GoPay belum diaktifkan; hubungi admin untuk menyelesaikan pembayaran."});
  }catch(e){console.error(e);return fail(res,500,"Tidak dapat membuat pesanan.");}
}
