export default {
  async fetch(request) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // プリフライトリクエストの処理
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    try {
      // URLからパスを抽出
      const url = new URL(request.url);
      const celestrakPath = url.pathname.replace('/proxy/', '');

      // CelesTrakへのリクエストを構築
      const celestrakUrl = `https://celestrak.org/${celestrakPath}${url.search}`;
      const celestrakRequest = new Request(celestrakUrl, {
        method: request.method,
        headers: {
          'Accept': 'text/plain, application/json',
          'Accept-Encoding': 'identity',
          'User-Agent': 'Mozilla/5.0'
        }
      });

      // CelesTrakにリクエストを送信
      const response = await fetch(celestrakRequest);

      // レスポンスヘッダーを設定
      const responseHeaders = new Headers(response.headers);
      Object.keys(corsHeaders).forEach(key => {
        responseHeaders.set(key, corsHeaders[key]);
      });

      // レスポンスの処理
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/plain')) {
        // テキストデータの場合、適切にエンコーディングを処理
        const arrayBuffer = await response.arrayBuffer();
        // Latin1（ISO-8859-1）でデコード
        const text = new TextDecoder('latin1').decode(arrayBuffer);
        return new Response(text, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            ...Object.fromEntries(responseHeaders.entries()),
            'content-type': 'text/plain; charset=utf-8'
          }
        });
      } else {
        // その他のデータ形式の場合
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
        });
      }

    } catch (err) {
      console.error('Proxy Error:', err);
      return new Response(JSON.stringify({ error: 'Proxy Error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
}
