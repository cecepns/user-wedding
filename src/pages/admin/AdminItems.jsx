import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Edit, Trash2 } from 'lucide-react';
import PropTypes from 'prop-types';
import toast, { Toaster } from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { formatRupiah } from '../../utils/formatters';

const AdminItems = () => {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/user-wedding/api/items');
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('https://api-inventory.isavralabel.com/user-wedding/api/items/categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleItemSubmit = async (itemData) => {
    try {
      const url = itemData.id 
        ? `https://api-inventory.isavralabel.com/user-wedding/api/items/${itemData.id}`
        : 'https://api-inventory.isavralabel.com/user-wedding/api/items';
      
      const method = itemData.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(itemData),
      });

      if (response.ok) {
        fetchItems();
        setShowItemModal(false);
        toast.success('Item berhasil disimpan!');
      } else {
        const errorData = await response.json();
        toast.error(`Error menyimpan item: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menyimpan item');
    }
  };

  const handleDeleteItem = async (id) => {
    const confirmed = await new Promise((resolve) => {
      toast((t) => (
        <div className="flex items-center gap-3">
          <span>Apakah Anda yakin ingin menghapus item ini?</span>
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
      const response = await fetch(`https://api-inventory.isavralabel.com/user-wedding/api/items/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        fetchItems();
        toast.success('Item berhasil dihapus!');
      } else {
        const errorData = await response.json();
        toast.error(`Error menghapus item: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error menghapus item');
    }
  };

  const filteredItems = selectedCategory === 'all' 
    ? items 
    : items.filter(item => item.category === selectedCategory);

  return (
    <>
      <Helmet>
        <title>Kelola Item - Dashboard Admin</title>
      </Helmet>

      <Toaster position="top-right" />

      <AdminLayout>
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Kelola Item</h1>
              <p className="text-gray-600">Buat dan kelola item-item yang dapat digunakan dalam layanan pernikahan.</p>
            </div>
            <button
              onClick={() => setShowItemModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Tambah Item Baru
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter Kategori:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Item
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga
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
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded-full">
                        {item.category}
                      </span>
                    </td>
                      
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-primary-600">
                        {formatRupiah(item.price)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.is_active !== false 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.is_active !== false ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowItemModal(true);
                          }}
                          className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
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
          
          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-sm">
                Tidak ada item yang ditemukan
              </div>
            </div>
          )}
        </div>

        {/* Item Modal */}
        {showItemModal && (
          <ItemModal
            item={selectedItem}
            onSubmit={handleItemSubmit}
            onClose={() => {
              setShowItemModal(false);
              setSelectedItem(null);
            }}
          />
        )}
      </AdminLayout>
    </>
  );
};

const ItemModal = ({ item, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || '',
    category: item?.category || '',
    is_active: item?.is_active !== false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      id: item?.id,
      price: parseFloat(formData.price)
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-lg my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="px-6 py-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {item ? 'Edit Item' : 'Tambah Item Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Item</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Harga (Rp)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  placeholder="Contoh: Decoration, Photography, Catering"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {item && (
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Item Aktif</span>
                  </label>
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  {item ? 'Perbarui Item' : 'Buat Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

ItemModal.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    description: PropTypes.string,
    price: PropTypes.number,
    category: PropTypes.string,
    is_active: PropTypes.bool
  }),
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

export default AdminItems; 