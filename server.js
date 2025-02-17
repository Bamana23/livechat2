require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const port = process.env.PORT || 4000; // Change ici si besoin

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

let userSessions = {}; // Stocke les utilisateurs avec leurs tokens

// ➜ Connexion d'un nouvel utilisateur WebSocket
io.on("connection", (socket) => {
    const userToken = uuidv4(); // Générer un token unique
    userSessions[userToken] = socket.id; // Associer le token à la session

    console.log(`🔗 Nouvel utilisateur connecté: ${socket.id} | Token: ${userToken}`);

    // Envoyer le token à l'utilisateur via WebSocket
    socket.emit("assignToken", { token: userToken });

    // Gestion de l'envoi de messages
    socket.on("sendMessage", async (data) => {
        if (!data.message) return;
        try {
            const messageToSend = `#${userToken} ${data.message}`;
            await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: CHAT_ID,
                text: messageToSend
            });
            console.log(`📨 Message envoyé à Telegram: ${messageToSend}`);
        } catch (error) {
            console.error("❌ Erreur envoi Telegram:", error.message);
        }
    });

    // Déconnexion utilisateur
    socket.on("disconnect", () => {
        console.log(`❌ Utilisateur déconnecté: ${socket.id}`);
        delete userSessions[userToken];
    });
});

// ➜ Gestion des messages Telegram vers WebSocket
bot.on("message", (msg) => {
    if (msg.chat.id.toString() === CHAT_ID) {
        const regex = /#([a-f0-9-]+) (.+)/;
        const match = msg.text.match(regex);

        if (match) {
            const token = match[1];
            const message = match[2];

            if (userSessions[token]) {
                const userSocketId = userSessions[token];
                io.to(userSocketId).emit("receiveMessage", { message });
                console.log(`📩 Message envoyé à WebSocket: ${message}`);
            }
        }
    }
});

// ➜ Commande Telegram pour envoyer un message direct à un utilisateur
bot.onText(/\/chat (.+) (.+)/, (msg, match) => {
    const token = match[1];
    const message = match[2];

    if (userSessions[token]) {
        const userSocketId = userSessions[token];
        io.to(userSocketId).emit("receiveMessage", { message });
        bot.sendMessage(CHAT_ID, `✅ Message envoyé à ${token}`);
    } else {
        bot.sendMessage(CHAT_ID, `⚠️ Utilisateur non trouvé ou déconnecté.`);
    }
});

// ➜ Démarrage du serveur
server.listen(port, () => {
    console.log(`✅ Serveur live chat actif sur http://localhost:${port}`);
});
