require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

const VERIFY_ROLE_NAME = 'Verified';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

function buildVerifyEmbed() {
  return new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle('✅ Verification Required')
    .setDescription('Welcome! To get access to the server, click the **Verify** button below.\n\nYou will receive the **Verified** role instantly.')
    .setFooter({ text: 'Click the button below to verify' });
}

function buildVerifyButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify_button')
      .setLabel('✅ Verify')
      .setStyle(ButtonStyle.Success)
  );
}

async function setupVerifyChannel(guild) {
  const verifyChannel = guild.channels.cache.find(c => c.name === 'verify');
  if (!verifyChannel) {
    console.log(`⚠️  No #verify channel found in "${guild.name}" — create one and run !setupverify`);
    return;
  }
  try {
    const messages = await verifyChannel.messages.fetch({ limit: 20 });
    const botMessages = messages.filter(m => m.author.id === client.user.id);
    for (const msg of botMessages.values()) await msg.delete().catch(() => {});
  } catch {}
  await verifyChannel.send({ embeds: [buildVerifyEmbed()], components: [buildVerifyButton()] });
  console.log(`✅ Verify message posted in #verify in "${guild.name}"`);
}

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  const content = message.content.trim().toLowerCase();

  if (content === '!setupverify') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply('❌ Only admins can use this.');
    await setupVerifyChannel(message.guild);
    const reply = await message.reply('✅ Verify message posted in #verify!');
    setTimeout(() => reply.delete().catch(() => {}), 4000);
    message.delete().catch(() => {});
  }

  else if (content === '!help') {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📋 Verify Bot Commands')
      .addFields(
        { name: '!setupverify', value: 'Re-post the verify message in #verify (Admin only)' },
        { name: '!help', value: 'Show this help message' },
      );
    message.reply({ embeds: [embed] });
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton() || interaction.customId !== 'verify_button') return;

  const guild = interaction.guild;
  const member = interaction.member;

  let role = guild.roles.cache.find(r => r.name === VERIFY_ROLE_NAME);
  if (!role) {
    try {
      role = await guild.roles.create({ name: VERIFY_ROLE_NAME, color: 0x57f287, reason: 'Auto-created by Verify Bot' });
      console.log(`✅ Created "${VERIFY_ROLE_NAME}" role`);
    } catch {
      return interaction.reply({ content: '❌ Could not create the Verified role. Make sure I have Administrator permission!', ephemeral: true });
    }
  }

  if (member.roles.cache.has(role.id))
    return interaction.reply({ content: '✅ You are already verified!', ephemeral: true });

  try {
    await member.roles.add(role);
    await interaction.reply({ content: '✅ **Verified! Welcome to the server.** You now have full access.', ephemeral: true });
    console.log(`✅ Verified: ${member.user.tag}`);
  } catch {
    await interaction.reply({ content: '❌ Something went wrong. Please contact an admin.', ephemeral: true });
  }
});

client.once('ready', async () => {
  console.log(`✅ Verify Bot logged in as ${client.user.tag}`);
  for (const guild of client.guilds.cache.values()) {
    await setupVerifyChannel(guild);
  }
});

client.login(process.env.DISCORD_TOKEN);
