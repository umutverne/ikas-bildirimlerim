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
          background: #f5f5f5;
          padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        header {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { font-size: 24px; color: #1a1a1a; margin-bottom: 8px; }
        nav { margin-top: 16px; }
        nav a {
          display: inline-block;
          padding: 8px 16px;
          background: #0066cc;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin-right: 8px;
          font-size: 14px;
        }
        nav a:hover { background: #0052a3; }
        .card {
          background: white;
          padding: 24px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h2 { font-size: 20px; margin-bottom: 16px; color: #1a1a1a; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
        th { background: #f5f5f5; font-weight: 600; }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          background: #e8f5e9;
          color: #2e7d32;
          border-radius: 12px;
          font-size: 12px;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-value { font-size: 32px; font-weight: bold; color: #0066cc; }
        .stat-label { font-size: 14px; color: #666; margin-top: 4px; }
        form { margin-top: 16px; }
        label { display: block; margin-bottom: 8px; font-weight: 500; }
        input, textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-bottom: 16px;
          font-size: 14px;
        }
        button {
          background: #0066cc;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        button:hover { background: #0052a3; }
        .code {
          background: #f5f5f5;
          padding: 12px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          margin: 12px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>IKAS Bildirimlerim Admin</h1>
          <nav>
            <a href="/admin">Dashboard</a>
            <a href="/admin/stores">Magazalar</a>
            <a href="/admin/stores/new">Yeni Magaza</a>
            <a href="#" onclick="if(confirm('Tum veritabani sifirlanacak. Emin misiniz?')){document.getElementById('resetForm').submit();return false;}" style="background:#d32f2f;">Veritabani Sifirla</a>
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
  app.get('/admin', requireAuth, (req, res) => {
    const stores = db_stores.getAll();
    const allUsers = stores.reduce((sum, s) => sum + s.user_count, 0);
    const stats = db_notifications.getStats();

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
            </tr>
          </thead>
          <tbody>
            ${stores.map(s => `
              <tr>
                <td>${s.store_name}</td>
                <td>${s.agency_name || 'Demo'}</td>
                <td><span class="badge">${s.user_count}</span></td>
                <td><code>${s.link_code}</code></td>
                <td>${new Date(s.created_at).toLocaleDateString('tr-TR')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    res.send(renderPage('Dashboard', content));
  });

  app.get('/admin/stores/new', requireAuth, (req, res) => {
    const content = `
      <div class="card">
        <h2>Yeni Magaza Ekle</h2>
        <form method="POST" action="/admin/stores/create">
          <label>Magaza Adi:</label>
          <input type="text" name="store_name" required placeholder="Ornek: Umut Store" />

          <label>IKAS Authorized App ID:</label>
          <input type="text" name="authorized_app_id" required placeholder="bbc146ff-2a97-4aba-8941-99dbd1d82661" />

          <button type="submit">Magaza Olustur</button>
        </form>
      </div>
    `;

    res.send(renderPage('Yeni Magaza', content));
  });

  app.post('/admin/stores/create', requireAuth, (req, res) => {
    const { store_name, authorized_app_id } = req.body;

    let agency = db_agencies.getAll()[0];
    if (!agency) {
      const newAgency = db_agencies.create('Demo Agency');
      agency = { id: newAgency.id };
    }

    const store = db_stores.create(agency.id, store_name, authorized_app_id);

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'ikasbildirimlerim_bot';
    const botLink = `https://t.me/${botUsername}`;

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
          <a href="/admin" style="display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;">Dashboard'a Don</a>
        </div>
      </div>
    `;

    res.send(renderPage('Magaza Olusturuldu', content));
  });

  app.post('/admin/reset-database', requireAuth, (req, res) => {
    resetDatabase();
    res.redirect('/admin');
  });
}

export { requireAuth };
