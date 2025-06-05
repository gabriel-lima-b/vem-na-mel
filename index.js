const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const crypto = require('crypto');

// Configurações do bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Armazenamento em memória (em produção, use banco de dados)
const grupos = new Map();
const configServidor = new Map();

// Classes disponíveis do Ragnarok
const CLASSES_RO = [
    'Qualquer Classe',
    'Cavaleiro Rúnico',
    'Guardião Real',
    'Arcano',
    'Feiticeiro',
    'Sentinela',
    'Trovador',
    'Musa',
    'Mecânico',
    'Bioquímico',
    'Arcebispo',
    'Shura',
    'Sicário',
    'Renegado',
    'Kagerou',
    'Oboro',
    'Insurgente',
    'Ceifadores de Alma',
    'Mestre Estrelar'
];

// Função para gerar ID único
function gerarIdGrupo() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Função para verificar se usuário pode criar grupos
function podecriarGrupos(member, guildId) {
    const config = configServidor.get(guildId);
    if (!config || !config.rolesPermitidas) return member.permissions.has(PermissionsBitField.Flags.Administrator);
    
    return member.permissions.has(PermissionsBitField.Flags.Administrator) || 
           member.roles.cache.some(role => config.rolesPermitidas.includes(role.id));
}


// Função para atualizar mensagem do grupo
async function atualizarMensagemGrupo(grupo) {
    try {
        const canal = await client.channels.fetch(grupo.canalId);
        const thread = await canal.threads.fetch(grupo.threadId);
        
        let mensagem = `**${grupo.nome}**\n`;
        mensagem += `🆔 **ID do Grupo:** ${grupo.id}\n`;
        mensagem += `👑 **Organizador:** <@${grupo.organizadorId}>\n\n`;
        
        mensagem += `**📋 Composição do Grupo:**\n`;
        for (const [classe, config] of Object.entries(grupo.roles)) {
            const membros = config.membros.map(id => `<@${id}>`).join(', ') || '*Vazio*';
            mensagem += `${classe} (${config.membros.length}/${config.limite}): ${membros}\n`;
        }
        
        if (grupo.fila.length > 0) {
            mensagem += `\n**⏳ Fila de Espera:**\n`;
            grupo.fila.forEach((item, index) => {
                mensagem += `${index + 1}. <@${item.userId}> - ${item.classe}\n`;
            });
        }
        
        if (grupo.informacoesAdicionais) {
            mensagem += `\n**📝 Informações Adicionais:**\n${grupo.informacoesAdicionais}`;
        }
        
        // Botões de interação
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('entrar_grupo')
                    .setLabel('Entrar no Grupo')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('sair_grupo')
                    .setLabel('Sair do Grupo')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('➖')
            );
        
        // Se a mensagem já existe, edita ela; senão, cria uma nova
        if (grupo.mensagemId) {
            try {
                const mensagemExistente = await thread.messages.fetch(grupo.mensagemId);
                await mensagemExistente.edit({ content: mensagem, components: [row] });
            } catch (error) {
                // Se não conseguir editar (mensagem foi deletada), cria uma nova
                console.log('Mensagem original não encontrada, criando nova...');
                const novaMensagem = await thread.send({ content: mensagem, components: [row] });
                grupo.mensagemId = novaMensagem.id;
            }
        } else {
            // Primeira vez criando a mensagem
            const novaMensagem = await thread.send({ content: mensagem, components: [row] });
            grupo.mensagemId = novaMensagem.id;
        }
    } catch (error) {
        console.error('Erro ao atualizar mensagem do grupo:', error);
    }
}

// Função para processar fila
function processarFila(grupo) {
    if (grupo.fila.length === 0) return false;
    
    let mudanca = false;
    for (let i = grupo.fila.length - 1; i >= 0; i--) {
        const item = grupo.fila[i];
        const roleConfig = grupo.roles[item.classe];
        
        if (roleConfig && roleConfig.membros.length < roleConfig.limite) {
            roleConfig.membros.push(item.userId);
            grupo.fila.splice(i, 1);
            mudanca = true;
        }
    }
    
    return mudanca;
}

