"use client";

import type { ReactNode } from "react";

interface NextActionPanelProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  titleTag?: "h1" | "h2" | "h3";
  eyebrowClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  actionsClassName?: string;
}

export function NextActionPanel({
  eyebrow,
  title,
  description,
  actions,
  titleTag = "h2",
  eyebrowClassName,
  titleClassName,
  descriptionClassName,
  actionsClassName,
}: NextActionPanelProps) {
  const TitleTag = titleTag;

  return (
    <>
      {eyebrow && <p className={eyebrowClassName}>{eyebrow}</p>}
      {title && <TitleTag className={titleClassName}>{title}</TitleTag>}
      {description && <p className={descriptionClassName}>{description}</p>}
      {actions && <div className={actionsClassName}>{actions}</div>}
    </>
  );
}
