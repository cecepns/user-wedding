import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";

const API_BASE = "https://api-inventory.isavralabel.com/user-wedding/api";

const VENDOR_COLOR_POOL = [
  "bg-green-600 text-white",
  "bg-sky-600 text-white",
  "bg-indigo-600 text-white",
  "bg-amber-700 text-white",
  "bg-purple-700 text-white",
  "bg-orange-600 text-white",
  "bg-emerald-700 text-white",
  "bg-rose-600 text-white",
  "bg-cyan-700 text-white",
];

const statusLabel = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
};

const normalizeCategory = (value) =>
  (value || "").toString().trim().toLowerCase();

const normalizeText = (value) =>
  (value || "").toString().trim().toLowerCase();

const AdminVendorCalendar = () => {
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [toppingVendorsMap, setToppingVendorsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const getVendorColorClass = (vendorKey) => {
    const key = (vendorKey || "").toString();
    if (!key) return "bg-gray-700 text-white";
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
      hash = (hash + key.charCodeAt(i) * (i + 1)) % 100000;
    }
    return VENDOR_COLOR_POOL[hash % VENDOR_COLOR_POOL.length];
  };

  const fetchVendorCalendar = async () => {
    setLoading(true);
    try {
      const [itemsRes, calendarRes] = await Promise.all([
        fetch(`${API_BASE}/items`),
        fetch(`${API_BASE}/vendor-calendar`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        }),
      ]);

      const itemsData = await itemsRes.json();
      const calendarData = await calendarRes.json();

      const toppingItems = Array.isArray(itemsData)
        ? itemsData.filter((item) => normalizeCategory(item?.category) === "topping")
        : [];

      const toppingMap = toppingItems.reduce((acc, item) => {
        const id = Number(item?.id);
        if (!Number.isFinite(id)) return acc;
        const key = `item_${id}`;
        acc[key] = {
          key,
          id,
          name: item?.name || `Item ${id}`,
          nameNormalized: normalizeText(item?.name),
        };
        return acc;
      }, {});

      const filteredEvents = (Array.isArray(calendarData?.events) ? calendarData.events : [])
        .filter((event) => {
          const key = (event?.vendor_key || "").toString();
          if (key && toppingMap[key]) return true;

          const eventVendorName = normalizeText(event?.vendor_name);
          if (!eventVendorName) return false;
          return Object.values(toppingMap).some(
            (vendor) => vendor.nameNormalized === eventVendorName
          );
        })
        .map((event) => {
          const key = (event?.vendor_key || "").toString();
          if (key && toppingMap[key]) return event;

          const eventVendorName = normalizeText(event?.vendor_name);
          const matchedByName = Object.values(toppingMap).find(
            (vendor) => vendor.nameNormalized === eventVendorName
          );
          if (!matchedByName) return event;

          return {
            ...event,
            vendor_key: matchedByName.key,
            vendor_name: matchedByName.name,
          };
        });

      setToppingVendorsMap(toppingMap);
      setEvents(filteredEvents);
    } catch (error) {
      console.error("Error fetching vendor calendar:", error);
      setToppingVendorsMap({});
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorCalendar();
  }, []);

  const monthlyEvents = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    return events.filter((event) => {
      const d = new Date(event.wedding_date);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [events, calendarMonth]);

  const eventsByDate = useMemo(() => {
    return monthlyEvents.reduce((acc, event) => {
      const d = new Date(event.wedding_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    }, {});
  }, [monthlyEvents]);

  const selectedDateEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];

  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startWeekday; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const changeMonth = (direction) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return next;
    });
    setSelectedDate(null);
  };

  return (
    <>
      <Helmet>
        <title>Kalender Vendor - Dashboard Admin</title>
      </Helmet>

      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Kalender Vendor</h1>
          <p className="text-gray-600">
            Jadwal topping vendor otomatis dari pesanan client.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Filter aktif: hanya item kategori TOPPING ({Object.keys(toppingVendorsMap).length} vendor aktif).
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Jadwal Vendor</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                title="Bulan sebelumnya"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {calendarMonth.toLocaleDateString("id-ID", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <button
                onClick={() => changeMonth(1)}
                className="p-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                title="Bulan berikutnya"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 bg-gray-50 text-xs font-semibold text-gray-600">
              {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
                <div key={day} className="px-2 py-2 text-center uppercase tracking-wide">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 text-sm">
              {loading ? (
                <div className="col-span-7 py-8 text-center text-gray-500">
                  Memuat jadwal vendor...
                </div>
              ) : (
                getCalendarDays().map((date, index) => {
                  if (!date) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="min-h-20 border border-gray-100 bg-gray-50"
                      />
                    );
                  }

                  const key = `${date.getFullYear()}-${String(
                    date.getMonth() + 1
                  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                  const eventsForDay = eventsByDate[key] || [];
                  const vendorsForDay = [...new Set(eventsForDay.map((e) => e.vendor_key))];
                  const isSelected = selectedDate === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDate(key)}
                      className={`min-h-20 border border-gray-100 p-1 text-left align-top ${
                        vendorsForDay.length > 0 ? "bg-blue-50" : "bg-white"
                      } ${isSelected ? "ring-2 ring-primary-500 z-10" : ""}`}
                    >
                      <div className="text-sm text-blue-700 font-medium mb-1 text-center">
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {vendorsForDay.slice(0, 3).map((vendorKey) => {
                          const vendorEvent = eventsForDay.find((e) => e.vendor_key === vendorKey);
                          const colorClass = getVendorColorClass(vendorKey);
                          return (
                            <span
                              key={vendorKey}
                              className={`block w-full rounded px-2 py-0.5 text-[10px] font-semibold truncate ${colorClass}`}
                            >
                              {vendorEvent?.vendor_name || vendorKey}
                            </span>
                          );
                        })}
                        {vendorsForDay.length > 3 && (
                          <span className="block text-[10px] text-gray-600 text-center">
                            +{vendorsForDay.length - 3} vendor
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {selectedDate && (
          <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Detail Vendor{" "}
                {new Date(selectedDate).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-sm font-medium text-blue-700 hover:text-blue-900"
              >
                Tutup detail
              </button>
            </div>

            {selectedDateEvents.length === 0 ? (
              <p className="text-sm text-gray-500">Tidak ada jadwal vendor di tanggal ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Vendor</th>
                      <th className="px-4 py-2 text-left">Client</th>
                      <th className="px-4 py-2 text-left">Kontak</th>
                      <th className="px-4 py-2 text-left">Sumber</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDateEvents.map((event, idx) => (
                      <tr key={`${event.event_type}-${event.source_id}-${event.vendor_key}-${idx}`} className="border-t border-gray-100">
                        <td className="px-4 py-2">
                          <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${getVendorColorClass(event.vendor_key)}`}>
                            {event.vendor_name}
                          </span>
                        </td>
                        <td className="px-4 py-2">{event.client_name || "-"}</td>
                        <td className="px-4 py-2">
                          <div>{event.client_phone || "-"}</div>
                          <div className="text-xs text-gray-500">{event.client_email || "-"}</div>
                        </td>
                        <td className="px-4 py-2">
                          {event.event_type === "custom_request" ? "Custom Request" : "Order"} #{event.source_id}
                        </td>
                        <td className="px-4 py-2">{statusLabel[event.status] || event.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </AdminLayout>
    </>
  );
};

export default AdminVendorCalendar;
