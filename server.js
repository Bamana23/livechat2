require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const port = 3000;

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public")); // ✅ Sert les fichiers statiques

let userSessions = {}; // Stocke les sessions utilisateur

io.on("connection", (socket) => {
    console.log(`Nouvel utilisateur connecté : ${socket.id}`);

    socket.on("disconnect", () => {
        console.log(`Utilisateur déconnecté : ${socket.id}`);
        delete userSessions[socket.id];
    });

    // Gérer l'envoi de messages du client vers Telegram
    socket.on("sendMessage", async (data) => {
        try {
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: CHAT_ID,
                text: `Message de ${socket.id}: ${data.message}`
            });
        } catch (error) {
            console.error("Erreur envoi Telegram:", error.message);
        }
    });
});

// Écouter les messages Telegram et les envoyer en temps réel aux utilisateurs
bot.on("message", (msg) => {
    if (msg.chat.id.toString() === CHAT_ID) {
        io.emit("receiveMessage", msg.text);
    }
});

// Démarrer le serveur
server.listen(port, () => {
    console.log(`Serveur live chat actif sur http://localhost:${port}`);
});
