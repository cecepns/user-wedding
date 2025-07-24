import { useState, useEffect } from 'react';
import { Helmet } from "react-helmet-async";
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatRupiah } from '../utils/formatters';
import jsPDF from 'jspdf';

const CustomService = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    wedding_date: '',
    guest_count: '',
    budget: '',
    services: [],
    additional_requests: ''
  });

  const [serviceOptions, setServiceOptions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    fetchServiceOptions();
    fetchPaymentMethods();
  }, []);

  // Scroll to top when switching between tabs
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [showForm]);

  const fetchServiceOptions = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/user-wedding/api/items');
      const data = await response.json();
      setServiceOptions(data);
    } catch (error) {
      console.error('Error fetching service options:', error);
      toast.error('Gagal memuat daftar layanan');
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/user-wedding/api/payment-methods');
      const data = await response.json();
      setPaymentMethods(data);
      if (data.length > 0) {
        setSelectedPaymentMethod(data[0]);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleServiceToggle = (service) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service.name)
        ? prev.services.filter(s => s !== service.name)
        : [...prev.services, service.name]
    }));
  };

  const calculateTotalPrice = () => {
    if (!Array.isArray(formData.services) || !Array.isArray(serviceOptions)) return 0;
    return formData.services.reduce((total, serviceName) => {
      const service = serviceOptions.find(s => s.name === serviceName);
      let price = service ? service.price : 0;
      if (typeof price === 'string') price = parseFloat(price);
      return total + (isNaN(price) ? 0 : price);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/user-wedding/api/custom-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          services: formData.services.join(', ')
        }),
      });

      if (response.ok) {
        setShowPaymentInstructions(true);
        toast.success('Permintaan layanan kustom berhasil dikirim! Silakan pilih metode pembayaran.');
      } else {
        toast.error('Error mengirim permintaan. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error mengirim permintaan. Silakan coba lagi.');
    }
  };

  const handleContinueToForm = () => {
    if (formData.services.length === 0) {
      toast.error('Silakan pilih minimal satu layanan terlebih dahulu');
      return;
    }
    setShowForm(true);
    // Scroll to top when switching to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToServices = () => {
    setShowForm(false);
    // Scroll to top when switching back to services
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToForm = () => {
    setShowPaymentInstructions(false);
    // Scroll to top when going back to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePaymentComplete = () => {
    toast.success('Terima kasih! Pembayaran booking Anda akan dikonfirmasi dalam 1x24 jam.');
    navigate('/');
  };

  const handleWhatsAppContact = () => {
    const phoneNumber = '6289646829459';
    const message = `Halo! Saya sudah melakukan pemesanan layanan kustom dengan total Rp ${calculateTotalPrice().toLocaleString('id-ID')}. Mohon konfirmasi pembayaran saya.`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

    const handleDownloadInvoice = () => {
    if (!formData.name || !formData.services.length) {
      toast.error('Silakan lengkapi data terlebih dahulu');
      return;
    }
    
    setIsGeneratingPDF(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      // Helper function to add text with automatic line wrapping
      const addWrappedText = (text, x, y, maxWidth, fontSize = 10) => {
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(text, maxWidth);
        lines.forEach((line, index) => {
          doc.text(line, x, y + (index * (fontSize * 0.4)));
        });
        return lines.length * (fontSize * 0.4);
      };

      // Generate invoice number
      const invoiceNumber = `CUSTOM-${Math.floor(Math.random() * 1000000)}`;
      const currentDate = new Date().toLocaleDateString('id-ID', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
      
      // Page 1: Header and Company Info
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('User Wedding Organizer', margin, 20);
      
      // Company details
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Jl. Raya panongan Kec. Panongan Kab. Tangerang Provinsi Banten', margin, 30);
      doc.text('Telephone: 089646829459', margin, 37);
      doc.text('Email: edo19priyatno@gmail.com', margin, 44);
      doc.text('Website: https://sites.google.com/view/userwedding/beranda', margin, 51);
      
      // Invoice details (right side)
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', pageWidth - margin - 30, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`No. Invoice: ${invoiceNumber}`, pageWidth - margin - 30, 30);
      doc.text(`Tanggal Invoice: ${currentDate}`, pageWidth - margin - 30, 37);
      doc.text(`Jatuh Tempo: ${currentDate}`, pageWidth - margin - 30, 44);
      
      // Bill To section
      let currentY = 70;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Dibayar Kepada:', margin, currentY);
      currentY += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(formData.name, margin, currentY);
      currentY += 7;
      doc.text(formData.email, margin, currentY);
      currentY += 7;
      doc.text(formData.phone, margin, currentY);
      currentY += 7;
      doc.text(`Tanggal Pernikahan: ${formData.wedding_date}`, margin, currentY);
      currentY += 7;
      doc.text(`Jumlah Tamu: ${formData.guest_count}`, margin, currentY);
      currentY += 7;
      doc.text(`Rentang Budget: ${formData.budget}`, margin, currentY);
      currentY += 15;
      
      // Service table header
      doc.setFillColor(52, 152, 219); // Blue background
      doc.rect(margin, currentY, contentWidth, 8, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255); // White text
      doc.text('No.', margin + 5, currentY + 6);
      doc.text('Deskripsi', margin + 20, currentY + 6);
      doc.text('Jml', margin + 120, currentY + 6);
      doc.text('Harga', margin + 150, currentY + 6);
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      currentY += 15;
      
      // Service items
      formData.services.forEach((serviceName, idx) => {
        const service = serviceOptions.find(s => s.name === serviceName);
        let price = service ? service.price : 0;
        if (typeof price === 'string') price = parseFloat(price);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text((idx + 1).toString(), margin + 5, currentY);
        
        // Handle long service names with wrapping
        const serviceNameLines = doc.splitTextToSize(serviceName, 80);
        serviceNameLines.forEach((line, lineIndex) => {
          doc.text(line, margin + 20, currentY + (lineIndex * 4));
        });
        
        doc.text('1', margin + 120, currentY);
        doc.text(formatRupiah(isNaN(price) ? 0 : price), margin + 150, currentY);
        currentY += Math.max(7, serviceNameLines.length * 4);
      });
      
      // Add total service row
      currentY += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('', margin + 5, currentY); // Empty serial number
      doc.text('Total Harga Layanan:', margin + 20, currentY);
      doc.text('', margin + 120, currentY); // Empty quantity
      doc.text(formatRupiah(calculateTotalPrice()), margin + 150, currentY);
      currentY += 20;
      
      
      // Payment details section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Detail Pembayaran:', margin, currentY);
      currentY += 15;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Harga Layanan: ${formatRupiah(calculateTotalPrice())}`, margin, currentY);
      currentY += 7;
      doc.text('Metode Pembayaran: Transfer Bank', margin, currentY);
      currentY += 7;
      doc.text('Biaya Booking: Rp 2.000.000', margin, currentY);
      currentY += 7;
      doc.text(`Total Pembayaran Diperlukan: ${formatRupiah(2000000)}`, margin, currentY);
      currentY += 15;
      
      // Add selected payment method details
      if (selectedPaymentMethod) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Rekening Tujuan:', margin, currentY);
        currentY += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Bank: ${selectedPaymentMethod.name}`, margin, currentY);
        currentY += 7;
        doc.text(`Nomor Rekening: ${selectedPaymentMethod.account_number}`, margin, currentY);
        currentY += 7;
        if (selectedPaymentMethod.details) {
          doc.text(`Detail: ${selectedPaymentMethod.details}`, margin, currentY);
          currentY += 7;
        }
        currentY += 10;
      } else {
        // Default payment method if none selected
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Rekening Tujuan:', margin, currentY);
        currentY += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Bank: BSI', margin, currentY);
        currentY += 7;
        doc.text('Nomor Rekening: 4321', margin, currentY);
        currentY += 7;
        doc.text('Detail: Atas Nama User Wedding', margin, currentY);
        currentY += 10;
      }
      
      // Footer
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Terima kasih telah memilih layanan kami!', pageWidth / 2, pageHeight - 20, { align: 'center' });
      
      // Save the PDF
      doc.save(`invoice-custom-${formData.name || 'order'}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Invoice berhasil diunduh!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Gagal mengunduh invoice. Silakan coba lagi.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Payment Instructions Component
  const PaymentInstructionsModal = () => {
    if (!showPaymentInstructions) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
          <div className="p-4 sm:p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                Instruksi Pembayaran
              </h3>
              <p className="text-gray-600">
                Silakan pilih metode pembayaran dan ikuti instruksi di bawah ini
              </p>
            </div>

            {/* Payment Methods */}
            {paymentMethods.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih Metode Pembayaran
                  </label>
                  <div className="grid gap-3">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedPaymentMethod?.id === method.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-300 hover:border-primary-300'
                        }`}
                        onClick={() => setSelectedPaymentMethod(method)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-800">{method.name}</h4>
                            <p className="text-sm text-gray-600">{method.type}</p>
                          </div>
                          <div className="w-4 h-4 border-2 border-gray-300 rounded-full flex items-center justify-center">
                            {selectedPaymentMethod?.id === method.id && (
                              <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Method Details */}
                {selectedPaymentMethod && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-800 mb-4">
                      Detail Pembayaran - {selectedPaymentMethod.name}
                    </h4>
                    
                    <div className="space-y-3">
                      {selectedPaymentMethod.account_number && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Nomor Rekening:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="bg-white px-3 py-2 rounded border text-sm font-mono">
                              {selectedPaymentMethod.account_number}
                            </code>
                            <button
                              onClick={() => navigator.clipboard.writeText(selectedPaymentMethod.account_number)}
                              className="text-primary-600 hover:text-primary-700 text-sm"
                            >
                              Salin
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {selectedPaymentMethod.details && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Instruksi:</span>
                          <div className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                            {selectedPaymentMethod.details}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Total Amount */}
                <div className="bg-primary-50 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Total Harga Layanan:</span>
                      <span className="font-medium text-gray-700">
                        {formatRupiah(calculateTotalPrice())}
                      </span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex flex-wrap justify-between items-center">
                        <span className="font-medium text-gray-800">Total Pembayaran Booking:</span>
                        <span className="text-2xl font-bold text-primary-600">
                          {formatRupiah(2000000)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Important Notes */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h5 className="font-semibold text-yellow-800 mb-2">Penting!</h5>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Transfer Rp 2.000.000 untuk booking (uang muka)</li>
                    <li>• Simpan bukti transfer untuk konfirmasi</li>
                    <li>• Pembayaran akan dikonfirmasi dalam 1x24 jam</li>
                    <li>• Hubungi kami jika ada pertanyaan</li>
                  </ul>
                  <div className="mt-3 pt-3 border-t border-yellow-200">
                    <p className="text-xs text-yellow-600">
                      <strong>Catatan:</strong> Total harga layanan adalah {formatRupiah(calculateTotalPrice())}. 
                      Pembayaran Rp 2.000.000 adalah uang muka untuk booking. Sisa pembayaran dapat diselesaikan sesuai kesepakatan.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <p className="text-gray-600 mb-4">Belum ada metode pembayaran yang tersedia</p>
                <p className="text-sm text-gray-500">Silakan hubungi admin untuk informasi pembayaran</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t">
              <button
                onClick={handleBackToForm}
                className="w-full px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Kembali
              </button>
              
              <button
                onClick={handleDownloadInvoice}
                disabled={isGeneratingPDF}
                className={`w-full px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  isGeneratingPDF 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isGeneratingPDF ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Menghasilkan PDF...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Invoice
                  </>
                )}
              </button>
              
              <button
                onClick={handleWhatsAppContact}
                className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
                Hubungi WhatsApp
              </button>
              
              {paymentMethods.length > 0 && (
                <button
                  onClick={handlePaymentComplete}
                  className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Selesai
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>Layanan Kustom - User Wedding</title>
        <meta
          name="description"
          content="Buat layanan pernikahan kustom sesuai kebutuhan Anda. Pilih layanan yang Anda inginkan dan kami akan menyesuaikan dengan budget dan preferensi Anda."
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 py-32">
        <div className="container-custom px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800 mb-6">
              Layanan Pernikahan Kustom
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Buat layanan pernikahan yang sesuai dengan kebutuhan dan budget Anda. 
              Pilih layanan yang Anda inginkan dan kami akan menyesuaikan dengan preferensi Anda.
            </p>
          </div>

          {!showForm ? (
            /* Service Selection Page */
            <div className="max-w-6xl mx-auto">
              {/* Service Selection Header */}
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
                    Pilih Layanan
                  </h2>
                  <button
                    onClick={() => {
                      if (formData.services.length === serviceOptions.length) {
                        setFormData(prev => ({ ...prev, services: [] }));
                      } else {
                        setFormData(prev => ({ 
                          ...prev, 
                          services: serviceOptions.map(service => service.name) 
                        }));
                      }
                    }}
                    className={`w-full sm:w-auto px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.services.length === serviceOptions.length && serviceOptions.length > 0
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    {formData.services.length === serviceOptions.length && serviceOptions.length > 0 ? 'Hapus Semua' : 'Pilih Semua'}
                  </button>
                </div>
                
                {/* Selected Services Summary */}
                {formData.services.length > 0 && (
                  <div className="bg-white rounded-lg p-4 mb-6 border border-green-200">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <span className="text-gray-700">
                        <span className="font-medium">{formData.services.length}</span> layanan dipilih
                      </span>
                      <span className="text-lg font-bold text-primary-600">
                        Total: {formatRupiah(calculateTotalPrice())}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Service List */}
              <div className="grid gap-4">
                {serviceOptions.map((service) => (
                  <div
                    key={service.id}
                    className={`bg-white rounded-lg p-6 border-2 transition-all duration-200 ${
                      formData.services.includes(service.name)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                          <h3 className="text-xl font-semibold text-gray-800">
                            {service.name}
                          </h3>
                          {service.category && (
                            <span className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full self-start">
                              {service.category}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3">
                          {service.description}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                        <div className="text-left sm:text-right">
                          <div className="text-2xl font-bold text-primary-600">
                            {formatRupiah(service.price)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleServiceToggle(service)}
                          className={`w-full sm:w-auto px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                            formData.services.includes(service.name)
                              ? 'bg-primary-600 text-white hover:bg-primary-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {formData.services.includes(service.name) ? 'Dipilih' : 'Pilih'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Continue Button */}
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleContinueToForm}
                  disabled={formData.services.length === 0}
                  className={`px-8 py-3 rounded-lg text-lg font-medium transition-colors ${
                    formData.services.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Lanjutkan ({formData.services.length} dipilih)
                </button>
              </div>
            </div>
          ) : (
            /* Form Page */
            <div className="max-w-4xl mx-auto">
              {/* Form Header */}
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={handleBackToServices}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    ← Kembali ke Pilihan Layanan
                  </button>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
                  Informasi Pribadi
                </h2>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <span className="text-gray-700">
                      <span className="font-medium">{formData.services.length}</span> layanan dipilih
                    </span>
                    <span className="text-lg font-bold text-primary-600">
                      Total: {formatRupiah(calculateTotalPrice())}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="bg-white rounded-lg shadow-lg p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Personal Information */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Telepon</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Pernikahan</label>
                      <input
                        type="date"
                        name="wedding_date"
                        value={formData.wedding_date}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Tamu</label>
                      <input
                        type="number"
                        name="guest_count"
                        value={formData.guest_count}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rentang Budget</label>
                      <select
                        name="budget"
                        value={formData.budget}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Pilih rentang budget</option>
                        <option value="10-25">Rp 10.000.000 - Rp 25.000.000</option>
                        <option value="25-50">Rp 25.000.000 - Rp 50.000.000</option>
                        <option value="50-100">Rp 50.000.000 - Rp 100.000.000</option>
                        <option value="100+">Rp 100.000.000+</option>
                      </select>
                    </div>
                  </div>

                  {/* Additional Requests */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Permintaan Tambahan</label>
                    <textarea
                      name="additional_requests"
                      value={formData.additional_requests}
                      onChange={handleInputChange}
                      rows={6}
                      placeholder="Ceritakan tentang pernikahan impian Anda, persyaratan khusus, atau permintaan spesifik..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    ></textarea>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-end">
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="w-full sm:w-auto px-8 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                    >
                      Kembali ke Beranda
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:w-auto btn-primary"
                    >
                      Kirim Permintaan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Instructions Modal */}
      <PaymentInstructionsModal />
    </>
  );
};

export default CustomService; 