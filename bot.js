const TelegramBot = require("node-telegram-bot-api");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

// ── Config ──────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!BOT_TOKEN || !SHEET_ID || !SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
  console.error("❌ Environment variables belum lengkap! Cek README.md");
  process.exit(1);
}

// ── Google Auth untuk Sheets ─────────────────────────────────────────────────
const serviceAccountAuth = new JWT({
  email: SERVICE_ACCOUNT_EMAIL,
  key: PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});



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
      await sheet.setHeaderRow(["ID", "Task", "Status", "Tanggal Dibuat", "Tanggal Selesai"]);
    } else if (name === "Pengeluaran") {
      await sheet.setHeaderRow(["ID", "Tanggal", "Keterangan", "Jumlah"]);
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
  }
});

// ── Message Handler (multi-step input) ───────────────────────────────────────
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;


  if (!text || text.startsWith("/")) return;

  const state = getState(chatId);
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
      row.set("Tanggal Selesai", today());
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
    try {
        const sheet = await getSheet("Pengeluaran");
        await sheet.addRow({
          ID: generateId(),
          Tanggal: today(),
          Keterangan: state.keterangan,
          Jumlah: jumlah,
        });
        clearState(chatId);
        bot.sendMessage(
          chatId,
          `✅ *Pengeluaran berhasil dicatat!*\n\n` +
            `📌 *${state.keterangan}*\n` +
            `💰 ${formatRupiah(jumlah)}\n` +
            `📅 ${today()}`,
          { parse_mode: "Markdown" }
        );
      } catch (e) {
        clearState(chatId);
        bot.sendMessage(chatId, "❌ Gagal menyimpan: " + e.message);
      }
  }
});

console.log("🤖 Bot berjalan...");
