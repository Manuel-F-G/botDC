const path = require('path');
const fs = require('fs');
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
const { FFmpeg } = require('prism-media');

// Usamos ffmpeg-static para obtener el path del ejecutable
const ffmpegPath = require('ffmpeg-static').path;

const app = express();
app.get('/', (req, res) => res.send('Bot activo'));
app.listen(process.env.PORT || 3000, () =>
  console.log('🌐 Servidor web activo')
);

// === CONFIGURACIÓN ===
const TARGET_USER_IDS = [
  '1368112694468808807',
  '1298518404033941565',
  '1055009202168406118',
  '752987605808840807',
  '1344499474994823230'
];
const ALLOWED_CHANNELS = [
  '1369775267639201792',
  '1369547402465509376',
  '1369767579752730745'
];
const TIMEOUT_MS = 10 * 1000;
const AUDIO_FILE = path.join(__dirname, 'sonido.mp3');

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

// Timeout con !play o !p
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

// Seguimiento de usuarios en canales de voz
client.on('voiceStateUpdate', async (oldState, newState) => {
  const user = newState.member?.user;
  if (!user || user.bot) return;

  const joinedTarget = TARGET_USER_IDS.includes(user.id) && newState.channelId !== null;
  const leftChannel = TARGET_USER_IDS.includes(user.id) && newState.channelId === null;

  if (joinedTarget) {
    const channel = newState.channel;
    if (!channel) return;

    console.log(`🔊 Intentando unirme al canal: ${channel.name}`);

    if (connection) connection.destroy();

    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator
    });

    // Mejorar la captura de errores al intentar conectar al canal de voz
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      console.log(`🔊 Conectado a canal de voz: ${channel.name}`);

      player = createAudioPlayer();
      connection.subscribe(player);
      playLoop(); // Iniciar sonido en bucle

    } catch (error) {
      console.error('❌ Error al conectar a voz:', error);
    }
  }

  // Si ya no queda ningún usuario objetivo en canal, desconecta
  if (leftChannel && connection) {
    const guild = newState.guild;
    const stillSomeone = guild.members.cache.some(m =>
      TARGET_USER_IDS.includes(m.id) && m.voice.channelId
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
  // Verificar si el archivo de audio existe
  if (!fs.existsSync(AUDIO_FILE)) {
    console.error(`❌ El archivo de audio no existe: ${AUDIO_FILE}`);
    return;
  }

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
    executablePath: ffmpegPath // Asegúrate de usar ffmpegPath correctamente
  });

  const resource = createAudioResource(ffmpeg);
  player.play(resource);

  player.once(AudioPlayerStatus.Idle, () => {
    console.log("🔁 Reproducción completada. Reproduciendo de nuevo...");
    playLoop(); // Llamada recursiva para el bucle
  });

  player.on(AudioPlayerStatus.Playing, () => {
    console.log("🎶 El sonido está siendo reproducido.");
  });
}

client.login(process.env.DISCORD_TOKEN);
