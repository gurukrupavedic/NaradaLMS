import {
  Document,
  Packer,
  Paragraph,
  Table,
  TextRun,
  ExternalHyperlink,
  IRunOptions,
} from "docx";

import { PAGE_MARGIN, PAGE_SIZE } from "./constants";
import { processNumbering } from "./numbering";
import { processStyles } from "./styles";
import { unitToTwip } from "./utils";

import type {
  ExportConfig,
  ExporterOptions,
  ExportFormat,
  MarkMapping,
  NodeMapping,
  TiptapNode,
} from "./types";


const PACKER_MAP = {
  string: Packer.toString,
  buffer: Packer.toBuffer,
  base64: Packer.toBase64String,
  blob: Packer.toBlob,
  stream: Packer.toStream,
} as const;

export class DocxExporter {
  private pageSize: ExportConfig["pageSize"];
  private pageMargin: ExportConfig["pageMargin"];

  constructor(
    protected readonly nodeMapping: NodeMapping,
    protected readonly markMapping: MarkMapping,
    protected readonly options: ExporterOptions = {}
  ) {}

  public get availableWidth() {
    const pageWidth = unitToTwip(this.pageSize!.width);
    const pageMargin =
      unitToTwip(this.pageMargin!.left!) + unitToTwip(this.pageMargin!.right!);
    return pageWidth - pageMargin;
  }

  public transformInline(
    nodes: TiptapNode[] = [],
    runOptions?: IRunOptions
  ): Array<TextRun | ExternalHyperlink> {
    const process = (child: TiptapNode) => {
      const properties = {};
      let link: string | null = null;

      for (const mark of child.marks || []) {
        if (mark.type === "link") {
          link = mark.attrs?.href;
        }
        const markProps = this.markMapping[mark.type]?.(mark, this);
        if (markProps) Object.assign(properties, markProps);
      }

      const textRun = new TextRun({
        ...properties,
        ...runOptions,
        text: child.text || "",
      });

      return link
        ? new ExternalHyperlink({ link, children: [textRun] })
        : textRun;
    };

    return nodes.map(process);
  }

  public async transformBlock(
    node: TiptapNode
  ): Promise<Paragraph | Table | Paragraph[]> {
    const mapper = this.nodeMapping[node.type!];
    return mapper?.(node, this);
  }

  protected async transformContent(
    parent: TiptapNode
  ): Promise<Array<Paragraph | Table>> {
    const transformPromises = (parent.content || []).map((child) =>
      this.transformBlock(child)
    );

    const results = await Promise.all(transformPromises);

    return results.flatMap((item) =>
      item ? (Array.isArray(item) ? item : [item]) : []
    );
  }

  protected async createDocument(
    content: TiptapNode,
    config: ExportConfig = {}
  ): Promise<Document> {
    const {
      styles = {},
      useDefaultStyles = true,
      numbering = [],
      useDefaultNumbering = true,
      pageSize = PAGE_SIZE,
      pageMargin = PAGE_MARGIN,
      headers,
      footers,
    } = config;

    this.pageSize = pageSize;
    this.pageMargin = pageMargin;

    return new Document({
      styles: processStyles(styles, useDefaultStyles),
      numbering: processNumbering(numbering, useDefaultNumbering),
      evenAndOddHeaderAndFooters: !!headers?.even || !!footers?.even,
      sections: [
        {
          children: await this.transformContent(content),
          headers,
          footers,
          properties: {
            page: {
              size: pageSize,
              margin: pageMargin,
            },
          },
        },
      ],
    });
  }

  async export(
    doc: TiptapNode,
    format: ExportFormat = "blob",
    config: ExportConfig = {}
  ) {
    const document = await this.createDocument(doc, config);
    const packer = PACKER_MAP[format];
    return await packer(document);
  }
}
