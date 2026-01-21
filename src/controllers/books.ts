import type { Request, Response } from "express";
import { readdir } from "node:fs/promises";
import { exiftool } from "exiftool-vendored";
import type { Book } from "../models/Book";
import AdmZip from "adm-zip";
import path from "node:path";
import fs from "node:fs";
import { XMLParser } from "fast-xml-parser";
import { encodeBookPath } from "../utils/parseBookTitle";


//read all books
export async function findAllBooks(req: Request, res: Response) {
  try {
    const files = await readdir(process.env.BOOKS_DIR ? process.env.BOOKS_DIR : '');
    return files;
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error reading books' });
  }
};

export async function getBook(filePath: string): Promise<{ data: Buffer; mimeType: string } | undefined> {
  //Download the book
  const book = await fs.promises.readFile(filePath);
  const mimeType = "application/epub+zip";
  return { data: book, mimeType };
}

export async function getEpubCover(filePath: string): Promise<{ data: Buffer; mimeType: string }> {
  const zip = new AdmZip(encodeBookPath(filePath), { fs });
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

  const containerEntry = zip.getEntry("META-INF/container.xml");
  if (!containerEntry) throw new Error("EPUB format no valid (missing container.xml)");

  const containerData = parser.parse(containerEntry.getData().toString());
  const opfPath = containerData.container?.rootfiles?.rootfile?.["full-path"];

  if (!opfPath) throw new Error("Could not find rootfile on container.xml");

  const opfEntry = zip.getEntry(opfPath);
  if (!opfEntry) throw new Error(`Could not find OPF file on ${opfPath}`);

  const opfContent = opfEntry.getData().toString();
  const opfData = parser.parse(opfContent);

  const manifest = opfData.package?.manifest?.item;
  const metadata = opfData.package?.metadata?.meta;

  if (!manifest) throw new Error("Could not find manifest");

  let coverHref = "";
  let coverMediaType = "";

  const items = Array.isArray(manifest) ? manifest : [manifest];
  const metas = Array.isArray(metadata) ? metadata : [metadata];

  const coverMeta = metas.find(m => m?.name === "cover");
  if (coverMeta) {
    const coverID = coverMeta.content;
    const item = items.find(i => i.id === coverID);
    if (item) {
      coverHref = item.href;
      coverMediaType = item["media-type"];
    }
  }

  if (!coverHref) {
    const item = items.find(i => i.properties === "cover-image");
    if (item) {
      coverHref = item.href;
      coverMediaType = item["media-type"];
    }
  }

  if (!coverHref) {
    const item = items.find(i => i.id?.toLowerCase().includes("cover"));
    if (item) {
      coverHref = item.href;
      coverMediaType = item["media-type"];
    }
  }

  if (!coverHref) throw new Error("Could not find cover");

  const opfDir = path.dirname(opfPath);
  const fullImagePath = path.join(opfDir, coverHref).replace(/\\/g, "/");

  const imageEntry = zip.getEntry(fullImagePath);
  if (!imageEntry) throw new Error(`Could not find image: ${fullImagePath}`);

  return {
    data: imageEntry.getData(),
    mimeType: coverMediaType || "image/jpeg"
  };
}

export async function getCover(path: string): Promise<{ data: Buffer; mimeType: string } | undefined> {
  if (path.endsWith(".epub")) {
    return getEpubCover(path);
  }
}


