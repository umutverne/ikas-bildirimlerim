import { db_admin_users } from './db_admin_users.js';
import { db_agencies, db_stores, db_users, db_notifications } from './database.js';
import { hashPassword, verifyPassword, createSession, getSession, deleteSession, requireAuth, requireSuperAdmin, requireAgencyAdmin } from './auth.js';
import crypto from 'crypto';

function generatePassword() {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 karakter
}

function renderLoginPage(error = null) {
  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Giriş - IKAS Bildirimlerim</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 min-h-screen flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            📱 IKAS Telegram Bildirimlerim
          </h1>
          <p class="text-gray-500 mt-2">Yönetim Paneli</p>
        </div>

        ${error ? `
          <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p class="text-red-700 text-sm">${error}</p>
          </div>
        ` : ''}

        <form method="POST" action="/login" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
            <input
              type="email"
              name="email"
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Şifre</label>
            <input
              type="password"
              name="password"
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            class="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition transform hover:-translate-y-0.5"
          >
            Giriş Yap
          </button>
        </form>

        <p class="text-center text-sm text-gray-500 mt-6">
          Varsayılan giriş: admin@ikasbildirim.com / admin123
        </p>
      </div>
    </body>
    </html>
  `;
}

export function setupAuthRoutes(app) {
  // Login page
  app.get('/login', (req, res) => {
    res.send(renderLoginPage());
  });

  // Login handler
  app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    console.log('🔐 Login attempt:', email);
    const user = await db_admin_users.getByEmail(email);
    console.log('👤 User found:', user ? 'YES' : 'NO');

    if (!user) {
      console.log('❌ User not found');
      return res.send(renderLoginPage('E-posta veya şifre hatalı'));
    }

    const passwordValid = await verifyPassword(password, user.password_hash);
    console.log('🔑 Password valid:', passwordValid);

    if (!passwordValid) {
      console.log('❌ Invalid password');
      return res.send(renderLoginPage('E-posta veya şifre hatalı'));
    }

    // Create session
    const { sessionId } = createSession(user);
    await db_admin_users.updateLastLogin(user.id);

    res.cookie('session_id', sessionId, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    });

    // Check if must change password
    if (user.must_change_password) {
      return res.redirect('/change-password');
    }

    res.redirect('/admin');
  });

  // Logout
  app.get('/logout', (req, res) => {
    const sessionId = req.cookies?.session_id;
    if (sessionId) {
      deleteSession(sessionId);
    }
    res.clearCookie('session_id');
    res.redirect('/login');
  });

  // Change password (ilk giriş)
  app.get('/change-password', requireAuth, (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Şifre Değiştir</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-50 min-h-screen flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-lg w-full max-w-md p-8">
          <h2 class="text-2xl font-bold text-gray-800 mb-6">Şifrenizi Değiştirin</h2>
          <p class="text-gray-600 mb-6">Güvenliğiniz için lütfen şifrenizi değiştirin.</p>

          <form method="POST" action="/change-password" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Yeni Şifre</label>
              <input
                type="password"
                name="new_password"
                required
                minlength="6"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Minimum 6 karakter"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Yeni Şifre (Tekrar)</label>
              <input
                type="password"
                name="confirm_password"
                required
                minlength="6"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Şifreyi tekrar girin"
              />
            </div>

            <button
              type="submit"
              class="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
            >
              Şifreyi Güncelle
            </button>
          </form>
        </div>
      </body>
      </html>
    `);
  });

  app.post('/change-password', requireAuth, async (req, res) => {
    const { new_password, confirm_password } = req.body;

    if (new_password !== confirm_password) {
      return res.send('Şifreler eşleşmiyor!');
    }

    const password_hash = await hashPassword(new_password);

    // Update password and remove must_change_password flag
    await db_admin_users.updatePassword(req.session.adminUserId, password_hash, false);

    res.redirect('/admin');
  });

  // Create Agency (Super Admin only)
  app.post('/admin/agencies/create', requireAuth, requireSuperAdmin, async (req, res) => {
    const { agency_name, admin_email } = req.body;

    // Create agency
    const agency = await db_agencies.create(agency_name);

    // Generate temporary password
    const tempPassword = generatePassword();
    const passwordHash = await hashPassword(tempPassword);

    // Create admin user for agency
    await db_admin_users.create(
      admin_email,
      passwordHash,
      `${agency_name} Admin`,
      'agency_admin',
      agency.id,
      true // must_change_password
    );

    // Render success page with credentials
    res.send(`
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Ajans Oluşturuldu - IKAS Telegram Bildirimlerim</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #F4F4F5;
            min-height: 100vh;
            padding: 32px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: #FFFFFF;
            border: 1px solid #E4E4E7;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
          h1 {
            font-size: 28px;
            font-weight: 700;
            color: #18181B;
            margin-bottom: 8px;
          }
          .success-badge {
            display: inline-block;
            padding: 8px 16px;
            background: #F0FDF4;
            color: #065F46;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 24px;
          }
          .info-box {
            background: #FAFAFA;
            border: 2px dashed #E4E4E7;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
          }
          .info-label {
            font-size: 12px;
            font-weight: 600;
            color: #71717A;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          .info-value {
            font-family: 'Courier New', monospace;
            font-size: 18px;
            font-weight: 700;
            color: #3B82F6;
            padding: 12px;
            background: white;
            border-radius: 6px;
            border: 1px solid #E4E4E7;
          }
          .warning-box {
            background: #FEF3C7;
            border-left: 4px solid #F59E0B;
            padding: 16px;
            border-radius: 8px;
            margin: 24px 0;
          }
          .warning-title {
            font-weight: 600;
            color: #92400E;
            margin-bottom: 4px;
          }
          .warning-text {
            color: #B45309;
            font-size: 14px;
          }
          .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #3B82F6;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.2s;
          }
          .btn:hover {
            background: #2563EB;
            transform: translateY(-1px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <span class="success-badge">✅ Başarılı</span>
          <h1>Ajans Oluşturuldu!</h1>
          <p style="color: #71717A; margin-top: 8px;">Ajans başarıyla sisteme eklendi.</p>

          <div class="info-box">
            <div style="margin-bottom: 20px;">
              <div class="info-label">Ajans Adı</div>
              <div class="info-value">${agency_name}</div>
            </div>

            <div style="margin-bottom: 20px;">
              <div class="info-label">Admin E-posta</div>
              <div class="info-value">${admin_email}</div>
            </div>

            <div>
              <div class="info-label">Geçici Şifre</div>
              <div class="info-value">${tempPassword}</div>
            </div>
          </div>

          <div class="warning-box">
            <div class="warning-title">⚠️ Önemli</div>
            <div class="warning-text">
              Bu bilgileri ajans yöneticisiyle paylaşın. İlk girişte şifre değişikliği zorunludur.
            </div>
          </div>

          <div style="margin-top: 32px;">
            <a href="/admin/agencies" class="btn">Ajanslar Listesine Dön</a>
          </div>
        </div>
      </body>
      </html>
    `);
  });
}
