const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const config = require('./config.json');

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildInvites // Ensure you have the GuildInvites intent enabled
  ] 
});

let invites = {};

const getInviteCounts = async (guild) => {
    return new Map(guild.invites.cache.map(invite => [invite.code, invite.uses]));
};

client.once('ready', async () => {
    console.log('Bot is online!');
    console.log('Code by r3b');
    console.log('https://discord.gg/y3dNxBkm7H');
    client.user.setStatus('dnd');
    client.user.setActivity('Streaming on Twitch', { 
        type: ActivityType.Streaming, 
        url: 'https://www.twitch.tv/ir3b8'
    });

    // Load all server invites
    for (const [guildId, guild] of client.guilds.cache) {
        try {
            const currentInvites = await guild.invites.fetch();
            invites[guildId] = new Map(currentInvites.map(invite => [invite.code, invite.uses]));
            console.log(`Loaded ${currentInvites.size} invites for guild: ${guild.name}`);
        } catch (err) {
            console.log(`Failed to load invites for guild: ${guild.name}`);
            console.error(err);
        }
    }
});

client.on('inviteCreate', async invite => {
    const guildInvites = invites[invite.guild.id];
    guildInvites.set(invite.code, invite.uses);
});

client.on('inviteDelete', async invite => {
    const guildInvites = invites[invite.guild.id];
    guildInvites.delete(invite.code);
});

client.on('guildMemberAdd', async member => {
    const welcomeChannel = member.guild.channels.cache.get(config.welcomeChannelId);
    
    // Check if the new member is a bot
    if (member.user.bot) {
        const botRole = member.guild.roles.cache.get(config.botRoleId);
        if (botRole) {
            member.roles.add(botRole).catch(console.error);
            console.log(`Bot ${member.user.tag} has been assigned the bot role.`);
        } else {
            console.log('Bot role not found.');
        }
        return; // Stop further execution for bots
    }

    // Existing logic for normal users
    const role = member.guild.roles.cache.get(config.autoRoleId);
    if (role) {
        member.roles.add(role).catch(console.error);
    } else {
        console.log('Role not found for user.');
    }

    const newInvites = await member.guild.invites.fetch();
    const usedInvite = newInvites.find(inv => {
        const prevUses = (invites[member.guild.id].get(inv.code) || 0);
        return inv.uses > prevUses;
    });

    let inviterMention = 'Unknown';
    if (usedInvite && usedInvite.inviter) {
        inviterMention = `<@${usedInvite.inviter.id}>`;
        console.log(`Member joined with invite code ${usedInvite.code}`);
    } else {
        console.log(`Member joined, but no matching invite was found.`);
    }

    const bannerUrl = member.user.bannerURL({ dynamic: true, format: 'png', size: 1024 });

    const welcomeEmbed = new EmbedBuilder()
        .setColor('#05131f')
        .setTitle('Welcome to the Server! 🎉')
        .setDescription(`Hello ${member}, we're glad to have you in our server!`)
        .addFields([
            { name: 'Username', value: `${member.user.tag}`, inline: true },
            { name: 'Invited By', value: inviterMention, inline: true },
            { name: 'Invite Used', value: usedInvite ? usedInvite.code : 'No invite used', inline: true },
            { name: 'Announcements Channel', value: '<#1236472479212638250>', inline: true },
            { name: 'Support Channel', value: '<#1236472479212638258>', inline: true }
        ])
        .setThumbnail(member.user.displayAvatarURL())
        .setImage(bannerUrl || null)  // Use 'null' instead of an empty string
        .setTimestamp();
    
    welcomeChannel.send({ embeds: [welcomeEmbed] });
    

    invites[member.guild.id] = new Map(newInvites.map(invite => [invite.code, invite.uses]));
});


client.login(config.botToken);
