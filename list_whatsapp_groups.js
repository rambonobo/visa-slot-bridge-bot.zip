import { initWhatsApp, getGroups } from '../whatsapp.js';
import { log } from '../utils.js';

await initWhatsApp({
  onReady: async () => {
    const groups = await getGroups();
    log('WhatsApp groups:');
    for (const g of groups) console.log(`- ${g.subject} :: ${g.id}`);
    process.exit(0);
  }
});
