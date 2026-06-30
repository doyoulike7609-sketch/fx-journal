// Netlify Function: Anthropic APIへのプロキシ
// ブラウザから直接Anthropic APIを呼ぶとCORSでブロックされるため、
// このサーバーレス関数を経由させることで回避する。
// APIキーはNetlifyの環境変数（ANTHROPIC_API_KEY）に保存し、
// クライアント側のコードには一切含めない。

exports.handler = async function (event) {
  // CORS preflight対応
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: 'サーバー側にANTHROPIC_API_KEYが設定されていません。Netlifyの Site settings > Environment variables で設定してください。',
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'リクエストボディのJSON解析に失敗しました' }),
    };
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    return {
      statusCode: res.status,
      headers: corsHeaders(),
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Anthropic APIへの接続に失敗しました: ' + err.message }),
    };
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}
