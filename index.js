const {
  Client,
  GatewayIntentBits,
  Partials
} = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionStatus,
  AudioPlayerStatus,
  getVoiceConnection
} = require('@discordjs/voice');
const fs = require('fs');
const express = require('express');

// Servidor web para Railway
const app = express();
app.get('/', (req, res) => res.send('Bot activo'));
app.listen(process.env.PORT || 3000, () =>
  console.log('🌐 Servidor web activo')
);

// CONFIGURACIÓN
const TARGET_USER_IDS = ['1368112694468808807', '1055009202168406118', '752987605808840807', '1344499474994823230'];
const ALLOWED_CHANNELS = [
  '1369775267639201792',
  '1369547402465509376',
  '1369767579752730745'
];
const TIMEOUT_MS = 10 * 1000;
const AUDIO_FILE = './sonido.mp3'; // Asegúrate de tener este archivo en la raíz

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
});

// Timeout por !play o !p
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

// Entrar al canal de voz y reproducir sonido en bucle
client.on('voiceStateUpdate', async (oldState, newState) => {
  const user = newState.member?.user;
  if (!user || user.bot) return;

  if (
    TARGET_USER_IDS.includes(user.id) &&
    newState.channelId &&
    newState.channelId !== oldState.channelId
  ) {
    try {
      const voiceChannel = newState.channel;
      if (!voiceChannel) return;

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      console.log(`🔊 Conectado a canal de voz: ${voiceChannel.name}`);

      const player = createAudioPlayer();
      connection.subscribe(player);

      const playLoop = () => {
        const resource = createAudioResource(fs.createReadStream(AUDIO_FILE));
        player.play(resource);
      };

      player.on(AudioPlayerStatus.Idle, () => {
        playLoop(); // Reproducir de nuevo cuando termine
      });

      playLoop(); // Empezar la primera vez

      console.log(`▶️ Reproduciendo sonido en bucle para ${user.username}`);
    } catch (error) {
      console.error('❌ Error al conectar o reproducir:', error);
    }
  }

  // Si el usuario sale del canal, detener el sonido
  if (TARGET_USER_IDS.includes(user.id) && newState.channelId === null) {
    const connection = getVoiceConnection(oldState.guild.id);
    if (connection) {
      connection.destroy(); // Salir del canal
      console.log(`❌ ${user.username} salió del canal, deteniendo el sonido.`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
