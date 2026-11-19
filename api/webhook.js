import { createHash, timingSafeEqual } from "node:crypto";
import { supabaseAdmin, json, fail } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "Method not allowed");
  try {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) return fail(res, 500, "Webhook belum dikonfigurasi.");

    const body = req.body || {};
    const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status, transaction_id, currency } = body;
    if (!order_id || !status_code || !gross_amount || !signature_key) return fail(res, 400, "Notifikasi tidak lengkap.");

    const expected = createHash("sha512").update(`${order_id}${status_code}${gross_amount}${serverKey}`).digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(String(signature_key), "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return fail(res, 401, "Signature Midtrans tidak valid.");
    if (currency && currency !== "IDR") return fail(res, 400, "Mata uang transaksi tidak sesuai.");

    const db = supabaseAdmin();
    const { data: order, error } = await db.from("orders").select("id,total,status,provider_reference")
      .eq("order_number", order_id).single();
    if (error || !order) return fail(res, 404, "Pesanan tidak ditemukan.");
    if (Number(gross_amount) !== Number(order.total)) return fail(res, 400, "Nominal pembayaran tidak sesuai.");

    let nextStatus = null;
    if ((transaction_status === "settlement" || transaction_status === "capture") && (!fraud_status || fraud_status === "accept")) nextStatus = "paid";
    else if (transaction_status === "expire") nextStatus = "expired";
    else if (transaction_status === "deny" || transaction_status === "cancel") nextStatus = "failed";

    if (nextStatus && order.status === "pending") {
      const update = { status: nextStatus };
      if (transaction_id) update.provider_reference = transaction_id;
      if (nextStatus === "paid") update.paid_at = new Date().toISOString();
      const { error: updateError } = await db.from("orders").update(update).eq("id", order.id).eq("status", "pending");
      if (updateError) throw updateError;
    }
    return json(res, 200, { received: true });
  } catch (error) {
    console.error("Midtrans webhook error:", error);
    return fail(res, 500, "Gagal memproses notifikasi pembayaran.");
  }
}
