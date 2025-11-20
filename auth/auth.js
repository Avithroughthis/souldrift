const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const backButton = document.getElementById('backButton');


showSignup.addEventListener('click', () => {
  loginForm.style.display = 'none';
  signupForm.style.display = 'flex';
});

showLogin.addEventListener('click', () => {
  signupForm.style.display = 'none';
  loginForm.style.display = 'flex';
});


backButton.addEventListener('click', () => {
  window.location.href = '/index.html';
});


signupForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const username = signupForm.elements['username'].value.trim();
  const password = signupForm.elements['password'].value;

  if (!username || !password) {
    alert("Please enter both username and password.");
    return;
  }

  
  const users = JSON.parse(localStorage.getItem('users') || '{}');

  if (users[username]) {
    alert("Username already exists. Choose a different one.");
    return;
  }

  users[username] = { password };
  localStorage.setItem('users', JSON.stringify(users));

  alert("Signup successful! You can now log in.");
  signupForm.reset();
  signupForm.style.display = 'none';
  loginForm.style.display = 'flex';
});


loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const username = loginForm.elements['username'].value.trim();
  const password = loginForm.elements['password'].value;

  const users = JSON.parse(localStorage.getItem('users') || '{}');

  if (users[username] && users[username].password === password) {
    
    localStorage.setItem('currentUser', username);

    alert(`Welcome back, ${username}!`);
    window.location.href = '/dailygoals/daily.html';
  } else {
    alert("Invalid username or password.");
  }
});
