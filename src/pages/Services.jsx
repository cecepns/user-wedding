import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import toast from "react-hot-toast";
import PaymentInstructions from "../components/PaymentInstructions";

// Helper function to format price in Indonesian Rupiah format
const formatPrice = (price) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return 'Rp 0';
  return `Rp ${numPrice.toLocaleString('id-ID')}`;
};

const Services = () => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch("https://api-inventory.isavralabel.com/user-wedding/api/services");
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  const handleBookService = (service) => {
    setSelectedService(service);
    setShowBookingModal(true);
  };

  return (
    <>
      <Helmet>
        <title>Layanan Pernikahan - User Wedding</title>
        <meta
          name="description"
          content="Jelajahi layanan pernikahan komprehensif kami termasuk perencanaan, dekorasi, fotografi, dan lainnya."
        />
      </Helmet>

      <div className="pt-20">
        {/* Hero Section */}
        <section className="section-padding gradient-bg">
          <div className="container-custom text-center">
            <h1 className=" text-5xl lg:text-6xl font-bold text-gray-800 mb-6 animate-fade-in">
              Layanan Pernikahan Kami
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto animate-slide-up">
              Dari upacara intim hingga perayaan megah, kami menawarkan layanan
              pernikahan komprehensif yang disesuaikan untuk membuat hari
              spesial Anda sempurna.
            </p>
          </div>
        </section>

        {/* Services Grid */}
        <section className="section-padding bg-white">
          <div className="container-custom">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  index={index}
                  onBook={() => handleBookService(service)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Booking Modal */}
        {showBookingModal && (
          <BookingModal
            service={selectedService}
            onClose={() => setShowBookingModal(false)}
            onOrderSuccess={(data) => {
              setOrderData(data);
              setShowPaymentInstructions(true);
              setShowBookingModal(false);
            }}
          />
        )}

        {/* Payment Instructions Modal */}
        {showPaymentInstructions && orderData && (
          <PaymentInstructionsModal
            orderData={orderData}
            onClose={() => {
              setShowPaymentInstructions(false);
              setOrderData(null);
            }}
          />
        )}
      </div>
    </>
  );
};

const ServiceCard = ({ service, index, onBook }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchServiceItems();
  }, [service.id]);

  const fetchServiceItems = async () => {
    try {
      const response = await fetch(
        `https://api-inventory.isavralabel.com/user-wedding/api/services/${service.id}/items`
      );
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error("Error fetching service items:", error);
    }
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-lg overflow-hidden card-hover animate-slide-up"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <img
        src={
          service.image ||
          `https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=400`
        }
        alt={service.name}
        className="w-full h-48 object-cover"
      />
      <div className="p-6">
        <h3 className=" text-2xl font-semibold text-gray-800 mb-3">
          {service.name}
        </h3>
        <p className="text-gray-600 mb-4">{service.description}</p>

        {items.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-800 mb-2">Paket Termasuk:</h4>
            <ul className="space-y-1">
              {items.slice(0, 3).map((item) => (
                <li
                  key={item.id}
                  className="text-sm text-gray-600 flex justify-between"
                >
                  <span>• {item.name}</span>
                  <span className="font-medium">
                    {formatPrice(item.final_price || item.item_price || 0)}
                  </span>
                </li>
              ))}
              {items.length > 3 && (
                <li className="text-sm text-gray-500">
                  + {items.length - 3} item lainnya
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm text-gray-500">Mulai dari</span>
              <div className="text-2xl font-bold text-primary-600">
                {formatPrice(service.base_price)}
              </div>
            </div>
          </div>
          {/* <button onClick={onBook} className="btn-primary">
            Pesan Sekarang
          </button> */}
          <Link
            to={`/services/${service.id}`}
            className="w-full text-center block btn-primary font-medium"
          >
            Lihat Detail →
          </Link>
        </div>
      </div>
    </div>
  );
};

const PaymentInstructionsModal = ({ orderData, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="px-6 py-8">
            <PaymentInstructions
              totalAmount={orderData.total_amount}
              onComplete={onClose}
              onBack={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const BookingModal = ({ service, onClose, onOrderSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    wedding_date: "",
    notes: "",
  });
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    fetchServiceItems();
  }, [service.id]);

  const fetchServiceItems = async () => {
    try {
      const response = await fetch(
        `https://api-inventory.isavralabel.com/user-wedding/api/services/${service.id}/items`
      );
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error("Error fetching service items:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleItemToggle = (item) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) {
        return prev.filter((i) => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const calculateTotal = () => {
    return selectedItems.reduce(
      (total, item) => total + (item.final_price || item.item_price || 0),
      0
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const orderData = {
        ...formData,
        service_id: service.id,
        service_name: service.name,
        selected_items: selectedItems,
        total_amount: calculateTotal(),
        status: "pending",
      };

      const response = await fetch("https://api-inventory.isavralabel.com/user-wedding/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Pesanan berhasil ditempatkan! Silakan lanjutkan dengan pembayaran.");
        onOrderSuccess({ ...orderData, id: result.id });
      } else {
        toast.error("Error menempatkan pesanan. Silakan coba lagi.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error menempatkan pesanan. Silakan coba lagi.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className=" text-2xl font-bold text-gray-900">
                Pesan {service.name}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Customer Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg text-gray-800">
                    Informasi Pelanggan
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Lengkap
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telepon
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alamat
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Pernikahan
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catatan Tambahan
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Permintaan khusus atau informasi tambahan..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    ></textarea>
                  </div>
                </div>

                {/* Service Items */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg text-gray-800">
                    Pilih Item Layanan
                  </h4>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedItems.find((i) => i.id === item.id)
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-300 hover:border-primary-300"
                        }`}
                        onClick={() => handleItemToggle(item)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-800">
                              {item.name}
                            </h5>
                            <p className="text-sm text-gray-600 mt-1">
                              {item.description}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="font-bold text-primary-600">
                              {formatPrice(item.final_price || item.item_price || 0)}
                            </div>
                            <input
                              type="checkbox"
                              checked={
                                selectedItems.find((i) => i.id === item.id) !==
                                undefined
                              }
                              onChange={() => handleItemToggle(item)}
                              className="mt-2"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total Jumlah:</span>
                      <span className="text-primary-600">
                        {formatPrice(calculateTotal())}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={selectedItems.length === 0}
                >
                  Tempatkan Pesanan ({formatPrice(calculateTotal())})
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

PaymentInstructionsModal.propTypes = {
  orderData: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

ServiceCard.propTypes = {
  service: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onBook: PropTypes.func.isRequired,
};

BookingModal.propTypes = {
  service: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onOrderSuccess: PropTypes.func.isRequired,
};

export default Services;
