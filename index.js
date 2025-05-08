const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const express = require('express');
const fs = require('fs');

const app = express();
app.get('/', (req, res) => res.send('Bot activo'));
app.listen(process.env.PORT || 3000, () =>
  console.log('🌐 Servidor web activo')
);

// === CONFIGURACIÓN ===
//const ALLOWED_CHANNELS = [
//'1369775267639201792',
//  '1369547402465509376',
//  '1369767579752730745'
// ];
const TARGET_USER_IDS = [
  '1298518404033941565',
  '679883915296505889'
];

const AUDIO_FILE = './sonido.mp3'; // Asegúrate de que esté presente

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel]
});

let connection = null;
let player = null;

client.once('ready', () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
});

// 🎵 Función simplificada para reproducir el audio en bucle
function playSound() {
  if (!fs.existsSync(AUDIO_FILE)) {
    console.error('❌ Archivo de audio no encontrado:', AUDIO_FILE);
    return;
  }

  console.log('✅ Archivo de audio encontrado correctamente');

  const resource = createAudioResource(AUDIO_FILE);
  player = createAudioPlayer();
  connection.subscribe(player);

  player.play(resource);

  player.on(AudioPlayerStatus.Idle, () => {
    console.log('Audio terminado, reiniciando...');
    playSound(); // Vuelve a reproducir
  });

  player.on('error', error => {
    console.error('Error al reproducir audio:', error);
  });
}

// 📡 Seguimiento de usuarios en canales de voz
client.on('voiceStateUpdate', async (oldState, newState) => {
  const user = newState.member?.user;
  if (!user || user.bot) return;

  const joinedTarget = TARGET_USER_IDS.includes(user.id) && newState.channelId !== null;
  const leftChannel = TARGET_USER_IDS.includes(user.id) && newState.channelId === null;

  if (joinedTarget) {
    const channel = newState.channel;
    if (!channel) return;

    if (connection) connection.destroy();

    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    connection.once(VoiceConnectionStatus.Ready, () => {
      console.log(`🔊 Conectado al canal de voz: ${channel.name}`);
      playSound();
    });
  }

  if (leftChannel && connection) {
    const guild = newState.guild;
    const stillSomeone = guild.members.cache.some(m =>
      TARGET_USER_IDS.includes(m.id) && m.voice.channelId
    );

    if (!stillSomeone) {
      connection.destroy();
      connection = null;
      console.log('👋 Salí del canal de voz porque ya no hay más usuarios objetivo');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
