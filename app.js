const {
    default: Baileys,
    DisconnectReason,
    fetchLatestBaileysVersion,
    useMultiFileAuthState
} = require('@whiskeysockets/baileys')
const P = require('pino')
const { imageSync } = require('qr-image')
const { Boom } = require('@hapi/boom')
const express = require('express')
const fs = require('fs-extra')
const cors = require('cors')

const app = express()
const port = 3000
const verification = new Map()

app.set('json spaces', 2)
app.use(express.json())
app.use(cors())

const start = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('session')
    const client = Baileys({
        version: (await fetchLatestBaileysVersion()).version,
        printQRInTerminal: true,
        auth: state,
        logger: P({ level: 'fatal' }),
        browser: ['AuthGuard-Bot', 'fatal', '1.0.0']
    })

    // Private Password to Your Qr code.
    client.session = '123'

    client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (update.qr) {
            console.log(
                `QR code generated. Scan it to continue | You can also authenticate in http://localhost:${port}`
            )
            client.QR = imageSync(update.qr)
        }
        if (connection === 'close') {
            const { statusCode } = new Boom(lastDisconnect?.error).output
            if (statusCode !== DisconnectReason.loggedOut) {
                console.log('Reconnecting...')
                setTimeout(start, 3000)
            } else {
                console.log('Disconnected.')
                fs.removeSync('session')
                console.log('Starting...')
                setTimeout(start, 3000)
            }
        }
        if (connection === 'connecting') {
            client.condition = 'connecting'
            console.log('Connecting to WhatsApp...')
        }
        if (connection === 'open') {
            client.condition = 'connected'
            console.log('Connected to WhatsApp')
        }
    })

    /**
     * @param {string} str
     * @returns {string}
     */

    const correctJid = (str) => (/\d/.test(str) ? str.replace(/\D/g, '') : 123) + '@s.whatsapp.net'

    /**
     * @param {string} phone
     * @returns {boolean}
     */

    const validWhatsApp = async (phone) => (await client.onWhatsApp(phone))[0]?.exists || false

    app.get('/', (req, res) => res.status(200).setHeader('Content-Type', 'text/plain').send('Running...'))

    app.get('/wa/qr', async (req, res) => {
        const { session } = req.query
        if (!session || !client || client.session !== req.query.session)
            return void res.status(404).setHeader('Content-Type', 'text/plain').send('Invalid Session').end()
        if (!client || !client.QR)
            return void res
                .status(404)
                .setHeader('Content-Type', 'text/plain')
                .send(client.condition === 'connected' ? 'You are already connected to WhatsApp' : 'QR not generated')
                .end()
        res.status(200).contentType('image/png').send(client.QR)
    })

    app.all('/request', async (req, res) => {
        const { phone } = req.method === 'GET' ? req.query : req.body
        if (!phone) return void res.sendStatus(404)
        const jid = correctJid(phone)
        const valid = await validWhatsApp(jid)
        if (!valid) return void res.status(404).json({ error: 'Number not available on WhatsApp' })
        if (verification.has(jid)) {
            const storedCode = verification.get(jid)
            const remainingTime = ~~((storedCode.expiration - Date.now()) / 1000)
            return void res.json({ cooldown: `Please wait for ${remainingTime} seconds` })
        }
        const code = Math.floor(100000 + Math.random() * 900000)
        verification.set(jid, { code, expiration: Date.now() + 120000 })
        await client.sendMessage(jid, { text: `Your OTP is ${code}` })
        setTimeout(() => verification.delete(jid), 120000)
        return void res.status(200).setHeader('Content-Type', 'text/plain').send('Open Your WhatsApp!')
    })

    app.all('/verify', async (req, res) => {
        const { phone, code } = req.method === 'GET' ? req.query : req.body
        if (!phone || !code) return void res.sendStatus(404)
        const otp = parseInt(code)
        const jid = correctJid(phone)
        const valid = await validWhatsApp(jid)
        if (!valid) return void res.status(404).json({ error: 'Number not available on WhatsApp' })
        const storedCode = verification.get(jid)
        if (!storedCode || Date.now() > storedCode?.expiration || otp !== storedCode?.code)
            return void res.status(400).json({ error: 'Invalid or Expired Code' })
        const successful = 'Congratulations, You are verified!'
        await client.sendMessage(jid, { text: successful })
        return void res.json({ successful })
    })

    app.all('*', (req, res) => res.sendStatus(404))

    client.ev.on('creds.update', saveCreds)
    return client
}

start()
app.listen(port, () => console.log(`Server started on PORT: ${port}`))
