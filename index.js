const { Client, GatewayIntentBits, Partials } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel]
});

// Si pones comandos te carga la verga
const FORBIDDEN_CHANNELS = [
  '1369775267639201792', 
  '1369547402465509376', 
  '1369767579752730745'  
];

const TIMEOUT_DURATION = 10000; // 10 segundos de timeout
const TARGET_COMMANDS = ['!play', '!p'];

client.once('ready', () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
});

// Función para dar timeout
const giveTimeout = (member, duration) => {
  member.timeout(duration, 'Time por pendejo').catch(console.error);
};

// Comprobación de mensajes
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase().trim();

  // Timeout por comandos en canales prohibidos
  if (FORBIDDEN_CHANNELS.includes(message.channel.id)) {
    if (TARGET_COMMANDS.some(command => content.startsWith(command))) {
      console.log(`⚡ Usuario ${message.author.tag} usó ${message.content} en un canal no permitido.`);
      giveTimeout(message.member, TIMEOUT_DURATION);
      message.reply('JAJAJAJAJA pendejo no vuelvas a poner ese comando');
      return;
    }
  }

  // palabras ome
  const omeRegex = /\b[o0][m][e3]\b/;
  if (omeRegex.test(content)) {
    message.reply('ome, haz ome wei🐀🐀🐀');
    return;
  }

  // Comando !sapo con @usuario
  if (content.startsWith('!sapo') && message.mentions.users.size > 0) {
    const target = message.mentions.users.first();
    const isSapo = Math.random() < 0.5;
    const respuesta = isSapo
      ? ` ${target.username} es un puto sapo 🐸`
      : ` ${target.username} no es sapo, pero si te llevas unos tablazos`;
    message.channel.send(respuesta);
    return;
  }

  // Mención directa a Victor Mendivil 09 (ID: 1298518404033941565)
  if (
    message.content.includes('<@1298518404033941565>') || 
    message.content.includes('<@!1298518404033941565>')
  ) {
    message.reply('No haré ome, no estés chingando');
    return;
  }

  // Mención directa a otro usuario joto (ID: 1357943865931468911)
  if (
    message.content.includes('<@1357943865931468911>') || 
    message.content.includes('<@!1357943865931468911>')
  ) {
    message.reply('soy joto y me gusta la verga');
    return;
  }

  // Mención directa al nuevo usuario (ID: 1055009202168406118)
  if (
    message.content.includes('<@1055009202168406118>') || 
    message.content.includes('<@!1055009202168406118>')
  ) {
    message.reply('me gusta la verga negra, dura y que se me note hasta la pancita');
    return;
  }

  if (
    message.content.includes('<@685301041092231172>') || 
    message.content.includes('<@!685301041092231172>')
  ) {
    message.reply('Hola soy savz, me gusta la verga peluda, que me la metan por el culo y me dejen abierto el orto, que me echen su lechita, sisisi que rico');
    return;
  }
});

client.login(process.env.DISCORD_TOKEN);
