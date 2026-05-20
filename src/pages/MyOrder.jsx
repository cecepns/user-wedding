import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { formatRupiah } from "../utils/formatters";
import { imageUrl } from "../utils/imageUrl";

const API_BASE = "https://api.kingcreativestudio.my.id/user-wedding/api";

const toNumber = (value) => {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};
const normalizeName = (value) =>
  (value || "")
    .toString()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
const getMasterItemId = (item) => {
  const id = Number(item?.item_id ?? item?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
};
const getItemIdentityKey = (item) => {
  const masterId = getMasterItemId(item);
  if (masterId) return `id:${masterId}`;
  const name = normalizeName(item?.name || item?.item_name || item?.title);
  return name ? `name:${name}` : "";
};

/** Untuk <input type="date">: ambil Y-M-D di zona waktu lokal, bukan prefix string ISO (UTC) yang sering mundur 1 hari. */
const weddingDateToInputValue = (value) => {
  if (value == null || value === "") return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return String(value).slice(0, 10);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const MyOrder = () => {
  const [invoiceId, setInvoiceId] = useState("");
  const [lookupPhone, setLookupPhone] = useState("");
  const [order, setOrder] = useState(null);
  const [orderSource, setOrderSource] = useState("order");
  const [serviceItems, setServiceItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [lockedSelectedKeys, setLockedSelectedKeys] = useState(new Set());
  const [customServices, setCustomServices] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    wedding_date: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalAmount = useMemo(() => {
    if (!order) return 0;
    if (orderSource === "custom_request") {
      return toNumber(order.total_amount);
    }
    const basePrice = toNumber(order.base_price);
    const extras = selectedItems.reduce(
      (sum, item) => sum + toNumber(item.final_price),
      0
    );
    return basePrice + extras;
  }, [order, selectedItems, orderSource]);

  const hydrateOrderForm = (orderData, source = "order") => {
    setOrderSource(source);
    setOrder(orderData);
    setFormData({
      name: orderData?.name || "",
      email: orderData?.email || "",
      phone: orderData?.phone || "",
      address: orderData?.address || "",
      wedding_date: orderData?.wedding_date
        ? weddingDateToInputValue(orderData.wedding_date)
        : "",
      notes: source === "custom_request" ? orderData?.additional_requests || "" : orderData?.notes || "",
    });
    setCustomServices(source === "custom_request" ? orderData?.services || "" : "");
    const normalizedSelected = (Array.isArray(orderData?.selected_items) ? orderData.selected_items : []).map(
      (item) => ({
        ...item,
        final_price: toNumber(item?.final_price ?? item?.item_price ?? item?.price ?? item?.custom_price ?? 0),
      })
    );
    setSelectedItems(normalizedSelected);
    setLockedSelectedKeys(
      new Set(
        normalizedSelected
          .map((item) => getItemIdentityKey(item))
          .filter(Boolean)
      )
    );
  };

  const parseInvoiceInput = (value) => {
    const raw = String(value || "").trim();
    const normalized = raw.toLowerCase();
    if (!raw) return { id: "", sourceHint: null };
    if (normalized.startsWith("custom:")) {
      return { id: raw.split(":")[1]?.trim() || "", sourceHint: "custom_request" };
    }
    if (/^c\d+$/i.test(raw)) {
      return { id: raw.slice(1), sourceHint: "custom_request" };
    }
    return { id: raw, sourceHint: "order" };
  };

  const loadOrder = async () => {
    const { id, sourceHint } = parseInvoiceInput(invoiceId);
    const phone = lookupPhone.trim();
    if (!id || !phone) {
      toast.error("Masukkan nomor invoice/pesanan dan nomor HP");
      return;
    }

    setLoading(true);
    try {
      const tryFetchOrder = async () => {
        const response = await fetch(
          `${API_BASE}/orders/public/${encodeURIComponent(id)}?phone=${encodeURIComponent(phone)}`
        );
        const data = await response.json();
        return { response, data, source: "order" };
      };
      const tryFetchCustom = async () => {
        const response = await fetch(
          `${API_BASE}/custom-requests/public/${encodeURIComponent(id)}?phone=${encodeURIComponent(phone)}`
        );
        const data = await response.json();
        return { response, data, source: "custom_request" };
      };

      let lookupResult;
      if (sourceHint === "custom_request") {
        lookupResult = await tryFetchCustom();
      } else {
        lookupResult = await tryFetchOrder();
        if (!lookupResult.response.ok) {
          const fallback = await tryFetchCustom();
          if (fallback.response.ok) {
            lookupResult = fallback;
          }
        }
      }

      if (!lookupResult.response.ok) {
        throw new Error(lookupResult.data?.message || "Pesanan tidak ditemukan");
      }

      hydrateOrderForm(lookupResult.data, lookupResult.source);

      if (lookupResult.source === "order" && lookupResult.data?.service_id) {
        const itemsRes = await fetch(`${API_BASE}/services/${lookupResult.data.service_id}/items`);
        const itemsData = await itemsRes.json();
        setServiceItems(Array.isArray(itemsData) ? itemsData : []);
      } else {
        setServiceItems([]);
      }
    } catch (error) {
      setOrder(null);
      setServiceItems([]);
      setSelectedItems([]);
      toast.error(error.message || "Gagal memuat pesanan");
    } finally {
      setLoading(false);
    }
  };

  const isSameItem = (a, b) => {
    const masterIdA = getMasterItemId(a);
    const masterIdB = getMasterItemId(b);
    if (masterIdA && masterIdB && masterIdA === masterIdB) return true;

    const nameA = normalizeName(a?.name || a?.item_name || a?.title);
    const nameB = normalizeName(b?.name || b?.item_name || b?.title);
    return Boolean(nameA && nameB && nameA === nameB);
  };

  const isSelected = (serviceItem) =>
    selectedItems.some((item) => isSameItem(item, serviceItem));
  const isLockedSelected = (serviceItem) => {
    const key = getItemIdentityKey(serviceItem);
    return Boolean(key && lockedSelectedKeys.has(key));
  };

  const displayItems = useMemo(() => {
    const merged = [...serviceItems];
    selectedItems.forEach((selectedItem) => {
      const exists = merged.some((item) => isSameItem(item, selectedItem));
      if (!exists) {
        merged.push({ ...selectedItem, _fromSelectedOnly: true });
      }
    });
    return merged;
  }, [serviceItems, selectedItems]);

  const toggleItem = (serviceItem) => {
    setSelectedItems((prev) => {
      const exists = prev.some((item) => isSameItem(item, serviceItem));
      if (exists) {
        return prev.filter((item) => !isSameItem(item, serviceItem));
      }
      return [
        ...prev,
        {
          id: serviceItem.id,
          item_id: serviceItem.item_id,
          name: serviceItem.name || serviceItem.item_name,
          item_name: serviceItem.name || serviceItem.item_name,
          final_price: toNumber(
            serviceItem.final_price ?? serviceItem.custom_price ?? serviceItem.item_price ?? serviceItem.price ?? 0
          ),
        },
      ];
    });
  };

  const handleSave = async () => {
    if (!order) return;
    if (!lookupPhone.trim()) {
      toast.error("Nomor HP verifikasi wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const isCustomOrder = orderSource === "custom_request";
      const endpoint = isCustomOrder
        ? `${API_BASE}/custom-requests/public/${order.id}`
        : `${API_BASE}/orders/public/${order.id}`;
      const payload = isCustomOrder
        ? {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            wedding_date: formData.wedding_date,
            services: customServices,
            additional_requests: formData.notes,
            verification_phone: lookupPhone.trim(),
          }
        : {
            ...formData,
            selected_items: selectedItems,
            verification_phone: lookupPhone.trim(),
          };

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Gagal menyimpan pesanan");
      }

      const refreshEndpoint = isCustomOrder
        ? `${API_BASE}/custom-requests/public/${order.id}?phone=${encodeURIComponent(lookupPhone.trim())}`
        : `${API_BASE}/orders/public/${order.id}?phone=${encodeURIComponent(lookupPhone.trim())}`;
      const refreshed = await fetch(
        refreshEndpoint
      );
      const refreshedData = await refreshed.json();
      if (refreshed.ok) {
        hydrateOrderForm(refreshedData, isCustomOrder ? "custom_request" : "order");
      }
      toast.success("Pesanan berhasil diperbarui");
    } catch (error) {
      toast.error(error.message || "Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Pesanan Saya - User Wedding Organizer</title>
      </Helmet>

      <section className="pt-28 pb-16 bg-[#f0f8ff] min-h-screen">
        <div className="container-custom">
          <div className="max-w-6xl mx-auto px-4 md:px-0">
            <h1 className="text-3xl font-bold text-[#2f4274] mb-2">Pesanan Saya</h1>
            <p className="text-[#4a5f95] mb-6">
              Cek dan edit pesanan Anda dengan nomor invoice/pesanan.
            </p>

            <div className="bg-white rounded-2xl border border-[#d7e3ff] shadow-lg p-4 md:p-6 mb-6">
              <label className="block text-sm font-medium text-[#2f4274] mb-2">
                Nomor Invoice / ID Pesanan
              </label>
              <div className="grid md:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  placeholder="Contoh: 123"
                  className="flex-1 rounded-lg border border-[#c9d7f5] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="text"
                  value={lookupPhone}
                  onChange={(e) => setLookupPhone(e.target.value)}
                  placeholder="Nomor HP sesuai pesanan"
                  className="flex-1 rounded-lg border border-[#c9d7f5] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={loadOrder}
                  disabled={loading}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {loading ? "Mencari..." : "Cari"}
                </button>
              </div>
            </div>

            {order && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-[#d7e3ff] shadow-lg p-4 md:p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-[#2f4274]">
                    Detail Pesanan #{order.id}
                  </h2>
                  <div>
                    <label className="block text-sm text-[#4a5f95] mb-1">Nama</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      className="w-full rounded-lg border border-[#c9d7f5] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#4a5f95] mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      className="w-full rounded-lg border border-[#c9d7f5] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#4a5f95] mb-1">No. HP</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full rounded-lg border border-[#c9d7f5] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#4a5f95] mb-1">Alamat</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-[#c9d7f5] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#4a5f95] mb-1">Tanggal Acara</label>
                    <input
                      type="date"
                      value={formData.wedding_date}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, wedding_date: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[#c9d7f5] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#4a5f95] mb-1">Catatan</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-[#c9d7f5] px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#d7e3ff] shadow-lg p-4 md:p-6">
                  {order?.service_image && (
                    <div className="mb-4">
                      <img
                        src={imageUrl(order.service_image)}
                        alt={order.service_name || "Layanan"}
                        className="h-64 w-full rounded-lg object-cover border border-gray-200"
                      />
                    </div>
                  )}
                  <h2 className="text-lg font-semibold text-[#2f4274] mb-3">
                    {orderSource === "custom_request"
                      ? "Rincian Layanan Custom"
                      : `Item Tambahan (${order.service_name || "Layanan"})`}
                  </h2>
                  {orderSource === "custom_request" ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-[#4a5f95] mb-1">Layanan Custom</label>
                        <textarea
                          value={customServices}
                          onChange={(e) => setCustomServices(e.target.value)}
                          rows={4}
                          className="w-full rounded-lg border border-[#c9d7f5] px-3 py-2 text-sm"
                          placeholder="Contoh: Dekorasi premium, Catering 500 pax, Dokumentasi"
                        />
                      </div>
                      <div className="pt-4 border-t border-gray-200 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total booking</span>
                          <span className="font-medium">{formatRupiah(toNumber(order.booking_amount))}</span>
                        </div>
                      </div>
                    </div>
                  ) : displayItems.length === 0 ? (
                    <p className="text-sm text-gray-500">Item tambahan tidak tersedia.</p>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-[380px] overflow-auto pr-1">
                        {displayItems.map((item, index) => {
                          const active = isSelected(item);
                          const locked = active && isLockedSelected(item);
                          const unitPrice = toNumber(
                            item.final_price ?? item.custom_price ?? item.item_price ?? item.price ?? 0
                          );
                          return (
                            <div
                              key={`${item.id ?? item.item_id ?? item.name ?? "item"}-${index}`}
                              className={`rounded-lg border p-3 ${
                                active ? "border-primary-300 bg-primary-50" : "border-gray-200"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                                  <p className="text-xs text-gray-600">{formatRupiah(unitPrice)}</p>
                                  {item._fromSelectedOnly && (
                                    <p className="text-[11px] text-amber-700 mt-1">
                                      Item lama (tidak ada di daftar layanan saat ini)
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleItem(item)}
                                  disabled={locked}
                                  className={`text-xs font-semibold px-2 py-1 rounded ${
                                    locked
                                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                      : active
                                      ? "bg-red-100 text-red-700"
                                      : "bg-green-100 text-green-700"
                                  }`}
                                >
                                  {locked ? "Sudah dipilih" : active ? "Batalkan" : "Tambah"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Harga layanan</span>
                          <span className="font-medium">{formatRupiah(totalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total booking</span>
                          <span className="font-medium">{formatRupiah(toNumber(order.booking_amount))}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold text-[#2f4274] pt-1">
                          <span>Pelunasan</span>
                          <span>
                            {formatRupiah(
                              Math.max(0, totalAmount - toNumber(order.booking_amount))
                            )}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-5 w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan Perubahan Pesanan"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default MyOrder;
