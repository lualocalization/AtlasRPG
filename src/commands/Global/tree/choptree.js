const { AttachmentBuilder } = require('discord.js');
const DataService = require('../../../database/repositories/userDataRepositories');
const activeUsers = new Set();

module.exports = {
	data: { name: 'choptree', description: 'Chop down trees with your axe for wood materials' },

	run: async ({ interaction }) => {
		const userId = interaction.user.id;

		if (activeUsers.has(userId)) {
			return interaction.reply({
				embeds: [
					{
						description: `<:Removed:1338951500524949546> You are already chopping a tree.`,
						color: 0xffffff,
					},
				],
			});
		}

		activeUsers.add(userId);
		await interaction.deferReply();

		try {
			const userData = await DataService.getUserData(userId);
			const equippedItem = userData.equippedItem;

			if (!equippedItem || equippedItem.category !== 'axe') {
				activeUsers.delete(userId);
				return interaction.editReply(`### <:Removed:1338951500524949546> Equip an axe to chop a tree.`);
			}

			const axe = equippedItem;
			const treeType = ['oak_tree', 'birch_tree'][Math.floor(Math.random() * 2)];
			const woodType = `${treeType.split('_')[0]}_wood`;
			const woodEmoji = woodType === 'oak_wood' ? '<:oak_wood:1341904056259448966>' : '<:birch_wood:1341904088383750247>';
			const woodCollected = Math.floor(Math.random() * 5) + 1;
			const woodAmount = userData.materials[woodType] || 0;
			const progressStep = axe.choppingPower === Infinity ? 100 : axe.choppingPower || 10;
			const timeTook = (100 / progressStep) * 1;
			const formattedTreeName = treeType.replace('_tree', '').replace(/^\w/, (c) => c.toUpperCase());

			let embed = {
				color: 0x90ee90,
				title: `Chopping tree..`,
				description: `🌳 You have started chopping a **${formattedTreeName} Tree**.`,
				fields: [
					{ name: 'Tree Type', value: `${formattedTreeName} Tree`, inline: true },
					{ name: 'Progress', value: '0%', inline: true },
				],
				footer: { text: interaction.user.username, icon_url: interaction.user.displayAvatarURL() },
			};

			await interaction.editReply({ embeds: [embed] });

			for (let progress = progressStep; progress <= 100; progress += progressStep) {
				let filledBlocks = Math.floor(progress / 12.5);
				let emptyBlocks = 8 - filledBlocks;
				let progressBar = '▓'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
				embed.fields[1].value = `${progressBar} ${progress}%`;

				await interaction.editReply({ embeds: [embed] });

				if (progress === 100) {
					embed.title = `Tree Chopped!`;
					embed.description = `🌲 **You've successfully chopped down a ${formattedTreeName} Tree!**`;

					embed.fields = [
						{ name: 'Logs Obtained', value: `${woodEmoji} ${woodCollected} ${formattedTreeName} Wood`, inline: true },
						{ name: 'Chopping Streak', value: `<:streak:1341909633689845760> ${userData.choppingStreak || 1}`, inline: true },
						{ name: 'Class XP Gained', value: `⭐ +40 Lumberjack XP`, inline: true },
						{ name: 'Time Took', value: `⌛ ${timeTook}s`, inline: true },
						{
							name: 'Axe Durability',
							value: axe.durability <= 1 ? `🪓 Your axe broke!` : `🪓 ${axe.durability - 1} Uses left`,
							inline: true,
						},
						{ name: 'Rare Drops', value: `<:Removed:1338951500524949546> None`, inline: true },
					];

					userData.choppingStreak = (userData.choppingStreak || 0) + 1;
					axe.durability--;

					if (axe.durability <= 0) {
						userData.equippedItem = null;
						userData.choppingStreak = 0;
					}

					await interaction.editReply({ embeds: [embed] });

					break;
				}

				await new Promise((resolve) => setTimeout(resolve, 1000));
			}

			userData.materials[woodType] = woodAmount + woodCollected;
			await DataService.updateUserData(userId, 'materials', userData.materials);
			await DataService.updateUserData(userId, 'choppingStreak', userData.choppingStreak);
			await DataService.updateUserData(userId, 'equippedItem', userData.equippedItem);
		} catch (error) {
			console.error(`Error in ${__filename}:`, error);
			await interaction.editReply({ content: 'There was an error processing your request.', ephemeral: true });
		} finally {
			activeUsers.delete(userId);
		}
	},
};
