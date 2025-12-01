import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001;

// Enable CORS for your frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176']
}));

// Proxy endpoint
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    const contentType = response.headers.get('content-type') || 'text/html';
    const data = await response.text();

    // Modify HTML to fix relative URLs
    let modifiedData = data;
    if (contentType.includes('text/html')) {
      const baseUrl = new URL(targetUrl);
      const baseHref = `${baseUrl.protocol}//${baseUrl.host}`;

      // Inject base tag for relative URLs
      modifiedData = data.replace(
        /<head>/i,
        `<head><base href="${baseHref}">`
      );

      // Fix protocol-relative URLs
      modifiedData = modifiedData.replace(
        /src=["']\/\//g,
        `src="${baseUrl.protocol}//`
      );
      modifiedData = modifiedData.replace(
        /href=["']\/\//g,
        `href="${baseUrl.protocol}//`
      );
    }

    // Remove X-Frame-Options and CSP headers that block embedding
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(modifiedData);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Failed to fetch URL',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`📡 Use: http://localhost:${PORT}/proxy?url=<your-url>`);
});
