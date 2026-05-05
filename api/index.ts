export default async function handler(req: any, res: any) {
  try {
    const mod = await import('../packages/backend/dist/index.js')
    const app: any = mod.default
    app(req, res)
  } catch (e: any) {
    res.status(500).json({
      startup_error: true,
      message: String(e),
      stack: e?.stack ?? 'no stack',
    })
  }
}
