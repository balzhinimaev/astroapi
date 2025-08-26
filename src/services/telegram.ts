interface SendTelegramMessageParams {
  text: string;
}

export async function sendTelegramMessage(params: SendTelegramMessageParams): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return; // silently skip if not configured
  }

  const url = new URL(`https://api.telegram.org/bot${token}/sendMessage`);
  const body = {
    chat_id: chatId,
    text: params.text,
    disable_web_page_preview: true,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);
  try {
    const resp = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) {
      // eslint-disable-next-line no-console
      console.error('Telegram sendMessage failed', resp.status);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Telegram sendMessage error', err);
  } finally {
    clearTimeout(timeoutId);
  }
}


