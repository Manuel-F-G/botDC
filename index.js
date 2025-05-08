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

const app = express();
app.get('/', (req, res) => res.send('Bot activo'));
app.listen(process.env.PORT || 3000, () => {
  console.log('🌐 Servidor web activo');
});

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

// CONFIGURACIÓN
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
const AUDIO_FILE = './sonido.mp3'; 
let activeConnection = null;
let currentPlayer = null;

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

// Detectar entrada a canal de voz y reproducir sonido en bucle
client.on('voiceStateUpdate', async (oldState, newState) => {
  const user = newState.member?.user;
  if (!user || user.bot) return;

  // Usuario objetivo entra a canal de voz
  if (TARGET_USER_IDS.includes(user.id) && newState.channelId && newState.channelId !== oldState.channelId) {
    const voiceChannel = newState.channel;

    if (activeConnection) {
      activeConnection.destroy();
    }

    activeConnection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator
    });

    await entersState(activeConnection, VoiceConnectionStatus.Ready, 30_000);

    currentPlayer = createAudioPlayer();

    const playLoop = () => {
      const resource = createAudioResource(fs.createReadStream(AUDIO_FILE));
      currentPlayer.play(resource);
    };

    currentPlayer.on(AudioPlayerStatus.Idle, () => {
      playLoop(); // bucle
    });

    activeConnection.subscribe(currentPlayer);
    playLoop();

    console.log(`🔊 Reproduciendo sonido en ${voiceChannel.name} para ${user.username}`);
  }

  // Usuario sale del canal
  if (TARGET_USER_IDS.includes(user.id) && newState.channelId === null) {
    const connection = getVoiceConnection(oldState.guild.id);
    if (connection) {
      connection.destroy();
      console.log(`❌ ${user.username} salió del canal. Se detuvo el audio.`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