// Evento quando o bot fica online
client.once('ready', async () => {
    console.log(`Bot ${client.user.tag} está online!`);
    
    // Registrar comandos slash
    const commands = [
        new SlashCommandBuilder()
            .setName('criargrupo')
            .setDescription('Criar um novo grupo para Ragnarok Online'),
        
        new SlashCommandBuilder()
            .setName('editargrupo')
            .setDescription('Editar um grupo existente')
            .addStringOption(option =>
                option.setName('id')
                    .setDescription('ID do grupo')
                    .setRequired(true)),
        
        new SlashCommandBuilder()
            .setName('removermembro')
            .setDescription('Remover um membro do grupo')
            .addStringOption(option =>
                option.setName('id')
                    .setDescription('ID do grupo')
                    .setRequired(true))
            .addUserOption(option =>
                option.setName('membro')
                    .setDescription('Membro a ser removido')
                    .setRequired(true)),
        
        new SlashCommandBuilder()
            .setName('sairgrupo')
            .setDescription('Sair de um grupo')
            .addStringOption(option =>
                option.setName('id')
                    .setDescription('ID do grupo')
                    .setRequired(true)),
        
        new SlashCommandBuilder()
            .setName('entrargrupo')
            .setDescription('Entrar em um grupo')
            .addStringOption(option =>
                option.setName('id')
                    .setDescription('ID do grupo')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('classe')
                    .setDescription('Classe desejada')
                    .setRequired(true)
                    .addChoices(
                        ...CLASSES_RO.map(classe => ({ name: classe, value: classe }))
                    )),
        
        new SlashCommandBuilder()
            .setName('ajuda')
            .setDescription('Informações sobre os comandos do bot'),
        
        new SlashCommandBuilder()
            .setName('configbot')
            .setDescription('Configurar permissões do bot (apenas administradores)')
            .addRoleOption(option =>
                option.setName('role')
                    .setDescription('Role que pode criar grupos')
                    .setRequired(false))
    ];
    
    try {
        await client.application.commands.set(commands);
        console.log('Comandos registrados com sucesso!');
    } catch (error) {
        console.error('Erro ao registrar comandos:', error);
    }
    
    // Configurar limpeza automática de grupos após 1 semana
    setInterval(async () => {
        const agora = Date.now();
        const semanaEmMs = 7 * 24 * 60 * 60 * 1000;
        
        for (const [id, grupo] of grupos.entries()) {
            if (agora - grupo.criadoEm > semanaEmMs) {
                try {
                    const canal = await client.channels.fetch(grupo.canalId);
                    const thread = await canal.threads.fetch(grupo.threadId);
                    await thread.delete();
                    grupos.delete(id);
                    console.log(`Grupo ${id} removido automaticamente após 1 semana`);
                } catch (error) {
                    console.error(`Erro ao remover grupo ${id}:`, error);
                }
            }
        }
    }, 60 * 60 * 1000); // Verificar a cada hora
});

