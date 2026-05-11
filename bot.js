const TelegramBot = require("node-telegram-bot-api");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const { google } = require("googleapis");
const axios = require("axios");
const stream = require("stream");

// ── Config ──────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.7915064433:AAHh9dNRVw43VETh8Ee8hFAvpnmZAsCgaWE;
const SHEET_ID = process.env.1uL2JOeJ8OLNIzlx_UooNpFoDjgyzp1wJEE8ikSlWEKg;
const DRIVE_FOLDER_ID = process.env.1YUHFayud5QnG0t1AJpD3g9W-pCp1XsSE;
const SERVICE_ACCOUNT_EMAIL = process.env.hotdkebayoran@bot-aktivitas-hotd.iam.gserviceaccount.com;
const PRIVATE_KEY = process.env.-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDGNk8dZOSguLP9\ny2udhViKLqZt69aTbD6r2gdITq5b1fO7Z2twzmXukWWxfmTi48Iv1gJj2doXbIOM\nZ7mxo4KN7caT7XbmV3CL7DbcXpj/vzUY+hUwmAXOF0Ho8wBdHJbQ5f5yAE++Q30x\nc3o/qDJ6GoAyWsfcpSD3piAmZmmbZWrHPbJq54scBofm0PaS5cyE8ob+DlaWgUda\nsGMRpZ5Xz0wcXrx/fwBNJUxw04HUkDKpeg5Q/SrjzYgSwjvwNM4NDAvsmv6Ilo25\n7Yo/rHvj4o/QS86e3EG5MKLFm1lOEf0Qn325rgUjM1bTTzlvYZNLSp+d6xdMJSEg\nLxQRvB4lAgMBAAECggEAA9DqW4TEgRKlRnra3szBLGHjCuU6O5rfJwRa1QnMwhBf\nsak3UJPssvfiJxVpoFOlurGKWL1KPV61tqeNk+2ztwNPqivteNhQnqUE1l/M3smh\n3lH8Q/P9Up8wgelhxakl/y4aZLv8TQu0FpZkUWLt29t0QePtCqK0PIhagJrCqD72\nJkONkMU68bbAOvW/THucmUtUEdvNk3I+5k5GO9L73Ex8+1Vbd0osD1x6g3ip5ljm\n6kXigVpfiiHYoVvgGA341xq7YfuS069ybpSDuf0Lr+XgTr9aAm2zEUCSoIn7xR8v\nU4MOOf4wulXIJyngqksg5tJ1ubms/z7dun9zKCR7kQKBgQD23H5IsHuJtZDfoorA\na/zom9KXI/H2+3e3NW0EarkUpos7iZzKf+EhmibwifavxccFJiTo3fXoSbPnwUMd\nXCzKePucSDLWUMxtE9xYAahMvuNBNRNpXsYI+OIt43Eatyx5dSAdsHcI4V3w2tmQ\ngyojd8rMCrz7vBIDANOsn4AWsQKBgQDNjMRrIjE5dfD6ClpYzMryb8JHXL+3J2y1\nHMHQjm5nCri4zr69XmPsfTgbflY6MLWLnqmLQNZIiRSNJ3Ik1NeYO4mdzrgIt450\nCDo4RxdfZMtTJXWd8+isTvZf9nuKtB9MYXGHsRMhR6ovQFQDrrstFZ6oEUxLKDio\neOXl1GgDtQKBgQDCGMHuU1z+/NSJEds4ym+TURl2ntucD0KkuYwbAfK+CujEikHO\nclfIPNVLIZ7lu4LtSH2S3xp/Zpvep/UmO5g4JoHm8lmOav8g8JG6XKtAlIJIffvi\nSJM68L2dyQvgLo/4e6Ah1+LwB4r+WoTf/FGAi6rXXcYTxF8BH4BPZSWoMQKBgFpO\nYylSb1/4YjPogoMLDoru8OMba5tTNd5oUPqI6RZaTofbRU+7fZkz9oeVvNp59fju\nbzyf8sURfLb7QpnN7R6T4cU0QgSKaIqv5qw9B5bAmNfh2EfaFjpFwtasWuC4fBu5\noABmmqn/a1SxJXgst016dycN2oAWnrXdz9tms4AVAoGAWx7ZnqCTB7AK5Gh08iZA\njCbIASIfJbLkm/lpQCRbfDwolOFkugDBa/IxS/wdFl3hL/NsKtwTFLmQHKfZNx1r\ndQ6jhCvB2zXZAg9xUAUV2asrx3BO4gPv2JGRx4tVCh19kgs1/NjbTaTY4XmrZSys\nspQvxAE6vGRxE1CtcN4ru68=\n-----END PRIVATE KEY-----\n.replace(/\\n/g, "\n");

