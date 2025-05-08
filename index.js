const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  Events 
} = require('discord.js');
const {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionStatus,
  AudioPlayerStatus
} = require('@discordjs/voice');
const fs = require('fs');
const express = require('express');

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
const AUDIO_FILE = './sonido.mp3'; // Debe estar en la misma carpeta

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

// Estado para saber si ya está siguiendo y conectado
let trackedGuildId = null;
let receiver = null;
let connection = null;

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

client.on('voiceStateUpdate', async (oldState, newState) => {
  const user = newState.member?.user;
  if (!user || user.bot) return;

  // Si alguno de los dos usuarios a seguir se une a un canal de voz
  if (TARGET_USER_IDS.includes(user.id) && newState.channelId && newState.channelId !== oldState.channelId) {
    try {
      const voiceChannel = newState.channel;
      if (!voiceChannel) return;

      // Si ya hay una conexión, destruirla primero
      const oldConnection = getVoiceConnection(newState.guild.id);
      if (oldConnection) oldConnection.destroy();

      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      console.log(`🔊 Conectado a canal de voz: ${voiceChannel.name}`);

      // Crear receptor de voz
      receiver = connection.receiver;
      trackedGuildId = voiceChannel.guild.id;

      connection.receiver.speaking.on('start', (userId) => {
        if (TARGET_USER_IDS.includes(userId)) {
          const resource = createAudioResource(fs.createReadStream(AUDIO_FILE));
          const player = createAudioPlayer();

          player.play(resource);
          connection.subscribe(player);

          player.once(AudioPlayerStatus.Idle, () => {
            player.stop();
          });

          console.log(`▶️ Reproduciendo sonido porque habló ${user.username}`);
        }
      });
    } catch (error) {
      console.error('❌ Error al conectar a voz:', error);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
