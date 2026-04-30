const CONFIG = {
  senderName: 'OASIS R&D',
  batchSize: 20,
  batchDelayMs: 500,
  maxRecipientsPerRequest: 300,
};

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const expectedToken = PropertiesService.getScriptProperties().getProperty('OASIS_MAIL_TOKEN');

    if (expectedToken && payload.token !== expectedToken) {
      throw new Error('Invalid mail token.');
    }

    const recipients = normalizeRecipients(payload.to);
    if (!recipients.length) throw new Error('No recipients were provided.');
    if (recipients.length > CONFIG.maxRecipientsPerRequest) {
      throw new Error(`Too many recipients. Max ${CONFIG.maxRecipientsPerRequest} per request.`);
    }
    if (!payload.subject) throw new Error('Subject is required.');
    if (!payload.html) throw new Error('HTML body is required.');

    let sent = 0;
    for (let i = 0; i < recipients.length; i += CONFIG.batchSize) {
      const batch = recipients.slice(i, i + CONFIG.batchSize);
      batch.forEach((email) => {
        GmailApp.sendEmail(email, payload.subject, toPlainText(payload.html), {
          htmlBody: payload.html,
          name: CONFIG.senderName,
        });
        sent += 1;
      });

      if (i + CONFIG.batchSize < recipients.length) {
        Utilities.sleep(CONFIG.batchDelayMs);
      }
    }

    return jsonResponse({ ok: true, sent });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: error.message });
  }
}

function doGet() {
  return jsonResponse({
    ok: true,
    service: 'OASIS newsletter mailer',
    message: 'Use POST requests from the OASIS admin app.',
  });
}

function normalizeRecipients(value) {
  if (Array.isArray(value)) {
    return value.map(String).map((email) => email.trim()).filter(Boolean);
  }

  return String(value || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
}

function toPlainText(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
