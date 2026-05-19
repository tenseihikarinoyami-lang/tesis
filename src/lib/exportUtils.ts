import { ThesisProject, THESIS_CHAPTERS, CitationMetadata } from "../types";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, PageBreak, Header, PageNumber, NumberFormat, SectionType } from "docx";

const MARGIN_LEFT = 2268;   // 4cm
const MARGIN_TOP = 1700;    // 3cm
const MARGIN_RIGHT = 1700;  // 3cm
const MARGIN_BOTTOM = 1700; // 3cm

const FONT_BODY = "Times New Roman";
const SIZE_BODY = 24; // 12pt

export async function generateWordDoc(project: ThesisProject): Promise<Blob> {
  const prelims: Paragraph[] = [];
  const bodySections: Paragraph[] = [];

  // Title Page
  prelims.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "REPUBLICA BOLIVARIANA DE VENEZUELA", bold: true, font: FONT_BODY, size: SIZE_BODY }),
        new TextRun({ break: 1, text: project.university === "UPTAEB" ? "UNIVERSIDAD POLITÉCNICA TERRITORIAL \"ANDRÉS ELOY BLANCO\"" : "INSTITUTO UNIVERSITARIO DE TECNOLOGÍA", bold: true, font: FONT_BODY, size: SIZE_BODY - 2 }),
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 1200 },
      children: [new TextRun({ text: project.title.toUpperCase(), bold: true, font: FONT_BODY, size: SIZE_BODY + 4 })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 1200 },
      children: [new TextRun({ text: "Trabajo Especial de Grado para optar al título correspondiente", font: FONT_BODY, size: SIZE_BODY })]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 2400 },
      children: [
        new TextRun({ text: "Autor: [NOMBRE DEL ESTUDIANTE]", font: FONT_BODY, size: SIZE_BODY }),
        new TextRun({ break: 1, text: "Tutor: [NOMBRE DEL TUTOR]", font: FONT_BODY, size: SIZE_BODY }),
      ]
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Chapters
  project.chunks.forEach((chunk, idx) => {
    if (!chunk.content || chunk.content.trim().length === 0) return;
    
    bodySections.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 },
        children: [
          new TextRun({ text: `CAPÍTULO ${idx + 1}`, bold: true, font: FONT_BODY, size: 28 }),
          new TextRun({ break: 1, text: chunk.chapter.toUpperCase(), bold: true, font: FONT_BODY, size: 28 })
        ]
      })
    );

    chunk.content.split(/\n\s*\n/).forEach(p => {
      if (p.trim()) {
        bodySections.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 360, before: 120, after: 120 }, // 1.5 line height
            indent: { firstLine: 567 }, // 1cm indent
            children: [new TextRun({ text: p.replace(/\n/g, " ").trim(), font: FONT_BODY, size: SIZE_BODY })]
          })
        );
      }
    });
    bodySections.push(new Paragraph({ children: [new PageBreak()] }));
  });

  // Bibliography
  if (project.validatedCitations.length > 0) {
    bodySections.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 },
        children: [new TextRun({ text: "REFERENCIAS BIBLIOGRÁFICAS", bold: true, font: FONT_BODY, size: 28 })]
      })
    );

    project.validatedCitations.forEach(c => {
      bodySections.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { line: 240, before: 120 },
          indent: { hanging: 567 },
          children: [
            new TextRun({ text: `${c.authors.join(", ")} (${c.year}). `, font: FONT_BODY, size: SIZE_BODY }),
            new TextRun({ text: c.title, font: FONT_BODY, size: SIZE_BODY, italics: true }),
            new TextRun({ text: `. ${c.journal || ""}${c.doi ? `. DOI: ${c.doi}` : ""}`, font: FONT_BODY, size: SIZE_BODY })
          ]
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
            pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN }
          },
        }, 
        children: prelims 
      },
      { 
        properties: { 
          page: { 
            margin: { top: MARGIN_TOP, right: MARGIN_RIGHT, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT },
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL }
          }, 
          type: SectionType.NEXT_PAGE,
        }, 
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT_BODY, size: 20 })]
              })
            ]
          })
        },
        children: bodySections 
      }
    ]
  });

  return Packer.toBlob(doc);
}

export function exportToMarkdown(project: ThesisProject): string {
  let md = `# ${project.title.toUpperCase()}\n\n`;
  md += `**Trabajo de Grado presentado como requisito para optar al título correspondiente**\n\n`;
  md += `---\n\n`;
  md += `## HIPÓTESIS: ${project.hypothesis}\n\n`;
  
  project.chunks.forEach(chunk => {
    if (chunk.content && chunk.content.trim().length > 0) {
      md += `\n# ${chunk.chapter.toUpperCase()}\n\n${chunk.content}\n\n`;
      md += `\n---\n`;
    }
  });

  md += `\n# REFERENCIAS BIBLIOGRÁFICAS\n\n`;
  project.validatedCitations.forEach(c => {
    md += `- ${c.authors.join(", ")} (${c.year}). *${c.title}*. ${c.journal || ""}\n`;
  });

  return md;
}

export function exportToBibTeX(citations: CitationMetadata[]): string {
  return citations.map(c => {
    const id = (c.authors[0]?.split(" ").pop() || "source") + c.year;
    return `@article{${id.toLowerCase()},
  author = {${c.authors.join(" and ")}},
  title = {${c.title}},
  journal = {${c.journal || ""}},
  year = {${c.year}},
  doi = {${c.doi || ""}}
}`;
  }).join("\n\n");
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
