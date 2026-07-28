import express from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'

import authRoutes from './routes/auth'
import eventRoutes from './routes/events'
import articleRoutes from './routes/articles'
import memberRoutes from './routes/members'
import settingsRoutes from './routes/settings'
import pageRoutes from './routes/pages'
import landingSectionRoutes from './routes/landingSections'
import menuRoutes from './routes/menus'
import divisionRoutes from './routes/divisions'
import uploadRoutes from './routes/upload'
import eventRegistrationRoutes from './routes/eventRegistrations'
import eventDocumentationRoutes from './routes/eventDocumentation'
import mediaRoutes from './routes/media'
import newsletterRoutes from './routes/newsletter'
import searchRoutes from './routes/search'
import auditLogRoutes from './routes/auditLogs'
import tagRoutes from './routes/tags'
import researchRoutes from './routes/research'
import commentRoutes from './routes/comments'
import analyticsRoutes from './routes/analytics'
import userRoutes from './routes/users'
import electionRoutes from './routes/elections'
import candidateRoutes from './routes/candidates'
import voteRoutes from './routes/votes'
import blockDataRoutes from './routes/blockData'
import faqRoutes from './routes/faqs'
import bookmarkRoutes from './routes/bookmarks'
import notificationRoutes from './routes/notifications'
import { securityHeaders } from './middleware/security-headers'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

/**
 * Proxy awareness, required for correct client addresses.
 *
 * Rate limiting buckets requests by `req.ip`. Express only reads
 * `X-Forwarded-For` when it has been told to trust a proxy, and that default is
 * the safe one: trusting the header unconditionally would let any caller set its
 * own address and walk straight past the limiter.
 *
 * Set TRUST_PROXY to the number of proxies in front of this process (`1` behind
 * a single nginx or load balancer), or to a comma-separated list of addresses.
 * Leave it unset when the process is reached directly.
 */
const trustProxy = (process.env.TRUST_PROXY || '').split('#')[0].trim()
if (trustProxy) {
  const hopCount = Number(trustProxy)
  app.set('trust proxy', Number.isInteger(hopCount) && hopCount > 0 ? hopCount : trustProxy)
}

// Do not advertise the framework and version.
app.disable('x-powered-by')

// Security headers on every response, including /uploads and error responses.
// Registered before the routes so nothing can answer without them.
app.use(securityHeaders)

/**
 * Allowed browser origins.
 *
 * The two localhost ports are the dev servers. Anything else has to be named
 * explicitly: FRONTEND_URL covers the normal deployment, and CORS_ORIGINS takes
 * a comma-separated list when more than one origin is involved (a staging host,
 * a custom domain). Hard-coding only localhost meant a deployed frontend would
 * be refused by the browser.
 */
const allowedOrigins = Array.from(
  new Set(
    [
      'http://localhost:3000',
      'http://localhost:3001',
      (process.env.FRONTEND_URL || '').split('#')[0].trim(),
      ...(process.env.CORS_ORIGINS || '').split('#')[0].split(',').map((value) => value.trim()),
    ].filter(Boolean)
  )
)

app.use(cors({
  origin: (origin, callback) => {
    // Requests without an Origin header are not browser cross-origin requests
    // (curl, server-to-server, same-origin navigation) and are left alone.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    // Reject by withholding the Access-Control-Allow-Origin header rather than
    // raising. The browser blocks the read either way, and throwing here would
    // surface as an unhandled 500 with a stack trace for every probe.
    callback(null, false)
  },
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

/**
 * Serve uploaded files statically.
 *
 * `nosniff` stops a browser from second-guessing the Content-Type and executing
 * an upload as markup, and PDFs are sent as attachments so a document cannot be
 * rendered in a tab on this origin. The upload controller already restricts what
 * can be written here; these headers are the second layer.
 */
app.use(
  '/uploads',
  express.static(path.join(__dirname, '../uploads'), {
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      if (filePath.toLowerCase().endsWith('.pdf')) {
        res.setHeader('Content-Disposition', 'attachment')
      }
    },
  })
)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/event-registration', eventRegistrationRoutes)
app.use('/api/event-documentation', eventDocumentationRoutes)
app.use('/api/articles', articleRoutes)
app.use('/api/members', memberRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/pages', pageRoutes)
app.use('/api/landing-sections', landingSectionRoutes)
app.use('/api', menuRoutes)
app.use('/api/divisions', divisionRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/media', mediaRoutes)
app.use('/api/newsletter', newsletterRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/audit-logs', auditLogRoutes)
app.use('/api/tags', tagRoutes)
app.use('/api/research', researchRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api', candidateRoutes)
app.use('/api/elections', electionRoutes)
app.use('/api', voteRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/users', userRoutes)
app.use('/api/blocks', blockDataRoutes)
app.use('/api/faq', faqRoutes)
app.use('/api/bookmarks', bookmarkRoutes)
app.use('/api/notifications', notificationRoutes)

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})

export default app