// Manipular comandos slash
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    
    const { commandName } = interaction;
    
    try {
        switch (commandName) {
            case 'criargrupo':
                if (!podecriarGrupos(interaction.member, interaction.guildId)) {
                    return await interaction.reply({ 
                        content: '❌ Você não tem permissão para criar grupos!', 
                        ephemeral: true 
                    });
                }
                
                const modal = new ModalBuilder()
                    .setCustomId('criar_grupo_modal')
                    .setTitle('Criar Novo Grupo');
                
                const nomeInput = new TextInputBuilder()
                    .setCustomId('nome_grupo')
                    .setLabel('Nome do Grupo')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                
                const infoInput = new TextInputBuilder()
                    .setCustomId('info_adicional')
                    .setLabel('Informações Adicionais')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false);
                
                const topicoInput = new TextInputBuilder()
                    .setCustomId('nome_topico')
                    .setLabel('Nome do Tópico')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                
                modal.addComponents(
                    new ActionRowBuilder().addComponents(nomeInput),
                    new ActionRowBuilder().addComponents(infoInput),
                    new ActionRowBuilder().addComponents(topicoInput)
                );
                
                await interaction.showModal(modal);
                break;
                
            case 'editargrupo':
                const idEditar = interaction.options.getString('id');
                const grupoEditar = grupos.get(idEditar);
                
                if (!grupoEditar) {
                    return await interaction.reply({ 
                        content: '❌ Grupo não encontrado!', 
                        ephemeral: true 
                    });
                }
                
                if (grupoEditar.organizadorId !== interaction.user.id && 
                    !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return await interaction.reply({ 
                        content: '❌ Apenas o organizador ou administradores podem editar o grupo!', 
                        ephemeral: true 
                    });
                }
                
                // Similar ao criar grupo, mas com valores preenchidos
                const modalEditar = new ModalBuilder()
                    .setCustomId(`editar_grupo_modal_${idEditar}`)
                    .setTitle('Editar Grupo');
                
                const nomeEditarInput = new TextInputBuilder()
                    .setCustomId('nome_grupo')
                    .setLabel('Nome do Grupo')
                    .setStyle(TextInputStyle.Short)
                    .setValue(grupoEditar.nome)
                    .setRequired(true);
                
                const infoEditarInput = new TextInputBuilder()
                    .setCustomId('info_adicional')
                    .setLabel('Informações Adicionais')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(grupoEditar.informacoesAdicionais || '')
                    .setRequired(false);
                
                modalEditar.addComponents(
                    new ActionRowBuilder().addComponents(nomeEditarInput),
                    new ActionRowBuilder().addComponents(infoEditarInput)
                );
                
                await interaction.showModal(modalEditar);
                break;
                
            case 'removermembro':
                const idRemover = interaction.options.getString('id');
                const membroRemover = interaction.options.getUser('membro');
                const grupoRemover = grupos.get(idRemover);
                
                if (!grupoRemover) {
                    return await interaction.reply({ 
                        content: '❌ Grupo não encontrado!', 
                        ephemeral: true 
                    });
                }
                
                if (grupoRemover.organizadorId !== interaction.user.id && 
                    !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return await interaction.reply({ 
                        content: '❌ Apenas o organizador ou administradores podem remover membros!', 
                        ephemeral: true 
                    });
                }
                
                let removido = false;
                for (const [classe, config] of Object.entries(grupoRemover.roles)) {
                    const index = config.membros.indexOf(membroRemover.id);
                    if (index !== -1) {
                        config.membros.splice(index, 1);
                        removido = true;
                        break;
                    }
                }
                
                if (!removido) {
                    const filaIndex = grupoRemover.fila.findIndex(item => item.userId === membroRemover.id);
                    if (filaIndex !== -1) {
                        grupoRemover.fila.splice(filaIndex, 1);
                        removido = true;
                    }
                }
                
                if (removido) {
                    processarFila(grupoRemover);
                    await atualizarMensagemGrupo(grupoRemover);
                    await interaction.reply({ 
                        content: `✅ ${membroRemover.tag} foi removido do grupo!`, 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: '❌ Membro não encontrado no grupo!', 
                        ephemeral: true 
                    });
                }
                break;
                
            case 'sairgrupo':
                const idSair = interaction.options.getString('id');
                const grupoSair = grupos.get(idSair);
                
                if (!grupoSair) {
                    return await interaction.reply({ 
                        content: '❌ Grupo não encontrado!', 
                        ephemeral: true 
                    });
                }
                
                let saiu = false;
                for (const [classe, config] of Object.entries(grupoSair.roles)) {
                    const index = config.membros.indexOf(interaction.user.id);
                    if (index !== -1) {
                        config.membros.splice(index, 1);
                        saiu = true;
                        break;
                    }
                }
                
                if (!saiu) {
                    const filaIndex = grupoSair.fila.findIndex(item => item.userId === interaction.user.id);
                    if (filaIndex !== -1) {
                        grupoSair.fila.splice(filaIndex, 1);
                        saiu = true;
                    }
                }
                
                if (saiu) {
                    processarFila(grupoSair);
                    await atualizarMensagemGrupo(grupoSair);
                    await interaction.reply({ 
                        content: '✅ Você saiu do grupo!', 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: '❌ Você não está neste grupo!', 
                        ephemeral: true 
                    });
                }
                break;
                
            case 'entrargrupo':
                const idEntrar = interaction.options.getString('id');
                const classeDesejada = interaction.options.getString('classe');
                const grupoEntrar = grupos.get(idEntrar);
                
                if (!grupoEntrar) {
                    return await interaction.reply({ 
                        content: '❌ Grupo não encontrado!', 
                        ephemeral: true 
                    });
                }
                
                if (!grupoEntrar.roles[classeDesejada]) {
                    return await interaction.reply({ 
                        content: '❌ Esta classe não está disponível neste grupo!', 
                        ephemeral: true 
                    });
                }
                
                // Verificar se já está no grupo
                let jaNoGrupo = false;
                for (const [classe, config] of Object.entries(grupoEntrar.roles)) {
                    if (config.membros.includes(interaction.user.id)) {
                        jaNoGrupo = true;
                        break;
                    }
                }
                
                if (jaNoGrupo || grupoEntrar.fila.some(item => item.userId === interaction.user.id)) {
                    return await interaction.reply({ 
                        content: '❌ Você já está neste grupo!', 
                        ephemeral: true 
                    });
                }
                
                const roleConfig = grupoEntrar.roles[classeDesejada];
                if (roleConfig.membros.length < roleConfig.limite) {
                    roleConfig.membros.push(interaction.user.id);
                    await atualizarMensagemGrupo(grupoEntrar);
                    await interaction.reply({ 
                        content: `✅ Você entrou no grupo como ${classeDesejada}!`, 
                        ephemeral: true 
                    });
                } else {
                    grupoEntrar.fila.push({
                        userId: interaction.user.id,
                        classe: classeDesejada
                    });
                    await atualizarMensagemGrupo(grupoEntrar);
                    await interaction.reply({ 
                        content: `⏳ Você foi adicionado à fila de espera para ${classeDesejada}!`, 
                        ephemeral: true 
                    });
                }
                break;
                
            case 'ajuda':
                const embedAjuda = new EmbedBuilder()
                    .setTitle('🎮 Bot de Grupos - Ragnarok Online')
                    .setDescription('Comandos disponíveis para gerenciar grupos de RO:')
                    .addFields(
                        { name: '/criargrupo', value: 'Criar um novo grupo (requer permissão)', inline: false },
                        { name: '/editargrupo <id>', value: 'Editar um grupo existente (apenas organizador)', inline: false },
                        { name: '/entrargrupo <id> <classe>', value: 'Entrar em um grupo na classe especificada', inline: false },
                        { name: '/sairgrupo <id>', value: 'Sair de um grupo', inline: false },
                        { name: '/removermembro <id> <@membro>', value: 'Remover membro do grupo (apenas organizador)', inline: false },
                        { name: '/configbot', value: 'Configurar permissões (apenas administradores)', inline: false }
                    )
                    .setColor(0x00AE86)
                    .setFooter({ text: 'Os grupos são automaticamente removidos após 1 semana' });
                
                await interaction.reply({ embeds: [embedAjuda] });
                break;
                
            case 'configbot':
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return await interaction.reply({ 
                        content: '❌ Apenas administradores podem usar este comando!', 
                        ephemeral: true 
                    });
                }
                
                const role = interaction.options.getRole('role');
                let config = configServidor.get(interaction.guildId) || {};
                
                if (role) {
                    if (!config.rolesPermitidas) config.rolesPermitidas = [];
                    
                    if (config.rolesPermitidas.includes(role.id)) {
                        config.rolesPermitidas = config.rolesPermitidas.filter(id => id !== role.id);
                        await interaction.reply({ 
                            content: `✅ Role ${role.name} removida das permissões de criar grupos!`, 
                            ephemeral: true 
                        });
                    } else {
                        config.rolesPermitidas.push(role.id);
                        await interaction.reply({ 
                            content: `✅ Role ${role.name} adicionada às permissões de criar grupos!`, 
                            ephemeral: true 
                        });
                    }
                    
                    configServidor.set(interaction.guildId, config);
                } else {
                    const rolesPermitidas = config.rolesPermitidas || [];
                    const rolesNomes = rolesPermitidas.map(id => {
                        const role = interaction.guild.roles.cache.get(id);
                        return role ? role.name : 'Role não encontrada';
                    }).join(', ') || 'Apenas administradores';
                    
                    await interaction.reply({ 
                        content: `**Configuração atual:**\nRoles que podem criar grupos: ${rolesNomes}`, 
                        ephemeral: true 
                    });
                }
                break;
        }
    } catch (error) {
        console.error('Erro ao processar comando:', error);
        if (!interaction.replied) {
            await interaction.reply({ 
                content: '❌ Ocorreu um erro ao processar o comando!', 
                ephemeral: true 
            });
        }
    }
});

