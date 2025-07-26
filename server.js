const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

// --- MIDDLEWARE ---
// Habilita o CORS para permitir que seu frontend (em outra origem) se comunique com este servidor.
app.use(cors());
// Habilita o parsing de JSON no corpo das requisições.
app.use(express.json({ limit: '50mb' })); // Aumenta o limite para suportar imagens em base64

// --- ROTAS DA API ---

// -- PERSONAGENS --

// GET /api/characters - Lista todos os personagens
app.get('/api/characters', async (req, res) => {
  try {
    const characters = await prisma.character.findMany();
    res.json(characters);
  } catch (error) {
    console.error('Falha ao buscar personagens:', error);
    res.status(500).json({ error: 'Falha ao buscar personagens.' });
  }
});

// GET /api/characters/:id - Busca um personagem específico
app.get('/api/characters/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const character = await prisma.character.findUnique({
      where: { id },
    });
    if (character) {
      res.json(character);
    } else {
      res.status(404).json({ error: 'Personagem não encontrado.' });
    }
  } catch (error) {
    console.error(`Falha ao buscar personagem ${id}:`, error);
    res.status(500).json({ error: 'Falha ao buscar personagem.' });
  }
});

// POST /api/characters - Cria um novo personagem
app.post('/api/characters', async (req, res) => {
  try {
    const newCharacterData = req.body;
    // O Prisma espera que dados JSON sejam objetos, não strings. Vamos garantir isso.
    Object.keys(newCharacterData).forEach(key => {
        if (typeof newCharacterData[key] === 'string') {
            try {
                const parsed = JSON.parse(newCharacterData[key]);
                newCharacterData[key] = parsed;
            } catch (e) {
                // Não é um JSON, ignora
            }
        }
    });

    // Se o personagem já tem um ID (caso de importação), o Prisma não vai gerar um novo.
    const newCharacter = await prisma.character.create({
      data: newCharacterData,
    });
    res.status(201).json(newCharacter);
  } catch (error) {
    console.error('Falha ao criar personagem:', error);
    res.status(500).json({ error: 'Falha ao criar personagem.' });
  }
});

// PUT /api/characters/:id - Atualiza um personagem existente
app.put('/api/characters/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const updatedCharacter = await prisma.character.update({
      where: { id },
      data: req.body,
    });
    res.json(updatedCharacter);
  } catch (error) {
    console.error(`Falha ao atualizar personagem ${id}:`, error);
    res.status(500).json({ error: 'Falha ao atualizar personagem.' });
  }
});

// DELETE /api/characters/:id - Deleta um personagem
app.delete('/api/characters/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.character.delete({
      where: { id },
    });
    res.status(204).send(); // 204 No Content - sucesso, sem corpo de resposta
  } catch (error) {
    console.error(`Falha ao deletar personagem ${id}:`, error);
    res.status(500).json({ error: 'Falha ao deletar personagem.' });
  }
});


// -- DADOS MESTRE --

// Função genérica para buscar dados mestre
const getMasterData = async (model, res) => {
    try {
        const data = await model.findFirst();
        res.json(data ? data.content : []);
    } catch (error) {
        console.error(`Falha ao buscar dados mestre:`, error);
        res.status(500).json({ error: 'Falha ao buscar dados mestre.' });
    }
}

// Função genérica para salvar dados mestre
const saveMasterData = async (model, data, res) => {
    try {
        // Usa `upsert` para criar o registro se ele não existir, ou atualizá-lo se existir.
        // Usamos um ID fixo para garantir que sempre estamos atualizando o mesmo documento.
        await model.upsert({
            where: { id: 'singleton' },
            update: { content: data },
            create: { id: 'singleton', content: data },
        });
        res.status(200).json(data);
    } catch (error) {
        console.error(`Falha ao salvar dados mestre:`, error);
        res.status(500).json({ error: 'Falha ao salvar dados mestre.' });
    }
}

// Para usar as funções acima, você precisará de modelos no seu `schema.prisma` para cada tipo de dado mestre.
// Exemplo de schema.prisma:
/*
  model MasterItems {
    id      String @id @default("singleton")
    content Json
  }
  model MasterRituals {
    id      String @id @default("singleton")
    content Json
  }
  // etc. para Attributes e Skills
*/

// GET e PUT para Atributos Mestre
app.get('/api/master-data/attributes', (req, res) => getMasterData(prisma.masterAttributes, res));
app.put('/api/master-data/attributes', (req, res) => saveMasterData(prisma.masterAttributes, req.body, res));

// GET e PUT para Perícias Mestre
app.get('/api/master-data/skills', (req, res) => getMasterData(prisma.masterSkills, res));
app.put('/api/master-data/skills', (req, res) => saveMasterData(prisma.masterSkills, req.body, res));

// GET e PUT para Itens Mestre
app.get('/api/master-data/items', (req, res) => getMasterData(prisma.masterItems, res));
app.put('/api/master-data/items', (req, res) => saveMasterData(prisma.masterItems, req.body, res));

// GET e PUT para Rituais Mestre
app.get('/api/master-data/rituals', (req, res) => getMasterData(prisma.masterRituals, res));
app.put('/api/master-data/rituals', (req, res) => saveMasterData(prisma.masterRituals, req.body, res));


// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor CyberGhost rodando na porta ${PORT}`);
});

// Lembre-se de adicionar os modelos para dados mestre no seu prisma.schema
// Ex:
// model MasterAttributes {
//   id      String @id @default("singleton")
//   content Json
// }
// E assim por diante para Skills, Items, e Rituals.
// Depois rode `npx prisma migrate dev` para aplicar as mudanças.