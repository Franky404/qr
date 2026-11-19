const cfg=window.KONTER_CONFIG||{};
const ready=!!(cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_URL.includes("YOUR_"));
const db=ready?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
const $=s=>document.querySelector(s), money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
function toast(s){const e=$("#toast");e.textContent=s;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2600);}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function currentProfile(){
 if(!db)return null;const {data:{user}}=await db.auth.getUser();if(!user)return null;
 const {data}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();return data?.role==="admin"?user:null;
}
async function showState(){
 const user=await currentProfile();$("#loginPanel").hidden=!!user;$("#dashboard").hidden=!user;if(user)await refreshAll();
}
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();if(!db){toast("Konfigurasi Supabase belum diisi.");return;}const f=new FormData(e.currentTarget);const {error}=await db.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});if(error){toast(error.message);return;}await showState();});
$("#logoutBtn").onclick=async()=>{await db.auth.signOut();showState();};
async function refreshAll(){await Promise.all([loadProducts(),loadOrders()]);}
async function loadProducts(){const {data,error}=await db.from("products").select("*").order("created_at",{ascending:false});if(error){toast(error.message);return;}$("#adminProducts").innerHTML=(data||[]).map(p=>`<tr><td><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.category)}</small></td><td>${money(p.price)}</td><td><button class="delete-button" data-id="${p.id}">Hapus</button></td></tr>`).join("")||'<tr><td colspan="3">Belum ada produk.</td></tr>';document.querySelectorAll(".delete-button").forEach(b=>b.onclick=()=>deleteProduct(b.dataset.id));}
async function loadOrders(){const {data,error}=await db.from("orders").select("id,order_number,customer_name,phone,total,status,created_at").order("created_at",{ascending:false}).limit(30);if(error){toast(error.message);return;}const rows=data||[];$("#totalOrders").textContent=rows.length;$("#pendingOrders").textContent=rows.filter(x=>x.status==="pending").length;$("#paidOrders").textContent=rows.filter(x=>x.status==="paid").length;$("#adminOrders").innerHTML=rows.map(o=>`<article class="order-row"><div><b>${escapeHtml(o.order_number)}</b><small>${escapeHtml(o.customer_name)} · ${escapeHtml(o.phone)}</small></div><div class="order-meta"><b>${money(o.total)}</b><span class="status status-${o.status}">${escapeHtml(o.status)}</span></div></article>`).join("")||"Belum ada pesanan.";}
async function deleteProduct(id){if(!confirm("Hapus produk ini?"))return;const {error}=await db.from("products").delete().eq("id",id);if(error)toast(error.message);else{toast("Produk dihapus.");loadProducts();}}
$("#productForm").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const row={name:f.get("name").trim(),category:f.get("category"),price:Number(f.get("price")),description:f.get("description").trim(),active:true};const {error}=await db.from("products").insert(row);if(error)toast(error.message);else{e.currentTarget.reset();toast("Produk tersimpan.");loadProducts();}});
$("#refreshOrders").onclick=loadOrders;
if(!ready){$("#loginPanel").querySelector(".notice").textContent="Isi URL dan anon key Supabase di config.js terlebih dahulu. Buat akun admin di Supabase Auth, lalu tetapkan role admin pada profiles.";}
showState();
