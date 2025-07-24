import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import CustomServiceModal from "../components/CustomServiceModal";
import heroImage from "../assets/hero-banner.jpg";

const Home = () => {
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [services, setServices] = useState([]);

  useEffect(() => {
    AOS.init({
      duration: 1000,
      easing: "ease-in-out",
      once: true,
      mirror: false,
    });
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch("https://api-inventory.isavralabel.com/user-wedding/api/services");
      const data = await response.json();
      setServices(data.slice(0, 3)); // Show only first 3 services
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  return (
    <>
      <Helmet>
        <title>User Wedding - Hari Pernikahan Sempurna Anda Menanti</title>
        <meta
          name="description"
          content="Ciptakan momen magis dengan User Wedding. Layanan perencanaan pernikahan profesional untuk membuat hari spesial Anda tak terlupakan."
        />
        <meta
          name="keywords"
          content="wedding planner, wedding organizer, jakarta wedding, wedding services"
        />
      </Helmet>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center gradient-bg hero-pattern overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>

        <div className="container-custom relative z-10 p-4 md:px-8 pt-24 md:pt-20">
          <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-12 items-center">
            <div data-aos="fade-right" data-aos-delay="200">
              <h1 className=" text-5xl lg:text-7xl font-bold text-gray-800 mb-6 leading-tight">
                Hari
                <span className="text-gradient block">Pernikahan</span>
                Sempurna Anda
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Wujudkan impian Anda menjadi kenyataan dengan layanan
                perencanaan pernikahan profesional kami. Dari upacara intim
                hingga perayaan megah, kami menciptakan momen magis yang abadi.
              </p>
              <div
                className="flex flex-col sm:flex-row gap-4"
                data-aos="fade-up"
                data-aos-delay="400"
              >
                <button
                  onClick={() => setIsCustomModalOpen(true)}
                  className="btn-primary"
                >
                  Rencanakan Pernikahan Saya
                </button>
                <Link to="/services" className="btn-primary-outline text-center">
                  Lihat Layanan
                </Link>
              </div>
            </div>

            <div className="relative" data-aos="fade-left" data-aos-delay="300">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-200 to-secondary-200 rounded-full blur-3xl opacity-30 animate-float"></div>
              <img
                src={heroImage}
                alt="Upacara pernikahan yang indah"
                className="relative z-10 w-full h-96 lg:h-[500px] object-cover rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding bg-slate-50">
        <div className="container-custom">
          <div className="text-center mb-16" data-aos="fade-up">
            <h2 className=" text-4xl lg:text-5xl font-bold text-gray-800 mb-6">
              Mengapa Memilih User Wedding?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Kami membawa pengalaman bertahun-tahun dan passion untuk membuat
              hari pernikahan Anda luar biasa
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "💍",
                title: "Perencanaan Ahli",
                description:
                  "Wedding planner profesional dengan pengalaman bertahun-tahun menciptakan perayaan sempurna",
              },
              {
                icon: "🎨",
                title: "Desain Kustom",
                description:
                  "Tema dan dekorasi yang dipersonalisasi sesuai dengan visi dan gaya unik Anda",
              },
              {
                icon: "✨",
                title: "Pengalaman Bebas Stres",
                description:
                  "Kami menangani setiap detail sehingga Anda bisa fokus menikmati hari spesial",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="text-center p-8 rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-lg card-hover"
                data-aos="fade-up"
                data-aos-delay={200 + index * 200}
              >
                <div className="text-6xl mb-6">{feature.icon}</div>
                <h3 className=" text-2xl font-semibold text-gray-800 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="text-center mb-16" data-aos="fade-up">
            <h2 className=" text-4xl lg:text-5xl font-bold text-gray-800 mb-6">
              Layanan Pernikahan Kami
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Dari pertemuan intim hingga perayaan megah, kami menawarkan solusi
              pernikahan lengkap
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {services.map((service, index) => (
              <div
                key={service.id}
                className="bg-whitbg-slate-50-2xl shadow-lg overflow-hidden card-hover"
                data-aos="fade-up"
                data-aos-delay={300 + index * 200}
              >
                <img
                  src={
                    service.image ||
                    `https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=400`
                  }
                  alt={service.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6 space-y-4">
                  <h3 className=" text-xl font-semibold text-gray-800 mb-3">
                    {service.name}
                  </h3>
                  <p className="text-gray-600 mb-4">{service.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-primary-600">
                      Rp {Math.floor(service.base_price)?.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="w-full">
                    <Link
                      to={`/services/${service.id}`}
                      className="w-full text-center block btn-primary font-medium"
                    >
                      Lihat Detail →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* <div className="text-center" data-aos="fade-up" data-aos-delay="600">
            <Link to="/services" className="btn-primary">
              Lihat Semua Layanan
            </Link>
          </div> */}
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-900/20 to-secondary-900/20"></div>
        <div className="container-custom relative z-10">
          <div className="text-center max-w-4xl mx-auto" data-aos="fade-up">
            <h2 className=" text-4xl lg:text-5xl font-bold mb-6">
              Siap Merencanakan Pernikahan Impian Anda?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Mari mulai menciptakan hari sempurna yang selalu Anda impikan.
              Hubungi kami untuk konsultasi gratis.
            </p>
            <div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              data-aos="fade-up"
              data-aos-delay="300"
            >
              <button
                onClick={() => setIsCustomModalOpen(true)}
                className="bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 hover:scale-105"
              >
                Custom Sesuai Keinginan Anda
              </button>
              <Link
                to="/contact"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-gray-900 transition-all duration-300"
              >
                Booking Konsultasi
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Service Modal */}
      <CustomServiceModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
      />
    </>
  );
};

export default Home;
