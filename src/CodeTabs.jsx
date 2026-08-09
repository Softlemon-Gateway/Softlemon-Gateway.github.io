// Dropdown replacement for Zudoku's built-in CodeTabs, registered through
// mdx.components in zudoku.config.jsx. Eleven language tabs overflow the
// content column, so the language choice is a select instead of a tab row,
// keeping the language icons. The chosen language is stored in localStorage
// and synced across every code block on the site (same spirit as the built-in
// syncKey, which this component accepts and treats as always-on).

import {
  Children,
  isValidElement,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { CodeTabPanel } from "zudoku/ui/CodeTabs.js";
import {
  CopyCodeButton,
  codeBlockClass,
  codeBlockContentClass,
  codeBlockHeaderClass,
} from "zudoku/ui/CodeBlock.js";
import { HighlightedCode } from "zudoku/ui/SyntaxHighlight.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "zudoku/ui/Select.js";
import { cn } from "zudoku/ui/util.js";
// Not part of Zudoku's public export map, imported from the shipped source.
// Revisit if a Zudoku upgrade moves the file.
import { LanguageIcon } from "../node_modules/zudoku/src/lib/components/LanguageIcon.tsx";

const STORAGE_KEY = "softlemon-code-lang";
const listeners = new Set();

const subscribe = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

const getSnapshot = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
};

const setStoredLanguage = (label) => {
  try {
    localStorage.setItem(STORAGE_KEY, label);
  } catch {
    // Private browsing without storage still switches the current block.
  }
  for (const callback of listeners) callback();
};

// Same displayName check as the built-in CodeTabs (survives HMR reloads).
const isCodeTabPanel = (child) =>
  isValidElement(child) &&
  child.type?.displayName === CodeTabPanel.displayName;

export const DropdownCodeTabs = ({ children, hideIcon = false }) => {
  const contentRef = useRef(null);
  const storedLabel = useSyncExternalStore(subscribe, getSnapshot, () => "");

  const panels = useMemo(() => {
    return Children.toArray(children)
      .filter(isCodeTabPanel)
      .map(({ props }, i) => {
        const metaTitle = /title="([^"]*)"/.exec(props.meta ?? "")?.[1];
        return {
          ...props,
          label: metaTitle ?? props.title ?? props.language ?? `Tab ${i + 1}`,
        };
      });
  }, [children]);

  const activeIndex = Math.max(
    0,
    panels.findIndex((panel) => panel.label === storedLabel),
  );
  const activePanel = panels.at(activeIndex);

  if (panels.length === 0) return null;

  return (
    <div className={codeBlockClass}>
      <div className={codeBlockHeaderClass}>
        <div className="flex flex-1 items-center px-1.5 py-1">
          <Select value={activePanel.label} onValueChange={setStoredLanguage}>
            <SelectTrigger
              size="sm"
              aria-label="Request language"
              className="h-7 w-auto gap-2 border-transparent bg-transparent text-sm shadow-none hover:bg-accent"
            >
              <SelectValue>
                <span className="flex items-center gap-2">
                  {!hideIcon && (
                    <LanguageIcon
                      language={activePanel.icon ?? activePanel.language}
                    />
                  )}
                  {activePanel.label}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {panels.map((panel) => (
                <SelectItem key={panel.label} value={panel.label}>
                  <span className="flex items-center gap-2">
                    {!hideIcon && (
                      <LanguageIcon language={panel.icon ?? panel.language} />
                    )}
                    {panel.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <CopyCodeButton contentRef={contentRef} />
      </div>
      <div
        ref={contentRef}
        className={cn(
          codeBlockContentClass,
          activePanel.showLineNumbers && "line-numbers",
        )}
      >
        <HighlightedCode
          code={activePanel.code}
          language={activePanel.language}
          meta={activePanel.meta}
        />
      </div>
    </div>
  );
};
