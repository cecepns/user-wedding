import { Helmet } from 'react-helmet-async';

const About = () => {
  const teamMembers = [
    {
      name: "Sarah Johnson",
      role: "Lead Wedding Planner",
      image: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400",
      bio: "Dengan pengalaman lebih dari 10 tahun, Sarah mengkhususkan diri dalam menciptakan pernikahan impian yang mencerminkan cerita unik setiap pasangan."
    },
    {
      name: "Michael Chen",
      role: "Event Coordinator",
      image: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400",
      bio: "Michael memastikan setiap detail berjalan lancar pada hari pernikahan Anda dengan keterampilan organisasi yang luar biasa."
    },
    {
      name: "Emily Rodriguez",
      role: "Design Specialist",
      image: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400",
      bio: "Emily menghidupkan visi artistik, menciptakan dekorasi dan tema yang menakjubkan untuk perayaan yang tak terlupakan."
    }
  ];

  return (
    <>
      <Helmet>
        <title>Tentang Kami - User Wedding</title>
        <meta name="description" content="Pelajari tentang tim User Wedding dan misi kami untuk menciptakan perayaan pernikahan yang sempurna." />
      </Helmet>

      <div className="pt-20">
        {/* Hero Section */}
        <section className="section-padding gradient-bg">
          <div className="container-custom">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="animate-fade-in">
                <h1 className=" text-5xl lg:text-6xl font-bold text-gray-800 mb-6">
                  Tentang User Wedding
                </h1>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  Kami bersemangat menciptakan momen magis dan mewujudkan impian pernikahan Anda menjadi kenyataan. 
                  Dengan pengalaman bertahun-tahun dan perhatian pada detail, kami memastikan hari spesial Anda sempurna.
                </p>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary-600">500+</div>
                    <div className="text-gray-600">Pernikahan Direncanakan</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary-600">10+</div>
                    <div className="text-gray-600">Tahun Pengalaman</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary-600">98%</div>
                    <div className="text-gray-600">Pasangan Bahagia</div>
                  </div>
                </div>
              </div>
              <div className="animate-slide-up">
                <img
                  src="https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Tim perencanaan pernikahan"
                  className="w-full h-96 object-cover rounded-2xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="section-padding bg-white">
          <div className="container-custom">
            <div className="text-center mb-16">
              <h2 className=" text-4xl lg:text-5xl font-bold text-gray-800 mb-6 animate-fade-in">
                Misi Kami
              </h2>
              <p className="text-xl text-gray-600 max-w-4xl mx-auto animate-slide-up">
                Menciptakan pengalaman pernikahan luar biasa yang melampaui ekspektasi dan menciptakan kenangan abadi. 
                Kami percaya setiap pasangan layak mendapat perayaan yang unik seperti kisah cinta mereka.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: "Layanan Personal",
                  description: "Setiap pernikahan unik, dan kami menyesuaikan layanan kami dengan visi dan preferensi Anda.",
                  icon: "💖"
                },
                {
                  title: "Perhatian pada Detail",
                  description: "Dari dekorasi terkecil hingga gestur terbesar, kami memastikan kesempurnaan dalam setiap elemen.",
                  icon: "✨"
                },
                {
                  title: "Perencanaan Bebas Stres",
                  description: "Kami menangani semua logistik sehingga Anda bisa fokus menikmati masa tunangan dan hari spesial.",
                  icon: "🎯"
                }
              ].map((value, index) => (
                <div
                  key={index}
                  className="text-center p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-white shadow-lg card-hover animate-slide-up"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="text-6xl mb-6">{value.icon}</div>
                  <h3 className=" text-2xl font-semibold text-gray-800 mb-4">
                    {value.title}
                  </h3>
                  <p className="text-gray-600">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        {/* <section className="section-padding gradient-bg">
          <div className="container-custom">
            <div className="text-center mb-16">
              <h2 className=" text-4xl lg:text-5xl font-bold text-gray-800 mb-6 animate-fade-in">
                Kenali Tim Kami
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto animate-slide-up">
                Tim profesional pernikahan kami yang berpengalaman berdedikasi untuk membuat hari Anda sempurna.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {teamMembers.map((member, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden card-hover animate-scale-in"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-64 object-cover"
                  />
                  <div className="p-6">
                    <h3 className=" text-xl font-semibold text-gray-800 mb-2">
                      {member.name}
                    </h3>
                    <p className="text-primary-600 font-medium mb-3">{member.role}</p>
                    <p className="text-gray-600">{member.bio}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section> */}

        {/* CTA Section */}
        <section className="section-padding bg-gray-900 text-white">
          <div className="container-custom text-center">
            <h2 className=" text-4xl lg:text-5xl font-bold mb-6 animate-fade-in">
              Siap Mulai Merencanakan?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto animate-slide-up">
              Mari ciptakan pernikahan impian Anda bersama. Hubungi kami untuk konsultasi gratis.
            </p>
            <a
              href="/contact"
              className="inline-block bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 hover:scale-105"
            >
              Mulai Hari Ini
            </a>
          </div>
        </section>
      </div>
    </>
  );
};

export default About;