export default function handler(req: any, res: any) {
  res.status(200).json({
    lanIp: null,
    port: 443,
    environment: 'vercel',
  });
}
