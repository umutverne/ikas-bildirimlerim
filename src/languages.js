const messages = {
  tr: {
    newOrder: 'Yeni Siparis',
    customer: 'Musteri',
    phone: 'Telefon',
    total: 'Toplam',
    products: 'Urunler',
    date: 'Tarih',
    unknown: 'Bilinmiyor',
    noProducts: 'Urun bilgisi mevcut degil',
    orderDataError: 'Siparis verisi okunamadi'
  },
  en: {
    newOrder: 'New Order',
    customer: 'Customer',
    phone: 'Phone',
    total: 'Total',
    products: 'Products',
    date: 'Date',
    unknown: 'Unknown',
    noProducts: 'No product information available',
    orderDataError: 'Order data could not be read'
  }
};

export function getMessages(lang = 'tr') {
  return messages[lang] || messages.tr;
}
