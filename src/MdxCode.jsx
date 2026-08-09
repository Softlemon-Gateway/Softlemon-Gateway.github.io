// Wraps Zudoku's default MDX `code` handler so standalone fenced blocks
// without an explicit title get a language label ("JSON") in the header
// instead of the built-in "Code" fallback. Fences with title="..." and inline
// code are passed through untouched. Registered via mdx.components in
// zudoku.config.jsx.
//
// MdxComponents is not part of Zudoku's public export map, imported from the
// shipped source. Revisit if a Zudoku upgrade moves the file.
import { MdxComponents } from "../node_modules/zudoku/src/lib/util/MdxComponents.tsx";

const OriginalCode = MdxComponents.code;

const LANGUAGE_LABELS = {
  json: "JSON",
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  shell: "Shell",
  bash: "Shell",
  sh: "Shell",
  sql: "SQL",
  http: "HTTP",
  yaml: "YAML",
  xml: "XML",
  html: "HTML",
  css: "CSS",
  php: "PHP",
  py: "Python",
  python: "Python",
  ruby: "Ruby",
  go: "Go",
  java: "Java",
  csharp: "C#",
  kotlin: "Kotlin",
  swift: "Swift",
  objc: "Objective-C",
};

const labelFor = (language) => {
  if (!language) return undefined;
  if (LANGUAGE_LABELS[language]) return LANGUAGE_LABELS[language];
  return language.length <= 4
    ? language.toUpperCase()
    : language.charAt(0).toUpperCase() + language.slice(1);
};

export const MdxCode = (props) => {
  const isInline = props.inline === "true" || props.inline === true;
  const language = props.className?.match(/language-(\w+)/)?.[1];
  const title =
    !isInline && !props.title ? labelFor(language) : props.title;

  return <OriginalCode {...props} title={title} />;
};
