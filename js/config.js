const CONFIG = {
  // SHA-256 hash of the portal password
  // Generate in browser console:
  //   crypto.subtle.digest('SHA-256', new TextEncoder().encode('your-password'))
  //     .then(h => Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2,'0')).join(''))
  //     .then(console.log)
  passwordHash: '43c27b4e263fa191a6a7ec198cd4d5b47d17413c49d77dc533a01720707e3202',

  // Data file paths
  toolsDataUrl: 'data/tools.json',
  promptsDataUrl: 'data/prompts.json',
  claudeDataUrl: 'data/claude.json',
  latestContentDataUrl: 'data/latest-content.json',
};
