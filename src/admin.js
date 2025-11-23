import { db_agencies, db_stores, db_users, db_notifications, resetDatabase } from './database.js';
import { db_admin_users } from './db_admin_users.js';
import { requireAuth, requireSuperAdmin, requireAgencyAdmin, hashPassword } from './auth.js';
import crypto from 'crypto';

function renderPage(title, content, session) {
  const isSuperAdmin = session.role === 'super_admin';

  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title} - IKAS Telegram Bildirimlerim</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #F4F4F5;
          min-height: 100vh;
        }

        /* Sidebar */
        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          width: 280px;
          height: 100vh;
          background: #FFFFFF;
          border-right: 1px solid #E4E4E7;
          display: flex;
          flex-direction: column;
          z-index: 100;
        }

        .sidebar-header {
          padding: 32px 24px;
          border-bottom: 1px solid #E4E4E7;
        }

        .logo {
          font-size: 20px;
          font-weight: 700;
          color: #18181B;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #3B82F6 0%, #A855F7 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .user-info {
          font-size: 13px;
          color: #71717A;
          margin-top: 4px;
        }

        .user-role {
          display: inline-block;
          padding: 2px 8px;
          background: ${isSuperAdmin ? 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)' : '#3B82F6'};
          color: white;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          margin-top: 8px;
        }

        .sidebar-nav {
          flex: 1;
          padding: 24px 16px;
          overflow-y: auto;
        }

        .nav-section {
          margin-bottom: 24px;
        }

        .nav-section-title {
          font-size: 11px;
          font-weight: 600;
          color: #A1A1AA;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 0 12px;
          margin-bottom: 8px;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 12px;
          color: #52525B;
          text-decoration: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 4px;
        }

        .nav-link:hover {
          background: #F4F4F5;
          color: #18181B;
        }

        .nav-link.active {
          background: #3B82F6;
          color: white;
        }

        .nav-link.danger {
          color: #DC2626;
        }

        .nav-link.danger:hover {
          background: #FEE2E2;
        }

        .nav-icon {
          font-size: 18px;
          width: 20px;
          text-align: center;
        }

        .sidebar-footer {
          padding: 16px 24px;
          border-top: 1px solid #E4E4E7;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border: 1px solid #E4E4E7;
          border-radius: 8px;
          color: #52525B;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          justify-content: center;
        }

        .logout-btn:hover {
          background: #F4F4F5;
          border-color: #D4D4D8;
        }

        /* Main Content */
        .main-content {
          margin-left: 280px;
          padding: 32px;
          min-height: 100vh;
        }

        .page-header {
          margin-bottom: 32px;
        }

        .page-title {
          font-size: 32px;
          font-weight: 700;
          color: #18181B;
          margin-bottom: 8px;
        }

        .page-subtitle {
          font-size: 14px;
          color: #71717A;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: #FFFFFF;
          border: 1px solid #E4E4E7;
          border-radius: 12px;
          padding: 24px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .stat-card:hover {
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .stat-label {
          font-size: 13px;
          font-weight: 600;
          color: #71717A;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        .stat-value {
          font-size: 36px;
          font-weight: 700;
          color: #18181B;
          margin-bottom: 8px;
        }

        .stat-change {
          font-size: 12px;
          color: #10B981;
          font-weight: 500;
        }

        /* Card */
        .card {
          background: #FFFFFF;
          border: 1px solid #E4E4E7;
          border-radius: 12px;
          margin-bottom: 24px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .card-header {
          padding: 20px 24px;
          border-bottom: 1px solid #E4E4E7;
        }

        .card-title {
          font-size: 18px;
          font-weight: 600;
          color: #18181B;
        }

        .card-body {
          padding: 24px;
        }

        /* Table */
        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          padding: 12px 16px;
          background: #F4F4F5;
          font-size: 12px;
          font-weight: 600;
          color: #71717A;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #E4E4E7;
        }

        td {
          padding: 16px;
          border-bottom: 1px solid #E4E4E7;
          font-size: 14px;
          color: #18181B;
        }

        tr:hover {
          background: #FAFAFA;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          background: #3B82F6;
          color: white;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge.purple {
          background: linear-gradient(135deg, #A855F7 0%, #EC4899 100%);
        }

        /* Form Elements */
        label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #18181B;
          margin-bottom: 8px;
        }

        input, textarea {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #E4E4E7;
          border-radius: 8px;
          font-size: 14px;
          color: #18181B;
          background: #FFFFFF;
          transition: all 0.2s;
          margin-bottom: 16px;
        }

        input:focus, textarea:focus {
          outline: none;
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        small {
          display: block;
          font-size: 13px;
          color: #71717A;
          margin-top: -12px;
          margin-bottom: 16px;
        }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-primary {
          background: #3B82F6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563EB;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          transform: translateY(-1px);
        }

        .btn-success {
          background: #10B981;
          color: white;
        }

        .btn-success:hover {
          background: #059669;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-danger {
          background: #EF4444;
          color: white;
        }

        .btn-danger:hover {
          background: #DC2626;
        }

        .code-box {
          background: #FAFAFA;
          border: 2px dashed #E4E4E7;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          font-family: 'Courier New', monospace;
          font-size: 24px;
          font-weight: 700;
          color: #3B82F6;
          letter-spacing: 2px;
          margin: 16px 0;
        }

        .code-inline {
          font-family: 'Courier New', monospace;
          background: #F4F4F5;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          user-select: none;
          transition: all 0.2s;
        }

        .code-inline:hover {
          background: #E4E4E7;
        }

        .success-box {
          background: #F0FDF4;
          border-left: 4px solid #10B981;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
        }

        .success-title {
          font-weight: 600;
          color: #065F46;
          margin-bottom: 4px;
        }

        .success-text {
          color: #047857;
          font-size: 14px;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
          }

          .sidebar.mobile-open {
            transform: translateX(0);
          }

          .main-content {
            margin-left: 0;
            padding: 16px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .page-title {
            font-size: 24px;
          }
        }
      </style>
    </head>
    <body>
      <!-- Sidebar -->
      <div class="sidebar">
        <div class="sidebar-header">
          <div class="logo">
            <div class="logo-icon">📱</div>
            <div>
              <div>IKAS Telegram</div>
              <div style="font-size: 14px; font-weight: 500; color: #71717A;">Bildirimlerim</div>
            </div>
          </div>
          <div class="user-info">
            ${session.fullName}
            <div class="user-role">${isSuperAdmin ? '👑 Super Admin' : '🏢 Agency Admin'}</div>
          </div>
        </div>

        <div class="sidebar-nav">
          <div class="nav-section">
            <div class="nav-section-title">Ana Menü</div>
            <a href="/admin" class="nav-link ${title === 'Dashboard' ? 'active' : ''}">
              <span class="nav-icon">📊</span>
              Dashboard
            </a>
            ${isSuperAdmin ? `
            <a href="/admin/agencies" class="nav-link ${title === 'Ajanslar' ? 'active' : ''}">
              <span class="nav-icon">🏢</span>
              Ajanslar
            </a>
            <a href="/admin/agencies/new" class="nav-link ${title === 'Yeni Ajans' ? 'active' : ''}">
              <span class="nav-icon">➕</span>
              Yeni Ajans
            </a>
            ` : ''}
            <a href="/admin/stores" class="nav-link ${title === 'Mağazalar' ? 'active' : ''}">
              <span class="nav-icon">🏪</span>
              Mağazalar
            </a>
            <a href="/admin/stores/new" class="nav-link ${title === 'Yeni Mağaza' ? 'active' : ''}">
              <span class="nav-icon">🆕</span>
              Yeni Mağaza
            </a>
          </div>

          ${isSuperAdmin ? `
          <div class="nav-section">
            <div class="nav-section-title">Sistem</div>
            <a href="#" onclick="if(confirm('Tüm veritabanı sıfırlanacak. Emin misiniz?')){document.getElementById('resetForm').submit();return false;}" class="nav-link danger">
              <span class="nav-icon">🗑️</span>
              Veritabanını Sıfırla
            </a>
          </div>
          ` : ''}
        </div>

        <div class="sidebar-footer">
          <a href="/logout" class="logout-btn">
            <span>🚪</span>
            Çıkış Yap
          </a>
        </div>
      </div>

      <!-- Main Content -->
      <div class="main-content">
        ${content}
      </div>

      <form id="resetForm" method="POST" action="/admin/reset-database" style="display:none;"></form>
    </body>
    </html>
  `;
}

export function setupAdminRoutes(app) {
  // Dashboard
  app.get('/admin', requireAuth, async (req, res) => {
    const isSuperAdmin = req.session.role === 'super_admin';
    const agencyId = req.session.agencyId;

    // Get stores (filtered by agency if not super admin)
    let stores = await db_stores.getAll();
    if (!isSuperAdmin && agencyId) {
      stores = stores.filter(s => s.agency_id === agencyId);
    }

    const allUsers = stores.reduce((sum, s) => sum + s.user_count, 0);
    const stats = isSuperAdmin ? await db_notifications.getStats() : await db_notifications.getStatsByAgency(agencyId);

    // Filter test orders from total revenue
    const testOrderRevenue = stats.test_order_revenue || 0;
    const actualRevenue = (stats.total_revenue || 0) - testOrderRevenue;

    const content = `
      <div class="page-header">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Sistem genel bakış ve istatistikler</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Aktif Mağaza</div>
          <div class="stat-value">${stores.length}</div>
          <div class="stat-change">↗ ${isSuperAdmin ? 'Tüm sistem' : 'Ajansınız'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Kayıtlı Kullanıcı</div>
          <div class="stat-value">${allUsers}</div>
          <div class="stat-change">↗ Telegram kullanıcıları</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Toplam Bildirim</div>
          <div class="stat-value">${stats.total_notifications || 0}</div>
          <div class="stat-change">↗ Gönderilen siparişler</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Sipariş Tutarı</div>
          <div class="stat-value">${actualRevenue.toFixed(0)} TL</div>
          <div class="stat-change">↗ Test siparişler hariç</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Son Mağazalar</h2>
        </div>
        <div class="card-body" style="padding: 0;">
          <table>
            <thead>
              <tr>
                <th>Mağaza Adı</th>
                <th>Ajans</th>
                <th>Kullanıcı Sayısı</th>
                <th>Bağlantı Kodu</th>
                <th>Tarih</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              ${stores.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#71717A;padding:32px;">Henüz mağaza yok</td></tr>' : stores.map(s => `
                <tr>
                  <td><strong>${s.store_name}</strong></td>
                  <td>${s.agency_name || 'Demo'}</td>
                  <td><span class="badge">${s.user_count}</span></td>
                  <td>
                    <code class="code-inline link-code" data-code="${s.link_code}" title="Görmek için tıkla">
                      ••••••••
                    </code>
                  </td>
                  <td>${new Date(s.created_at).toLocaleDateString('tr-TR')}</td>
                  <td>
                    <a href="/admin/test-webhook/${s.id}" class="btn btn-success" style="padding: 6px 12px; font-size: 12px;">
                      🧪 Test
                    </a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
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
      </script>
    `;

    res.send(renderPage('Dashboard', content, req.session));
  });

  // Agencies (Super Admin only)
  app.get('/admin/agencies', requireAuth, requireSuperAdmin, async (req, res) => {
    const agencies = await db_agencies.getAll();

    const content = `
      <div class="page-header">
        <h1 class="page-title">Ajanslar</h1>
        <p class="page-subtitle">Tüm ajansları yönetin</p>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Tüm Ajanslar</h2>
        </div>
        <div class="card-body" style="padding: 0;">
          <table>
            <thead>
              <tr>
                <th>Ajans Adı</th>
                <th>Mağaza Sayısı</th>
                <th>Admin E-posta</th>
                <th>Notlar</th>
                <th>Oluşturma Tarihi</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              ${agencies.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#71717A;padding:32px;">Henüz ajans yok</td></tr>' : agencies.map(a => `
                <tr>
                  <td><strong>${a.name}</strong></td>
                  <td><span class="badge">${a.store_count || 0}</span></td>
                  <td>${a.admin_email || '-'}</td>
                  <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${a.notes || '-'}</td>
                  <td>${new Date(a.created_at).toLocaleDateString('tr-TR')}</td>
                  <td>
                    <div style="display: flex; gap: 8px;">
                      <a href="/admin/agencies/edit/${a.id}" class="btn btn-primary" style="padding: 6px 12px; font-size: 12px;">
                        ✏️ Düzenle
                      </a>
                      <button
                         onclick="deleteAgency(${a.id}, '${a.name.replace(/'/g, "\\'")}')"
                         class="btn btn-danger" style="padding: 6px 12px; font-size: 12px; border: none; cursor: pointer;">
                        🗑️ Sil
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div id="deleteModal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 50; align-items: center; justify-content: center;">
        <div style="background: white; border-radius: 12px; padding: 32px; max-width: 480px; width: 90%;">
          <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 12px;">Ajansı Sil</h2>
          <p id="deleteMessage" style="color: #71717A; margin-bottom: 24px;"></p>
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button onclick="closeDeleteModal()" class="btn" style="background: #E4E4E7; color: #18181B;">İptal</button>
            <button id="confirmDelete" class="btn btn-danger">Sil</button>
          </div>
        </div>
      </div>

      <script>
        let agencyToDelete = null;

        function deleteAgency(id, name) {
          agencyToDelete = id;
          document.getElementById('deleteMessage').textContent = name + ' ajansını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.';
          document.getElementById('deleteModal').style.display = 'flex';
        }

        function closeDeleteModal() {
          document.getElementById('deleteModal').style.display = 'none';
          agencyToDelete = null;
        }

        document.getElementById('confirmDelete').addEventListener('click', async function() {
          if (!agencyToDelete) return;

          console.log('Deleting agency:', agencyToDelete);

          try {
            const response = await fetch('/admin/agencies/delete/' + agencyToDelete, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });

            console.log('Delete response status:', response.status);

            if (response.ok) {
              const data = await response.json();
              console.log('Delete response data:', data);
              closeDeleteModal();
              window.location.reload();
            } else {
              const errorText = await response.text();
              console.error('Delete failed:', errorText);
              closeDeleteModal();
              alert('Silme işlemi başarısız oldu: ' + errorText);
            }
          } catch (error) {
            console.error('Delete error:', error);
            closeDeleteModal();
            alert('Bir hata oluştu: ' + error.message);
          }
        });
      </script>
    `;

    res.send(renderPage('Ajanslar', content, req.session));
  });

  // New Agency Form (Super Admin only)
  app.get('/admin/agencies/new', requireAuth, requireSuperAdmin, (req, res) => {
    const content = `
      <div class="page-header">
        <h1 class="page-title">Yeni Ajans Oluştur</h1>
        <p class="page-subtitle">Yeni bir ajans ve admin kullanıcısı oluşturun</p>
      </div>

      <div class="card">
        <div class="card-body">
          <form method="POST" action="/admin/agencies/create">
            <label>Ajans Adı:</label>
            <input type="text" name="agency_name" required placeholder="Örnek: ABC Digital Agency" />

            <label>Admin E-posta:</label>
            <input type="email" name="admin_email" required placeholder="admin@abcagency.com" />
            <small>Bu e-posta ile ajans yöneticisi giriş yapacak</small>

            <button type="submit" class="btn btn-primary">Ajans Oluştur</button>
          </form>
        </div>
      </div>
    `;

    res.send(renderPage('Yeni Ajans', content, req.session));
  });

  // Stores
  app.get('/admin/stores', requireAuth, async (req, res) => {
    const isSuperAdmin = req.session.role === 'super_admin';
    const agencyId = req.session.agencyId;

    let stores = await db_stores.getAll();
    if (!isSuperAdmin && agencyId) {
      stores = stores.filter(s => s.agency_id === agencyId);
    }

    const content = `
      <div class="page-header">
        <h1 class="page-title">Mağazalar</h1>
        <p class="page-subtitle">${isSuperAdmin ? 'Tüm' : 'Ajansınıza ait'} mağazaları görüntüleyin</p>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Tüm Mağazalar</h2>
        </div>
        <div class="card-body" style="padding: 0;">
          <table>
            <thead>
              <tr>
                <th>Mağaza Adı</th>
                <th>Ajans</th>
                <th>Kullanıcı Sayısı</th>
                <th>Bağlantı Kodu</th>
                <th>App ID</th>
                <th>Tarih</th>
              </tr>
            </thead>
            <tbody>
              ${stores.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#71717A;padding:32px;">Henüz mağaza yok</td></tr>' : stores.map(s => `
                <tr>
                  <td><strong>${s.store_name}</strong></td>
                  <td>${s.agency_name || 'Demo'}</td>
                  <td><span class="badge">${s.user_count}</span></td>
                  <td>
                    <code class="code-inline link-code" data-code="${s.link_code}" title="Görmek için tıkla">
                      ••••••••
                    </code>
                  </td>
                  <td>
                    <code class="code-inline app-id-code" data-appid="${s.authorized_app_id}" title="Görmek için tıkla" style="font-size:11px;">
                      ••••••••
                    </code>
                  </td>
                  <td>${new Date(s.created_at).toLocaleDateString('tr-TR')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <script>
        document.querySelectorAll('.link-code, .app-id-code').forEach(el => {
          let revealed = false;
          el.addEventListener('click', function() {
            const value = this.dataset.code || this.dataset.appid;
            if (!revealed) {
              this.textContent = value;
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

    res.send(renderPage('Mağazalar', content, req.session));
  });

  // New Store Form
  app.get('/admin/stores/new', requireAuth, async (req, res) => {
    const isSuperAdmin = req.session.role === 'super_admin';
    const agencies = isSuperAdmin ? await db_agencies.getAll() : [];

    const content = `
      <div class="page-header">
        <h1 class="page-title">Yeni Mağaza Ekle</h1>
        <p class="page-subtitle">IKAS mağazanızı sisteme ekleyin</p>
      </div>

      <div class="card">
        <div class="card-body">
          <form method="POST" action="/admin/stores/create">
            ${isSuperAdmin && agencies.length > 0 ? `
            <label>Ajans:</label>
            <select name="agency_id" style="width: 100%; padding: 12px 16px; border: 1px solid #E4E4E7; border-radius: 8px; margin-bottom: 16px; font-size: 14px;">
              ${agencies.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
            </select>
            ` : ''}

            <label>Mağaza Adı:</label>
            <input type="text" name="store_name" required placeholder="Örnek: Test Mağazam" />

            <label>IKAS Access Token (Bearer Token):</label>
            <input type="text" name="ikas_token" placeholder="Opsiyonel - IKAS API token" />
            <small>IKAS Admin Panel → Ayarlar → API'den alabilirsiniz</small>

            <label>IKAS Authorized App ID:</label>
            <input type="text" name="authorized_app_id" required placeholder="test-store-12345" />
            <small>Token yoksa herhangi bir ID yazabilirsiniz</small>

            <button type="submit" class="btn btn-primary">Mağaza Oluştur</button>
          </form>
        </div>
      </div>
    `;

    res.send(renderPage('Yeni Mağaza', content, req.session));
  });

  // Create Store
  app.post('/admin/stores/create', requireAuth, async (req, res) => {
    const { store_name, authorized_app_id, ikas_token, agency_id } = req.body;
    const isSuperAdmin = req.session.role === 'super_admin';

    let finalAgencyId = agency_id;

    if (!isSuperAdmin) {
      finalAgencyId = req.session.agencyId;
    }

    if (!finalAgencyId) {
      const agencies = await db_agencies.getAll();
      if (agencies.length === 0) {
        const newAgency = await db_agencies.create('Demo Agency');
        finalAgencyId = newAgency.id;
      } else {
        finalAgencyId = agencies[0].id;
      }
    }

    const store = await db_stores.create(finalAgencyId, store_name, authorized_app_id, ikas_token || null);

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'ikasbildirimlerim_bot';
    const botLink = `https://t.me/${botUsername}`;

    const webhookSetupButton = ikas_token
      ? `<a href="/admin/setup-webhook/${store.id}" class="btn btn-success" style="margin-right: 8px;">🔗 IKAS Webhook Kur</a>`
      : '';

    const content = `
      <div class="page-header">
        <h1 class="page-title">✅ Mağaza Oluşturuldu!</h1>
        <p class="page-subtitle">Mağazanız başarıyla sisteme eklendi</p>
      </div>

      <div class="card">
        <div class="card-body">
          <p style="margin-bottom: 8px;"><strong>Mağaza:</strong> ${store_name}</p>
          <p style="margin-bottom: 16px;"><strong>Bağlantı Kodu:</strong></p>
          <div class="code-box">${store.link_code}</div>

          <h3 style="margin-top: 32px; margin-bottom: 16px; font-size: 18px; font-weight: 600;">📋 Kullanıcı Talimatları</h3>
          <ol style="line-height: 1.8; padding-left: 20px; color: #52525B;">
            <li>Telegram'da botu açın: <a href="${botLink}" target="_blank" style="color: #3B82F6;">${botLink}</a></li>
            <li><code style="background: #F4F4F5; padding: 2px 6px; border-radius: 4px;">/start</code> komutunu yazın</li>
            <li><code style="background: #F4F4F5; padding: 2px 6px; border-radius: 4px;">/bagla ${store.link_code}</code> komutunu yazın</li>
            <li>Sipariş bildirimleri başlasın! 🎉</li>
          </ol>

          <div style="margin-top: 32px; display: flex; gap: 8px;">
            ${webhookSetupButton}
            <a href="/admin" class="btn btn-primary">Dashboard'a Dön</a>
          </div>
        </div>
      </div>
    `;

    res.send(renderPage('Mağaza Oluşturuldu', content, req.session));
  });

  // Reset Database (Super Admin only)
  app.post('/admin/reset-database', requireAuth, requireSuperAdmin, async (req, res) => {
    await resetDatabase();
    res.redirect('/admin');
  });

  // Test Webhook
  app.get('/admin/test-webhook/:storeId', requireAuth, async (req, res) => {
    const storeId = req.params.storeId;
    const store = await db_stores.getAll().then(stores => stores.find(s => s.id == storeId));

    if (!store) {
      return res.status(404).send('Store not found');
    }

    const testOrders = [
      {
        customer: { fullName: "Ahmet Yılmaz", phone: "+905551234567" },
        totalFinalPrice: 450.00,
        orderLineItems: [
          { quantity: 1, variant: { name: "Premium T-Shirt" }, finalPrice: 250.00, currencyCode: "TRY" },
          { quantity: 2, variant: { name: "Cotton Socks" }, finalPrice: 100.00, currencyCode: "TRY" }
        ]
      },
      {
        customer: { fullName: "Ayşe Demir", phone: "+905559876543" },
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
        orderedAt: new Date().toISOString(),
        isTest: true // Mark as test order
      })
    };

    try {
      const axios = (await import('axios')).default;
      const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : `http://localhost:${process.env.PORT || 3000}`;

      const response = await axios.post(`${baseUrl}/webhook/order`, webhookPayload);

      const content = `
        <div class="page-header">
          <h1 class="page-title">✅ Test Siparişi Gönderildi!</h1>
        </div>

        <div class="success-box">
          <div class="success-title">Test başarılı!</div>
          <div class="success-text">Sipariş bildirimi Telegram'a gönderildi</div>
        </div>

        <div class="card">
          <div class="card-body">
            <p><strong>Mağaza:</strong> ${store.store_name}</p>
            <p><strong>Durum:</strong> ${response.data.ok ? 'Başarılı' : 'Başarısız'}</p>
            <p><strong>Gönderilen Bildirim Sayısı:</strong> ${response.data.sent || 0}</p>

            <div style="margin-top: 24px;">
              <a href="/admin" class="btn btn-primary">Dashboard'a Dön</a>
            </div>
          </div>
        </div>
      `;

      res.send(renderPage('Test Siparişi', content, req.session));
    } catch (error) {
      const content = `
        <div class="page-header">
          <h1 class="page-title">❌ Test Siparişi Hatası</h1>
        </div>

        <div class="card">
          <div class="card-body">
            <p><strong>Hata:</strong> ${error.message}</p>

            <div style="margin-top: 24px;">
              <a href="/admin" class="btn btn-primary">Dashboard'a Dön</a>
            </div>
          </div>
        </div>
      `;

      res.send(renderPage('Test Siparişi Hatası', content, req.session));
    }
  });

  // Setup Webhook
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
        <div class="page-header">
          <h1 class="page-title">✅ Webhook Kuruldu!</h1>
        </div>

        <div class="success-box">
          <div class="success-title">🎉 Sistem Hazır!</div>
          <div class="success-text">Artık IKAS'tan gelen siparişler otomatik olarak Telegram'a bildirilecek.</div>
        </div>

        <div class="card">
          <div class="card-body">
            <p><strong>Mağaza:</strong> ${store.store_name}</p>
            <p><strong>Webhook URL:</strong> <code style="background: #F4F4F5; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${webhookUrl}</code></p>
            <p><strong>Webhook ID:</strong> ${webhookId}</p>
            <p><strong>Event:</strong> store/order/created</p>

            <div style="margin-top: 24px;">
              <a href="/admin" class="btn btn-primary">Dashboard'a Dön</a>
            </div>
          </div>
        </div>
      `;

      res.send(renderPage('Webhook Kuruldu', content, req.session));
    } catch (error) {
      const content = `
        <div class="page-header">
          <h1 class="page-title">❌ Webhook Kurulum Hatası</h1>
        </div>

        <div class="card">
          <div class="card-body">
            <p><strong>Hata:</strong> ${error.message}</p>
            <p style="margin-top: 16px; color: #71717A;">IKAS API token'ınızı kontrol edin veya IKAS destek ekibiyle iletişime geçin.</p>

            <div style="margin-top: 24px;">
              <a href="/admin" class="btn btn-primary">Dashboard'a Dön</a>
            </div>
          </div>
        </div>
      `;

      res.send(renderPage('Webhook Hatası', content, req.session));
    }
  });

  // Edit Agency (Super Admin only)
  app.get('/admin/agencies/edit/:id', requireAuth, requireSuperAdmin, async (req, res) => {
    const agencyId = req.params.id;
    const agency = await db_agencies.getById(agencyId);

    if (!agency) {
      return res.status(404).send('Ajans bulunamadı');
    }

    // Get admin user for this agency
    const adminUsers = await db_admin_users.getByAgency(agencyId);
    const adminUser = adminUsers[0] || null;

    const content = `
      <div class="page-header">
        <h1 class="page-title">Ajans Düzenle</h1>
        <p class="page-subtitle">${agency.name} ajansını düzenleyin</p>
      </div>

      <div class="card">
        <div class="card-body">
          <form method="POST" action="/admin/agencies/update/${agencyId}">
            <label>Ajans Adı:</label>
            <input type="text" name="agency_name" required value="${agency.name}" placeholder="Örnek: ABC Digital Agency" />

            <label>Notlar:</label>
            <textarea name="notes" rows="4" placeholder="Ajans hakkında notlar...">${agency.notes || ''}</textarea>

            ${adminUser ? `
              <h3 style="margin-top: 24px; margin-bottom: 16px; font-size: 18px; font-weight: 600;">Admin Kullanıcı</h3>

              <label>Admin E-posta:</label>
              <input type="email" value="${adminUser.email}" disabled style="background: #F4F4F5; cursor: not-allowed;" />
              <small style="margin-top: -12px;">E-posta değiştirilemez</small>

              <label>Tam Ad:</label>
              <input type="text" name="admin_full_name" value="${adminUser.full_name}" placeholder="Admin adı" />

              <div style="margin-top: 16px; padding: 16px; background: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px;">
                <p style="font-size: 14px; color: #92400E; margin-bottom: 8px;">
                  <strong>⚠️ Şifre Sıfırlama</strong>
                </p>
                <p style="font-size: 13px; color: #B45309; margin-bottom: 12px;">
                  Ajans admin kullanıcısının şifresini sıfırlamak için aşağıdaki kutuyu işaretleyin. Yeni geçici şifre oluşturulacak ve kullanıcı ilk girişte şifresini değiştirmek zorunda kalacak.
                </p>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                  <input type="checkbox" name="reset_password" value="1" style="width: auto; margin: 0;">
                  <span>Admin kullanıcısının şifresini sıfırla</span>
                </label>
              </div>
            ` : ''}

            <div style="margin-top: 24px; display: flex; gap: 12px;">
              <button type="submit" class="btn btn-primary">Değişiklikleri Kaydet</button>
              <a href="/admin/agencies" class="btn" style="background: #E4E4E7; color: #18181B;">İptal</a>
            </div>
          </form>
        </div>
      </div>
    `;

    res.send(renderPage('Ajans Düzenle', content, req.session));
  });

  // Update Agency (Super Admin only)
  app.post('/admin/agencies/update/:id', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const agencyId = parseInt(req.params.id);
      const { agency_name, notes, admin_full_name, reset_password } = req.body;

      console.log('📝 Updating agency:', agencyId);
      console.log('  Agency name:', agency_name);
      console.log('  Admin full name:', admin_full_name);
      console.log('  Reset password:', reset_password);

      // Update agency
      await db_agencies.update(agencyId, agency_name, notes || null);
      console.log('✅ Agency updated');

      // Update admin user if exists
      const adminUsers = await db_admin_users.getByAgency(agencyId);
      let tempPassword = null;

      if (adminUsers.length > 0) {
        const adminUser = adminUsers[0];

        // Update full name if changed
        if (admin_full_name && admin_full_name !== adminUser.full_name) {
          await db_admin_users.update(adminUser.id, admin_full_name);
          console.log('✅ Admin full name updated:', admin_full_name);
        }

        // Reset password if requested
        if (reset_password === '1') {
          const crypto = await import('crypto');
          tempPassword = crypto.default.randomBytes(4).toString('hex').toUpperCase();
          const { hashPassword } = await import('./auth.js');
          const passwordHash = await hashPassword(tempPassword);

          await db_admin_users.updatePassword(adminUser.id, passwordHash, true);
          console.log('✅ Admin password reset with temp password');
        }
      }

      // If password was reset, show success page with password
      if (tempPassword) {
        const content = `
          <div class="page-header">
            <h1 class="page-title">✅ Ajans Güncellendi!</h1>
          </div>

          <div class="success-box">
            <div class="success-title">Değişiklikler kaydedildi</div>
            <div class="success-text">Ajans bilgileri başarıyla güncellendi.</div>
          </div>

          <div class="card">
            <div class="card-body">
              <p><strong>Ajans:</strong> ${agency_name}</p>
              <div style="margin-top: 24px; padding: 16px; background: #FAFAFA; border: 2px dashed #E4E4E7; border-radius: 8px;">
                <p style="font-weight: 600; margin-bottom: 8px;">🔑 Yeni Geçici Şifre</p>
                <div style="font-family: 'Courier New', monospace; font-size: 24px; font-weight: 700; color: #3B82F6; padding: 12px; background: white; border-radius: 6px; border: 1px solid #E4E4E7; text-align: center; letter-spacing: 2px;">
                  ${tempPassword}
                </div>
                <p style="margin-top: 12px; font-size: 13px; color: #71717A;">
                  ⚠️ Bu şifreyi ajans yöneticisiyle paylaşın. İlk girişte şifre değiştirme zorunludur.
                </p>
              </div>

              <div style="margin-top: 24px;">
                <a href="/admin/agencies" class="btn btn-primary">Ajanslar Listesine Dön</a>
              </div>
            </div>
          </div>
        `;

        return res.send(renderPage('Ajans Güncellendi', content, req.session));
      }

      // Otherwise just redirect back to agencies list
      console.log('✅ Update complete, redirecting to agencies list');
      res.redirect('/admin/agencies');
    } catch (error) {
      console.error('❌ Error updating agency:', error);
      res.status(500).send(`Error updating agency: ${error.message}`);
    }
  });

  app.get('/admin/api/overview', requireAuth, async (req, res) => {
    try {
      if (req.session.role !== 'super_admin') {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
      }

      const stats = await db_agencies.getOverviewStats();

      res.json({
        ok: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get('/admin/api/agencies', requireAuth, async (req, res) => {
    try {
      if (req.session.role !== 'super_admin') {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
      }

      const search = req.query.search || '';
      const status = req.query.status || 'all';
      const page = parseInt(req.query.page) || 1;
      const perPage = parseInt(req.query.per_page) || 20;

      const result = await db_agencies.getAgenciesWithStats(search, status, page, perPage);

      res.json({
        ok: true,
        data: {
          items: result.items,
          pagination: {
            page,
            per_page: perPage,
            total_items: result.total_items,
            total_pages: result.total_pages
          }
        }
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get('/admin/api/agencies/:id', requireAuth, async (req, res) => {
    try {
      if (req.session.role !== 'super_admin') {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
      }

      const agencyId = parseInt(req.params.id);
      const agency = await db_agencies.getAgencyDetailWithStats(agencyId);

      if (!agency) {
        return res.status(404).json({ ok: false, error: 'Agency not found' });
      }

      res.json({
        ok: true,
        data: agency
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get('/admin/api/agencies/:id/stores', requireAuth, async (req, res) => {
    try {
      if (req.session.role !== 'super_admin') {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
      }

      const agencyId = parseInt(req.params.id);
      const stores = await db_agencies.getAgencyStores(agencyId);

      res.json({
        ok: true,
        data: {
          items: stores
        }
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post('/admin/api/agencies', requireAuth, async (req, res) => {
    try {
      if (req.session.role !== 'super_admin') {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
      }

      const { name, admin_email, admin_full_name } = req.body;

      if (!name || !admin_email) {
        return res.status(400).json({ ok: false, error: 'Name and admin_email are required' });
      }

      const agency = await db_agencies.create(name);

      const tempPassword = crypto.randomBytes(4).toString('hex').toUpperCase();
      const passwordHash = await hashPassword(tempPassword);

      await db_admin_users.create(
        admin_email,
        passwordHash,
        admin_full_name || 'Agency Admin',
        'agency_admin',
        agency.id
      );

      res.json({
        ok: true,
        data: {
          id: agency.id,
          name: name,
          admin_email: admin_email,
          temporary_password: tempPassword
        }
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.put('/admin/api/agencies/:id', requireAuth, async (req, res) => {
    try {
      if (req.session.role !== 'super_admin') {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
      }

      const agencyId = parseInt(req.params.id);
      const { name, notes, active } = req.body;

      const agency = await db_agencies.getById(agencyId);
      if (!agency) {
        return res.status(404).json({ ok: false, error: 'Agency not found' });
      }

      await db_agencies.updateFull(
        agencyId,
        name !== undefined ? name : agency.name,
        notes !== undefined ? notes : agency.notes,
        active !== undefined ? active : agency.active
      );

      const updated = await db_agencies.getById(agencyId);

      res.json({
        ok: true,
        data: {
          id: updated.id,
          name: updated.name,
          notes: updated.notes,
          active: updated.active
        }
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Delete Agency (Super Admin only)
  app.post('/admin/agencies/delete/:id', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const agencyId = parseInt(req.params.id);
      console.log('🗑️  Deleting agency:', agencyId);

      const adminUsers = await db_admin_users.getByAgency(agencyId);
      console.log(`  Found ${adminUsers.length} admin users to deactivate`);

      for (const user of adminUsers) {
        await db_admin_users.deactivate(user.id);
        console.log(`  Deactivated admin user: ${user.email}`);
      }

      await db_agencies.delete(agencyId);
      console.log(`✅ Agency ${agencyId} deleted successfully`);

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Error deleting agency:', error);
      res.status(500).json({ error: error.message });
    }
  });
}
