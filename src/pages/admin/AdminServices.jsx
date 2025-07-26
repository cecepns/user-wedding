import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';

// Utility function for Indonesian Rupiah formatting
const formatRupiah = (amount) => {
  if (!amount && amount !== 0) return 'Rp 0';
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const AdminServices = () => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [serviceItems, setServiceItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [editingServiceItem, setEditingServiceItem] = useState(null);

  useEffect(() => {
    fetchServices();
    fetchAvailableItems();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/user-wedding/api/services');
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchAvailableItems = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/user-wedding/api/items');
      const data = await response.json();
      setAvailableItems(data);
    } catch (error) {
      console.error('Error fetching available items:', error);
    }
  };

  const fetchServiceItems = async (serviceId) => {
    try {
      const response = await fetch(`https://api-inventory.isavralabel.com/user-wedding/api/services/${serviceId}/items`);
      const data = await response.json();
      setServiceItems(data);
    } catch (error) {
      console.error('Error fetching service items:', error);
    }
  };

  const handleServiceSubmit = async (serviceData) => {
    try {
      const url = serviceData.id 
        ? `https://api-inventory.isavralabel.com/user-wedding/api/services/${serviceData.id}`
        : 'https://api-inventory.isavralabel.com/user-wedding/api/services';
      
      const method = serviceData.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(serviceData),
      });

      if (response.ok) {
        fetchServices();
        setShowServiceModal(false);
        toast.success('Layanan berhasil disimpan!');
      } else {
        toast.error('Error menyimpan layanan');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menyimpan layanan');
    }
  };

  const handleDeleteService = async (id) => {
    const confirmed = await new Promise((resolve) => {
      toast((t) => (
        <div className="flex items-center gap-3">
          <span>Apakah Anda yakin ingin menghapus layanan ini?</span>
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
      const response = await fetch(`https://api-inventory.isavralabel.com/user-wedding/api/services/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        fetchServices();
        toast.success('Layanan berhasil dihapus!');
      } else {
        toast.error('Error menghapus layanan');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menghapus layanan');
    }
  };

  const handleAddItemToService = async (itemData) => {
    try {
      const url = `https://api-inventory.isavralabel.com/user-wedding/api/services/${selectedService.id}/items`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(itemData),
      });

      if (response.ok) {
        fetchServiceItems(selectedService.id);
        setShowItemModal(false);
        toast.success('Item berhasil ditambahkan ke layanan!');
      } else {
        const errorData = await response.json();
        toast.error(`Error menambahkan item: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menambahkan item');
    }
  };

  const handleUpdateServiceItem = async (itemData) => {
    try {
      const url = `https://api-inventory.isavralabel.com/user-wedding/api/service-items/${editingServiceItem.id}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(itemData),
      });

      if (response.ok) {
        fetchServiceItems(selectedService.id);
        setShowItemModal(false);
        setEditingServiceItem(null);
        toast.success('Item layanan berhasil diperbarui!');
      } else {
        toast.error('Error memperbarui item layanan');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error memperbarui item layanan');
    }
  };

  const handleDeleteServiceItem = async (id) => {
    const confirmed = await new Promise((resolve) => {
      toast((t) => (
        <div className="flex items-center gap-3">
          <span>Apakah Anda yakin ingin menghapus item ini dari layanan?</span>
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
      const response = await fetch(`https://api-inventory.isavralabel.com/user-wedding/api/service-items/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        fetchServiceItems(selectedService.id);
        toast.success('Item berhasil dihapus dari layanan!');
      } else {
        toast.error('Error menghapus item dari layanan');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menghapus item dari layanan');
    }
  };

  return (
    <>
      <Helmet>
        <title>Kelola Layanan - Dashboard Admin</title>
      </Helmet>

      <Toaster position="top-right" />

      <AdminLayout>
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Kelola Layanan</h1>
              <p className="text-gray-600">Buat dan kelola layanan pernikahan Anda beserta item-itemnya.</p>
            </div>
            <button
              onClick={() => setShowServiceModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Tambah Layanan Baru
            </button>
          </div>
        </div>

        {/* Services Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Layanan
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deskripsi
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga Dasar
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{service.name}</div>
                        {service.image && (
                          <div className="mt-1">
                            <img 
                              src={service.image} 
                              alt={service.name}
                              className="w-12 h-12 rounded-lg object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {service.description}
                      </div>
                    </td>
                                         <td className="px-6 py-4 whitespace-nowrap">
                       <div className="text-sm font-bold text-primary-600">
                         {formatRupiah(service.base_price)}
                       </div>
                     </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedService(service);
                          fetchServiceItems(service.id);
                        }}
                        className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 text-sm"
                      >
                        <Package size={16} />
                        Kelola Item
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedService(service);
                            setShowServiceModal(true);
                          }}
                          className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="text-red-600 hover:text-red-700 flex items-center gap-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Service Items Preview */}
        {selectedService && (
          <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-lg text-gray-800">
                Item Layanan: {selectedService.name}
              </h4>
              <button
                onClick={() => setShowItemModal(true)}
                className="bg-secondary-500 text-white px-4 py-2 rounded-lg hover:bg-secondary-600 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Tambah Item
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama Item
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Harga
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {serviceItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.description}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.is_required ? (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                            Wajib
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                            Opsional
                          </span>
                        )}
                      </td>
                                             <td className="px-4 py-3 whitespace-nowrap">
                         <div className="text-sm font-bold text-secondary-600">
                           {formatRupiah(item.final_price)}
                         </div>
                         {item.custom_price && (
                           <div className="text-xs text-gray-500">
                             Asli: {formatRupiah(item.item_price)}
                           </div>
                         )}
                       </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setEditingServiceItem(item);
                              setShowItemModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <Edit size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteServiceItem(item.id)}
                            className="text-red-600 hover:text-red-700 flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Service Modal */}
        {showServiceModal && (
          <ServiceModal
            service={selectedService}
            onSubmit={handleServiceSubmit}
            onClose={() => {
              setShowServiceModal(false);
              setSelectedService(null);
            }}
          />
        )}

        {/* Item Modal */}
        {showItemModal && (
          <ServiceItemModal
            serviceItem={editingServiceItem}
            availableItems={availableItems}
            onSubmit={editingServiceItem ? handleUpdateServiceItem : handleAddItemToService}
            onClose={() => {
              setShowItemModal(false);
              setEditingServiceItem(null);
            }}
          />
        )}
      </AdminLayout>
    </>
  );
};

const ServiceModal = ({ service, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    description: service?.description || '',
    base_price: service?.base_price || '',
    image: service?.image || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      id: service?.id,
      base_price: parseFloat(formData.base_price)
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-lg my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="px-6 py-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {service ? 'Edit Layanan' : 'Tambah Layanan Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Layanan</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Harga Dasar (Rp)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.base_price}
                  onChange={(e) => setFormData({...formData, base_price: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">URL Gambar</label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({...formData, image: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  {service ? 'Perbarui Layanan' : 'Buat Layanan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const ServiceItemModal = ({ serviceItem, availableItems, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    item_id: serviceItem?.item_id || '',
    custom_price: serviceItem?.custom_price || '',
    is_required: serviceItem?.is_required || false,
    sort_order: serviceItem?.sort_order || 0
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      custom_price: formData.custom_price ? parseFloat(formData.custom_price) : null
    });
  };

  const selectedItem = availableItems.find(item => item.id == formData.item_id);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-lg my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="px-6 py-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {serviceItem ? 'Edit Item Layanan' : 'Tambah Item ke Layanan'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Item</label>
                <select
                  value={formData.item_id}
                  onChange={(e) => setFormData({...formData, item_id: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Pilih item...</option>
                  {availableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {formatRupiah(item.price)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedItem && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">{selectedItem.name}</h4>
                  <p className="text-gray-600 text-sm mb-2">{selectedItem.description}</p>
                  <p className="text-sm text-gray-500">Kategori: {selectedItem.category}</p>
                  <p className="text-sm text-gray-500">Harga: {formatRupiah(selectedItem.price)}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Harga Kustom (Opsional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.custom_price}
                  onChange={(e) => setFormData({...formData, custom_price: e.target.value})}
                  placeholder="Biarkan kosong untuk menggunakan harga default"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Jika diisi, akan menggantikan harga default item
                </p>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_required}
                    onChange={(e) => setFormData({...formData, is_required: e.target.checked})}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Item Wajib</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Item wajib akan otomatis dipilih saat customer memilih layanan ini
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Urutan</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  {serviceItem ? 'Perbarui Item' : 'Tambah Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminServices;