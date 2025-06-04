# 🎮 Bot de Grupos - Ragnarok Online

Um bot do Discord desenvolvido para auxiliar na criação e gerenciamento de grupos/parties para Ragnarok Online.

![Discord](https://img.shields.io/badge/Discord-Bot-5865F2)
![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)
![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)

## 📋 Funcionalidades

- **Criação de grupos** com controle de permissões por roles
- **Sistema de classes** para organização da party
- **Gerenciamento completo** de membros
- **Auto-remoção** de grupos após 1 semana
- **Interface intuitiva** com comandos slash, janelas de input e botões

## 🚀 Comandos Disponíveis

### Para Membros Autorizados
- `/criargrupo` - Criar um novo grupo (requer permissão configurada pelo admin)
- `/entrargrupo <id> <classe>` - Entrar em um grupo na classe especificada
- `/sairgrupo <id>` - Sair de um grupo
- `/ajuda` - Para a lista dos comandos do bot

### Para Organizadores de Grupo
- `/editargrupo <id>` - Editar um grupo existente (apenas o criador do grupo)
- `/removermembro <id> <@membro>` - Remover membro do grupo (apenas o criador)

### Para Administradores
- `/configbot` - Configurar quais roles podem criar grupos

## ⚙️ Configuração

### Pré-requisitos
- Node.js 16.9.0 ou superior
- Uma aplicação Discord criada no [Discord Developer Portal](https://discord.com/developers/applications)
- Token do bot Discord

### Instalação
1. Clone o repositório:
```bash
git clone https://github.com/gabriel-lima-b/vem-na-mel.git
cd vem-na-mel
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
# Crie um arquivo .env na raiz do projeto
DISCORD_TOKEN=seu_token_aqui
CLIENT_ID=id_da_aplicacao
```

4. Execute o bot:
```bash
npm start
```

### Configuração no Servidor Discord

1. **Convide o bot** para seu servidor com as permissões necessárias:
   - Usar comandos de aplicação
   - Enviar mensagens
   - Incorporar links
   - Usar emojis externos

2. **Configure as permissões** usando `/configbot`:
   - Selecione quais roles podem criar grupos
   - Apenas administradores podem usar este comando

## 🎯 Como Usar

### Primeira Configuração
1. Um administrador usa `/configbot` para definir quais roles podem criar grupos
2. Membros com essas roles podem começar a criar grupos

### Criando um Grupo
1. Use `/criargrupo` e siga as instruções
2. Defina nome, descrição, classes necessárias
3. O bot criará automaticamente o grupo em um novo tópico do canal

### Participando de Grupos
1. Use `/entrargrupo <id> <classe>` para se juntar (ou use o botão de entrar no grupo abaixo da descrição do grupo)
2. Especifique sua classe (Knight, Wizard, Priest, etc.)
3. Use `/sairgrupo <id>` quando não precisar mais (ou o botão de sair do grupo abaixo da descrição do grupo)

## 🔧 Recursos Técnicos

- **Auto-limpeza**: Grupos são removidos automaticamente após 1 semana
- **Controle de permissões**: Sistema baseado em roles do Discord
- **Comandos slash**: Interface moderna e intuitiva
- **Persistência**: Dados salvos em banco de dados

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está licenciado sob a Licença GNU General Public License v3.0 - veja o arquivo [LICENSE](LICENSE) para detalhes.

A GPL v3 garante que este software permaneça livre e open source. Qualquer trabalho derivado deve também ser distribuído sob a mesma licença.

## 🐛 Reportar Bugs

Encontrou um bug? Abra uma [issue](https://github.com/seu-usuario/ragnarok-groups-bot/issues) com:
- Descrição detalhada do problema
- Passos para reproduzir
- Screenshots (se aplicável)

## 📞 Suporte

Para dúvidas sobre uso ou configuração:
- Abra uma [issue](https://github.com/seu-usuario/ragnarok-groups-bot/issues)
- Entre em contato via Discord: `limacaco`

---

⭐ Se este projeto te ajudou, considere dar uma estrela no repositório!