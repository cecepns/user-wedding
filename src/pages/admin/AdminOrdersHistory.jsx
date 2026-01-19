import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import AdminLayout from "../../components/AdminLayout";
import { formatRupiah, formatDate, formatDateTime } from "../../utils/formatters";

const AdminOrdersHistory = () => {
  const [orders, setOrders] = useState([]);
  const [ordersPagination, setOrdersPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersPagination.page]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api-inventory.isavralabel.com/user-wedding/api/orders?page=${ordersPagination.page}&limit=${ordersPagination.limit}&status=confirmed,completed,cancelled`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        }
      );
      const data = await response.json();

      if (Array.isArray(data)) {
        setOrders(data);
        setOrdersPagination((prev) => ({
          ...prev,
          total: data.length,
          totalPages: 1,
        }));
      } else {
        setOrders(data.orders || []);
        setOrdersPagination((prev) => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 1,
        }));
      }
    } catch (error) {
      console.error("Error fetching orders history:", error);
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
        fetchOrders();
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
        fetchOrders();
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

  return (
    <>
      <Helmet>
        <title>History Pesanan - Dashboard Admin</title>
      </Helmet>

      <Toaster position="top-right" />

      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            History Pesanan
          </h1>
          <p className="text-gray-600">
            Daftar pesanan yang sudah selesai / diselesaikan.
          </p>
        </div>

        <div className="space-y-6">
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
                  ) : orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            #{order.id}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(order.created_at)}
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
                            <option value="completed">Selesai</option>
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
                        Tidak ada pesanan selesai
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {ordersPagination.totalPages > 1 && (
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

                        if (!Array.isArray(items) || items.length === 0) {
                          return (
                            <div className="text-gray-500 text-center py-4">
                              Tidak ada item yang dipilih
                            </div>
                          );
                        }

                        return items.map((item, index) => {
                          const itemName =
                            item.name ||
                            item.item_name ||
                            item.title ||
                            "Item tidak dikenal";
                          const itemPrice =
                            item.final_price ||
                            item.item_price ||
                            item.price ||
                            item.custom_price ||
                            0;
                          const quantity = item.quantity || 1;
                          const subtotal =
                            (typeof itemPrice === "number"
                              ? itemPrice
                              : parseFloat(itemPrice) || 0) * quantity;

                          return (
                            <div
                              key={index}
                              className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0"
                            >
                              <span className="text-gray-900">
                                {itemName}{" "}
                                {quantity > 1 && (
                                  <span className="text-gray-500">
                                    (x{quantity})
                                  </span>
                                )}
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
      </AdminLayout>
    </>
  );
};

export default AdminOrdersHistory;
