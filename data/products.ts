import type { ImageSourcePropType } from 'react-native';

export type Category = {
  id: string;
  ad: string;
  icon: string;
  gorsel: ImageSourcePropType;
};

export type Product = {
  id: string;
  ad: string;
  fiyat: number;
  stok: number;
  barkod: string;
  kategori: string;
  altKategori: string;
  icon: string;
  gorsel: string;
};

export const categories: Category[] = [
  { id: 'tumu', ad: 'Tümü', icon: 'view-grid-outline', gorsel: { uri: 'https://plus.unsplash.com/premium_photo-1664527305901-a3c8bec62850?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200' } },
  { id: 'firin', ad: 'Fırın', icon: 'bread-slice-outline', gorsel: { uri: 'https://plus.unsplash.com/premium_photo-1664640733898-d5c3f71f44e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200' } },
  { id: 'sut', ad: 'Süt Ürünleri', icon: 'cup-outline', gorsel: require('../assets/images/kategori-sut.png') },
  { id: 'icecek', ad: 'İçecek', icon: 'coffee-outline', gorsel: require('../assets/images/kategori-icecek.png') },
  { id: 'atistirmalik', ad: 'Atıştırmalık', icon: 'cookie-outline', gorsel: require('../assets/images/kategori-atistirmalik.png') },
  { id: 'temizlik', ad: 'Temizlik', icon: 'spray-bottle', gorsel: { uri: 'https://plus.unsplash.com/premium_photo-1681154819686-43fcc4dc4df3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200' } },
  { id: 'meyve-sebze', ad: 'Meyve & Sebze', icon: 'food-apple-outline', gorsel: require('../assets/images/kategori-manav.png') },
  { id: 'kahvaltilik', ad: 'Kahvaltılık', icon: 'egg-fried', gorsel: { uri: 'https://plus.unsplash.com/premium_photo-1670839413382-3d426c2451e0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200' } },
  { id: 'dondurulmus', ad: 'Dondurulmuş Ürünler', icon: 'snowflake', gorsel: { uri: 'https://plus.unsplash.com/premium_photo-1757479571345-3c76958eed25?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200' } },
  { id: 'dondurma', ad: 'Dondurma', icon: 'ice-cream', gorsel: { uri: 'https://plus.unsplash.com/premium_photo-1666920428775-ec9ddeaae574?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200' } },
  { id: 'kisisel-bakim', ad: 'Kişisel Bakım & Kozmetik', icon: 'lotion-outline', gorsel: { uri: 'https://plus.unsplash.com/premium_photo-1684407616442-8d5a1b7c978e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200' } },
  { id: 'kagit-urunleri', ad: 'Kağıt Ürünleri', icon: 'paper-roll-outline', gorsel: { uri: 'https://plus.unsplash.com/premium_photo-1682148737203-8118bb2b3e07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200' } },
];

