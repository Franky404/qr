import { supabaseAdmin, cors, json, fail } from "./_lib.js";

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== "POST") return fail(res, 405, "Method not allowed");

  try {
    const { order_id } = req.body || {};
    if (!order_id || typeof order_id !== "string") return fail(res, 400, "ID pesanan tidak valid.");

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) return fail(res, 500, "MIDTRANS_SERVER_KEY belum diatur di Vercel.");
    const production = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const baseUrl = production ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
    const db = supabaseAdmin();

    const { data: order, error } = await db.from("orders")
      .select("id,order_number,customer_name,phone,total,status,provider_reference,payment_qr_url,payment_expires_at")
      .eq("id", order_id).single();
    if (error || !order) return fail(res, 404, "Pesanan tidak ditemukan.");
    if (order.status !== "pending") return fail(res, 409, "Pesanan ini tidak lagi menunggu pembayaran.");

    // Reuse an existing QR when the customer retries the request.
    if (order.provider_reference && order.payment_qr_url) {
      return json(res, 200, { order_number: order.order_number, total: order.total, qr_url: order.payment_qr_url, expires_at: order.payment_expires_at });
    }

    const auth = Buffer.from(`${serverKey}:`).toString("base64");
    const response = await fetch(`${baseUrl}/v2/charge`, {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": `Basic ${auth}` },
      body: JSON.stringify({
        payment_type: "qris",
        transaction_details: { order_id: order.order_number, gross_amount: order.total },
        qris: { acquirer: "gopay" },
        customer_details: { first_name: order.customer_name, phone: order.phone }
      })
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Midtrans charge error:", result);
      return fail(res, 502, result.status_message || "Midtrans gagal membuat QRIS. Periksa konfigurasi Sandbox.");
    }

    const qrAction = (result.actions || []).find(action => action.name === "generate-qr-code");
    if (!qrAction?.url || !result.transaction_id) {
      console.error("Unexpected Midtrans response:", result);
      return fail(res, 502, "Midtrans tidak mengirim alamat QRIS yang diperlukan.");
    }

    const expiresAt = result.expiry_time || null;
    const { error: updateError } = await db.from("orders").update({
      provider_reference: result.transaction_id,
      payment_qr_url: qrAction.url,
      payment_expires_at: expiresAt,
      payment_provider: "midtrans_qris"
    }).eq("id", order.id).eq("status", "pending");
    if (updateError) throw updateError;

    return json(res, 200, { order_number: order.order_number, total: order.total, qr_url: qrAction.url, expires_at: expiresAt });
  } catch (error) {
    console.error("Create payment error:", error);
    return fail(res, 500, "Tidak dapat menyiapkan pembayaran QRIS.");
  }
}
