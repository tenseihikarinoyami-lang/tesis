import { ThesisProject, THESIS_CHAPTERS, CitationMetadata } from "../types";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, PageBreak, Header, PageNumber, NumberFormat, SectionType } from "docx";

// Standard values for many Venezuelan technical institutes (IUTA, IUTAR, UPTAEB)
const MARGIN_LEFT = 2268;   // 4cm
const MARGIN_TOP = 1700;    // 3cm
const MARGIN_RIGHT = 1700;  // 3cm
const MARGIN_BOTTOM = 1700; // 3cm

const FONT_BODY = "Times New Roman";
const SIZE_BODY = 24; // 12pt

export async function generateWordDoc(project: ThesisProject): Promise<Blob> {
  const sortedChapters = [...THESIS_CHAPTERS];
  const sortedChunks = [...project.chunks].sort((a, b) => {
    const indexA = sortedChapters.indexOf(a.chapter);
    const indexB = sortedChapters.indexOf(b.chapter);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  const prelims: Paragraph[] = [];
  const bodySections: Paragraph[] = [];

  // 1. CARATULA / PORTADA
  prelims.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "REPUBLICA BOLIVARIANA DE VENEZUELA", bold: true, font: FONT_BODY, size: SIZE_BODY }),
        new TextRun({ break: 1, text: "MINISTERIO DEL PODER POPULAR PARA LA EDUCACIÓN UNIVERSITARIA", bold: true, font: FONT_BODY, size: SIZE_BODY - 4 }),
        new TextRun({ break: 1, text: "INSTITUTO UNIVERSITARIO DE TECNOLOGÍA", bold: true, font: FONT_BODY, size: SIZE_BODY - 2 }),
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2000, after: 1000 },
      children: [
        new TextRun({ 
          text: project.title.toUpperCase(), 
          bold: true, 
          font: FONT_BODY, 
          size: SIZE_BODY + 2
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 2000 },
      children: [
        new TextRun({ 
          text: "Trabajo Especial de Grado presentado como requisito para optar al título correspondiente", 
          font: FONT_BODY, 
          size: SIZE_BODY - 2 
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: "Autor: [NOMBRE DEL ESTUDIANTE]", font: FONT_BODY, size: SIZE_BODY }),
        new TextRun({ break: 1, text: "Tutor: [NOMBRE DEL TUTOR]", font: FONT_BODY, size: SIZE_BODY }),
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2000 },
      children: [
        new TextRun({ text: `Maracay, ${new Date().toLocaleDateString("es-VE", { month: 'long', year: 'numeric' })}`, font: FONT_BODY, size: SIZE_BODY })
      ]
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // 2. RESUMEN
  const summaryChunk = project.chunks.find(c => c.chapter === "Resumen");
  if (summaryChunk) {
    prelims.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 },
        children: [new TextRun({ text: "RESUMEN", bold: true, font: FONT_BODY, size: SIZE_BODY })]
      }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: 240 }, // Simple space for summary
        children: [
          new TextRun({ 
            text: summaryChunk.content.replace(/\n/g, " "), // Continuous text
            font: FONT_BODY, 
            size: SIZE_BODY 
          })
        ]
      }),
      new Paragraph({
        spacing: { before: 400 },
        children: [
          new TextRun({ text: "Descriptores: ", bold: true, font: FONT_BODY, size: SIZE_BODY }),
          new TextRun({ text: project.title.split(" ").slice(0, 5).join(", "), font: FONT_BODY, size: SIZE_BODY })
        ]
      }),
      new Paragraph({ children: [new PageBreak()] })
    );
  }

  // 3. CAPITULOS
  sortedChunks.forEach((chunk) => {
    if (chunk.chapter === "Resumen") return;
    if (!chunk.content || chunk.content.trim().length < 10) return;

    // Chapter Header
    bodySections.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 },
        children: [
          new TextRun({ text: `CAPÍTULO ${toRoman(getChapterNumber(chunk.chapter))}`, bold: true, font: FONT_BODY, size: SIZE_BODY }),
          new TextRun({ break: 1, text: chunk.chapter.toUpperCase(), bold: true, font: FONT_BODY, size: SIZE_BODY }),
        ]
      })
    );

    // Chapter Content
    const paragraphs = chunk.content.split(/\n\s*\n/);
    paragraphs.forEach(pText => {
      if (pText.trim()) {
        bodySections.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 360, before: 120, after: 120 }, // 1.5 space
            indent: { firstLine: 567 }, // 1cm indent
            children: [
              new TextRun({ 
                text: pText.trim().replace(/\n/g, " "), 
                font: FONT_BODY, 
                size: SIZE_BODY 
              })
            ]
          })
        );
      }
    });

    bodySections.push(new Paragraph({ children: [new PageBreak()] }));
  });

  // 4. BIBLIOGRAFIA
  bodySections.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 400 },
      children: [new TextRun({ text: "REFERENCIAS BIBLIOGRÁFICAS", bold: true, font: FONT_BODY, size: SIZE_BODY })]
    })
  );

  if (project.validatedCitations.length > 0) {
    project.validatedCitations.forEach(c => {
      bodySections.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { line: 240, before: 60, after: 60 },
          indent: { hanging: 567 }, // Hanging indent for references
          children: [
            new TextRun({
              text: `${c.authors.join(", ")} (${c.year}). `,
              font: FONT_BODY,
              size: SIZE_BODY,
            }),
            new TextRun({
              text: c.title,
              font: FONT_BODY,
              size: SIZE_BODY,
              italics: true
            }),
            new TextRun({
              text: `. ${c.journal || ""}${c.doi ? `. DOI: ${c.doi}` : ""}`,
              font: FONT_BODY,
              size: SIZE_BODY,
            })
          ],
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: MARGIN_TOP, right: MARGIN_RIGHT, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT },
            pageNumbers: {
              start: 1,
              format: NumberFormat.LOWER_ROMAN
            }
          },
        },
        children: prelims,
      },
      {
        properties: {
          page: {
            margin: { top: MARGIN_TOP, right: MARGIN_RIGHT, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT },
            pageNumbers: {
              start: 1,
              format: NumberFormat.DECIMAL
            }
          },
          type: SectionType.NEXT_PAGE,
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT_BODY,
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
        },
        children: bodySections,
      }
    ],
  });

  return Packer.toBlob(doc);
}

