import { startWhatsApp, listWhatsAppGroups } from './whatsapp.js'

const sock = await startWhatsApp({})
// wait a bit for connection (if already logged in it will be instant)
setTimeout(async () => {
  try {
    const groups = await listWhatsAppGroups(sock)
    console.log('--- WhatsApp Groups ---')
    for (const g of groups) {
      console.log(`Name: ${g.name}  |  JID: ${g.id}`)
    }
    console.log('\nTip: copy the JID you want into group_map.json')
  } catch (e) {
    console.error('Error listing groups:', e)
  }
}, 4000)
