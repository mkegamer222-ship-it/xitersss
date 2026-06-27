const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Garantir que a pasta data existe
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const linksFile = path.join(dataDir, 'links.json');
if (!fs.existsSync(linksFile)) {
    fs.writeFileSync(linksFile, JSON.stringify([], null, 2));
}

// Credenciais do admin
const ADMIN_USER = 'kdss';
const ADMIN_PASS = 'lindão';

// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'xiters-secret-key-2024-ultra-secure',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 // 24 horas
    }
}));

// Funções auxiliares
function getLinks() {
    try {
        const data = fs.readFileSync(linksFile, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

function saveLinks(links) {
    fs.writeFileSync(linksFile, JSON.stringify(links, null, 2));
}

// Middleware de autenticação
function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    return res.status(401).json({ success: false, message: 'Não autorizado' });
}

// ============ ROTAS DA API ============

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isAdmin = true;
        req.session.username = username;
        return res.json({ success: true, message: 'Login realizado com sucesso!' });
    }

    return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logout realizado' });
});

// Verificar sessão
app.get('/api/check-auth', (req, res) => {
    if (req.session && req.session.isAdmin) {
        return res.json({ authenticated: true, username: req.session.username });
    }
    return res.json({ authenticated: false });
});

// Obter todos os links (público)
app.get('/api/links', (req, res) => {
    const links = getLinks();
    // Ordenar por data mais recente
    links.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, links });
});

// Postar novo link (apenas admin)
app.post('/api/links', requireAuth, (req, res) => {
    const { title, url, description, category } = req.body;

    if (!title || !url) {
        return res.status(400).json({ success: false, message: 'Título e URL são obrigatórios' });
    }

    // Validar URL
    try {
        new URL(url);
    } catch (e) {
        return res.status(400).json({ success: false, message: 'URL inválida' });
    }

    const links = getLinks();
    const newLink = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        title: title.trim(),
        url: url.trim(),
        description: description ? description.trim() : '',
        category: category ? category.trim() : 'Geral',
        createdAt: new Date().toISOString(),
        postedBy: req.session.username
    };

    links.push(newLink);
    saveLinks(links);

    res.json({ success: true, message: 'Link postado com sucesso!', link: newLink });
});

// Deletar link (apenas admin)
app.delete('/api/links/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    let links = getLinks();
    const index = links.findIndex(l => l.id === id);

    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Link não encontrado' });
    }

    links.splice(index, 1);
    saveLinks(links);

    res.json({ success: true, message: 'Link removido com sucesso!' });
});

// Editar link (apenas admin)
app.put('/api/links/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { title, url, description, category } = req.body;
    let links = getLinks();
    const index = links.findIndex(l => l.id === id);

    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Link não encontrado' });
    }

    if (title) links[index].title = title.trim();
    if (url) {
        try {
            new URL(url);
            links[index].url = url.trim();
        } catch (e) {
            return res.status(400).json({ success: false, message: 'URL inválida' });
        }
    }
    if (description !== undefined) links[index].description = description.trim();
    if (category) links[index].category = category.trim();
    links[index].updatedAt = new Date().toISOString();

    saveLinks(links);
    res.json({ success: true, message: 'Link atualizado!', link: links[index] });
});

// Servir index para qualquer rota não-API
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(
        `╔══════════════════════════════════════╗\n` +
        `║         🔗 XITERS Server 🔗          ║\n` +
        `║                                      ║\n` +
        `║   Rodando em: http://localhost:${PORT}   ║\n` +
        `║                                      ║\n` +
        `╚══════════════════════════════════════╝`
    );
});
