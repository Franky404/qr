const cfg = window.KONTER_CONFIG || {};
const apiBase = (cfg.API_BASE_URL || "").replace(/\/$/, "");
const supabaseReady = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes("YOUR_"));
const db = supabaseReady ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
const fallbackProducts = [
  {id:"demo-1",name:"Top Up HGI 1B",category:"Top Up HGI",price:57000,description:"Top up HGI 1 Billion"},
  {id:"demo-2",name:"Top Up HGI 500M",category:"Top Up HGI",price:34000,description:"Top up HGI 500 Million"},
  {id:"demo-3",name:"Top Up HGI 200M",category:"Top Up HGI",price:17000,description:"Top up HGI 200 Million"},
  {id:"demo-4",name:"Top Up HGI 100M",category:"Top Up HGI",price:9000,description:"Top up HGI 100 Million"}
];
let products = [], activeCategory = "Semua", selected = null, statusTimer = null;
const $ = s => document.querySelector(s);
const rupiah = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2800);}
function safe(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function loadProducts(){
  if(db){const {data,error}=await db.from("products").select("id,name,category,price,description,active").eq("active",true).order("created_at",{ascending:false});if(!error)products=data||[];else products=fallbackProducts;}
  else products=fallbackProducts;
  renderProducts();
}
function renderProducts(){
  const q=$("#search").value.toLowerCase();
  const list=products.filter(p=>(activeCategory==="Semua"||p.category===activeCategory)&&(`${p.name} ${p.description||""}`).toLowerCase().includes(q));
  $("#products").innerHTML=list.length?list.map(p=>`<article class="product-card"><div class="product-icon">◈</div><span class="product-category">${safe(p.category)}</span><h3>${safe(p.name)}</h3><p>${safe(p.description||"Produk konter digital")}</p><div class="product-bottom"><strong>${rupiah(p.price)}</strong><button class="add-button" data-id="${safe(p.id)}" aria-label="Pesan ${safe(p.name)}">+</button></div></article>`).join(""):'<div class="empty-state">Produk tidak ditemukan. Coba kata kunci lain.</div>';
  document.querySelectorAll(".add-button").forEach(b=>b.addEventListener("click",()=>openOrder(b.dataset.id)));
}
function openOrder(id){
  selected=products.find(p=>String(p.id)===String(id));if(!selected)return;
  if(statusTimer){clearInterval(statusTimer);statusTimer=null;}
  $("#selectedProduct").innerHTML=`<div><b>${safe(selected.name)}</b><small>${safe(selected.category)}</small></div><strong>${rupiah(selected.price)}</strong>`;
  $("#orderForm").hidden=false;$("#orderResult").hidden=true;$("#orderResult").innerHTML="";$("#orderModal").hidden=false;
}
$("#closeModal").onclick=()=>{$("#orderModal").hidden=true;if(statusTimer){clearInterval(statusTimer);statusTimer=null;}};
$("#orderModal").addEventListener("click",e=>{if(e.target.id==="orderModal")$("#orderModal").hidden=true;});
$("#search").addEventListener("input",renderProducts);
$("#filters").addEventListener("click",e=>{const b=e.target.closest("button[data-category]");if(!b)return;activeCategory=b.dataset.category;document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));renderProducts();});
async function checkPaymentStatus(orderNumber, statusEl){
  try{
    const r=await fetch(`${apiBase}/api/payment-status?order_number=${encodeURIComponent(orderNumber)}`);
    const data=await r.json();if(!r.ok)return;
    statusEl.textContent=data.status.toUpperCase();
    if(["paid","expired","failed"].includes(data.status)&&statusTimer){clearInterval(statusTimer);statusTimer=null;}
  }catch(e){console.warn("Status check:",e);}
}
$("#orderForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!selected)return;
  const f=new FormData(e.currentTarget), payload={product_id:selected.id,customer_name:f.get("customer_name").trim(),phone:f.get("phone").trim(),destination:f.get("destination").trim()};
  const btn=e.currentTarget.querySelector("button");btn.disabled=true;btn.textContent="Memproses…";
  try{
    if(!apiBase||apiBase.includes("YOUR-VERCEL"))throw new Error("Backend belum dikonfigurasi. Pesanan belum dikirim.");
    const orderResponse=await fetch(`${apiBase}/api/orders`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const order=await orderResponse.json();if(!orderResponse.ok)throw new Error(order.error||"Gagal membuat pesanan.");
    $("#orderForm").hidden=true;$("#orderResult").hidden=false;
    $("#orderResult").innerHTML=`<b>Pesanan ${safe(order.order_number)} berhasil dibuat</b><p>Menyiapkan QRIS…</p>`;

    const paymentResponse=await fetch(`${apiBase}/api/create-payment`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order_id:order.id})});
    const payment=await paymentResponse.json();
    if(!paymentResponse.ok)throw new Error(payment.error||"QRIS belum berhasil dibuat.");
    if(!payment.qr_url)throw new Error("Alamat QRIS tidak diterima dari server.");

    $("#orderResult").innerHTML=`<b>Scan QRIS untuk membayar</b><p>Nomor pesanan: <strong>${safe(payment.order_number)}</strong></p><p>Total: <strong>${rupiah(payment.total)}</strong></p><div style="display:flex;justify-content:center;margin:16px 0"><img src="${safe(payment.qr_url)}" alt="QRIS pembayaran" style="width:min(280px,100%);background:#fff;padding:10px;border-radius:12px" referrerpolicy="no-referrer"></div><p style="text-align:center">Buka aplikasi GoPay atau aplikasi pembayaran yang mendukung QRIS, lalu scan kode di atas.</p><p>Status: <strong id="livePaymentStatus">MENUNGGU PEMBAYARAN</strong></p><p id="paymentExpiry">${payment.expires_at?`Batas pembayaran: ${safe(payment.expires_at)}`:"Selesaikan pembayaran sebelum QRIS kedaluwarsa."}</p><p style="font-size:12px;opacity:.8">Halaman ini akan memeriksa status pembayaran secara berkala. Jangan tutup sebelum pembayaran selesai.</p>`;
    const statusEl=$("#livePaymentStatus");await checkPaymentStatus(payment.order_number,statusEl);
    statusTimer=setInterval(()=>checkPaymentStatus(payment.order_number,statusEl),7000);
  }catch(err){
    $("#orderResult").hidden=false;
    $("#orderResult").innerHTML=`<b>Pesanan tersimpan, pembayaran belum siap</b><p>${safe(err.message)}</p><p>Jangan membuat pesanan baru berulang kali. Hubungi admin dengan nomor pesanan jika diperlukan.</p>`;
  }
  finally{btn.disabled=false;btn.innerHTML='Buat pesanan <span>→</span>';}
});
$("#year").textContent=new Date().getFullYear();loadProducts();
