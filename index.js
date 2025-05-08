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

  // Comprobacion
  if (FORBIDDEN_CHANNELS.includes(message.channel.id)) {
    if (TARGET_COMMANDS.some(command => message.content.toLowerCase().startsWith(command))) {
      console.log(`⚡ Usuario ${message.author.tag} usó ${message.content} en un canal no permitido.`);
      
      // Aplicamos el timeout
      giveTimeout(message.member, TIMEOUT_DURATION);
      message.reply('JAJAJAJAJA pendejo no vuelvas a poner ese comando');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);