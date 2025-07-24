import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import { formatRupiah } from '../utils/formatters';
import jsPDF from 'jspdf';

const CustomServiceModal = ({ isOpen, onClose }) => {
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

  useEffect(() => {
    if (isOpen) {
      fetchServiceOptions();
    }
  }, [isOpen]);

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

  const handleDownloadInvoice = () => {
    const doc = new jsPDF();
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('User Wedding Organizer', 20, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Jl. Raya panongan Kec. Panongan Kab. Tangerang Provinsi Banten', 20, 30);
    doc.text('Telephone: 089646829459', 20, 37);
    doc.text('Email: edo19priyatno@gmail.com', 20, 44);
    doc.text('Website: https://sites.google.com/view/userwedding/beranda', 20, 51);
    // Invoice details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 150, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice Date: ${new Date().toLocaleDateString('id-ID')}`, 150, 37);
    // Bill To
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, 70);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(formData.name, 20, 77);
    doc.text(formData.email, 20, 84);
    doc.text(formData.phone, 20, 91);
    doc.text(`Wedding Date: ${formData.wedding_date}`, 20, 98);
    // Service table header
    const startY = 115;
    doc.setFillColor(52, 152, 219);
    doc.rect(20, startY, 170, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('No.', 25, startY + 6);
    doc.text('Layanan', 40, startY + 6);
    doc.text('Harga', 170, startY + 6, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    // Service items
    let currentY = startY + 15;
    formData.services.forEach((serviceName, idx) => {
      const service = serviceOptions.find(s => s.name === serviceName);
      let price = service ? service.price : 0;
      if (typeof price === 'string') price = parseFloat(price);
      doc.setFontSize(10);
      doc.text(`${idx + 1}`, 25, currentY);
      doc.text(serviceName, 40, currentY);
      doc.text(formatRupiah(isNaN(price) ? 0 : price), 170, currentY, { align: 'right' });
      currentY += 7;
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
    });
    // Total
    currentY += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total', 40, currentY);
    doc.text(formatRupiah(calculateTotalPrice()), 170, currentY, { align: 'right' });
    // Footer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Terima kasih telah menggunakan layanan kami!', 105, 280, { align: 'center' });
    doc.save(`invoice-custom-${formData.name || 'order'}-${new Date().toISOString().split('T')[0]}.pdf`);
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
        toast.success('Permintaan layanan kustom berhasil dikirim! Kami akan menghubungi Anda segera.');
        setFormData({
          name: '',
          email: '',
          phone: '',
          wedding_date: '',
          guest_count: '',
          budget: '',
          services: [],
          additional_requests: ''
        });
        onClose();
      } else {
        toast.error('Error mengirim permintaan. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error mengirim permintaan. Silakan coba lagi.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className=" text-2xl font-bold text-gray-900">
                Permintaan Layanan Pernikahan Kustom
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
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
              </div>

              <div className="grid md:grid-cols-2 gap-4">
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
              </div>

              <div className="grid md:grid-cols-2 gap-4">
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

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Layanan yang Diperlukan</label>
                  {formData.services.length > 0 && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{formData.services.length}</span> layanan dipilih • 
                      Total: <span className="font-bold text-primary-600">{formatRupiah(calculateTotalPrice())}</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  {serviceOptions.map((service) => (
                    <label key={service.id} className="flex items-start space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.services.includes(service.name)}
                        onChange={() => handleServiceToggle(service)}
                        className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{service.name}</span>
                            {service.description && (
                              <p className="text-xs text-gray-500 mt-1">{service.description}</p>
                            )}
                            {service.category && (
                              <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full mt-1">
                                {service.category}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-bold text-primary-600 ml-2">
                            {formatRupiah(service.price)}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permintaan Tambahan</label>
                <textarea
                  name="additional_requests"
                  value={formData.additional_requests}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Ceritakan tentang pernikahan impian Anda, persyaratan khusus, atau permintaan spesifik..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                {/* Placeholder for Download Invoice button, will implement after */}
                {formData.services.length > 0 && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleDownloadInvoice}
                  >
                    Download Invoice
                  </button>
                )}
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Kirim Permintaan
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

CustomServiceModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default CustomServiceModal;