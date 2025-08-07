let userInfo = {};

export function saveUserInfo() {
  userInfo = {
    name: document.getElementById("userName").value,
    gender: document.getElementById("userGender").value,
    age: document.getElementById("userAge").value,
    area: document.getElementById("userArea").value,
    aiName: document.getElementById("aiName").value,
  };

  document.getElementById("userForm").style.display = 'none';
  document.getElementById("chatContainer").style.display = 'block';
  document.getElementById("chatBox").innerHTML = `<p><i>${userInfo.aiName} is ready to chat with you 💬</i></p>`;
}

export function sendTextMessage() {
  const input = document.getElementById("userInput").value;
  if (!input.trim()) return;
  appendMessage(userInfo.name, input);
  generateAIReply(input);
  document.getElementById("userInput").value = '';
}

function appendMessage(sender, msg) {
  const box = document.getElementById("chatBox");
  box.innerHTML += `<p><b>${sender}:</b> ${msg}</p>`;
  box.scrollTop = box.scrollHeight;
}

function generateAIReply(userText) {
  const reply = `You said: ${userText}`; // Mood logic will come here
  appendMessage(userInfo.aiName, reply);
  speak(reply);
}

export function speak(text) {
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-IN';
  synth.speak(utter);
}

export function speakText() {
  const lastUser = document.getElementById("userInput").value;
  speak(lastUser);
}

export function startVoiceToText() {
  const rec = new webkitSpeechRecognition();
  rec.lang = 'en-IN';
  rec.onresult = (e) => {
    const txt = e.results[0][0].transcript;
    document.getElementById("userInput").value = txt;
    sendTextMessage();
  };
  rec.start();
}

export function startVoiceToVoice() {
  startVoiceToText(); // V to T → then T to V
}
