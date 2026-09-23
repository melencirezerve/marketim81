// Uygulama içi yasal metinler. [KÖŞELİ PARANTEZ] içindeki alanlar işletme
// bilgileriyle doldurulmalı ve metinler yayından önce bir hukukçuya
// kontrol ettirilmelidir.

export type YasalSayfa = 'kvkk' | 'gizlilik' | 'kullanim' | 'mesafeli-satis';

type Metin = { baslik: string; bolumler: { baslik: string; metin: string }[] };

const SIRKET = '[ŞİRKET UNVANI]';
const ADRES = '[İŞLETME ADRESİ], Cumayeri/Düzce';
const ILETISIM = 'destek@siparis81.com · 0850 255 20 81';

export const SON_GUNCELLEME = '23 Eylül 2026';

export const YASAL_METINLER: Record<YasalSayfa, Metin> = {
  kvkk: {
    baslik: 'KVKK Aydınlatma Metni',
    bolumler: [
      {
        baslik: 'Veri Sorumlusu',
        metin: `6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca kişisel verileriniz, veri sorumlusu sıfatıyla ${SIRKET} ("Marketim81") tarafından aşağıda açıklanan kapsamda işlenmektedir. Adres: ${ADRES}.`,
      },
      {
        baslik: 'İşlenen Kişisel Veriler',
        metin:
          'Kimlik (ad soyad), iletişim (cep telefonu numarası), teslimat adresi, sipariş ve işlem bilgileri (sipariş içeriği, tutar, ödeme yöntemi, tarih) ile uygulama kullanımına ilişkin teknik veriler (cihaz bildirim izni).',
      },
      {
        baslik: 'İşleme Amaçları',
        metin:
          'Üyelik oluşturma ve telefon numarasıyla kimlik doğrulama (SMS doğrulama kodu), siparişlerin alınması, hazırlanması ve adresinize teslimi, sipariş durumu hakkında bilgilendirme, müşteri destek taleplerinin yanıtlanması, yasal yükümlülüklerin (vergi ve ticaret mevzuatı) yerine getirilmesi.',
      },
      {
        baslik: 'Hukuki Sebepler',
        metin:
          'Verileriniz KVKK m.5/2-c (sözleşmenin kurulması ve ifası), m.5/2-ç (hukuki yükümlülüğün yerine getirilmesi) ve m.5/2-f (meşru menfaat) hukuki sebeplerine dayanılarak işlenir.',
      },
      {
        baslik: 'Aktarım',
        metin:
          'Verileriniz; altyapı ve veri barındırma hizmeti alınan tedarikçilere (veritabanı ve SMS doğrulama hizmet sağlayıcıları, yurt dışında bulunabilir), teslimatı yapan kurye personeline (yalnızca ad, telefon ve adres) ve talep halinde yetkili kamu kurumlarına aktarılabilir.',
      },
      {
        baslik: 'Saklama Süresi',
        metin:
          'Hesabınızı sildiğinizde ad, telefon ve adres bilgileriniz silinir. Sipariş kayıtları mevzuatın öngördüğü süre boyunca kişisel bilgilerinizden arındırılarak saklanır.',
      },
      {
        baslik: 'Haklarınız',
        metin: `KVKK m.11 kapsamında verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya silinmesini isteme, aktarıldığı üçüncü kişileri bilme ve zarara uğramanız halinde tazminat talep etme haklarına sahipsiniz. Taleplerinizi ${ILETISIM} üzerinden iletebilirsiniz. Hesabınızı uygulamadaki Ayarlar > Hesabımı Sil adımıyla dilediğiniz zaman silebilirsiniz.`,
      },
    ],
  },
  gizlilik: {
    baslik: 'Gizlilik Politikası',
    bolumler: [
      {
        baslik: 'Genel',
        metin:
          'Bu politika, Marketim81 mobil uygulamasını kullanırken hangi bilgilerin toplandığını ve nasıl korunduğunu açıklar. Kişisel verilerin işlenmesine ilişkin ayrıntılar KVKK Aydınlatma Metni\'nde yer alır.',
      },
      {
        baslik: 'Toplanan Bilgiler',
        metin:
          'Giriş için cep telefonu numaranız, siparişlerinizde görünecek adınız, eklediğiniz teslimat adresleri ve verdiğiniz siparişler. Konum, rehber, fotoğraf gibi cihaz verilerinize erişilmez.',
      },
      {
        baslik: 'Ödeme Bilgileri',
        metin:
          'Uygulama şu an yalnızca kapıda ödeme (nakit veya kart) kabul eder. Kart bilgileriniz uygulamada veya sunucularımızda saklanmaz.',
      },
      {
        baslik: 'Bildirimler',
        metin:
          'İzin verdiğiniz takdirde sipariş durumunuzla ilgili bildirimler gönderilir. Bildirim tercihlerinizi Ayarlar > Bildirim İzinleri ekranından değiştirebilirsiniz.',
      },
      {
        baslik: 'Güvenlik',
        metin:
          'Verileriniz şifreli bağlantı (HTTPS) üzerinden iletilir ve yalnızca yetkili personelin erişebildiği sistemlerde saklanır. Her kullanıcı yalnızca kendi adres ve siparişlerini görebilir.',
      },
      {
        baslik: 'Hesap Silme',
        metin:
          'Ayarlar > Hesabımı Sil adımıyla hesabınızı ve kişisel bilgilerinizi kalıcı olarak silebilirsiniz. Devam eden bir siparişiniz varsa önce teslim edilmesi veya iptal edilmesi gerekir.',
      },
      {
        baslik: 'İletişim',
        metin: `Sorularınız için: ${ILETISIM}.`,
      },
    ],
  },
  kullanim: {
    baslik: 'Kullanım Şartları',
    bolumler: [
      {
        baslik: 'Taraflar ve Kapsam',
        metin: `Bu şartlar, ${SIRKET} tarafından işletilen Marketim81 uygulamasının kullanımını düzenler. Uygulamaya giriş yaparak bu şartları kabul etmiş sayılırsınız.`,
      },
      {
        baslik: 'Hizmet Bölgesi',
        metin: 'Teslimat şu an yalnızca Cumayeri/Düzce sınırları içindeki adreslere yapılmaktadır.',
      },
      {
        baslik: 'Üyelik',
        metin:
          'Üyelik cep telefonu numarası ve SMS doğrulama kodu ile oluşturulur. Hesabınızın güvenliğinden ve doğrulama kodunu başkalarıyla paylaşmamaktan siz sorumlusunuz. 18 yaşından küçükler veli izni olmadan sipariş veremez.',
      },
      {
        baslik: 'Fiyat ve Stok',
        metin:
          'Ürün fiyatları ve stok durumu sipariş anında kesinleşir. Stokta olmayan ürünler için sipariş alınmaz. Minimum sipariş tutarı ve teslimat ücreti sepet ekranında gösterilir.',
      },
      {
        baslik: 'Sipariş ve İptal',
        metin:
          'Siparişiniz hazırlanmaya başlamadan önce Siparişlerim ekranından iptal edebilirsiniz. Hazırlanmaya başlamış siparişler için destek hattımızla iletişime geçin.',
      },
      {
        baslik: 'Kötüye Kullanım',
        metin:
          'Gerçeğe aykırı adres veya bilgilerle sipariş verilmesi, teslim alınmayan tekrarlı siparişler ya da uygulamanın kötüye kullanılması halinde hesap askıya alınabilir.',
      },
      {
        baslik: 'Değişiklikler',
        metin: 'Bu şartlar güncellenebilir; güncel metin her zaman uygulama içinde yayımlanır.',
      },
    ],
  },
  'mesafeli-satis': {
    baslik: 'Mesafeli Satış Sözleşmesi',
    bolumler: [
      {
        baslik: 'Satıcı',
        metin: `Unvan: ${SIRKET}\nAdres: ${ADRES}\nMERSİS / Vergi No: [MERSİS NO]\nİletişim: ${ILETISIM}`,
      },
      {
        baslik: 'Alıcı',
        metin: 'Uygulamada siparişi veren, hesabında kayıtlı ad ve telefon numarası ile siparişte seçtiği teslimat adresine sahip kişidir.',
      },
      {
        baslik: 'Konu',
        metin:
          'Bu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, alıcının uygulama üzerinden sipariş verdiği ürünlerin satışı ve teslimine ilişkin tarafların hak ve yükümlülüklerini düzenler. Ürünlerin adı, adedi, satış fiyatı (KDV dahil), teslimat ücreti ve ödeme yöntemi sipariş özetinde ve sipariş detayında yer alır.',
      },
      {
        baslik: 'Teslimat',
        metin: 'Ürünler, siparişte belirtilen adrese genellikle 30-60 dakika içinde teslim edilir. Teslimat süresi yoğunluğa göre değişebilir.',
      },
      {
        baslik: 'Ödeme',
        metin: 'Ödeme teslimat sırasında kuryeye nakit veya kart ile yapılır.',
      },
      {
        baslik: 'Cayma Hakkı',
        metin:
          'Mesafeli Sözleşmeler Yönetmeliği m.15 uyarınca çabuk bozulabilen veya son kullanma tarihi geçme ihtimali olan mallar ile tüketicinin anlık veya günlük ihtiyaçlarına yönelik gıda, içecek ve diğer günlük tüketim maddelerinde cayma hakkı bulunmamaktadır. Hasarlı, eksik veya hatalı teslim edilen ürünler için teslimattan itibaren 24 saat içinde destek hattımıza başvurabilirsiniz.',
      },
      {
        baslik: 'Uyuşmazlık',
        metin:
          'Uyuşmazlıklarda, Ticaret Bakanlığınca ilan edilen parasal sınırlar dahilinde tüketicinin yerleşim yerindeki Tüketici Hakem Heyetleri ile Tüketici Mahkemeleri yetkilidir.',
      },
    ],
  },
};
