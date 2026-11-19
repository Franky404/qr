import { supabaseAdmin, cors, json, fail } from "./_lib.js";

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== "GET") return fail(res, 405, "Method not allowed");
  const order_number = String(req.query?.order_number || "").trim();
  if (!order_number) return fail(res, 400, "Nomor pesanan wajib diisi.");
  try {
    const db = supabaseAdmin();
    const { data, error } = await db.from("orders").select("order_number,status,paid_at")
      .eq("order_number", order_number).single();
    if (error || !data) return fail(res, 404, "Pesanan tidak ditemukan.");
    return json(res, 200, data);
  } catch (error) {
    console.error("Payment status error:", error);
    return fail(res, 500, "Tidak dapat memeriksa status pembayaran.");
  }
}
