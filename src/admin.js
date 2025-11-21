import { db_agencies, db_stores, db_users, db_notifications, resetDatabase } from './database.js';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function checkAuth(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) return false;

  const credentials = Buffer.from(auth.substring(6), 'base64').toString();
  const [username, password] = credentials.split(':');

  return username === 'admin' && password === ADMIN_PASSWORD;
}

function requireAuth(req, res, next) {
  if (!checkAuth(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
    return res.status(401).send('Authentication required');
  }
  next();
}

function renderPage(title, content) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title} - IKAS Bildirimlerim Admin</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        header {
          background: white;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 24px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        h1 {
          font-size: 28px;
          color: #1a1a1a;
          margin-bottom: 4px;
          font-weight: 700;
        }
        .subtitle {
          color: #666;
          font-size: 14px;
          margin-bottom: 16px;
        }
        nav { margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap; }
        nav a {
          display: inline-block;
          padding: 10px 18px;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        nav a:hover {
          background: #5568d3;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
        }
        .card {
          background: white;
          padding: 28px;
          border-radius: 12px;
          margin-bottom: 24px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        h2 {
          font-size: 22px;
          margin-bottom: 20px;
          color: #1a1a1a;
          font-weight: 600;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        th, td {
          padding: 14px 12px;
          text-align: left;
          border-bottom: 1px solid #e8e8e8;
        }
        th {
          background: #f8f9fa;
          font-weight: 600;
          color: #555;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 0.5px;
        }
        tr:hover { background: #f8f9fa; }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          border-left: 4px solid #667eea;
          transition: transform 0.2s;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.15);
        }
        .stat-value {
          font-size: 36px;
          font-weight: bold;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .stat-label {
          font-size: 13px;
          color: #666;
          margin-top: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
        }
        form { margin-top: 16px; }
        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }
        input, textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          margin-bottom: 16px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        input:focus, textarea:focus {
          outline: none;
          border-color: #667eea;
        }
        button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }
        button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .code {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          font-family: 'Courier New', monospace;
          font-size: 20px;
          font-weight: bold;
          text-align: center;
          margin: 16px 0;
          border: 2px dashed #667eea;
          color: #667eea;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>🎯 IKAS Bildirimlerim</h1>
          <div class="subtitle">Yonetim Paneli</div>
          <nav>
            <a href="/admin">📊 Dashboard</a>
            <a href="/admin/stores">🏪 Magazalar</a>
            <a href="/admin/stores/new">➕ Yeni Magaza</a>
            <a href="#" onclick="if(confirm('Tum veritabani sifirlanacak. Emin misiniz?')){document.getElementById('resetForm').submit();return false;}" style="background:linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">🗑️ Sifirla</a>
          </nav>
          <form id="resetForm" method="POST" action="/admin/reset-database" style="display:none;"></form>
        </header>
        ${content}
      </div>
    </body>
    </html>
  `;
}

export function setupAdminRoutes(app) {
  app.get('/admin', requireAuth, async (req, res) => {
    const stores = await db_stores.getAll();
    const allUsers = stores.reduce((sum, s) => sum + s.user_count, 0);
    const stats = await db_notifications.getStats();

    const content = `
      <div class="stats">
        <div class="stat-card">
          <div class="stat-value">${stores.length}</div>
          <div class="stat-label">Aktif Magaza</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${allUsers}</div>
          <div class="stat-label">Kayitli Kullanici</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.total_notifications || 0}</div>
          <div class="stat-label">Toplam Bildirim</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${(stats.total_revenue || 0).toFixed(0)} TL</div>
          <div class="stat-label">Toplam Siparis Tutari</div>
        </div>
      </div>

      <div class="card">
        <h2>Son Magazalar</h2>
        <table>
          <thead>
            <tr>
              <th>Magaza Adi</th>
              <th>Ajans</th>
              <th>Kullanici Sayisi</th>
              <th>Baglanti Kodu</th>
              <th>Tarih</th>
              <th>Islemler</th>
            </tr>
          </thead>
          <tbody>
            ${stores.map(s => `
              <tr>
                <td>${s.store_name}</td>
                <td>${s.agency_name || 'Demo'}</td>
                <td><span class="badge">${s.user_count}</span></td>
                <td>
                  <code class="link-code" data-code="${s.link_code}" style="cursor:pointer;user-select:none;" title="Gormek icin tikla">
                    ••••••••
                  </code>
                </td>
                <td>${new Date(s.created_at).toLocaleDateString('tr-TR')}</td>
                <td>
                  <a href="/admin/test-webhook/${s.id}" style="display: inline-block; padding: 6px 12px; background: #10b981; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">
                    🧪 Test Siparisi
                  </a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <script>
        document.querySelectorAll('.link-code').forEach(el => {
          let revealed = false;
          el.addEventListener('click', function() {
            if (!revealed) {
              this.textContent = this.dataset.code;
              this.style.fontWeight = 'bold';
              revealed = true;
            } else {
              this.textContent = '••••••••';
              this.style.fontWeight = 'normal';
              revealed = false;
            }
          });
        });

        document.querySelectorAll('.app-id-code').forEach(el => {
          let revealed = false;
          el.addEventListener('click', function() {
            if (!revealed) {
              this.textContent = this.dataset.appid;
              this.style.fontWeight = 'bold';
              revealed = true;
            } else {
              this.textContent = '••••••••';
              this.style.fontWeight = 'normal';
              revealed = false;
            }
          });
        });
      </script>
    `;

    res.send(renderPage('Dashboard', content));
  });

  app.get('/admin/stores', requireAuth, async (req, res) => {
    const stores = await db_stores.getAll();

    const content = `
      <div class="card">
        <h2>Tum Magazalar</h2>
        <table>
          <thead>
            <tr>
              <th>Magaza Adi</th>
              <th>Ajans</th>
              <th>Kullanici Sayisi</th>
              <th>Baglanti Kodu</th>
              <th>App ID</th>
              <th>Tarih</th>
            </tr>
          </thead>
          <tbody>
            ${stores.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#666;">Henuz magaza yok</td></tr>' : stores.map(s => `
              <tr>
                <td><strong>${s.store_name}</strong></td>
                <td>${s.agency_name || 'Demo'}</td>
                <td><span class="badge">${s.user_count}</span></td>
                <td>
                  <code class="link-code" data-code="${s.link_code}" style="cursor:pointer;user-select:none;" title="Gormek icin tikla">
                    ••••••••
                  </code>
                </td>
                <td>
                  <code class="app-id-code" data-appid="${s.authorized_app_id}" style="cursor:pointer;user-select:none;font-size:11px;" title="Gormek icin tikla">
                    ••••••••
                  </code>
                </td>
                <td>${new Date(s.created_at).toLocaleDateString('tr-TR')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <script>
        document.querySelectorAll('.link-code').forEach(el => {
          let revealed = false;
          el.addEventListener('click', function() {
            if (!revealed) {
              this.textContent = this.dataset.code;
              this.style.fontWeight = 'bold';
              revealed = true;
            } else {
              this.textContent = '••••••••';
              this.style.fontWeight = 'normal';
              revealed = false;
            }
          });
        });

        document.querySelectorAll('.app-id-code').forEach(el => {
          let revealed = false;
          el.addEventListener('click', function() {
            if (!revealed) {
              this.textContent = this.dataset.appid;
              this.style.fontWeight = 'bold';
              revealed = true;
            } else {
              this.textContent = '••••••••';
              this.style.fontWeight = 'normal';
              revealed = false;
            }
          });
        });
      </script>
    `;

    res.send(renderPage('Magazalar', content));
  });

  app.get('/admin/stores/new', requireAuth, (req, res) => {
    const content = `
      <div class="card">
        <h2>Yeni Magaza Ekle</h2>
        <form method="POST" action="/admin/stores/create">
          <label>Magaza Adi:</label>
          <input type="text" name="store_name" required placeholder="Ornek: Test Magazam" />

          <label>IKAS Access Token (Bearer Token):</label>
          <input type="text" name="ikas_token" placeholder="Opsiyonel - IKAS API token" />
          <small style="color: #666; display: block; margin-top: -12px; margin-bottom: 16px;">
            IKAS Admin Panel → Ayarlar → API'den alabilirsiniz
          </small>

          <label>IKAS Authorized App ID:</label>
          <input type="text" name="authorized_app_id" required placeholder="test-store-12345" />
          <small style="color: #666; display: block; margin-top: -12px; margin-bottom: 16px;">
            Token yoksa herhangi bir ID yazabilirsiniz
          </small>

          <button type="submit">Magaza Olustur</button>
        </form>
      </div>
    `;

    res.send(renderPage('Yeni Magaza', content));
  });

  app.post('/admin/stores/create', requireAuth, async (req, res) => {
    const { store_name, authorized_app_id, ikas_token } = req.body;

    let agency = (await db_agencies.getAll())[0];
    if (!agency) {
      const newAgency = await db_agencies.create('Demo Agency');
      agency = { id: newAgency.id };
    }

    const store = await db_stores.create(agency.id, store_name, authorized_app_id, ikas_token || null);

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'ikasbildirimlerim_bot';
    const botLink = `https://t.me/${botUsername}`;

    const webhookSetupButton = ikas_token
      ? `<a href="/admin/setup-webhook/${store.id}" style="display: inline-block; padding: 10px 20px; background: #10b981; color: white; text-decoration: none; border-radius: 4px; margin-right: 8px;">🔗 IKAS Webhook Kur</a>`
      : '';

    const content = `
      <div class="card">
        <h2>Magaza Olusturuldu!</h2>
        <p><strong>Magaza:</strong> ${store_name}</p>
        <p><strong>Baglanti Kodu:</strong></p>
        <div class="code">${store.link_code}</div>

        <h3 style="margin-top: 24px;">Kullanici Talimatlar:</h3>
        <ol style="line-height: 1.8;">
          <li>Telegram'da botu ac: <a href="${botLink}" target="_blank">${botLink}</a></li>
          <li>/start komutunu yaz</li>
          <li>/bagla ${store.link_code} komutunu yaz</li>
          <li>Siparis bildirimleri baslasin!</li>
        </ol>

        <div style="margin-top: 24px;">
          ${webhookSetupButton}
          <a href="/admin" style="display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Dashboard'a Don</a>
        </div>
      </div>
    `;

    res.send(renderPage('Magaza Olusturuldu', content));
  });

  app.post('/admin/reset-database', requireAuth, async (req, res) => {
    await resetDatabase();
    res.redirect('/admin');
  });

  app.get('/admin/test-webhook/:storeId', requireAuth, async (req, res) => {
    const storeId = req.params.storeId;
    const store = await db_stores.getAll().then(stores => stores.find(s => s.id == storeId));

    if (!store) {
      return res.status(404).send('Store not found');
    }

    const testOrders = [
      {
        customer: { fullName: "Ahmet Yilmaz", phone: "+905551234567" },
        totalFinalPrice: 450.00,
        orderLineItems: [
          { quantity: 1, variant: { name: "Premium T-Shirt" }, finalPrice: 250.00, currencyCode: "TRY" },
          { quantity: 2, variant: { name: "Cotton Socks" }, finalPrice: 100.00, currencyCode: "TRY" }
        ]
      },
      {
        customer: { fullName: "Ayse Demir", phone: "+905559876543" },
        totalFinalPrice: 890.50,
        orderLineItems: [
          { quantity: 1, variant: { name: "Winter Jacket" }, finalPrice: 890.50, currencyCode: "TRY" }
        ]
      }
    ];

    const randomOrder = testOrders[Math.floor(Math.random() * testOrders.length)];

    const webhookPayload = {
      authorizedAppId: store.authorized_app_id,
      data: JSON.stringify({
        orderNumber: "TEST-" + Math.floor(Math.random() * 9000 + 1000),
        customer: randomOrder.customer,
        totalFinalPrice: randomOrder.totalFinalPrice,
        currencyCode: "TRY",
        orderLineItems: randomOrder.orderLineItems,
        orderedAt: new Date().toISOString()
      })
    };

    try {
      const axios = (await import('axios')).default;
      const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : `http://localhost:${process.env.PORT || 3000}`;

      const response = await axios.post(`${baseUrl}/webhook/order`, webhookPayload);

      const content = `
        <div class="card">
          <h2>✅ Test Siparisi Gonderildi!</h2>
          <p><strong>Magaza:</strong> ${store.store_name}</p>
          <p><strong>Durum:</strong> ${response.data.ok ? 'Basarili' : 'Basarisiz'}</p>
          <p><strong>Gonderilen Bildirim Sayisi:</strong> ${response.data.sent || 0}</p>

          <div style="margin-top: 24px;">
            <a href="/admin" style="display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Dashboard'a Don</a>
          </div>
        </div>
      `;

      res.send(renderPage('Test Siparisi', content));
    } catch (error) {
      const content = `
        <div class="card">
          <h2>❌ Test Siparisi Hatasi</h2>
          <p><strong>Hata:</strong> ${error.message}</p>

          <div style="margin-top: 24px;">
            <a href="/admin" style="display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Dashboard'a Don</a>
          </div>
        </div>
      `;

      res.send(renderPage('Test Siparisi Hatasi', content));
    }
  });

  app.get('/admin/setup-webhook/:storeId', requireAuth, async (req, res) => {
    const storeId = req.params.storeId;
    const store = await db_stores.getAll().then(stores => stores.find(s => s.id == storeId));

    if (!store || !store.ikas_token) {
      return res.status(400).send('Store not found or IKAS token missing');
    }

    try {
      const axios = (await import('axios')).default;
      const webhookUrl = process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/webhook/order`
        : `http://localhost:${process.env.PORT || 3000}/webhook/order`;

      // IKAS GraphQL mutation for webhook creation
      const mutation = `
        mutation {
          saveWebhook(input: {
            scopes: ["store/order/created"]
            endpoint: "${webhookUrl}"
          }) {
            id
            endpoint
            scopes
          }
        }
      `;

      const response = await axios.post(
        'https://api.myikas.com/api/v1/admin/graphql',
        { query: mutation },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${store.ikas_token}`
          }
        }
      );

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      const webhookId = response.data.data.saveWebhook.id;
      await db_stores.updateWebhookId(store.id, webhookId);

      const content = `
        <div class="card">
          <h2>✅ Webhook Kuruldu!</h2>
          <p><strong>Magaza:</strong> ${store.store_name}</p>
          <p><strong>Webhook URL:</strong> ${webhookUrl}</p>
          <p><strong>Webhook ID:</strong> ${webhookId}</p>
          <p><strong>Event:</strong> store/order/created</p>

          <div style="margin-top: 24px; padding: 16px; background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
            <strong style="color: #065f46;">🎉 Sistem Hazır!</strong>
            <p style="color: #047857; margin-top: 8px;">
              Artık IKAS'tan gelen siparişler otomatik olarak Telegram'a bildirilecek.
            </p>
          </div>

          <div style="margin-top: 24px;">
            <a href="/admin" style="display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Dashboard'a Don</a>
          </div>
        </div>
      `;

      res.send(renderPage('Webhook Kuruldu', content));
    } catch (error) {
      const content = `
        <div class="card">
          <h2>❌ Webhook Kurulum Hatasi</h2>
          <p><strong>Hata:</strong> ${error.message}</p>
          <p style="margin-top: 16px; color: #666;">IKAS API token'ınızı kontrol edin veya IKAS destek ekibiyle iletişime geçin.</p>

          <div style="margin-top: 24px;">
            <a href="/admin" style="display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Dashboard'a Don</a>
          </div>
        </div>
      `;

      res.send(renderPage('Webhook Hatasi', content));
    }
  });
}

export { requireAuth };
