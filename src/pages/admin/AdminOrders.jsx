import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, ShoppingCart, Eye, Trash2, ChevronLeft, ChevronRight, X, Edit, Download } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { formatRupiah, formatDate } from '../../utils/formatters';
import jsPDF from 'jspdf';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [customRequests, setCustomRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('orders');
  const [ordersPagination, setOrdersPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [customRequestsPagination, setCustomRequestsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRequestDetailModal, setShowRequestDetailModal] = useState(false);
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingType, setEditingType] = useState(''); // 'order' or 'request'
  const [newBookingAmount, setNewBookingAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [customRequestsLoading, setCustomRequestsLoading] = useState(false);
  const [showBankSelectionModal, setShowBankSelectionModal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedBankMethod, setSelectedBankMethod] = useState(null);
  const [pendingInvoiceItem, setPendingInvoiceItem] = useState(null);
  const [pendingInvoiceType, setPendingInvoiceType] = useState('');

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else {
      fetchCustomRequests();
    }
  }, [activeTab, ordersPagination.page, customRequestsPagination.page]);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/user-wedding/api/payment-methods');
      const data = await response.json();
      setPaymentMethods(data);
      if (data.length > 0) {
        setSelectedBankMethod(data[0]);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://api-inventory.isavralabel.com/user-wedding/api/orders?page=${ordersPagination.page}&limit=${ordersPagination.limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      const data = await response.json();
      
      // Handle both old format (array) and new format (object with pagination)
      if (Array.isArray(data)) {
        // Old format - no pagination
        setOrders(data);
        setOrdersPagination(prev => ({
          ...prev,
          total: data.length,
          totalPages: 1
        }));
      } else {
        // New format - with pagination
        setOrders(data.orders || []);
        setOrdersPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 1
        }));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
      setOrdersPagination(prev => ({
        ...prev,
        total: 0,
        totalPages: 1
      }));
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomRequests = async () => {
    setCustomRequestsLoading(true);
    try {
      const response = await fetch(`https://api-inventory.isavralabel.com/user-wedding/api/custom-requests?page=${customRequestsPagination.page}&limit=${customRequestsPagination.limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      const data = await response.json();
      
      // Handle both old format (array) and new format (object with pagination)
      if (Array.isArray(data)) {
        // Old format - no pagination
        setCustomRequests(data);
        setCustomRequestsPagination(prev => ({
          ...prev,
          total: data.length,
          totalPages: 1
        }));
      } else {
        // New format - with pagination
        setCustomRequests(data.requests || []);
        setCustomRequestsPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 1
        }));
      }
    } catch (error) {
      console.error('Error fetching custom requests:', error);
      setCustomRequests([]);
      setCustomRequestsPagination(prev => ({
        ...prev,
        total: 0,
        totalPages: 1
      }));
    } finally {
      setCustomRequestsLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const response = await fetch(`https://api-inventory.isavralabel.com/user-wedding/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchOrders();
        toast.success('Status pesanan berhasil diperbarui!');
      } else {
        toast.error('Error memperbarui status pesanan');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error memperbarui status pesanan');
    }
  };

  const handleCustomRequestStatusUpdate = async (requestId, newStatus) => {
    try {
      const response = await fetch(`https://api-inventory.isavralabel.com/user-wedding/api/custom-requests/${requestId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchCustomRequests();
        toast.success('Status permintaan kustom berhasil diperbarui!');
      } else {
        toast.error('Error memperbarui status permintaan kustom');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error memperbarui status permintaan kustom');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    const confirmed = await new Promise((resolve) => {
      toast((t) => (
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
      ), {
        duration: Infinity,
        position: 'top-center',
      });
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`https://api-inventory.isavralabel.com/user-wedding/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        fetchOrders();
        toast.success('Pesanan berhasil dihapus!');
      } else {
        toast.error('Error menghapus pesanan');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menghapus pesanan');
    }
  };

  const handleViewDetail = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };



  const handleOrdersPageChange = (newPage) => {
    setOrdersPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleCustomRequestsPageChange = (newPage) => {
    setCustomRequestsPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleViewRequestDetail = (request) => {
    setSelectedRequest(request);
    setShowRequestDetailModal(true);
  };



  const handleDeleteCustomRequest = async (requestId) => {
    const confirmed = await new Promise((resolve) => {
      toast((t) => (
        <div className="flex items-center gap-3">
          <span>Apakah Anda yakin ingin menghapus permintaan kustom ini?</span>
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
      ), {
        duration: Infinity,
        position: 'top-center',
      });
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`https://api-inventory.isavralabel.com/user-wedding/api/custom-requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        fetchCustomRequests();
        toast.success('Permintaan kustom berhasil dihapus!');
      } else {
        toast.error('Error menghapus permintaan kustom');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menghapus permintaan kustom');
    }
  };

  const handleEditBookingAmount = (item, type) => {
    setEditingItem(item);
    setEditingType(type);
    setNewBookingAmount(item.booking_amount?.toString() || '');
    setShowEditBookingModal(true);
  };

  const handleUpdateBookingAmount = async () => {
    if (!newBookingAmount || isNaN(parseFloat(newBookingAmount))) {
      toast.error('Masukkan jumlah booking yang valid');
      return;
    }

    try {
      let response;
      if (editingType === 'order') {
        response = await fetch(`https://api-inventory.isavralabel.com/user-wedding/api/orders/${editingItem.id}/booking-amount`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: JSON.stringify({ booking_amount: parseFloat(newBookingAmount) }),
        });
      } else {
        response = await fetch(`https://api-inventory.isavralabel.com/user-wedding/api/custom-requests/${editingItem.id}/booking-amount`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: JSON.stringify({ booking_amount: parseFloat(newBookingAmount) }),
        });
      }

      if (response.ok) {
        if (editingType === 'order') {
          fetchOrders();
        } else {
          fetchCustomRequests();
        }
        toast.success('Booking amount berhasil diperbarui!');
        setShowEditBookingModal(false);
        setEditingItem(null);
        setEditingType('');
        setNewBookingAmount('');
      } else {
        toast.error('Error memperbarui booking amount');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error memperbarui booking amount');
    }
  };

  const handleGenerateInvoice = (item, type) => {
    setPendingInvoiceItem(item);
    setPendingInvoiceType(type);
    setShowBankSelectionModal(true);
  };

  const generateInvoicePDF = (item, type, selectedBank = null) => {
    const doc = new jsPDF();
    
    // Get current domain for website URL
    const currentDomain = window.location.origin;
    
    // ===== PAGE 1 =====
    // Company header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('User Wedding Organizer', 20, 20);
    
    // Company details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Jl. Raya panongan Kec. Panongan Kab. Tangerang Provinsi Banten', 20, 30);
    doc.text('Telephone: 089646829459', 20, 37);
    doc.text('Email: edo19priyatno@gmail.com', 20, 44);
    doc.text(`Website: ${currentDomain}`, 20, 51);
    
    // Invoice details (right side)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 150, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`No. Invoice: ${item.id || 'N/A'}`, 150, 30);
    doc.text(`Tanggal Invoice: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, 150, 37);
    doc.text(`Jatuh Tempo: ${formatDate(item.wedding_date)}`, 150, 44);
    
    // Bill To section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Kepada :', 20, 70);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(item.name, 20, 77);
    doc.text(item.email, 20, 84);
    doc.text(item.phone, 20, 91);
    if (type === 'order' && item.address) {
      doc.text(item.address, 20, 98);
      doc.text(`Tanggal Pernikahan: ${formatDate(item.wedding_date)}`, 20, 105);
    } else {
      doc.text(`Tanggal Pernikahan: ${formatDate(item.wedding_date)}`, 20, 98);
    }
    
    // Service table header
    const startY = type === 'order' ? 120 : 110;
    doc.setFillColor(52, 152, 219); // Blue background
    doc.rect(20, startY, 170, 8, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255); // White text
    doc.text('No.', 25, startY + 6);
    doc.text('Deskripsi', 40, startY + 6);
    doc.text('Jml', 140, startY + 6);
    doc.text('Harga', 170, startY + 6);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Service items
    let currentY = startY + 15;
    let itemNumber = 1;
    
    if (type === 'order') {
      // Main service item (base price)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(itemNumber.toString(), 25, currentY);
      doc.text(item.service_name, 40, currentY);
      doc.text('1', 140, currentY);
      doc.text(formatRupiah(item.base_price || 0), 170, currentY);
      
      // Selected items as sub-items
      if (item.selected_items) {
        try {
          const selectedItems = JSON.parse(item.selected_items);
          if (Array.isArray(selectedItems) && selectedItems.length > 0) {
            currentY += 8;
            selectedItems.forEach((selectedItem) => {
              const itemName = selectedItem.name || selectedItem.item_name || selectedItem.title || 'Item tidak dikenal';
              const itemPrice = selectedItem.final_price || selectedItem.item_price || selectedItem.price || selectedItem.custom_price || 0;
              
              doc.setFontSize(8);
              doc.text(`  ${itemName}`, 40, currentY);
              doc.text('1', 140, currentY);
              doc.text(formatRupiah(itemPrice), 170, currentY);
              currentY += 5;
            });
          }
        } catch (error) {
          console.error('Error parsing selected items:', error);
        }
      }
    } else {
      // Custom request
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(itemNumber.toString(), 25, currentY);
      doc.text('Layanan Kustom', 40, currentY);
      doc.text('1', 140, currentY);
      doc.text(formatRupiah(item.booking_amount || 0), 170, currentY);
      
      if (item.services) {
        currentY += 8;
        doc.setFontSize(8);
        doc.text(`  ${item.services}`, 40, currentY);
      }
    }
    
    // Add total service row
    currentY += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('', 25, currentY); // Empty serial number
    doc.text('Total Harga Layanan:', 40, currentY);
    doc.text('', 140, currentY); // Empty quantity
    doc.text(formatRupiah(type === 'order' ? (item.total_amount || 0) : (item.booking_amount || 0)), 170, currentY);
    
    // Add payment details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detail Pembayaran:', 20, currentY + 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Harga Layanan: ${formatRupiah(type === 'order' ? (item.base_price || 0) : (item.booking_amount || 0))}`, 20, currentY + 30);
    doc.text(`Total Harga Layanan: ${formatRupiah(type === 'order' ? (item.total_amount || 0) : (item.booking_amount || 0))}`, 20, currentY + 37);
    doc.text('Metode Pembayaran: Transfer Bank', 20, currentY + 44);
    doc.text(`Biaya Booking: ${formatRupiah(item.booking_amount || 0)}`, 20, currentY + 51);
    doc.text(`Sisa Pembayaran: ${formatRupiah((type === 'order' ? (item.total_amount || 0) : (item.booking_amount || 0)) - (item.booking_amount || 0))}`, 20, currentY + 58);
    
    // Add bank account information
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Rekening Tujuan:', 20, currentY + 65);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    // Use selected bank account if available, otherwise use default
    const bankAccountNumber = selectedBank?.account_number || item.selected_bank_account || item.bank_account_number || '1234567890';
    const bankAccountName = selectedBank?.name || item.bank_account_name || 'User Wedding Organizer';
    doc.text(`Nomor Rekening: ${bankAccountNumber}`, 20, currentY + 75);
    doc.text(`Atas Nama: ${bankAccountName}`, 20, currentY + 82);
      
    doc.text('Terima kasih telah memilih layanan kami!', 105, 280, { align: 'center' });

    // Save the PDF
    const fileName = `invoice-${type}-${item.id}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };



  return (
    <>
      <Helmet>
        <title>Kelola Pesanan - Dashboard Admin</title>
      </Helmet>

      <Toaster position="top-right" />

      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Kelola Pesanan</h1>
          <p className="text-gray-600">Lacak dan kelola pesanan pelanggan dan permintaan kustom.</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'orders'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingCart size={16} />
              Pesanan Layanan
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'custom'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus size={16} />
              Permintaan Kustom 
            </button>
          </div>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
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
                        <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
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
                              {formatDate(order.wedding_date)}
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
                              onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                              className={`px-3 py-1 rounded-full text-sm font-medium border-0 ${getStatusColor(order.status)}`}
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
                                onClick={() => handleEditBookingAmount(order, 'order')}
                                className="text-green-600 hover:text-green-700 flex items-center gap-1"
                                title="Edit Booking Amount"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleGenerateInvoice(order, 'order')}
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
                        <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                          Tidak ada pesanan
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {ordersPagination.totalPages > 1 && (
              <div className="flex items-center justify-between bg-white px-6 py-3 border-t border-gray-200">
                <div className="flex items-center text-sm text-gray-700">
                  <span>
                    Menampilkan {((ordersPagination.page - 1) * ordersPagination.limit) + 1} - {Math.min(ordersPagination.page * ordersPagination.limit, ordersPagination.total)} dari {ordersPagination.total} pesanan
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOrdersPageChange(ordersPagination.page - 1)}
                    disabled={ordersPagination.page === 1}
                    className="px-3 py-1 rounded-md text-sm font-medium text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {Array.from({ length: ordersPagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handleOrdersPageChange(page)}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        page === ordersPagination.page
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handleOrdersPageChange(ordersPagination.page + 1)}
                    disabled={ordersPagination.page === ordersPagination.totalPages}
                    className="px-3 py-1 rounded-md text-sm font-medium text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Requests Tab */}
        {activeTab === 'custom' && (
          <div className="space-y-6">
            {/* Custom Requests Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID Permintaan
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pelanggan
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tanggal Pernikahan
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
                    {customRequestsLoading ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                          Memuat data...
                        </td>
                      </tr>
                    ) : customRequests.length > 0 ? (
                      customRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              #{request.id}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(request.created_at)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {request.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.phone}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(request.wedding_date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-primary-600">
                              {formatRupiah(request.booking_amount)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                              {request.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-3">
                              <select
                                value={request.status || 'pending'}
                                onChange={(e) => handleCustomRequestStatusUpdate(request.id, e.target.value)}
                                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                              >
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                              <button
                                onClick={() => handleViewRequestDetail(request)}
                                className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                title="Lihat Detail"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleEditBookingAmount(request, 'request')}
                                className="text-green-600 hover:text-green-700 flex items-center gap-1"
                                title="Edit Booking Amount"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleGenerateInvoice(request, 'request')}
                                className="text-purple-600 hover:text-purple-700 flex items-center gap-1"
                                title="Download Invoice"
                              >
                                <Download size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteCustomRequest(request.id)}
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
                        <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                          Tidak ada permintaan kustom
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Custom Requests Pagination */}
            {customRequestsPagination.totalPages > 1 && (
              <div className="flex items-center justify-between bg-white px-6 py-3 border-t border-gray-200">
                <div className="flex items-center text-sm text-gray-700">
                  <span>
                    Menampilkan {((customRequestsPagination.page - 1) * customRequestsPagination.limit) + 1} - {Math.min(customRequestsPagination.page * customRequestsPagination.limit, customRequestsPagination.total)} dari {customRequestsPagination.total} permintaan
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCustomRequestsPageChange(customRequestsPagination.page - 1)}
                    disabled={customRequestsPagination.page === 1}
                    className="px-3 py-1 rounded-md text-sm font-medium text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {Array.from({ length: customRequestsPagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handleCustomRequestsPageChange(page)}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        page === customRequestsPagination.page
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handleCustomRequestsPageChange(customRequestsPagination.page + 1)}
                    disabled={customRequestsPagination.page === customRequestsPagination.totalPages}
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
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Informasi Pelanggan</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-gray-700">Nama:</span>
                        <p className="text-gray-900">{selectedOrder.name}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Email:</span>
                        <p className="text-gray-900">{selectedOrder.email}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Telepon:</span>
                        <p className="text-gray-900">{selectedOrder.phone}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Alamat:</span>
                        <p className="text-gray-900">{selectedOrder.address}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Informasi Pesanan</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-gray-700">Layanan:</span>
                        <p className="text-gray-900">{selectedOrder.service_name}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Tanggal Pernikahan:</span>
                        <p className="text-gray-900">{formatDate(selectedOrder.wedding_date)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Tanggal Pesanan:</span>
                        <p className="text-gray-900">{formatDate(selectedOrder.created_at)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Total:</span>
                        <p className="text-2xl font-bold text-primary-600">{formatRupiah(selectedOrder.total_amount)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Catatan</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedOrder.notes}</p>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Item yang Dipilih</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {(() => {
                      try {
                        const items = JSON.parse(selectedOrder.selected_items || '[]');
                        console.log('Selected items structure:', items); // Debug log
                        
                        if (!Array.isArray(items) || items.length === 0) {
                          return (
                            <div className="text-gray-500 text-center py-4">
                              Tidak ada item yang dipilih
                            </div>
                          );
                        }
                        
                        return items.map((item, index) => {
                          // Handle different item structures
                          const itemName = item.name || item.item_name || item.title || 'Item tidak dikenal';
                          // Check for all possible price fields in order of preference
                          const itemPrice = item.final_price || item.item_price || item.price || item.custom_price || 0;
                          
                          return (
                            <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                              <span className="text-gray-900">{itemName}</span>
                              <span className="font-medium text-primary-600">{formatRupiah(itemPrice)}</span>
                            </div>
                          );
                        });
                      } catch (error) {
                        console.error('Error parsing selected items:', error);
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
                        toast((t) => (
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
                        ), {
                          duration: Infinity,
                          position: 'top-center',
                        });
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

        {/* Custom Request Detail Modal */}
        {showRequestDetailModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800">
                  Detail Permintaan Kustom #{selectedRequest.id}
                </h2>
                <button
                  onClick={() => setShowRequestDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Informasi Pelanggan</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-gray-700">Nama:</span>
                        <p className="text-gray-900">{selectedRequest.name}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Email:</span>
                        <p className="text-gray-900">{selectedRequest.email}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Telepon:</span>
                        <p className="text-gray-900">{selectedRequest.phone}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Informasi Pernikahan</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-gray-700">Tanggal Pernikahan:</span>
                        <p className="text-gray-900">{formatDate(selectedRequest.wedding_date)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Booking Amount:</span>
                        <p className="text-2xl font-bold text-primary-600">{formatRupiah(selectedRequest.booking_amount)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Tanggal Permintaan:</span>
                        <p className="text-gray-900">{formatDate(selectedRequest.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Layanan yang Diminta</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">{selectedRequest.services}</p>
                  </div>
                </div>

                {selectedRequest.additional_requests && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Permintaan Tambahan</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedRequest.additional_requests}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowRequestDetailModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={async () => {
                      const confirmed = await new Promise((resolve) => {
                        toast((t) => (
                          <div className="flex items-center gap-3">
                            <span>Apakah Anda yakin ingin menghapus permintaan kustom ini?</span>
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
                        ), {
                          duration: Infinity,
                          position: 'top-center',
                        });
                      });

                      if (confirmed) {
                        await handleDeleteCustomRequest(selectedRequest.id);
                        setShowRequestDetailModal(false);
                      }
                    }}
                    className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Hapus Permintaan
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
                    setEditingType('');
                    setNewBookingAmount('');
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
                      setEditingType('');
                      setNewBookingAmount('');
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
                    setPendingInvoiceType('');
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
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-300 hover:border-primary-300'
                        }`}
                        onClick={() => setSelectedBankMethod(method)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-800">{method.name}</h4>
                            <p className="text-sm text-gray-600">{method.type}</p>
                            {method.account_number && (
                              <p className="text-xs text-gray-500">No. Rek: {method.account_number}</p>
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
                      setPendingInvoiceType('');
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      if (pendingInvoiceItem && pendingInvoiceType) {
                        generateInvoicePDF(pendingInvoiceItem, pendingInvoiceType, selectedBankMethod);
                        setShowBankSelectionModal(false);
                        setPendingInvoiceItem(null);
                        setPendingInvoiceType('');
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