function toRoman(num: number): string {
  if (num <= 0) return "";
  const lookup: { [key: string]: number } = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
  let roman = "";
  for (let i in lookup) {
    while (num >= lookup[i]) {
      roman += i;
      num -= lookup[i];
    }
  }
  return roman;
}

function getChapterNumber(chapter: string): number {
  if (chapter.includes("Introducción")) return 0;
  if (chapter.includes("Problema")) return 1;
  if (chapter.includes("Teórico")) return 2;
  if (chapter.includes("Metodol")) return 3;
  if (chapter.includes("Resultados")) return 4;
  if (chapter.includes("Discusión")) return 5;
  if (chapter.includes("Conclusiones")) return 6;
  return 99;
}

export function exportToMarkdown(project: ThesisProject): string {
  let md = `# ${project.title.toUpperCase()}\n\n`;
  md += `**Trabajo de Grado presentado como requisito para optar al título correspondiente**\n\n`;
  md += `---\n\n`;
  md += `## RESUMEN E HIPÓTESIS\n\n**Hipótesis:** ${project.hypothesis}\n\n`;
  
  const sortedChapters = [...THESIS_CHAPTERS];
  const sortedChunks = [...project.chunks].sort((a, b) => {
    const indexA = sortedChapters.indexOf(a.chapter);
    const indexB = sortedChapters.indexOf(b.chapter);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  sortedChunks.forEach(chunk => {
    if (chunk.content && chunk.content.trim().length > 0) {
      md += `\n# ${chunk.chapter.toUpperCase()}\n\n${chunk.content}\n\n`;
      md += `\n---\n`;
    }
  });

  md += `\n# REFERENCIAS BIBLIOGRÁFICAS\n\n`;
  if (project.validatedCitations.length > 0) {
    project.validatedCitations.forEach(c => {
      md += `- ${c.authors.join(", ")} (${c.year}). *${c.title}*. ${c.journal || ""}${c.doi ? `. DOI: ${c.doi}` : ""}\n`;
    });
  } else {
    md += `(Pendiente de validación de fuentes)\n`;
  }
  return md;
}

export function exportToBibTeX(project: ThesisProject): string {
  return project.validatedCitations.map((c, i) => {
    const id = c.authors[0]?.split(" ")[0]?.toLowerCase() + (c.year || i);
    return `@article{${id},
  author = {${c.authors.join(" and ")}},
  title = {${c.title}},
  year = {${c.year}},
  journal = {${c.journal || "Unknown"}},
  doi = {${c.doi || ""}},
  url = {${c.url || ""}}
}`;
  }).join("\n\n");
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
