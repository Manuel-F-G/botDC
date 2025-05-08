const { Client, GatewayIntentBits, Partials } = require('discord.js');

// === CONFIGURACIÓN ===
const ALLOWED_CHANNELS = [
  '1369775267639201792',
  '1369547402465509376',
  '1369767579752730745'
];
const TIMEOUT_MS = 10 * 1000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
});

// Timeout con !play o !p
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Verifica si el mensaje es el comando !play o !p
  if (message.content.startsWith('!play') || message.content.startsWith('!p')) {
    // Verifica si el canal donde se envió el mensaje está permitido
    if (!ALLOWED_CHANNELS.includes(message.channel.id)) return;

    try {
      const member = message.member;
      if (!member.moderatable) {
        return message.reply('❌ No puedo dar timeout a este usuario.');
      }

      // Aplica el timeout
      await member.timeout(TIMEOUT_MS, 'Usó !play o !p en canal permitido');
      await message.reply(
        `⏳ ${member.user.tag} recibió timeout por usar !play o !p.`
      );
    } catch (err) {
      console.error('Error al aplicar timeout:', err);
      message.reply('❌ Hubo un error al aplicar el timeout.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
