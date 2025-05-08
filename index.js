process.env.FFMPEG_PATH = require('ffmpeg-static');
const {
  Client,
  GatewayIntentBits,
  Partials
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
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { FFmpeg } = require('prism-media');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot activo'));
app.listen(process.env.PORT || 3000, () =>
  console.log('🌐 Servidor web activo')
);

// === CONFIGURACIÓN ===
const ALLOWED_CHANNELS = [
  '1369775267639201792', // Cambia con el ID del canal donde se permiten los comandos
];
const AUDIO_FILE = './sonido.mp3';  // Ruta al archivo de audio
const TIMEOUT_MS = 10 * 1000;  // Tiempo de timeout para !play o !p

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

let connection = null;
let player = null;

client.once('ready', () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
});

// Comando de timeout: !play o !p
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

// Función para unirse al canal de voz y seguir al usuario
client.on('voiceStateUpdate', async (oldState, newState) => {
  const user = newState.member?.user;
  if (!user || user.bot) return;

  const joinedTarget = newState.channelId && ALLOWED_CHANNELS.includes(newState.channelId);
  const leftChannel = !newState.channelId;

  // Si el usuario se une a un canal, el bot se une también y reproduce el sonido
  if (joinedTarget) {
    const channel = newState.channel;
    if (!channel) return;

    // Destruir conexión anterior si existe
    if (connection) connection.destroy();

    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      console.log(`🔊 Conectado a canal de voz: ${channel.name}`);

      player = createAudioPlayer();
      connection.subscribe(player);
      playLoop();  // Reproducir sonido en bucle

    } catch (error) {
      console.error('❌ Error al conectar a voz:', error);
    }
  }

  // Si el usuario se desconecta, el bot también se desconecta
  if (leftChannel && connection) {
    const guild = newState.guild;
    const stillSomeone = guild.members.cache.some(m =>
      m.voice.channelId && ALLOWED_CHANNELS.includes(m.voice.channelId)
    );

    if (!stillSomeone) {
      player?.stop();
      connection.destroy();
      connection = null;
      console.log('👋 Salí del canal de voz');
    }
  }
});

// 🔁 Función para reproducir sonido en bucle
function playLoop() {
  const ffmpeg = new FFmpeg({
    args: [
      '-analyzeduration', '0',
      '-loglevel', '0',
      '-i', AUDIO_FILE,
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2'
    ],
    shell: false,
    executablePath: ffmpegInstaller.path // 🔧 Ruta de ffmpeg
  });

  const resource = createAudioResource(ffmpeg);
  player.play(resource);

  player.once(AudioPlayerStatus.Idle, () => {
    playLoop();  // Llamada recursiva para bucle
  });
}

client.login(process.env.DISCORD_TOKEN);
