// 간단한 헬스체크 API
export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok', 
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
} 