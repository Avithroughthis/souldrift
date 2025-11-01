window.addEventListener("DOMContentLoaded", () => {
  const bg1 = document.querySelector(".bg1");
  const bg2 = document.querySelector(".bg2");
  const title = document.querySelector(".brand");
  const header = document.querySelector(".hero__center");
  const companionWrapper = document.getElementById("companionWrapper");
  const companionGif = document.getElementById("companionGif");
  const chatContainer = document.getElementById("chatContainer");
  const moodText = document.getElementById("moodText");
  const submitMood = document.getElementById("submitMood");

  let sceneActive = false;

  // Hide chat area initially
  companionWrapper.classList.add("hidden");

  // User clicks anywhere to begin
  document.body.addEventListener("click", () => {
    if (sceneActive) return;
    sceneActive = true;

    // Fade + slide up title
    title.classList.add("fade-up");

    // Fade out background 1
    bg1.style.opacity = "0";

    // Switch to background 2 & show companion
    setTimeout(() => {
      bg2.style.opacity = "1";
      companionWrapper.classList.remove("hidden");

      // Wait for the fade to complete
      setTimeout(() => {
        companionWrapper.classList.add("active");

        // Companion greets the user after wrapper is visible
        setTimeout(() => {
          addChatBubble("Hi, I’m SoulDrift! How are you feeling today?", "companion");
        }, 1500);
      }, 500);
    }, 1500);
  });

  // === User input handlers ===
  submitMood.addEventListener("click", handleUserMood);
  moodText.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleUserMood();
  });

  function handleUserMood() {
    const text = moodText.value.trim();
    if (!text) return;

    addChatBubble(text, "user");
    moodText.value = "";

    let mood = "calm";
    if (text.toLowerCase().includes("happy")) mood = "happy";
    else if (text.toLowerCase().includes("sad")) mood = "sad";
    else if (text.toLowerCase().includes("anxious")) mood = "anxious";

    setCompanionMood(mood);

    setTimeout(() => {
      addChatBubble(getCompanionResponse(mood), "companion");
    }, 1000);
  }

  // === Add chat bubble in proper left/right alignment ===
  function addChatBubble(message, sender) {
    const row = document.createElement("div");
    row.classList.add("chat-row", sender);

    const bubble = document.createElement("div");
    bubble.classList.add("chat-bubble", sender);
    bubble.textContent = message;

    row.appendChild(bubble);
    chatContainer.appendChild(row);

    // Animate appearance
    requestAnimationFrame(() => {
      bubble.style.opacity = "1";
      bubble.style.transform = "scale(1) translateY(0)";
    });

    chatContainer.scrollTop = chatContainer.scrollHeight + 50;
  }

  // === Responses ===
  function getCompanionResponse(mood) {
    const responses = {
      happy: "That’s wonderful! I’m so glad you’re feeling happy today 💖",
      sad: "It’s okay to feel sad sometimes. I’m here for you 💙",
      anxious: "Take a deep breath... we’ll get through this together 🌿",
      calm: "That’s peaceful. Let’s keep this energy flowing 🌸"
    };
    return responses[mood] || "I’m here with you 🌼";
  }

  // === Change companion GIF ===
  function setCompanionMood(mood) {
    const moodAnimations = {
      happy: "assets/companion/happy.gif",
      sad: "assets/companion/sad.gif",
      calm: "assets/companion/calm.gif",
      anxious: "assets/companion/anxious.gif"
    };
    companionGif.src = moodAnimations[mood] || moodAnimations["calm"];
  }
});
