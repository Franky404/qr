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
let products = [], activeCategory = "Semua", selected = null;
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
  $("#products").innerHTML=list.length?list.map(p=>`<article class="product-card"><div class="product-icon">${"◈"}</div><span class="product-category">${safe(p.category)}</span><h3>${safe(p.name)}</h3><p>${safe(p.description||"Produk konter digital")}</p><div class="product-bottom"><strong>${rupiah(p.price)}</strong><button class="add-button" data-id="${safe(p.id)}" aria-label="Pesan ${safe(p.name)}">+</button></div></article>`).join(""):'<div class="empty-state">Produk tidak ditemukan. Coba kata kunci lain.</div>';
  document.querySelectorAll(".add-button").forEach(b=>b.addEventListener("click",()=>openOrder(b.dataset.id)));
}
function openOrder(id){selected=products.find(p=>String(p.id)===String(id));if(!selected)return;$("#selectedProduct").innerHTML=`<div><b>${safe(selected.name)}</b><small>${safe(selected.category)}</small></div><strong>${rupiah(selected.price)}</strong>`;$("#orderForm").hidden=false;$("#orderResult").hidden=true;$("#orderModal").hidden=false;}
$("#closeModal").onclick=()=>$("#orderModal").hidden=true;
$("#orderModal").addEventListener("click",e=>{if(e.target.id==="orderModal")$("#orderModal").hidden=true;});
$("#search").addEventListener("input",renderProducts);
$("#filters").addEventListener("click",e=>{const b=e.target.closest("button[data-category]");if(!b)return;activeCategory=b.dataset.category;document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));renderProducts();});
$("#orderForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!selected)return;
  const f=new FormData(e.currentTarget), payload={product_id:selected.id,customer_name:f.get("customer_name").trim(),phone:f.get("phone").trim(),destination:f.get("destination").trim()};
  const btn=e.currentTarget.querySelector("button");btn.disabled=true;btn.textContent="Memproses…";
  try{
    if(!apiBase||apiBase.includes("YOUR-VERCEL"))throw new Error("Backend belum dikonfigurasi. Pesanan belum dikirim.");
    const r=await fetch(`${apiBase}/api/orders`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await r.json();if(!r.ok)throw new Error(data.error||"Gagal membuat pesanan.");
    $("#orderForm").hidden=true;$("#orderResult").hidden=false;$("#orderResult").innerHTML=`<b>Pesanan berhasil dibuat</b><p>Nomor pesanan: <strong>${safe(data.order_number)}</strong></p><p>Status: MENUNGGU PEMBAYARAN</p><p>${safe(data.message||"Silakan tunggu instruksi pembayaran dari admin.")}</p>`;
  }catch(err){toast(err.message);}
  finally{btn.disabled=false;btn.innerHTML='Buat pesanan <span>→</span>';}
});
$("#year").textContent=new Date().getFullYear();loadProducts();