if (!BOT_TOKEN || !SHEET_ID || !DRIVE_FOLDER_ID || !SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
  console.error("❌ Environment variables belum lengkap! Cek README.md");
  process.exit(1);
}

// ── Google Auth (Sheets + Drive) ─────────────────────────────────────────────
const serviceAccountAuth = new JWT({
  email: SERVICE_ACCOUNT_EMAIL,
  key: PRIVATE_KEY,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
  ],
});

// ── Google Drive ──────────────────────────────────────────────────────────────
const drive = google.drive({ version: "v3", auth: serviceAccountAuth });

async function uploadToDrive(fileBuffer, fileName, mimeType) {
  const bufferStream = new stream.PassThrough();
  bufferStream.end(fileBuffer);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [DRIVE_FOLDER_ID],
    },
    media: {
      mimeType,
      body: bufferStream,
    },
    fields: "id, webViewLink",
  });

  // Jadikan file bisa dilihat siapa saja yang punya link
  await drive.permissions.create({
    fileId: res.data.id,
    requestBody: { role: "reader", type: "anyone" },
  });

  return res.data.webViewLink;
}

const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);

async function getSheet(name) {
  await doc.loadInfo();
  let sheet = doc.sheetsByTitle[name];
  if (!sheet) {
    sheet = await doc.addSheet({ title: name });
    if (name === "TodoList") {
      await sheet.setHeaderRow(["ID", "Task", "Status", "Tanggal Dibuat"]);
    } else if (name === "Pengeluaran") {
      await sheet.setHeaderRow(["ID", "Tanggal", "Keterangan", "Jumlah", "Kategori", "Bukti"]);
    }
  }
  return sheet;
}

function generateId() {
  return Date.now().toString(36).toUpperCase();
}

function formatRupiah(angka) {
  return "Rp " + Number(angka).toLocaleString("id-ID");
}

function today() {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ── Bot Setup ────────────────────────────────────────────────────────────────
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// State untuk multi-step conversation
const userState = {};

function setState(chatId, state) {
  userState[chatId] = state;
}
function getState(chatId) {
  return userState[chatId] || null;
}
function clearState(chatId) {
  delete userState[chatId];
}

// ── /start ───────────────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const name = msg.from.first_name || "Kamu";
  bot.sendMessage(
    msg.chat.id,
    `👋 Halo *${name}*\\! Selamat datang di bot pencatat harianmu\\.\n\n` +
      `📋 *Perintah yang tersedia:*\n\n` +
      `📝 /todolist — Kelola daftar tugas\n` +
      `💸 /pengeluaran — Catat pengeluaran\n` +
      `❓ /help — Bantuan`,
    { parse_mode: "MarkdownV2" }
  );
});

// ── /help ────────────────────────────────────────────────────────────────────
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `📖 *Panduan Penggunaan*\n\n` +
      `*📝 TodoList:*\n` +
      `/todolist — Buka menu todo\n\n` +
      `*💸 Pengeluaran:*\n` +
      `/pengeluaran — Buka menu pengeluaran\n\n` +
      `Ikuti instruksi yang muncul di layar\\.`,
    { parse_mode: "MarkdownV2" }
  );
});

