import express, { Request, Response, NextFunction } from 'express';
import { createProxyServer } from 'http-proxy';
import morgan from 'morgan';

const domainMap: { [key: string]: string } = {
    'example1.com': 'http://localhost:8081',
};

const app = express();
const proxy = createProxyServer({});

app.use(morgan('combined'));

app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`Request Headers: ${JSON.stringify(req.headers)}`);
    next();
});

app.all('*', (req: Request, res: Response) => {
    const hostHeader = req.headers.host;

    // 도메인에서 포트 번호 제거 (예: example.com:8080 -> example.com)
    const domain = hostHeader ? hostHeader.split(':')[0] : '';

    const target = domainMap[domain];

    if (target) {
        // 프록시 옵션 설정
        const options = {
            target: target,
            changeOrigin: true,
            preserveHeaderKeyCase: true,
        };

        // 프록시 응답 이벤트를 통해 응답 본문 로깅
        proxy.once('proxyRes', (proxyRes, req, res) => {
            let body = '';
            proxyRes.on('data', (chunk: Buffer) => {
                body += chunk.toString();
            });
            proxyRes.on('end', () => {
                console.log(`Proxy Response Body: ${body}`);
            });
        });

        // 프록시 요청
        proxy.web(req, res, options, (err: Error) => {
            console.error(`Proxy error: ${err.message}`);
            res.status(502).send('Bad Gateway');
        });
    } else {
        res.status(502).send('Bad Gateway: Unknown Domain');
    }
});

// 서버 시작
const PORT = 81;
app.listen(PORT, () => {
    console.log(`Proxy server is running on port ${PORT}`);
});
