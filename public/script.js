const socket = io();

const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");

// Envoi d'un message
sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

function sendMessage() {
    const message = messageInput.value.trim();
    if (message !== "") {
        addMessage("Vous", message, "user-message");

        socket.emit("sendMessage", { message });
        messageInput.value = "";
    }
}

// Réception des messages depuis Telegram
socket.on("receiveMessage", (message) => {
    addMessage("Support", message, "bot-message"); // "Support" au lieu de "Bot"
});

// Fonction pour ajouter un message au chat
function addMessage(user, message, className) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", className);
    messageElement.innerHTML = `<strong>${user}:</strong> ${message}`;
    chatBox.appendChild(messageElement);

    // Scroll vers le bas
    chatBox.scrollTop = chatBox.scrollHeight;
}