export const products: Product[] = [
  // Fırın
  { id: '1', ad: 'Ekmek', fiyat: 15, stok: 50, barkod: '8690000000011', kategori: 'Fırın', altKategori: 'Ekmek', icon: 'bread-slice-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1664640733898-d5c3f71f44e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '2', ad: 'Simit', fiyat: 12, stok: 35, barkod: '8690000000012', kategori: 'Fırın', altKategori: 'Simit & Poğaça', icon: 'food-croissant', gorsel: 'https://plus.unsplash.com/premium_photo-1691598048488-04d4d62286cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '3', ad: 'Tost Ekmeği (Büyük)', fiyat: 28, stok: 40, barkod: '8690000000013', kategori: 'Fırın', altKategori: 'Ekmek', icon: 'bread-slice-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1675727579991-16042ead1ddf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '4', ad: 'Poğaça', fiyat: 18, stok: 30, barkod: '8690000000014', kategori: 'Fırın', altKategori: 'Simit & Poğaça', icon: 'food-croissant', gorsel: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '5', ad: 'Kruvasan', fiyat: 22, stok: 25, barkod: '8690000000015', kategori: 'Fırın', altKategori: 'Kruvasan & Pasta', icon: 'food-croissant', gorsel: 'https://plus.unsplash.com/premium_photo-1725986663085-69be91a0c3af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '6', ad: 'Baget Ekmek', fiyat: 20, stok: 28, barkod: '8690000000016', kategori: 'Fırın', altKategori: 'Ekmek', icon: 'bread-slice-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1677686707023-9ac1e4f75a87?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },

  // Süt Ürünleri
  { id: '7', ad: 'Tam Yağlı Süt (1 L)', fiyat: 45, stok: 30, barkod: '8690000000028', kategori: 'Süt Ürünleri', altKategori: 'Süt', icon: 'bottle-tonic-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1694481100261-ab16523c4093?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '8', ad: 'Yoğurt (1 kg)', fiyat: 38, stok: 25, barkod: '8690000000029', kategori: 'Süt Ürünleri', altKategori: 'Yoğurt', icon: 'cup-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1674482019268-7d55dc027bf2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '9', ad: 'Beyaz Peynir (500 g)', fiyat: 95, stok: 15, barkod: '8690000000030', kategori: 'Süt Ürünleri', altKategori: 'Peynir', icon: 'cheese', gorsel: 'https://plus.unsplash.com/premium_photo-1691948106030-d5e76d461b14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '10', ad: 'Kaşar Peyniri (400 g)', fiyat: 110, stok: 15, barkod: '8690000000031', kategori: 'Süt Ürünleri', altKategori: 'Peynir', icon: 'cheese', gorsel: 'https://plus.unsplash.com/premium_photo-1682145554909-51bb4f75271a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '11', ad: 'Tereyağı (250 g)', fiyat: 75, stok: 20, barkod: '8690000000032', kategori: 'Süt Ürünleri', altKategori: 'Tereyağı & Kaymak', icon: 'cheese', gorsel: 'https://plus.unsplash.com/premium_photo-1700440539073-c769891a9e3f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '12', ad: 'Ayran (1 L)', fiyat: 22, stok: 40, barkod: '8690000000033', kategori: 'Süt Ürünleri', altKategori: 'Süt', icon: 'bottle-tonic-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1732818136286-3220e16c35db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },

  // İçecek
  { id: '13', ad: 'Filtre Kahve (250 g)', fiyat: 120, stok: 20, barkod: '8690000000035', kategori: 'İçecek', altKategori: 'Kahve & Çay', icon: 'coffee-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1675435644687-562e8042b9db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '14', ad: 'Maden Suyu (200 ml)', fiyat: 10, stok: 60, barkod: '8690000000036', kategori: 'İçecek', altKategori: 'Su & Maden Suyu', icon: 'bottle-soda-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1681284939219-acfc2faa7eb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '15', ad: 'Kola (1 L)', fiyat: 35, stok: 45, barkod: '8690000000037', kategori: 'İçecek', altKategori: 'Gazlı İçecek', icon: 'bottle-soda-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1725075086810-37e14268e5ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '16', ad: 'Portakal Suyu (1 L)', fiyat: 42, stok: 30, barkod: '8690000000038', kategori: 'İçecek', altKategori: 'Meyve Suyu', icon: 'bottle-soda-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1667543228378-ec4478ab2845?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '17', ad: 'Siyah Çay (1 kg)', fiyat: 85, stok: 25, barkod: '8690000000039', kategori: 'İçecek', altKategori: 'Kahve & Çay', icon: 'coffee-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1726776145390-eaef92b212d3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '18', ad: 'Enerji İçeceği (250 ml)', fiyat: 30, stok: 50, barkod: '8690000000040', kategori: 'İçecek', altKategori: 'Enerji İçeceği', icon: 'bottle-soda-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1681487652640-9257693221d5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },

  // Atıştırmalık
  { id: '19', ad: 'Sütlü Çikolata', fiyat: 35, stok: 40, barkod: '8690000000042', kategori: 'Atıştırmalık', altKategori: 'Çikolata', icon: 'candy-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1675237625510-e484acc4816d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '20', ad: 'Patates Cipsi', fiyat: 28, stok: 45, barkod: '8690000000097', kategori: 'Atıştırmalık', altKategori: 'Cips', icon: 'food-variant', gorsel: 'https://plus.unsplash.com/premium_photo-1672753747124-2bd4da9931fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '21', ad: 'Bisküvi', fiyat: 20, stok: 50, barkod: '8690000000043', kategori: 'Atıştırmalık', altKategori: 'Bisküvi & Gofret', icon: 'food-variant', gorsel: 'https://plus.unsplash.com/premium_photo-1668772704254-c4c4798b0e5d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '22', ad: 'Gofret', fiyat: 15, stok: 55, barkod: '8690000000044', kategori: 'Atıştırmalık', altKategori: 'Bisküvi & Gofret', icon: 'candy-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1671059792129-8fb1cff208f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '23', ad: 'Karışık Kuruyemiş (200 g)', fiyat: 65, stok: 20, barkod: '8690000000045', kategori: 'Atıştırmalık', altKategori: 'Kuruyemiş', icon: 'food-variant', gorsel: 'https://plus.unsplash.com/premium_photo-1726768984120-f476b15835f2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '24', ad: 'Mısır Cipsi', fiyat: 24, stok: 35, barkod: '8690000000046', kategori: 'Atıştırmalık', altKategori: 'Cips', icon: 'food-variant', gorsel: 'https://plus.unsplash.com/premium_photo-1726072359336-2ab76f9f2a07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },

  // Temizlik
  { id: '25', ad: 'Bulaşık Deterjanı', fiyat: 65, stok: 18, barkod: '8690000000103', kategori: 'Temizlik', altKategori: 'Deterjan', icon: 'spray-bottle', gorsel: 'https://plus.unsplash.com/premium_photo-1681154819686-43fcc4dc4df3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '26', ad: 'Çamaşır Deterjanı (3 kg)', fiyat: 145, stok: 12, barkod: '8690000000104', kategori: 'Temizlik', altKategori: 'Deterjan', icon: 'spray-bottle', gorsel: 'https://plus.unsplash.com/premium_photo-1681284938563-852a6e4a45e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '27', ad: 'Yüzey Temizleyici', fiyat: 48, stok: 22, barkod: '8690000000105', kategori: 'Temizlik', altKategori: 'Temizlik Spreyi', icon: 'spray-bottle', gorsel: 'https://plus.unsplash.com/premium_photo-1678742388597-d9d76a759d14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '28', ad: 'Tuvalet Kağıdı (8li)', fiyat: 55, stok: 30, barkod: '8690000000106', kategori: 'Temizlik', altKategori: 'Kağıt Ürünleri', icon: 'spray-bottle', gorsel: 'https://plus.unsplash.com/premium_photo-1675922302298-f24fa4b5b111?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '29', ad: 'Sıvı Sabun', fiyat: 32, stok: 28, barkod: '8690000000107', kategori: 'Temizlik', altKategori: 'Sabun', icon: 'spray-bottle', gorsel: 'https://plus.unsplash.com/premium_photo-1661591285003-9abbde56bf8a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '30', ad: 'Çamaşır Suyu', fiyat: 28, stok: 24, barkod: '8690000000108', kategori: 'Temizlik', altKategori: 'Deterjan', icon: 'spray-bottle', gorsel: 'https://plus.unsplash.com/premium_photo-1684407616442-87bf0d69e8b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },

  // Meyve & Sebze
  { id: '31', ad: 'Elma (kg)', fiyat: 25, stok: 70, barkod: '8690000000110', kategori: 'Meyve & Sebze', altKategori: 'Meyve', icon: 'food-apple-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1724249990837-f6dfcb7f3eaa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '32', ad: 'Havuç (kg)', fiyat: 18, stok: 55, barkod: '8690000000127', kategori: 'Meyve & Sebze', altKategori: 'Sebze', icon: 'carrot', gorsel: 'https://plus.unsplash.com/premium_photo-1724849305142-498abc1f7b89?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '33', ad: 'Muz (kg)', fiyat: 32, stok: 45, barkod: '8690000000128', kategori: 'Meyve & Sebze', altKategori: 'Meyve', icon: 'food-apple-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1724250081102-cab0e5cb314c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '34', ad: 'Domates (kg)', fiyat: 22, stok: 60, barkod: '8690000000129', kategori: 'Meyve & Sebze', altKategori: 'Sebze', icon: 'food-apple-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1661811820259-2575b82101bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '35', ad: 'Salatalık (kg)', fiyat: 15, stok: 50, barkod: '8690000000130', kategori: 'Meyve & Sebze', altKategori: 'Sebze', icon: 'carrot', gorsel: 'https://plus.unsplash.com/premium_photo-1691680760248-b5efa55af05b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '36', ad: 'Soğan (kg)', fiyat: 12, stok: 65, barkod: '8690000000131', kategori: 'Meyve & Sebze', altKategori: 'Sebze', icon: 'carrot', gorsel: 'https://plus.unsplash.com/premium_photo-1668076517573-fa01307d87ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '37', ad: 'Patates (kg)', fiyat: 14, stok: 75, barkod: '8690000000132', kategori: 'Meyve & Sebze', altKategori: 'Sebze', icon: 'carrot', gorsel: 'https://plus.unsplash.com/premium_photo-1724256031338-b5bfba816cfd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },

  // Kahvaltılık
  { id: '38', ad: 'Yeşil Zeytin (500 g)', fiyat: 65, stok: 30, barkod: '8690000000140', kategori: 'Kahvaltılık', altKategori: 'Zeytin', icon: 'food-variant', gorsel: 'https://plus.unsplash.com/premium_photo-1676047258483-c06cc305be6b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '39', ad: 'Bal (450 g)', fiyat: 180, stok: 18, barkod: '8690000000141', kategori: 'Kahvaltılık', altKategori: 'Bal & Reçel', icon: 'bottle-tonic-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1664273586932-ab870d61f7e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '40', ad: 'Çilek Reçeli (380 g)', fiyat: 55, stok: 25, barkod: '8690000000142', kategori: 'Kahvaltılık', altKategori: 'Bal & Reçel', icon: 'food-variant', gorsel: 'https://plus.unsplash.com/premium_photo-1663850873212-53e5b5230cf1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '41', ad: 'Tahin (500 g)', fiyat: 90, stok: 20, barkod: '8690000000143', kategori: 'Kahvaltılık', altKategori: 'Tahin & Pekmez', icon: 'bottle-tonic-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1692781059289-3ad849fb656a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '42', ad: 'Yumurta (10lu)', fiyat: 60, stok: 40, barkod: '8690000000144', kategori: 'Kahvaltılık', altKategori: 'Yumurta', icon: 'egg-fried', gorsel: 'https://plus.unsplash.com/premium_photo-1726072360068-cdc3561ea615?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },

  // Dondurulmuş Ürünler
  { id: '43', ad: 'Dondurulmuş Pizza', fiyat: 85, stok: 20, barkod: '8690000000150', kategori: 'Dondurulmuş Ürünler', altKategori: 'Hazır Yemek', icon: 'snowflake', gorsel: 'https://plus.unsplash.com/premium_photo-1681284938619-a7ef784fb90e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '44', ad: 'Parmak Patates (1 kg)', fiyat: 70, stok: 25, barkod: '8690000000151', kategori: 'Dondurulmuş Ürünler', altKategori: 'Hazır Yemek', icon: 'snowflake', gorsel: 'https://plus.unsplash.com/premium_photo-1672774750509-bc9ff226f3e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '45', ad: 'Dondurulmuş Karışık Sebze (450 g)', fiyat: 45, stok: 30, barkod: '8690000000152', kategori: 'Dondurulmuş Ürünler', altKategori: 'Sebze', icon: 'snowflake', gorsel: 'https://plus.unsplash.com/premium_photo-1661377055240-5d286225e219?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '46', ad: 'Mantı (500 g)', fiyat: 95, stok: 22, barkod: '8690000000153', kategori: 'Dondurulmuş Ürünler', altKategori: 'Hamur İşi', icon: 'snowflake', gorsel: 'https://plus.unsplash.com/premium_photo-1661600643912-dc6dbb1db475?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '47', ad: 'Waffle (4lü)', fiyat: 55, stok: 28, barkod: '8690000000154', kategori: 'Dondurulmuş Ürünler', altKategori: 'Hamur İşi', icon: 'snowflake', gorsel: 'https://plus.unsplash.com/premium_photo-1664478254358-fb8ce668dca6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },

  // Dondurma
  { id: '48', ad: 'Çikolatalı Dondurma (1 L)', fiyat: 120, stok: 20, barkod: '8690000000160', kategori: 'Dondurma', altKategori: 'Kutu Dondurma', icon: 'ice-cream', gorsel: 'https://plus.unsplash.com/premium_photo-1675237625549-bac770582d3b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '49', ad: 'Meyveli Dondurma Çubuk (4lü)', fiyat: 75, stok: 30, barkod: '8690000000161', kategori: 'Dondurma', altKategori: 'Çubuk Dondurma', icon: 'ice-cream', gorsel: 'https://plus.unsplash.com/premium_photo-1689298470213-bc9f130f7349?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '50', ad: 'Vanilyalı Dondurma (1 L)', fiyat: 115, stok: 20, barkod: '8690000000162', kategori: 'Dondurma', altKategori: 'Kutu Dondurma', icon: 'ice-cream', gorsel: 'https://plus.unsplash.com/premium_photo-1738063987905-517b0f4b067d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '51', ad: 'Sandviç Dondurma (6lı)', fiyat: 90, stok: 24, barkod: '8690000000163', kategori: 'Dondurma', altKategori: 'Sandviç Dondurma', icon: 'ice-cream', gorsel: 'https://plus.unsplash.com/premium_photo-1673580059872-b1307361f234?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },

  // Kişisel Bakım & Kozmetik
  { id: '52', ad: 'Şampuan (500 ml)', fiyat: 110, stok: 22, barkod: '8690000000170', kategori: 'Kişisel Bakım & Kozmetik', altKategori: 'Saç Bakımı', icon: 'lotion-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1681408059581-70a44c25d50c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '53', ad: 'Diş Macunu (75 ml)', fiyat: 45, stok: 35, barkod: '8690000000171', kategori: 'Kişisel Bakım & Kozmetik', altKategori: 'Ağız Bakımı', icon: 'lotion-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1679750866872-7bde2193b567?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '54', ad: 'Duş Jeli (500 ml)', fiyat: 68, stok: 26, barkod: '8690000000172', kategori: 'Kişisel Bakım & Kozmetik', altKategori: 'Vücut Bakımı', icon: 'lotion-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1673864589209-617526f61609?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '55', ad: 'Tıraş Köpüğü (200 ml)', fiyat: 65, stok: 18, barkod: '8690000000173', kategori: 'Kişisel Bakım & Kozmetik', altKategori: 'Tıraş Ürünleri', icon: 'lotion-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1751928458701-339aa3f23d23?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '56', ad: 'Deodorant (150 ml)', fiyat: 85, stok: 30, barkod: '8690000000174', kategori: 'Kişisel Bakım & Kozmetik', altKategori: 'Vücut Bakımı', icon: 'lotion-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1755892624685-9e4fbdd09197?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },

  // Kağıt Ürünleri
  { id: '57', ad: 'Kağıt Havlu (4lü)', fiyat: 60, stok: 30, barkod: '8690000000180', kategori: 'Kağıt Ürünleri', altKategori: 'Kağıt Havlu', icon: 'paper-roll-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1682148737203-8118bb2b3e07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '58', ad: 'Peçete (100lü)', fiyat: 25, stok: 45, barkod: '8690000000181', kategori: 'Kağıt Ürünleri', altKategori: 'Peçete', icon: 'paper-roll-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1750860246471-2ffa1891fe83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '59', ad: 'Islak Mendil (56lı)', fiyat: 40, stok: 35, barkod: '8690000000182', kategori: 'Kağıt Ürünleri', altKategori: 'Mendil', icon: 'paper-roll-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1776720096212-cc3bb440b188?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '60', ad: 'Yüz Temizleme Mendili (40lı)', fiyat: 35, stok: 32, barkod: '8690000000183', kategori: 'Kağıt Ürünleri', altKategori: 'Mendil', icon: 'paper-roll-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1683121712221-7bc745e55231?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
  { id: '61', ad: 'Rulo Tuvalet Kağıdı (16lı)', fiyat: 95, stok: 20, barkod: '8690000000184', kategori: 'Kağıt Ürünleri', altKategori: 'Tuvalet Kağıdı', icon: 'paper-roll-outline', gorsel: 'https://plus.unsplash.com/premium_photo-1761322103573-1c28fa860333?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400' },
];
