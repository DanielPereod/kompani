import express from 'express';

import { engine } from 'express-handlebars';
import { findAllBooks, getBook, getCover } from './controllers/books';
import fs from "fs";
import fileUpload from "express-fileupload";
import { parseBookTitle } from './utils/parseBookTitle';

const app = express();

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './src/views');

app.use(express.static('public'));
app.use(fileUpload());

app.get('/', async (req, res) => {
  const books = await findAllBooks(req, res);
  const epubBooks = books?.map(book => {
    if (book.includes(".epub")) {
      return parseBookTitle(book);
    } else {
      return null;
    }
  }).filter(book => book !== null);
  res.render('books', { books: epubBooks });
});

app.get('/opds', async (req, res) => {
  const books = await findAllBooks(req, res);
  const baseURL = `${req.protocol}://${req.get('host')}`;
  const currentTime = new Date().toISOString();

  const epubBooksPromise = books?.map(async (book) => {
    if (book.includes(".epub")) {
      const filePath = `${process.env.BOOKS_DIR}/${book}`;
      try {
        const stats = await fs.promises.stat(filePath);
        return {
          Filename: book,
          Title: parseBookTitle(book),
          LastUpdated: stats.mtime.toISOString(),
          Size: stats.size,
          MimeType: "application/epub+zip"
        };
      } catch (e) {
        console.error(`Error with file ${book}:`, e);
        return null;
      }
    } else {
      return null;
    }
  });

  const results = await Promise.all(epubBooksPromise || []);
  const epubBooks = results.filter(book => book !== null);

  res.set('Content-Type', 'application/xml');
  res.render('opds', { books: epubBooks, layout: false, BaseURL: baseURL, CurrentTime: currentTime });
});

app.get('/cover/:path', async (req, res) => {
  const cover = await getCover(`${process.env.BOOKS_DIR}/${req.params.path}`);
  const imgSrc = `data:${cover?.mimeType};base64,${cover?.data.toString("base64")}`;
  return res.render("cover", { image: imgSrc })
});

app.get('/img/:path', async (req, res) => {
  try {
    const cover = await getCover(`${process.env.BOOKS_DIR}/${req.params.path}`);
    if (cover) {
      res.contentType(cover.mimeType);
      res.send(cover.data);
    } else {
      res.status(404).send();
    }
  } catch (err) {
    res.status(500).send();
  }

});

app.get('/books/:path', async (req, res) => {
  const book = await getBook(`${process.env.BOOKS_DIR}/${req.params.path}`);
  return res.send(book?.data)
});

app.post('/books/upload', async (req, res) => {
  try {
    const file = req.files?.file;
    console.log(file)
    if (file) {
      const files = Array.isArray(file) ? file : [file];
      console.log(files);
      for (const f of files) {
        await f.mv(`${process.env.BOOKS_DIR}/${f.name}`);
      }
      res.status(200).send();
    } else {
      res.status(400).send();
    }
  } catch (err) {
    res.status(500).send();
  }
});


app.delete('/book/:path', async (req, res) => {
  try {
    await fs.promises.unlink(`${process.env.BOOKS_DIR}/${req.params.path}`);
    res.status(200).send();
  } catch (err) {
    res.status(500).send();
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
