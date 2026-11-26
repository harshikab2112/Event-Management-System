
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

async function sendWithResend({ email, subject, text, html }) {
  if (!process.env.RESEND_API_KEY) {
    const error = new Error('Resend email delivery is not configured.');
    error.status = 503;
    throw error;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'Gatherly <onboarding@resend.dev>',
      to: [email],
      subject,
      text,
      html
    })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      result.message || 'Unable to send verification email.'
    );
    error.status = 502;
    throw error;
  }

  return result;
}

async function sendOtp({ email, name, code, purpose }) {
  const action = purpose === 'signup'
    ? 'verify your email'
    : purpose === 'password-reset'
      ? 'reset your password'
      : 'sign in';

  const safeName = escapeHtml(name || 'there');

  const subject = `Your Gatherly code to ${action}`;

  const text =
    `Hi ${name || 'there'}, your Gatherly verification code is ${code}. ` +
    'It expires in 10 minutes. If you did not request this, ignore this email.';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;color:#1d2d3b">
      <p>Hi ${safeName},</p>
      <h1 style="font-size:22px">Your Gatherly verification code</h1>
      <p>Use this code to ${action}. It expires in 10 minutes.</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:8px;padding:16px 0">${code}</p>
      <p style="color:#657383;font-size:13px">
        If you did not request this, ignore this message.
        Never share your code with anyone.
      </p>
    </div>
  `;

  return sendWithResend({ email, subject, text, html });
}

module.exports = { sendOtp };