// ── /todolist ────────────────────────────────────────────────────────────────
bot.onText(/\/todolist/, (msg) => {
  bot.sendMessage(msg.chat.id, "📝 *Menu TodoList*", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "➕ Tambah Task", callback_data: "todo_tambah" }],
        [{ text: "📋 Lihat Daftar Task", callback_data: "todo_lihat" }],
        [{ text: "✅ Tandai Selesai", callback_data: "todo_selesai" }],
        [{ text: "🗑️ Hapus Task", callback_data: "todo_hapus" }],
      ],
    },
  });
});

// ── /pengeluaran ─────────────────────────────────────────────────────────────
bot.onText(/\/pengeluaran/, (msg) => {
  bot.sendMessage(msg.chat.id, "💸 *Menu Pengeluaran*", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "➕ Catat Pengeluaran", callback_data: "bayar_catat" }],
      ],
    },
  });
});

// ── Callback Handler ─────────────────────────────────────────────────────────
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  await bot.answerCallbackQuery(query.id);

  // ── TODO: Tambah ──
  if (data === "todo_tambah") {
    setState(chatId, { action: "todo_tambah" });
    bot.sendMessage(chatId, "✏️ Ketik nama task yang ingin ditambahkan:");

  // ── TODO: Lihat ──
  } else if (data === "todo_lihat") {
    try {
      const sheet = await getSheet("TodoList");
      const rows = await sheet.getRows();
      if (rows.length === 0) {
        bot.sendMessage(chatId, "📋 Belum ada task. Tambah dulu dengan /todolist!");
        return;
      }
      const pending = rows.filter((r) => r.get("Status") === "Pending");
      const done = rows.filter((r) => r.get("Status") === "Selesai");

      let text = "📋 *Daftar Task:*\n\n";
      if (pending.length > 0) {
        text += "⏳ *Belum Selesai:*\n";
        pending.forEach((r) => {
          text += `• \`${r.get("ID")}\` — ${r.get("Task")}\n`;
        });
      }
      if (done.length > 0) {
        text += "\n✅ *Selesai:*\n";
        done.forEach((r) => {
          text += `• ~~${r.get("Task")}~~\n`;
        });
      }
      bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
    } catch (e) {
      bot.sendMessage(chatId, "❌ Gagal mengambil data: " + e.message);
    }

  // ── TODO: Tandai Selesai ──
  } else if (data === "todo_selesai") {
    setState(chatId, { action: "todo_selesai" });
    bot.sendMessage(
      chatId,
      "✅ Ketik *ID task* yang ingin ditandai selesai.\n_(Lihat ID dengan /todolist → Lihat Daftar Task)_",
      { parse_mode: "Markdown" }
    );

  // ── TODO: Hapus ──
  } else if (data === "todo_hapus") {
    setState(chatId, { action: "todo_hapus" });
    bot.sendMessage(
      chatId,
      "🗑️ Ketik *ID task* yang ingin dihapus.\n_(Lihat ID dengan /todolist → Lihat Daftar Task)_",
      { parse_mode: "Markdown" }
    );

  // ── BAYAR: Catat ──
  } else if (data === "bayar_catat") {
    setState(chatId, { action: "bayar_catat", step: "keterangan" });
    bot.sendMessage(chatId, "📝 Ketik *keterangan pengeluaran* (contoh: Makan siang, Bensin):", {
      parse_mode: "Markdown",
    });

  // ── BAYAR: Pilih Kategori → minta foto bukti ──
  } else if (data.startsWith("kategori_")) {
    const kategori = data.replace("kategori_", "");
    const state = getState(chatId);
    if (state?.action === "bayar_catat" && state?.step === "kategori") {
      setState(chatId, { ...state, step: "bukti", kategori });
      bot.sendMessage(
        chatId,
        `🧾 Terakhir, kirim *foto bukti transfer atau kuitansi*-nya ya!\n_(Kirim sebagai foto/gambar)_`,
        { parse_mode: "Markdown" }
      );
    }
  }
});

