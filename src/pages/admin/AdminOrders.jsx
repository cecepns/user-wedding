import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Eye, Trash2, ChevronLeft, ChevronRight, X, Edit, Download } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import AdminLayout from "../../components/AdminLayout";
import { formatRupiah, formatDate, formatDateTime } from "../../utils/formatters";
import jsPDF from "jspdf";

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [ordersPagination, setOrdersPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newBookingAmount, setNewBookingAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBankSelectionModal, setShowBankSelectionModal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedBankMethod, setSelectedBankMethod] = useState(null);
  const [pendingInvoiceItem, setPendingInvoiceItem] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarOrders, setCalendarOrders] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [tableFilteredOrders, setTableFilteredOrders] = useState(null);

  useEffect(() => {
    // Intentionally only depend on page to avoid ref changes of fetchOrders
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersPagination.page]);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    fetchCalendarOrders(calendarMonth);
  }, [calendarMonth]);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch(
        "https://api-inventory.isavralabel.com/user-wedding/api/payment-methods"
      );
      const data = await response.json();
      setPaymentMethods(data);
      if (data.length > 0) {
        setSelectedBankMethod(data[0]);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api-inventory.isavralabel.com/user-wedding/api/orders?page=${ordersPagination.page}&limit=${ordersPagination.limit}&status=pending`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        }
      );
      const data = await response.json();

      // Handle both old format (array) and new format (object with pagination)
      if (Array.isArray(data)) {
        // Old format - no pagination
        setOrders(data);
        setOrdersPagination((prev) => ({
          ...prev,
          total: data.length,
          totalPages: 1,
        }));
      } else {
        // New format - with pagination
        setOrders(data.orders || []);
        setOrdersPagination((prev) => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 1,
        }));
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
      setOrdersPagination((prev) => ({
        ...prev,
        total: 0,
        totalPages: 1,
      }));
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarOrders = async (monthDate) => {
    setCalendarLoading(true);
    try {
      const response = await fetch(
        `https://api-inventory.isavralabel.com/user-wedding/api/orders?page=1&limit=5000&status=pending`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        }
      );
      const data = await response.json();

      const allOrders = Array.isArray(data) ? data : data.orders || [];

      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();

      const filtered = allOrders.filter((order) => {
        const rawDate = order.wedding_date;
        if (!rawDate) return false;
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === year && d.getMonth() === month;
      });

      setCalendarOrders(filtered);
      setSelectedDate(null);
    } catch (error) {
      console.error("Error fetching calendar orders:", error);
      setCalendarOrders([]);
      setSelectedDate(null);
    } finally {
      setCalendarLoading(false);
    }
  };


  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const response = await fetch(
        `https://api-inventory.isavralabel.com/user-wedding/api/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        // Optimistic update: hapus order yang sudah bukan pending dari semua list lokal
        setOrders((prev) => prev.filter((order) => order.id !== orderId));
        setCalendarOrders((prev) =>
          prev.filter((order) => order.id !== orderId)
        );
        setTableFilteredOrders((prev) =>
          Array.isArray(prev)
            ? prev.filter((order) => order.id !== orderId)
            : prev
        );

        // Refetch untuk sinkron dengan server & filter status=pending
        fetchOrders();
        fetchCalendarOrders(calendarMonth);
        toast.success("Status pesanan berhasil diperbarui!");
      } else {
        toast.error("Error memperbarui status pesanan");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error memperbarui status pesanan");
    }
  };


  const handleDeleteOrder = async (orderId) => {
    const confirmed = await new Promise((resolve) => {
      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <span>Apakah Anda yakin ingin menghapus pesanan ini?</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(true);
                }}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Ya
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(false);
                }}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
              >
                Tidak
              </button>
            </div>
          </div>
        ),
        {
          duration: Infinity,
          position: "top-center",
        }
      );
    });

    if (!confirmed) return;

    try {
      const response = await fetch(
        `https://api-inventory.isavralabel.com/user-wedding/api/orders/${orderId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        }
      );

      if (response.ok) {
        // Optimistic update: hapus order dari semua list lokal
        setOrders((prev) => prev.filter((order) => order.id !== orderId));
        setCalendarOrders((prev) =>
          prev.filter((order) => order.id !== orderId)
        );
        setTableFilteredOrders((prev) =>
          Array.isArray(prev)
            ? prev.filter((order) => order.id !== orderId)
            : prev
        );

        // Tutup modal detail jika order yang dihapus sedang dilihat
        if (selectedOrder && selectedOrder.id === orderId) {
          setShowDetailModal(false);
          setSelectedOrder(null);
        }

        // Refetch untuk sinkron dengan server
        fetchOrders();
        fetchCalendarOrders(calendarMonth);
        toast.success("Pesanan berhasil dihapus!");
      } else {
        toast.error("Error menghapus pesanan");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error menghapus pesanan");
    }
  };

  const handleViewDetail = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleOrdersPageChange = (newPage) => {
    setOrdersPagination((prev) => ({ ...prev, page: newPage }));
  };

  const getPaginationPages = (currentPage, totalPages) => {
    if (totalPages <= 7) {
      // Jika total halaman <= 7, tampilkan semua
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const showEllipsis = totalPages > 7;

    if (currentPage <= 3) {
      // Dekat dengan awal: 1 2 3 ... last-1 last
      pages.push(1, 2, 3);
      if (showEllipsis) pages.push("ellipsis");
      pages.push(totalPages - 1, totalPages);
    } else if (currentPage >= totalPages - 2) {
      // Dekat dengan akhir: 1 2 ... last-2 last-1 last
      pages.push(1, 2);
      if (showEllipsis) pages.push("ellipsis");
      pages.push(totalPages - 2, totalPages - 1, totalPages);
    } else {
      // Di tengah: 1 ... current-1 current current+1 ... last
      pages.push(1);
      if (showEllipsis) pages.push("ellipsis");
      pages.push(currentPage - 1, currentPage, currentPage + 1);
      if (showEllipsis) pages.push("ellipsis");
      pages.push(totalPages);
    }

    return pages;
  };

  const changeCalendarMonth = (direction) => {
    setCalendarMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startWeekday = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)

    const days = [];

    // Leading empty cells for first week
    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }

    // Actual days of month
    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  const bookingsByDate = calendarOrders.reduce((acc, order) => {
    const rawDate = order.wedding_date;
    if (!rawDate) return acc;

    const dateObj = new Date(rawDate);
    if (isNaN(dateObj.getTime())) return acc;

    const y = dateObj.getFullYear();
    const m = dateObj.getMonth() + 1;
    const d = dateObj.getDate();
    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    if (!acc[key]) acc[key] = [];
    acc[key].push(order);
    return acc;
  }, {});

  const handleFilterTableBySelectedDate = (dateKey) => {
    if (!dateKey) return;
    const ordersForDate = bookingsByDate[dateKey] || [];
    setTableFilteredOrders(ordersForDate);
  };

  const handleClearTableFilter = () => {
    setTableFilteredOrders(null);
  };

  const tableOrders = tableFilteredOrders ?? orders;


  const handleEditBookingAmount = (item) => {
    setEditingItem(item);
    setNewBookingAmount(item.booking_amount?.toString() || "");
    setShowEditBookingModal(true);
  };

  const handleUpdateBookingAmount = async () => {
    if (!newBookingAmount || isNaN(parseFloat(newBookingAmount))) {
      toast.error("Masukkan jumlah booking yang valid");
      return;
    }

    try {
      const response = await fetch(
        `https://api-inventory.isavralabel.com/user-wedding/api/orders/${editingItem.id}/booking-amount`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
          body: JSON.stringify({
            booking_amount: parseFloat(newBookingAmount),
          }),
        }
      );

      if (response.ok) {
        fetchOrders();
        toast.success("Booking amount berhasil diperbarui!");
        setShowEditBookingModal(false);
        setEditingItem(null);
        setNewBookingAmount("");
      } else {
        toast.error("Error memperbarui booking amount");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error memperbarui booking amount");
    }
  };

  const handleGenerateInvoice = (item) => {
    setPendingInvoiceItem(item);
    setShowBankSelectionModal(true);
  };

  const generateInvoicePDF = (item, selectedBank = null) => {
    const doc = new jsPDF();

    // Hitung lebar halaman dan margin
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // Get current domain for website URL
    const currentDomain = window.location.origin;

    // ===== PAGE 1 =====
    // Company header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("User Wedding Organizer", 20, 20);

    // Company details
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Jl. Raya panongan Kec. Panongan Kab. Tangerang Provinsi Banten",
      20,
      30
    );
    doc.text("Telephone: 089646829459", 20, 37);
    doc.text("Email: edo19priyatno@gmail.com", 20, 44);
    doc.text(`Website: ${currentDomain}`, 20, 51);

    // Invoice details (right side)
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 150, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`No. Invoice: ${item.id || "N/A"}`, 150, 30);
    doc.text(
      `Tanggal Invoice: ${new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}`,
      150,
      37
    );
    const eventDate = item.wedding_date;
    doc.text(`Jatuh Tempo: ${eventDate ? formatDateTime(eventDate) : '-'}`, 150, 44);

    // Bill To section
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Kepada :", 20, 60);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(item.name, 20, 67);
    doc.text(item.email, 20, 74);
    doc.text(item.phone, 20, 81);

    // Handle address with text wrapping to prevent breaking
    let addressY = 88;

    if (item.address) {
      // Use actual usable width (page width minus margins)
      const actualUsableWidth = pageWidth - (margin * 2);
      doc.text(item.address, margin, addressY, { maxWidth: actualUsableWidth });

      // Hitung tinggi teks untuk spacing yang tepat
      const addressHeight = doc.getTextDimensions(item.address, {
        maxWidth: actualUsableWidth,
      }).h;
      addressY += addressHeight + 5;
    }

    // Service table header - adjust based on address length
    const startY = item.address ? addressY + 8 : 110;
    doc.setFillColor(52, 152, 219); // Blue background
    doc.rect(20, startY, 170, 8, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255); // White text
    doc.text("No.", 25, startY + 6);
    doc.text("Deskripsi", 40, startY + 6);
    doc.text("Jml", 140, startY + 6);
    doc.text("Harga", 170, startY + 6);

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Service items
    let currentY = startY + 15;
    let itemNumber = 1;

    // Main service item (base price)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(itemNumber.toString(), 25, currentY);
    doc.text(item.service_name, 40, currentY);
    doc.text("1", 140, currentY);
    doc.text(formatRupiah(item.base_price || 0), 170, currentY);

    // Selected items as sub-items
    if (item.selected_items) {
      try {
        const selectedItems = JSON.parse(item.selected_items);
        if (Array.isArray(selectedItems) && selectedItems.length > 0) {
          currentY += 8;
          selectedItems.forEach((selectedItem) => {
            const itemName =
              selectedItem.name ||
              selectedItem.item_name ||
              selectedItem.title ||
              "Item tidak dikenal";
            const itemPrice =
              selectedItem.final_price ||
              selectedItem.item_price ||
              selectedItem.price ||
              selectedItem.custom_price ||
              0;

            const quantity = selectedItem.quantity || 1;
            const subtotal = (typeof itemPrice === 'number' ? itemPrice : parseFloat(itemPrice) || 0) * quantity;
            
            doc.setFontSize(8);
            doc.text(`  ${itemName}`, 40, currentY);
            doc.text(quantity.toString(), 140, currentY);
            doc.text(formatRupiah(subtotal), 170, currentY);
            currentY += 5;
          });
        }
      } catch (error) {
        console.error("Error parsing selected items:", error);
      }
    }

    // Add total service row
    currentY += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("", 25, currentY); // Empty serial number
    doc.text("Total Harga Layanan:", 40, currentY);
    doc.text("", 140, currentY); // Empty quantity
    doc.text(
      formatRupiah(item.total_amount || 0),
      170,
      currentY
    );

    // Add payment details
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Detail Pembayaran:", 20, currentY + 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Harga Layanan: ${formatRupiah(item.base_price || 0)}`,
      20,
      currentY + 30
    );
    doc.text(
      `Total Harga Layanan: ${formatRupiah(item.total_amount || 0)}`,
      20,
      currentY + 37
    );
    doc.text("Metode Pembayaran: Transfer Bank", 20, currentY + 44);
    doc.text(
      `Biaya Booking: ${formatRupiah(item.booking_amount || 0)}`,
      20,
      currentY + 51
    );
    doc.text(
      `Sisa Pembayaran: ${formatRupiah(
        (item.total_amount || 0) - (item.booking_amount || 0)
      )}`,
      20,
      currentY + 58
    );

    // Add bank account information
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Rekening Tujuan:", 20, currentY + 65);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    // Use selected bank account if available, otherwise use default
    const bankAccountNumber =
      selectedBank?.account_number ||
      item.selected_bank_account ||
      item.bank_account_number ||
      "1234567890";
    const bankAccountName =
      selectedBank?.name || item.bank_account_name || "User Wedding Organizer";
    doc.text(`Nomor Rekening: ${bankAccountNumber}`, 20, currentY + 75);
    doc.text(`Atas Nama: ${bankAccountName}`, 20, currentY + 82);

    // Add user notes section if available
    let notesY = currentY + 95;
    const notesText = item.notes || item.additional_requests || "";
    if (notesText && notesText.trim()) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Catatan:", 20, notesY);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      notesY += 7;

      // Use full width for notes (same as address width calculation)
      const actualUsableWidth = pageWidth - (margin * 2);
      const notesLines = doc.splitTextToSize(notesText, actualUsableWidth);
      notesLines.forEach((line) => {
        doc.text(line, 20, notesY);
        notesY += 5;
      });

      notesY += 15; // Add more space after notes
    }

    // Position thank you message at the bottom of the page
    // Calculate the final Y position after all content
    const finalContentY = notesText && notesText.trim() ? notesY : currentY + 95;
    const thankYouY = finalContentY + 30; // Add 30mm space after the last content
    
    // Set font for thank you message
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Terima kasih telah memilih layanan kami!", 105, thankYouY, {
      align: "center",
    });

    // Save the PDF
    const fileName = `invoice-order-${item.id}-${
      new Date().toISOString().split("T")[0]
    }.pdf`;
    doc.save(fileName);
  };

  return (
    <>
      <Helmet>
        <title>Kalender Booking - Dashboard Admin</title>
      </Helmet>

      <Toaster position="top-right" />

      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Kalender Booking
          </h1>
          <p className="text-gray-600">
            Lihat jadwal booking dan pesanan yang masih menunggu.
          </p>
        </div>

        {/* Booking Calendar */}
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Kalender Booking
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeCalendarMonth(-1)}
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
                    onClick={() => changeCalendarMonth(1)}
                    className="p-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                    title="Bulan berikutnya"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-7 bg-gray-50 text-xs font-semibold text-gray-600">
                  {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(
                    (day) => (
                      <div
                        key={day}
                        className="px-2 py-2 text-center uppercase tracking-wide"
                      >
                        {day}
                      </div>
                    )
                  )}
                </div>
                <div className="grid grid-cols-7 text-sm">
                  {calendarLoading ? (
                    <div className="col-span-7 flex items-center justify-center py-8">
                      <span className="text-gray-500 text-sm">
                        Memuat data booking untuk bulan ini...
                      </span>
                    </div>
                  ) : (
                    getCalendarDays().map((date, index) => {
                      if (!date) {
                        return (
                          <div
                            key={`empty-${index}`}
                            className="h-14 border border-gray-100 bg-gray-50"
                          />
                        );
                      }

                      const y = date.getFullYear();
                      const m = date.getMonth() + 1;
                      const d = date.getDate();
                      const key = `${y}-${String(m).padStart(
                        2,
                        "0"
                      )}-${String(d).padStart(2, "0")}`;

                      const ordersForDay = bookingsByDate[key] || [];
                      const hasBookings = ordersForDay.length > 0;
                      const isSelected = selectedDate === key;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSelectedDate(key);
                            handleFilterTableBySelectedDate(key);
                          }}
                          className={`h-14 border border-gray-100 flex flex-col items-center justify-center relative transition ${
                            hasBookings
                              ? "bg-red-200 hover:bg-red-100"
                              : "bg-blue-50 hover:bg-blue-100"
                          } ${isSelected ? "ring-2 ring-primary-500 z-10" : ""}`}
                        >
                          <span
                            className={`text-sm font-medium ${
                              hasBookings ? "text-red-700" : "text-blue-700"
                            }`}
                          >
                            {d}
                          </span>
                          {hasBookings && (
                            <span className="bg-blue-600 rounded md:py-1 px-2 mt-1 text-[7px] md:text-xs font-semibold text-white">
                              {ordersForDay.length} Client
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {selectedDate && (
          <div className="space-y-6">
            {tableFilteredOrders && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg">
                <span className="text-sm text-blue-800">
                  Menampilkan pesanan untuk tanggal{" "}
                  {new Date(selectedDate).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <button
                  type="button"
                  onClick={handleClearTableFilter}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                >
                  Hapus filter
                </button>
              </div>
            )}
            {/* Orders Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID Pesanan
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pelanggan
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Layanan
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tanggal Pernikahan
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Booking Amount
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          Memuat data...
                        </td>
                      </tr>
                    ) : tableOrders.length > 0 ? (
                      tableOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 bg-green-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="rounded-lg px-3 py-2 inline-flex flex-col">
                              <span className="text-xs font-semibold text-green-800">
                                #{order.id}
                              </span>
                              <span className="text-xs text-green-700 mt-1">
                                {formatDate(order.created_at)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {order.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.phone}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {order.service_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDateTime(order.wedding_date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-primary-600">
                              {formatRupiah(order.total_amount)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-primary-600">
                              {formatRupiah(order.booking_amount)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={order.status}
                              onChange={(e) =>
                                handleStatusUpdate(order.id, e.target.value)
                              }
                              className={`px-3 py-1 rounded-full text-sm font-medium border-0 ${getStatusColor(
                                order.status
                              )}`}
                            >
                              <option value="pending">Menunggu</option>
                              <option value="confirmed">Dikonfirmasi</option>
                              {/* <option value="completed">Selesai</option> */}
                              <option value="cancelled">Dibatalkan</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-3">
                              <button
                                onClick={() => handleViewDetail(order)}
                                className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                title="Lihat Detail"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  handleEditBookingAmount(order)
                                }
                                className="text-green-600 hover:text-green-700 flex items-center gap-1"
                                title="Edit Booking Amount"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  handleGenerateInvoice(order)
                                }
                                className="text-purple-600 hover:text-purple-700 flex items-center gap-1"
                                title="Download Invoice"
                              >
                                <Download size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                className="text-red-600 hover:text-red-700 flex items-center gap-1"
                                title="Hapus"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="8"
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          Tidak ada pesanan
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {!tableFilteredOrders && ordersPagination.totalPages > 1 && (
              <div className="flex items-center justify-between bg-white px-6 py-3 border-t border-gray-200">
                <div className="flex items-center text-sm text-gray-700">
                  <span>
                    Menampilkan{" "}
                    {(ordersPagination.page - 1) * ordersPagination.limit + 1} -{" "}
                    {Math.min(
                      ordersPagination.page * ordersPagination.limit,
                      ordersPagination.total
                    )}{" "}
                    dari {ordersPagination.total} pesanan
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      handleOrdersPageChange(ordersPagination.page - 1)
                    }
                    disabled={ordersPagination.page === 1}
                    className="px-3 py-1 rounded-md text-sm font-medium text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {getPaginationPages(
                    ordersPagination.page,
                    ordersPagination.totalPages
                  ).map((page, index) => {
                    if (page === "ellipsis") {
                      return (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-2 text-gray-500"
                        >
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => handleOrdersPageChange(page)}
                        className={`px-3 py-1 rounded-md text-sm font-medium ${
                          page === ordersPagination.page
                            ? "bg-primary-600 text-white"
                            : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() =>
                      handleOrdersPageChange(ordersPagination.page + 1)
                    }
                    disabled={
                      ordersPagination.page === ordersPagination.totalPages
                    }
                    className="px-3 py-1 rounded-md text-sm font-medium text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order Detail Modal */}
        {showDetailModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800">
                  Detail Pesanan #{selectedOrder.id}
                </h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Informasi Pelanggan
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-gray-700">Nama:</span>
                        <p className="text-gray-900">{selectedOrder.name}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Email:
                        </span>
                        <p className="text-gray-900">{selectedOrder.email}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Telepon:
                        </span>
                        <p className="text-gray-900">{selectedOrder.phone}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Alamat:
                        </span>
                        <p className="text-gray-900">{selectedOrder.address}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Informasi Pesanan
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-gray-700">
                          Layanan:
                        </span>
                        <p className="text-gray-900">
                          {selectedOrder.service_name}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Tanggal Pernikahan:
                        </span>
                        <p className="text-gray-900">
                          {formatDateTime(selectedOrder.wedding_date)}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Tanggal Pesanan:
                        </span>
                        <p className="text-gray-900">
                          {formatDate(selectedOrder.created_at)}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Total:
                        </span>
                        <p className="text-2xl font-bold text-primary-600">
                          {formatRupiah(selectedOrder.total_amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Catatan
                    </h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                      {selectedOrder.notes}
                    </p>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Item yang Dipilih
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {(() => {
                      try {
                        const items = JSON.parse(
                          selectedOrder.selected_items || "[]"
                        );
                        console.log("Selected items structure:", items); // Debug log

                        if (!Array.isArray(items) || items.length === 0) {
                          return (
                            <div className="text-gray-500 text-center py-4">
                              Tidak ada item yang dipilih
                            </div>
                          );
                        }

                        return items.map((item, index) => {
                          // Handle different item structures
                          const itemName =
                            item.name ||
                            item.item_name ||
                            item.title ||
                            "Item tidak dikenal";
                          // Check for all possible price fields in order of preference
                          const itemPrice =
                            item.final_price ||
                            item.item_price ||
                            item.price ||
                            item.custom_price ||
                            0;
                          const quantity = item.quantity || 1;
                          const subtotal = (typeof itemPrice === 'number' ? itemPrice : parseFloat(itemPrice) || 0) * quantity;

                          return (
                            <div
                              key={index}
                              className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0"
                            >
                              <span className="text-gray-900">
                                {itemName} {quantity > 1 && <span className="text-gray-500">(x{quantity})</span>}
                              </span>
                              <div className="text-right">
                                {quantity > 1 && (
                                  <div className="text-xs text-gray-500">
                                    {formatRupiah(itemPrice)} × {quantity}
                                  </div>
                                )}
                                <span className="font-medium text-primary-600">
                                  {formatRupiah(subtotal)}
                                </span>
                              </div>
                            </div>
                          );
                        });
                      } catch (error) {
                        console.error("Error parsing selected items:", error);
                        return (
                          <div className="text-gray-500 text-center py-4">
                            Error memuat item yang dipilih
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={async () => {
                      const confirmed = await new Promise((resolve) => {
                        toast(
                          (t) => (
                            <div className="flex items-center gap-3">
                              <span>
                                Apakah Anda yakin ingin menghapus pesanan ini?
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    toast.dismiss(t.id);
                                    resolve(true);
                                  }}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                                >
                                  Ya
                                </button>
                                <button
                                  onClick={() => {
                                    toast.dismiss(t.id);
                                    resolve(false);
                                  }}
                                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                                >
                                  Tidak
                                </button>
                              </div>
                            </div>
                          ),
                          {
                            duration: Infinity,
                            position: "top-center",
                          }
                        );
                      });

                      if (confirmed) {
                        await handleDeleteOrder(selectedOrder.id);
                        setShowDetailModal(false);
                      }
                    }}
                    className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Hapus Pesanan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Edit Booking Amount Modal */}
        {showEditBookingModal && editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">
                  Edit Booking Amount
                </h2>
                <button
                  onClick={() => {
                    setShowEditBookingModal(false);
                    setEditingItem(null);
                    setNewBookingAmount("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Booking Amount (Rp)
                  </label>
                  <input
                    type="number"
                    value={newBookingAmount}
                    onChange={(e) => setNewBookingAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Masukkan jumlah booking"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowEditBookingModal(false);
                      setEditingItem(null);
                      setNewBookingAmount("");
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleUpdateBookingAmount}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bank Selection Modal */}
        {showBankSelectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">
                  Pilih Bank Transfer
                </h2>
                <button
                  onClick={() => {
                    setShowBankSelectionModal(false);
                    setPendingInvoiceItem(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih Metode Pembayaran
                  </label>
                  <div className="space-y-2">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedBankMethod?.id === method.id
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-300 hover:border-primary-300"
                        }`}
                        onClick={() => setSelectedBankMethod(method)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-800">
                              {method.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {method.type}
                            </p>
                            {method.account_number && (
                              <p className="text-xs text-gray-500">
                                No. Rek: {method.account_number}
                              </p>
                            )}
                          </div>
                          <div className="w-4 h-4 border-2 border-gray-300 rounded-full flex items-center justify-center">
                            {selectedBankMethod?.id === method.id && (
                              <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowBankSelectionModal(false);
                      setPendingInvoiceItem(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      if (pendingInvoiceItem) {
                        generateInvoicePDF(
                          pendingInvoiceItem,
                          selectedBankMethod
                        );
                        setShowBankSelectionModal(false);
                        setPendingInvoiceItem(null);
                      }
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Generate Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
};

export default AdminOrders;
