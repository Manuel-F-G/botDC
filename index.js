const { Client, GatewayIntentBits, Partials } = require('discord.js');
const express = require('express');
const app = express();

// Servidor web para mantener el bot activo
app.get('/', (req, res) => res.send('Bot activo'));
app.listen(process.env.PORT || 3000, () =>
  console.log('🌐 Servidor web activo'),
);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel],
});

const ALLOWED_CHANNELS = [
  '1369775267639201792',
  '1369547402465509376',
  '1369767579752730745'
];

const TIMEOUT_MS = 10 * 1000;

client.once('ready', () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!play') || message.content.startsWith('!p')) {
    if (!ALLOWED_CHANNELS.includes(message.channel.id)) return;

    try {
      const member = message.member;

      if (!member.moderatable) {
        return message.reply('❌ No puedo dar timeout a este usuario.');
      }

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

client.login(process.env.DISCORD_TOKEN); // Usa variable de entorno
