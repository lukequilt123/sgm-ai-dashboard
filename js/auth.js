const Auth = {
  isAuthenticated() {
    if (sessionStorage.getItem('sgm_auth') === 'true') {
      return true;
    }
    this.showGate();
    return false;
  },

  showGate() {
    document.querySelector('.portal-page').classList.add('hidden');

    const gate = document.createElement('div');
    gate.className = 'password-gate';
    gate.innerHTML = `
      <div class="password-card">
        <img src="https://cdn.brandfetch.io/id6AGii4MS/w/396/h/126/theme/dark/logo.png?c=1bxid64Mup7aczewSAYMX&t=1740480772206"
             alt="Sleeping Giant Media" class="password-card__logo">
        <h1 class="password-card__title">AI Dashboard</h1>
        <p class="password-card__subtitle">Enter your access code to continue</p>
        <input type="password" class="password-card__input" id="pw-input"
               placeholder="Access code" autocomplete="off">
        <button class="password-card__submit" id="pw-submit">Enter Dashboard</button>
        <p class="password-card__error hidden" id="pw-error">Incorrect access code</p>
      </div>`;
    document.body.appendChild(gate);

    const submit = () => {
      const input = document.getElementById('pw-input');
      this.hashPassword(input.value).then(hash => {
        if (hash === CONFIG.passwordHash) {
          sessionStorage.setItem('sgm_auth', 'true');
          gate.remove();
          document.querySelector('.portal-page').classList.remove('hidden');
          location.reload();
        } else {
          document.getElementById('pw-error').classList.remove('hidden');
          input.value = '';
          input.focus();
        }
      });
    };

    document.getElementById('pw-submit').addEventListener('click', submit);
    document.getElementById('pw-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });

    setTimeout(() => document.getElementById('pw-input').focus(), 100);
  },

  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
};
