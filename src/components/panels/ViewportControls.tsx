import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { useTranslation } from "react-i18next";
import { rgbToCss } from "../../models/types";
import { useDiagramStore } from "../../store/diagramStore";
import { BookmarkIcon, BookmarkAddIcon } from "../icons/BookmarkIcon";
import { EyeOpenIcon, EyeClosedIcon } from "../icons/EyeIcon";
import { getAppPreferences } from "../../utils/appPreferences";
import {
  resolveSymbolSwatchStyle,
  subscribeUiChrome,
  SYMBOL_SWATCH_ON_LIGHT,
  type SymbolSwatchStyle,
} from "../../utils/symbolSwatchStyle";

let cachedSwatchStyle: SymbolSwatchStyle = SYMBOL_SWATCH_ON_LIGHT;

function getSymbolSwatchStyleSnapshot(): SymbolSwatchStyle {
  const next = resolveSymbolSwatchStyle();
  if (
    next.background === cachedSwatchStyle.background &&
    next.foreground === cachedSwatchStyle.foreground
  ) {
    return cachedSwatchStyle;
  }
  cachedSwatchStyle = next;
  return cachedSwatchStyle;
}

export function ViewportControls() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const bookmarks = useDiagramStore((s) => s.bookmarks);
  const bookmarksVisible = useDiagramStore((s) => s.bookmarksVisible);
  const setBookmarksVisible = useDiagramStore((s) => s.setBookmarksVisible);
  const openBookmarkEdit = useDiagramStore((s) => s.openBookmarkEdit);
  const closeBookmarkEdit = useDiagramStore((s) => s.closeBookmarkEdit);
  const addBookmark = useDiagramStore((s) => s.addBookmark);
  const goToBookmark = useDiagramStore((s) => s.goToBookmark);

  const swatchStyle = useSyncExternalStore(
    subscribeUiChrome,
    getSymbolSwatchStyleSnapshot,
    () => SYMBOL_SWATCH_ON_LIGHT,
  );

  // Keep the strip open during canvas interaction; dismiss on outside click.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        (target.closest(".canvas-container") ||
          target.closest(".selection-float") ||
          target.closest(".fit-to-content-button"))
      ) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleAdd = () => {
    addBookmark();
    closeBookmarkEdit();
  };

  const swatchVars = {
    "--symbol-swatch-bg": swatchStyle.background,
    "--symbol-swatch-fg": swatchStyle.foreground,
  } as CSSProperties;

  return (
    <div className="viewport-controls-anchor" ref={rootRef}>
      <div className="viewport-controls-row">
        <button
          type="button"
          className={
            open
              ? "viewport-control-button bookmark-toggle active"
              : "viewport-control-button bookmark-toggle"
          }
          style={open ? undefined : swatchVars}
          title={t("bookmarks.title")}
          aria-label={t("bookmarks.title")}
          aria-pressed={open}
          aria-expanded={open}
          onClick={() => {
            setOpen((value) => !value);
            closeBookmarkEdit();
          }}
        >
          <BookmarkIcon className="viewport-control-icon" size={22} />
        </button>
        <button
          type="button"
          className={
            bookmarksVisible
              ? "viewport-control-button active"
              : "viewport-control-button"
          }
          title={
            bookmarksVisible
              ? t("bookmarks.hideFlags")
              : t("bookmarks.showFlags")
          }
          aria-label={
            bookmarksVisible
              ? t("bookmarks.hideFlags")
              : t("bookmarks.showFlags")
          }
          aria-pressed={bookmarksVisible}
          onClick={() => setBookmarksVisible(!bookmarksVisible)}
        >
          {bookmarksVisible ? (
            <EyeOpenIcon className="viewport-control-icon" size={22} />
          ) : (
            <EyeClosedIcon className="viewport-control-icon" size={22} />
          )}
        </button>
      </div>

      {open && (
        <div className="bookmarks-strip" role="menu" style={swatchVars}>
          {bookmarks.map((bookmark) => (
            <div key={bookmark.id} className="bookmark-strip-row">
              <button
                type="button"
                className="bookmark-strip-item"
                style={{ color: rgbToCss(bookmark.color) }}
                title={
                  getAppPreferences().swapBookmarkClickBehaviour
                    ? t("bookmarks.goTitleSwapped")
                    : t("bookmarks.goTitle")
                }
                aria-label={t("bookmarks.goAria", { name: bookmark.name })}
                onClick={(e) => {
                  const modifier = e.ctrlKey || e.metaKey;
                  const swapped =
                    getAppPreferences().swapBookmarkClickBehaviour;
                  goToBookmark(bookmark.id, {
                    keepZoom: swapped ? !modifier : modifier,
                  });
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openBookmarkEdit(bookmark.id);
                }}
              >
                <BookmarkIcon className="bookmark-strip-icon" size={20} />
              </button>
              <span className="bookmark-strip-label" aria-hidden>
                {bookmark.name}
              </span>
            </div>
          ))}
          <button
            type="button"
            className="bookmark-strip-add"
            title={t("bookmarks.add")}
            aria-label={t("bookmarks.add")}
            onClick={handleAdd}
          >
            <BookmarkAddIcon className="viewport-control-icon" size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
