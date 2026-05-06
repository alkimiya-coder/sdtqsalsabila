require('dotenv').config()
const express = require('express')
const session = require('express-session') // Tambahan untuk login
const cors = require('cors')
const multer = require('multer')
const axios = require('axios')
const path = require('path')

const app = express()
const upload = multer()

// Konfigurasi dari .env
const PORT = process.env.PORT || 3000
const GAS_URL = process.env.GAS_URL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// --- KONFIGURASI SESSION (Untuk Login) ---
app.use(
  session({
    secret: 'salsabila-secret-key', // Bisa diganti bebas
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 }, // Login berlaku 1 jam
  }),
)

app.use(express.static(path.join(__dirname, 'public')))

// --- MIDDLEWARE PROTEKSI ADMIN ---
// Fungsi ini mengecek apakah user sudah login atau belum
const authMiddleware = (req, res, next) => {
  if (req.session.isAdmin) {
    next()
  } else {
    res.redirect('/login') // Jika belum login, lempar ke halaman login
  }
}

// --- ROUTING HALAMAN (VIEWS) ---

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'))
})

app.get('/ppdb', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'ppdb.html'))
})

//to testimoni
app.get('/testimoni', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'testimoni.html'))
})

// Halaman Login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'))
})

// Proses Login
app.post('/login', (req, res) => {
  const { password } = req.body
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true
    res.redirect('/admin')
  } else {
    res.send(
      "<script>alert('Password Salah!'); window.location='/login';</script>",
    )
  }
})

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/')
})

// Dashboard Admin (Sekarang Diproteksi)
app.get('/admin', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'))
})

// --- API ENDPOINTS ---

// 1. Ambil Konten Website dari GAS (Untuk Index & Admin)
app.get('/api/content', async (req, res) => {
  try {
    const mode = req.query.mode || ''
    // PERBAIKAN: Gunakan GAS_URL (bukan GAS_WEB_APP_URL) dan gunakan axios
    const response = await axios.get(`${GAS_URL}?target=content&mode=${mode}`)

    // Axios menyimpan data di .data
    res.json(response.data)
  } catch (error) {
    console.error('Error fetching content:', error.message)
    res.status(500).json({ status: 'ERROR', message: error.message })
  }
})
// 2. Kirim Pendaftaran PPDB (Logika Anda)
app.post('/kirim-pendaftaran', upload.any(), async (req, res) => {
  try {
    const folderData = { ...req.body, type: 'PPDB' }
    if (req.files) {
      req.files.forEach((file) => {
        folderData[file.fieldname] = {
          base64: file.buffer.toString('base64'),
          type: file.mimetype,
          name: file.originalname,
        }
      })
    }
    const response = await axios.post(GAS_URL, folderData)
    res.json(response.data)
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message })
  }
})

app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`))

// Endpoint untuk Update Konten dari Admin
app.post('/api/update-settings', async (req, res) => {
  try {
    // req.body sekarang sudah berisi 'type' yang ditentukan dari frontend
    // Misal: { type: 'UPDATE_SETTINGS', key: 'wa_admin', ... }
    // Atau: { type: 'ADD_BERITA', judul: '...', ... }

    const response = await axios.post(process.env.GAS_URL, req.body)

    // Kirim balik respon dari GAS ke browser
    res.json(response.data)
  } catch (error) {
    console.error('Error bridge to GAS:', error.message)
    res.status(500).json({ status: 'ERROR', message: error.message })
  }
})

// Endpoint untuk Logout
app.get('/logout', (req, res) => {
  // Jika Anda menggunakan express-session, hapus session-nya
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.send('Gagal logout')
      }
      res.clearCookie('connect.sid') // Nama cookie default express-session
      res.redirect('/login') // Arahkan kembali ke halaman login
    })
  } else {
    res.redirect('/login')
  }
})

module.exports = app
