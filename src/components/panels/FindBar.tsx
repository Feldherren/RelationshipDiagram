import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../../store/diagramStore";
import {
  flashDiagramHeaderHighlight,
  searchDiagram,
  type FindMatch,
} from "../../utils/diagramFind";

export interface FindBarActions {
  next: () => void;
  previous: () => void;
}

interface FindBarProps {
  open: boolean;
  onClose: () => void;
  actionsRef?: RefObject<FindBarActions | null>;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

export function FindBar({ open, onClose, actionsRef }: FindBarProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);

  const getDiagram = useDiagramStore((s) => s.getDiagram);
  const focusSelection = useDiagramStore((s) => s.focusSelection);
  const characters = useDiagramStore((s) => s.characters);
  const groups = useDiagramStore((s) => s.groups);
  const boxes = useDiagramStore((s) => s.boxes);
  const lines = useDiagramStore((s) => s.lines);
  const floatingTexts = useDiagramStore((s) => s.floatingTexts);
  const bookmarks = useDiagramStore((s) => s.bookmarks);
  const diagramTitle = useDiagramStore((s) => s.diagramTitle);
  const diagramSubtitle = useDiagramStore((s) => s.diagramSubtitle);

  const matches = useMemo(
    () => searchDiagram(getDiagram(), query),
    [
      query,
      getDiagram,
      characters,
      groups,
      boxes,
      lines,
      floatingTexts,
      bookmarks,
      diagramTitle,
      diagramSubtitle,
    ],
  );

  const navigateToMatch = useCallback(
    (match: FindMatch) => {
      if (match.kind === "header") {
        flashDiagramHeaderHighlight();
        return;
      }
      focusSelection(match.selection);
    },
    [focusSelection],
  );

  const goToIndex = useCallback(
    (index: number) => {
      if (matches.length === 0) return;
      const wrapped = ((index % matches.length) + matches.length) % matches.length;
      setMatchIndex(wrapped);
      navigateToMatch(matches[wrapped]);
    },
    [matches, navigateToMatch],
  );

  const goToNext = useCallback(() => {
    goToIndex(matchIndex + 1);
  }, [goToIndex, matchIndex]);

  const goToPrevious = useCallback(() => {
    goToIndex(matchIndex - 1);
  }, [goToIndex, matchIndex]);

  useEffect(() => {
    if (!actionsRef) return;
    actionsRef.current = { next: goToNext, previous: goToPrevious };
    return () => {
      actionsRef.current = null;
    };
  }, [actionsRef, goToNext, goToPrevious]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setMatchIndex(0);
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setMatchIndex(0);
    if (matches.length > 0) {
      navigateToMatch(matches[0]);
    }
  }, [matches, open, navigateToMatch]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key === "Enter" && event.target === inputRef.current) {
        event.preventDefault();
        if (event.shiftKey) {
          goToPrevious();
        } else {
          goToNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open, onClose, goToNext, goToPrevious]);

  if (!open) return null;

  const hasQuery = query.trim().length > 0;
  const currentMatch = matches.length > 0 ? matchIndex + 1 : 0;
  const statusMessage = !hasQuery
    ? ""
    : matches.length === 0
      ? t("find.noResults")
      : t("find.matchCount", { current: currentMatch, total: matches.length });

  return (
    <div className="find-bar-anchor">
      <div className="find-bar" role="search" aria-label={t("find.label")}>
        <label className="find-bar-field">
          <span className="sr-only">{t("find.label")}</span>
          <input
            ref={inputRef}
            type="search"
            className="find-bar-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("find.placeholder")}
            aria-keyshortcuts="Control+F Meta+F"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <div className="find-bar-actions">
          <button
            type="button"
            className="find-bar-button"
            onClick={goToPrevious}
            disabled={matches.length === 0}
            aria-label={t("find.previous")}
            aria-keyshortcuts="Shift+Enter F3"
          >
            {t("find.previous")}
          </button>
          <button
            type="button"
            className="find-bar-button"
            onClick={goToNext}
            disabled={matches.length === 0}
            aria-label={t("find.next")}
            aria-keyshortcuts="Enter F3"
          >
            {t("find.next")}
          </button>
          <span className="find-bar-status" aria-live="polite">
            {statusMessage}
          </span>
          <button
            type="button"
            className="find-bar-button find-bar-close"
            onClick={onClose}
            aria-label={t("find.close")}
            aria-keyshortcuts="Escape"
          >
            {t("find.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function isFindShortcutBlocked(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest(".find-bar")) return false;
  return isEditableTarget(target);
}
