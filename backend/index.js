const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3022;

app.use(cors());
app.use(express.json());

require('./database/init');

const booksRouter = require('./routes/books');
const worldsRouter = require('./routes/worlds');
const outlinesRouter = require('./routes/outlines');
const plotsRouter = require('./routes/plots');
const chaptersRouter = require('./routes/chapters');
const charactersRouter = require('./routes/characters');
const assistantsRouter = require('./routes/assistants');
const conversationsRouter = require('./routes/conversations');
const chapterHistoryRouter = require('./routes/chapterHistory');
const chapterOutlinesRouter = require('./routes/chapterOutlines');
const aiRouter = require('./routes/ai');
const novelWorkflowRouter = require('./routes/novelWorkflow');

app.use('/api/books', booksRouter);
app.use('/api/worlds', worldsRouter);
app.use('/api/outlines', outlinesRouter);
app.use('/api/plots', plotsRouter);
app.use('/api/chapters', chaptersRouter);
app.use('/api/characters', charactersRouter);
app.use('/api/assistants', assistantsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/chapter-history', chapterHistoryRouter);
app.use('/api/chapter-outlines', chapterOutlinesRouter);
app.use('/api', aiRouter);
app.use('/api/novel-workflow', novelWorkflowRouter);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
