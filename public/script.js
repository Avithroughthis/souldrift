window.addEventListener("DOMContentLoaded", () => {
  const bg1 = document.querySelector(".bg1");
  const bg2 = document.querySelector(".bg2");
  const title = document.querySelector(".brand");
  const companionWrapper = document.getElementById("companionWrapper");
  const companionGif = document.getElementById("companionGif");
  const chatContainer = document.getElementById("chatContainer");
  const moodText = document.getElementById("moodText");
  const submitMood = document.getElementById("submitMood");
  const floatingBubbles = document.getElementById("floatingBubbles");
  const sidebar = document.querySelector(".conversation-sidebar");
  const saveBtn = document.getElementById("saveConversationBtn");
  const newConvBtn = document.getElementById("newConversationBtn");
  const openAuthBtn = document.getElementById("openAuth");

  let sceneActive = false;

  document.body.classList.add("show-intro-title");
  document.body.addEventListener("click", startIntro);

  // ==================== USER LOGIN CHECK ====================
  const isLoggedIn = JSON.parse(localStorage.getItem("users")) || false;

  if (isLoggedIn) {
    // Hide Sign In button
    openAuthBtn.style.display = "none";

    // Add Log Out button
    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "Log Out";
    logoutBtn.id = "logoutBtn";
    logoutBtn.classList.add("auth-button");
    openAuthBtn.parentNode.appendChild(logoutBtn);

    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("users");
      window.location.reload();
    });
  }

  // ================= Current conversation identifier =================
  let currentConversationKey = `chat-${new Date().toISOString()}`;

  // ================= New Conversation =================
  newConvBtn.addEventListener("click", () => {
    chatContainer.innerHTML = "";
    currentConversationKey = `chat-${new Date().toISOString()}`;
    alert("Started a new conversation!");
  });

  // ================= Save Conversation =================
  saveBtn.addEventListener("click", () => {
    if (!chatContainer || chatContainer.children.length === 0) {
      return alert("No conversation to save!");
    }

    const messages = [];
    chatContainer.querySelectorAll(".chat-row").forEach(row => {
      const sender = row.classList.contains("user") ? "user" : "companion";
      const message = row.querySelector(".chat-bubble").textContent;
      messages.push({ sender, message, timestamp: Date.now() });
    });

    localStorage.setItem(currentConversationKey, JSON.stringify(messages));
    alert(`Conversation saved at ${new Date().toLocaleString()}`);

    // Add bubble to sidebar
    renderSidebarItem(currentConversationKey);
  });

  // ================= Render Sidebar Bubble =================
  function renderSidebarItem(conversationKey) {
    if (!sidebar) return;

    if (!sidebar.querySelector(`[data-key="${conversationKey}"]`)) {
      const bubble = document.createElement("div");
      bubble.classList.add("conversation-bubble");
      const dateStr = conversationKey.replace("chat-", "");
      bubble.textContent = new Date(dateStr).toLocaleString();
      bubble.dataset.key = conversationKey;

      bubble.addEventListener("click", () => {
        loadConversation(conversationKey);
      });

      sidebar.appendChild(bubble);
    }
  }

  // ================= Load Conversation =================
  function loadConversation(conversationKey) {
    chatContainer.innerHTML = "";
    const conversation = JSON.parse(localStorage.getItem(conversationKey)) || [];
    conversation.sort((a, b) => a.timestamp - b.timestamp);
    conversation.forEach(msg => addChatBubble(msg.message, msg.sender));
    currentConversationKey = conversationKey;
  }

  // ================= Load All Past Conversations =================
  function loadPastConversations() {
    if (!sidebar) return;
    sidebar.innerHTML = "<h3>Past Conversations</h3>";
    Object.keys(localStorage)
      .filter(key => key.startsWith("chat-"))
      .sort()
      .forEach(key => renderSidebarItem(key));
  }

  // ================= Save Individual Messages =================
  function saveMessage(message, sender) {
    const timestamp = Date.now();
    let conversation = JSON.parse(localStorage.getItem(currentConversationKey)) || [];
    conversation.push({ sender, message, timestamp });
    localStorage.setItem(currentConversationKey, JSON.stringify(conversation));
    renderSidebarItem(currentConversationKey);
  }

  // ================= Handle Chat Input =================
  submitMood.addEventListener("click", handleUserMood);
  moodText.addEventListener("keypress", e => {
    if (e.key === "Enter") handleUserMood();
  });

  function handleUserMood() {
    const text = moodText.value.trim();
    if (!text) return;

    addChatBubble(text, "user");
    saveMessage(text, "user");
    moodText.value = "";

    let mood = "excited";
    if (text.includes("happy")) mood = "happy";
    else if (text.includes("sad")) mood = "sad";
    else if (text.includes("angry")) mood = "angry";

    setCompanionMood(mood);

    setTimeout(() => {
      const response = getCompanionResponse(mood);
      addChatBubble(response, "companion");
      saveMessage(response, "companion");
    }, 1000);
  }

  // ================= Add Chat Bubble =================
  function addChatBubble(message, sender = "companion") {
    const chatRow = document.createElement("div");
    chatRow.classList.add("chat-row", sender);

    const bubble = document.createElement("div");
    bubble.classList.add("chat-bubble");
    bubble.textContent = message;

    chatRow.appendChild(bubble);
    chatContainer.appendChild(chatRow);

    chatContainer.scrollTo({
      top: chatContainer.scrollHeight,
      behavior: "smooth",
    });
  }

  // ================= Companion Responses =================
  function getCompanionResponse(mood) {
    const responses = {
      happy: "That’s wonderful! I’m so glad you’re feeling happy today 💖",
      sad: "It’s okay to feel sad sometimes. I’m here for you 💙",
      angry: "Take a deep breath... we’ll get through this together 🌿",
      excited: "That’s peaceful. Let’s keep this energy flowing 🌸",
    };
    return responses[mood] || "I’m here with you 🌼";
  }

  function setCompanionMood(mood) {
    const moodAnimations = {
      happy: "assets/companion/happy.gif",
      sad: "assets/companion/sad.gif",
      excited: "assets/companion/excited.gif",
      angry: "assets/companion/angry.gif",
    };
    companionGif.src = moodAnimations[mood] || moodAnimations["excited"];
  }

  // ================= Floating Bubbles =================
  function createFloatingBubbles(container, count = 8) {
    for (let i = 0; i < count; i++) {
      const bubble = document.createElement("div");
      bubble.classList.add("bubble");

      const size = Math.random() * 30 + 40;
      const left = Math.random() * 100;
      const duration = Math.random() * 6 + 8;
      const delay = Math.random() * 5;

      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.left = `${left}vw`;
      bubble.style.animationDuration = `${duration}s`;
      bubble.style.animationDelay = `${delay}s`;

      container.appendChild(bubble);

      bubble.addEventListener("animationend", () => {
        bubble.remove();
        createFloatingBubbles(container, 1);
      });
    }
  }

  // ================= Intro Animation =================
  function startIntro() {
    if (sceneActive) return;
    sceneActive = true;

    title.classList.add("fade-up");

    setTimeout(() => {
      const uiElements = [
        companionWrapper,
        openAuthBtn,
        ...document.querySelectorAll(".rs-item"),
        sidebar
      ];

      uiElements.forEach(el => {
        if (!el) return;
        el.classList.remove("hidden");
        el.classList.add("revealed");
      });

      if (floatingBubbles) createFloatingBubbles(floatingBubbles, 10);

      addChatBubble("Hi, I’m Bubu! How are you feeling today?", "companion");
    }, 1500);

    bg1.style.opacity = "0";
    setTimeout(() => { bg2.style.opacity = "1"; }, 1500);
  }

  // Load past conversations on page load
  loadPastConversations();
});