// ── Photo Handler (untuk bukti pengeluaran) ──────────────────────────────────
bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  const state = getState(chatId);
  if (!state || state.action !== "bayar_catat" || state.step !== "bukti") return;

  try {
    // Ambil foto resolusi tertinggi
    const photos = msg.photo;
    const bestPhoto = photos[photos.length - 1];
    const fileInfo = await bot.getFile(bestPhoto.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;

    bot.sendMessage(chatId, "⏳ Mengupload bukti ke Google Drive...");

    // Download foto dari Telegram
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);
    const ext = fileInfo.file_path.split(".").pop() || "jpg";
    const fileName = `bukti_${state.keterangan.replace(/\s+/g, "_")}_${generateId()}.${ext}`;

    // Upload ke Google Drive
    const driveLink = await uploadToDrive(buffer, fileName, `image/${ext}`);

    // Simpan ke Google Sheets
    const sheet = await getSheet("Pengeluaran");
    await sheet.addRow({
      ID: generateId(),
      Tanggal: today(),
      Keterangan: state.keterangan,
      Jumlah: state.jumlah,
      Kategori: state.kategori,
      Bukti: driveLink,
    });

    clearState(chatId);
    bot.sendMessage(
      chatId,
      `✅ *Pengeluaran berhasil dicatat!*\n\n` +
        `📌 *${state.keterangan}*\n` +
        `💰 ${formatRupiah(state.jumlah)}\n` +
        `🏷️ ${state.kategori}\n` +
        `📅 ${today()}\n` +
        `🧾 [Lihat Bukti](${driveLink})`,
      { parse_mode: "Markdown", disable_web_page_preview: true }
    );
  } catch (e) {
    clearState(chatId);
    bot.sendMessage(chatId, "❌ Gagal mengupload bukti: " + e.message);
  }
});

// ── Document Handler (jika kirim sebagai file/dokumen) ────────────────────────
bot.on("document", async (msg) => {
  const chatId = msg.chat.id;
  const state = getState(chatId);
  if (!state || state.action !== "bayar_catat" || state.step !== "bukti") return;

  const doc2 = msg.document;
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
  if (!allowedTypes.includes(doc2.mime_type)) {
    bot.sendMessage(chatId, "❌ Format tidak didukung. Kirim sebagai foto atau PDF saja ya.");
    return;
  }

  try {
    const fileInfo = await bot.getFile(doc2.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;

    bot.sendMessage(chatId, "⏳ Mengupload bukti ke Google Drive...");

    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);
    const ext = doc2.file_name?.split(".").pop() || "pdf";
    const fileName = `bukti_${state.keterangan.replace(/\s+/g, "_")}_${generateId()}.${ext}`;

    const driveLink = await uploadToDrive(buffer, fileName, doc2.mime_type);

    const sheet = await getSheet("Pengeluaran");
    await sheet.addRow({
      ID: generateId(),
      Tanggal: today(),
      Keterangan: state.keterangan,
      Jumlah: state.jumlah,
      Kategori: state.kategori,
      Bukti: driveLink,
    });

    clearState(chatId);
    bot.sendMessage(
      chatId,
      `✅ *Pengeluaran berhasil dicatat!*\n\n` +
        `📌 *${state.keterangan}*\n` +
        `💰 ${formatRupiah(state.jumlah)}\n` +
        `🏷️ ${state.kategori}\n` +
        `📅 ${today()}\n` +
        `🧾 [Lihat Bukti](${driveLink})`,
      { parse_mode: "Markdown", disable_web_page_preview: true }
    );
  } catch (e) {
    clearState(chatId);
    bot.sendMessage(chatId, "❌ Gagal mengupload bukti: " + e.message);
  }
});