// Manipular modais e botões
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'criar_grupo_modal') {
                const nomeGrupo = interaction.fields.getTextInputValue('nome_grupo');
                const infoAdicional = interaction.fields.getTextInputValue('info_adicional');
                const nomeTopico = interaction.fields.getTextInputValue('nome_topico');
                
                // Criar seletor de classes
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('selecionar_classes')
                    .setPlaceholder('Selecione as classes para o grupo')
                    .setMinValues(1)
                    .setMaxValues(CLASSES_RO.length)
                    .addOptions(
                        CLASSES_RO.map(classe => ({
                            label: classe,
                            value: classe,
                            description: `Adicionar ${classe} ao grupo`
                        }))
                    );
                
                const row = new ActionRowBuilder().addComponents(selectMenu);
                
                // Armazenar dados temporários
                const tempId = `temp_${Date.now()}`;
                grupos.set(tempId, {
                    nome: nomeGrupo,
                    informacoesAdicionais: infoAdicional,
                    nomeTopico: nomeTopico,
                    organizadorId: interaction.user.id,
                    canalId: interaction.channelId,
                    guildId: interaction.guildId,
                    temp: true
                });
                
                await interaction.reply({
                    content: 'Selecione as classes que poderão participar do grupo:',
                    components: [row],
                    ephemeral: true
                });
            }
            
            if (interaction.customId.startsWith('editar_grupo_modal_')) {
                const grupoId = interaction.customId.replace('editar_grupo_modal_', '');
                const grupo = grupos.get(grupoId);
                
                if (grupo) {
                    grupo.nome = interaction.fields.getTextInputValue('nome_grupo');
                    grupo.informacoesAdicionais = interaction.fields.getTextInputValue('info_adicional');
                    
                    await atualizarMensagemGrupo(grupo);
                    await interaction.reply({ 
                        content: '✅ Grupo editado com sucesso!', 
                        ephemeral: true 
                    });
                }
            }
        }
        
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'selecionar_classes') {
                const classesSelecionadas = interaction.values;
                
                // Encontrar grupo temporário
                let grupoTemp = null;
                let tempId = null;
                
                for (const [id, grupo] of grupos.entries()) {
                    if (grupo.temp && grupo.organizadorId === interaction.user.id) {
                        grupoTemp = grupo;
                        tempId = id;
                        break;
                    }
                }
                
                if (!grupoTemp) {
                    return await interaction.reply({ 
                        content: '❌ Sessão expirada. Tente novamente.', 
                        ephemeral: true 
                    });
                }
                
                // Criar modal para definir limites
                const modal = new ModalBuilder()
                    .setCustomId(`definir_limites_${tempId}`)
                    .setTitle('Definir Limites das Classes');
                
                classesSelecionadas.slice(0, 5).forEach((classe, index) => {
                    const input = new TextInputBuilder()
                        .setCustomId(`limite_${index}`)
                        .setLabel(`Limite para ${classe}`)
                        .setStyle(TextInputStyle.Short)
                        .setValue('1')
                        .setRequired(true);
                    
                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                });
                
                // Armazenar classes selecionadas
                grupoTemp.classesSelecionadas = classesSelecionadas;
                
                await interaction.showModal(modal);
            }
        }
        
        if (interaction.isModalSubmit() && interaction.customId.startsWith('definir_limites_')) {
            const tempId = interaction.customId.replace('definir_limites_', '');
            const grupoTemp = grupos.get(tempId);
            
            if (!grupoTemp) {
                return await interaction.reply({ 
                    content: '❌ Sessão expirada. Tente novamente.', 
                    ephemeral: true 
                });
            }
            
            // Criar thread
            const canal = interaction.channel;
            const thread = await canal.threads.create({
                name: grupoTemp.nomeTopico,
                autoArchiveDuration: 10080 // 1 semana
            });
            
            // Finalizar criação do grupo
            const grupoId = gerarIdGrupo();
            const roles = {};
            
            grupoTemp.classesSelecionadas.forEach((classe, index) => {
                const limite = parseInt(interaction.fields.getTextInputValue(`limite_${index}`)) || 1;
                roles[classe] = {
                    limite: limite,
                    membros: []
                };
            });
            
            const grupoFinal = {
                id: grupoId,
                nome: grupoTemp.nome,
                organizadorId: grupoTemp.organizadorId,
                threadId: thread.id,
                canalId: grupoTemp.canalId,
                guildId: grupoTemp.guildId,
                roles: roles,
                fila: [],
                informacoesAdicionais: grupoTemp.informacoesAdicionais,
                criadoEm: Date.now()
            };
            
            grupos.delete(tempId);
            grupos.set(grupoId, grupoFinal);
            
            await atualizarMensagemGrupo(grupoFinal);
            await interaction.reply({ 
                content: `✅ Grupo criado com sucesso! ID: ${grupoId}`, 
                ephemeral: true 
            });
        }
        
        if (interaction.isButton()) {
            if (interaction.customId === 'entrar_grupo' || interaction.customId === 'sair_grupo') {
                // Encontrar grupo pela thread
                let grupoEncontrado = null;
                for (const grupo of grupos.values()) {
                    if (grupo.threadId === interaction.channelId) {
                        grupoEncontrado = grupo;
                        break;
                    }
                }
                
                if (!grupoEncontrado) {
                    return await interaction.reply({ 
                        content: '❌ Grupo não encontrado!', 
                        ephemeral: true 
                    });
                }
                
                if (interaction.customId === 'entrar_grupo') {
                    // Verificar se já está no grupo
                    let jaNoGrupo = false;
                    for (const [classe, config] of Object.entries(grupoEncontrado.roles)) {
                        if (config.membros.includes(interaction.user.id)) {
                            jaNoGrupo = true;
                            break;
                        }
                    }
                    
                    if (jaNoGrupo || grupoEncontrado.fila.some(item => item.userId === interaction.user.id)) {
                        return await interaction.reply({ 
                            content: '❌ Você já está neste grupo!', 
                            ephemeral: true 
                        });
                    }
                    
                    // Criar seletor de classes disponíveis
                    const classesDisponiveis = Object.keys(grupoEncontrado.roles);
                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId('escolher_classe_entrada')
                        .setPlaceholder('Escolha sua classe')
                        .addOptions(
                            classesDisponiveis.map(classe => ({
                                label: classe,
                                value: classe,
                                description: `${grupoEncontrado.roles[classe].membros.length}/${grupoEncontrado.roles[classe].limite} ocupado`
                            }))
                        );
                    
                    const row = new ActionRowBuilder().addComponents(selectMenu);
                    await interaction.reply({ 
                        content: 'Escolha a classe que deseja jogar:', 
                        components: [row], 
                        ephemeral: true 
                    });
                } else {
                    // Sair do grupo
                    let saiu = false;
                    for (const [classe, config] of Object.entries(grupoEncontrado.roles)) {
                        const index = config.membros.indexOf(interaction.user.id);
                        if (index !== -1) {
                            config.membros.splice(index, 1);
                            saiu = true;
                            break;
                        }
                    }
                    
                    if (!saiu) {
                        const filaIndex = grupoEncontrado.fila.findIndex(item => item.userId === interaction.user.id);
                        if (filaIndex !== -1) {
                            grupoEncontrado.fila.splice(filaIndex, 1);
                            saiu = true;
                        }
                    }
                    
                    if (saiu) {
                        processarFila(grupoEncontrado);
                        await atualizarMensagemGrupo(grupoEncontrado);
                        await interaction.reply({ 
                            content: '✅ Você saiu do grupo!', 
                            ephemeral: true 
                        });
                    } else {
                        await interaction.reply({ 
                            content: '❌ Você não está neste grupo!', 
                            ephemeral: true 
                        });
                    }
                }
            }
        }
        
        if (interaction.isStringSelectMenu() && interaction.customId === 'escolher_classe_entrada') {
            const classeEscolhida = interaction.values[0];
            
            // Encontrar grupo pela thread
            let grupoEncontrado = null;
            for (const grupo of grupos.values()) {
                if (grupo.threadId === interaction.channelId) {
                    grupoEncontrado = grupo;
                    break;
                }
            }
            
            if (!grupoEncontrado) {
                return await interaction.reply({ 
                    content: '❌ Grupo não encontrado!', 
                    ephemeral: true 
                });
            }
            
            const roleConfig = grupoEncontrado.roles[classeEscolhida];
            if (roleConfig.membros.length < roleConfig.limite) {
                roleConfig.membros.push(interaction.user.id);
                await atualizarMensagemGrupo(grupoEncontrado);
                await interaction.reply({ 
                    content: `✅ Você entrou no grupo como ${classeEscolhida}!`, 
                    ephemeral: true 
                });
            } else {
                grupoEncontrado.fila.push({
                    userId: interaction.user.id,
                    classe: classeEscolhida
                });
                await atualizarMensagemGrupo(grupoEncontrado);
                await interaction.reply({ 
                    content: `⏳ Você foi adicionado à fila de espera para ${classeEscolhida}!`, 
                    ephemeral: true 
                });
            }
        }
    } catch (error) {
        console.error('Erro ao processar interação:', error);
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({ 
                    content: '❌ Ocorreu um erro ao processar a interação!', 
                    ephemeral: true 
                });
            } catch (replyError) {
                console.error('Erro ao responder interação:', replyError);
            }
        }
    }
});

// Manipular erros
client.on('error', error => {
    console.error('Erro no cliente Discord:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled promise rejection:', reason);
});

// Carregar variáveis de ambiente
require('dotenv').config();

// Fazer login com o token do bot
client.login(process.env.DISCORD_TOKEN);