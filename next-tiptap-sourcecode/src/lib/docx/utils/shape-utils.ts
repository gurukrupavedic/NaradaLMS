import { BuilderElement, UniversalMeasure } from "docx";

export type StrokeOptions = {
  dashstyle?: "dash" | "dot" | "dashdot" | "longdash" | "solid";
  color?: string;
  weight?: string;
};

export type FillOptions = {
  color?: string;
  opacity?: string;
};

export type ShapeOptions = {
  width: number | string | UniversalMeasure;
  height: number | string | UniversalMeasure;
  fill?: FillOptions;
  stroke?: StrokeOptions;
  children: BuilderElement[];
};

function createStroke(options: StrokeOptions): BuilderElement {
  const { dashstyle = "dash", color = "#0066CC", weight = "1pt" } = options;

  return new BuilderElement({
    name: "v:stroke",
    attributes: {
      dashstyle: { key: "dashstyle", value: dashstyle },
      color: { key: "color", value: color },
      weight: { key: "weight", value: weight },
    },
  });
}

function createFill(options: FillOptions): BuilderElement {
  const { color = "#FFFFFF", opacity = "100%" } = options;

  return new BuilderElement({
    name: "v:fill",
    attributes: {
      color: { key: "color", value: color },
      opacity: { key: "opacity", value: opacity },
    },
  });
}

export function createShapeElement(options: ShapeOptions): BuilderElement {
  const { width, height, fill, stroke, children } = options;

  const shapeChildren: BuilderElement[] = [];

  if (stroke) {
    shapeChildren.push(createStroke(stroke));
  }

  if (fill) {
    shapeChildren.push(createFill(fill));
  }

  shapeChildren.push(...children);

  return new BuilderElement({
    name: "v:shape",
    attributes: {
      type: { key: "type", value: "#_x0000_t202" },
      style: { key: "style", value: `width:${width};height:${height}` },
      filled: { key: "filled", value: fill ? "t" : "f" },
      stroked: { key: "stroked", value: stroke ? "t" : "f" },
    },
    children: shapeChildren,
  });
}

export function createPictureElement(shape: BuilderElement): BuilderElement {
  return new BuilderElement({
    name: "w:pict",
    children: [shape],
  });
}