// ── Message Handler (multi-step input) ───────────────────────────────────────
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Tangkap kalau user kirim foto/dokumen tapi di step bukti tapi bukan file
  const state = getState(chatId);
  if (state?.action === "bayar_catat" && state?.step === "bukti" && !text && !msg.photo && !msg.document) {
    bot.sendMessage(chatId, "⚠️ Tolong kirim *foto* atau *file PDF* bukti pembayarannya ya.", { parse_mode: "Markdown" });
    return;
  }

  if (!text || text.startsWith("/")) return;
  if (!state) return;

  // ── Todo: Tambah Task ──
  if (state.action === "todo_tambah") {
    try {
      const sheet = await getSheet("TodoList");
      const id = generateId();
      await sheet.addRow({
        ID: id,
        Task: text,
        Status: "Pending",
        "Tanggal Dibuat": today(),
      });
      clearState(chatId);
      bot.sendMessage(
        chatId,
        `✅ Task berhasil ditambahkan!\n\n📌 *${text}*\n🆔 ID: \`${id}\``,
        { parse_mode: "Markdown" }
      );
    } catch (e) {
      clearState(chatId);
      bot.sendMessage(chatId, "❌ Gagal menyimpan: " + e.message);
    }

  // ── Todo: Tandai Selesai ──
  } else if (state.action === "todo_selesai") {
    try {
      const sheet = await getSheet("TodoList");
      const rows = await sheet.getRows();
      const row = rows.find((r) => r.get("ID") === text.trim().toUpperCase());
      if (!row) {
        bot.sendMessage(chatId, `❌ Task dengan ID \`${text}\` tidak ditemukan.`, {
          parse_mode: "Markdown",
        });
        return;
      }
      row.set("Status", "Selesai");
      await row.save();
      clearState(chatId);
      bot.sendMessage(chatId, `✅ Task *${row.get("Task")}* ditandai selesai!`, {
        parse_mode: "Markdown",
      });
    } catch (e) {
      clearState(chatId);
      bot.sendMessage(chatId, "❌ Gagal update: " + e.message);
    }

  // ── Todo: Hapus ──
  } else if (state.action === "todo_hapus") {
    try {
      const sheet = await getSheet("TodoList");
      const rows = await sheet.getRows();
      const row = rows.find((r) => r.get("ID") === text.trim().toUpperCase());
      if (!row) {
        bot.sendMessage(chatId, `❌ Task dengan ID \`${text}\` tidak ditemukan.`, {
          parse_mode: "Markdown",
        });
        return;
      }
      const taskName = row.get("Task");
      await row.delete();
      clearState(chatId);
      bot.sendMessage(chatId, `🗑️ Task *${taskName}* berhasil dihapus!`, {
        parse_mode: "Markdown",
      });
    } catch (e) {
      clearState(chatId);
      bot.sendMessage(chatId, "❌ Gagal menghapus: " + e.message);
    }

  // ── Pengeluaran: Step Keterangan ──
  } else if (state.action === "bayar_catat" && state.step === "keterangan") {
    setState(chatId, { ...state, step: "jumlah", keterangan: text });
    bot.sendMessage(chatId, "💰 Berapa jumlahnya? (contoh: 25000 atau 1500000):");

  // ── Pengeluaran: Step Jumlah ──
  } else if (state.action === "bayar_catat" && state.step === "jumlah") {
    const jumlah = parseInt(text.replace(/\D/g, ""));
    if (isNaN(jumlah) || jumlah <= 0) {
      bot.sendMessage(chatId, "❌ Jumlah tidak valid. Masukkan angka saja, contoh: 25000");
      return;
    }
    setState(chatId, { ...state, step: "kategori", jumlah });
    bot.sendMessage(chatId, "🏷️ Pilih kategori pengeluaran:", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🍔 Makanan", callback_data: "kategori_Makanan" },
            { text: "🚗 Transport", callback_data: "kategori_Transport" },
          ],
          [
            { text: "🛒 Belanja", callback_data: "kategori_Belanja" },
            { text: "💊 Kesehatan", callback_data: "kategori_Kesehatan" },
          ],
          [
            { text: "🎮 Hiburan", callback_data: "kategori_Hiburan" },
            { text: "📦 Lainnya", callback_data: "kategori_Lainnya" },
          ],
        ],
      },
    });
  }
});

console.log("🤖 Bot berjalan...");
