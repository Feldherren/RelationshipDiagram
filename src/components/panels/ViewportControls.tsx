import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { useTranslation } from "react-i18next";
import { rgbToCss, type RGB } from "../../models/types";
import { useDiagramStore } from "../../store/diagramStore";
import { RgbPicker } from "../pickers/RgbPicker";
import { BookmarkIcon, BookmarkAddIcon } from "../icons/BookmarkIcon";
import { EyeOpenIcon, EyeClosedIcon } from "../icons/EyeIcon";
import { randomPastelColor } from "../../utils/pastelPalette";
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
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState<RGB>(() => randomPastelColor());
  const rootRef = useRef<HTMLDivElement>(null);
  const draftBookmarkIdRef = useRef<string | null>(null);

  const bookmarks = useDiagramStore((s) => s.bookmarks);
  const bookmarksVisible = useDiagramStore((s) => s.bookmarksVisible);
  const editingBookmarkId = useDiagramStore((s) => s.editingBookmarkId);
  const setBookmarksVisible = useDiagramStore((s) => s.setBookmarksVisible);
  const openBookmarkEdit = useDiagramStore((s) => s.openBookmarkEdit);
  const closeBookmarkEdit = useDiagramStore((s) => s.closeBookmarkEdit);
  const addBookmark = useDiagramStore((s) => s.addBookmark);
  const updateBookmark = useDiagramStore((s) => s.updateBookmark);
  const updateBookmarkView = useDiagramStore((s) => s.updateBookmarkView);
  const deleteBookmark = useDiagramStore((s) => s.deleteBookmark);
  const goToBookmark = useDiagramStore((s) => s.goToBookmark);

  const editing =
    editingBookmarkId != null
      ? (bookmarks.find((b) => b.id === editingBookmarkId) ?? null)
      : null;

  const swatchStyle = useSyncExternalStore(
    subscribeUiChrome,
    getSymbolSwatchStyleSnapshot,
    () => SYMBOL_SWATCH_ON_LIGHT,
  );

  // Seed draft fields when a different bookmark is opened for edit.
  useEffect(() => {
    if (!editing) {
      draftBookmarkIdRef.current = null;
      return;
    }
    if (draftBookmarkIdRef.current === editing.id) return;
    draftBookmarkIdRef.current = editing.id;
    setDraftName(editing.name);
    setDraftColor({ ...editing.color });
  }, [editing]);

  const closeAll = () => {
    setOpen(false);
    closeBookmarkEdit();
  };

  // Strip / edit form: keep open while interacting with the canvas.
  useEffect(() => {
    if (!open && !editing) return;

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
      closeAll();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editing) {
        closeBookmarkEdit();
        return;
      }
      setOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, editing, closeBookmarkEdit]);

  const handleAdd = () => {
    addBookmark();
    closeBookmarkEdit();
  };

  const submitEdit = () => {
    if (!editing) return;
    const name = draftName.trim();
    updateBookmark(editing.id, {
      name: name || editing.name,
      color: draftColor,
    });
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
                aria-label={t("bookmarks.goAria", { name: bookmark.name })}
                onClick={() => goToBookmark(bookmark.id)}
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

      {editing && (
        <div
          className="bookmarks-popup bookmarks-edit-popup"
          role="dialog"
          aria-label={t("bookmarks.editTitle")}
        >
          <div className="bookmarks-form">
            <h3>{t("bookmarks.editTitle")}</h3>
            <label className="field">
              <span>{t("bookmarks.nameLabel")}</span>
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                maxLength={80}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitEdit();
                  }
                }}
              />
            </label>
            <RgbPicker
              label={t("bookmarks.colourLabel")}
              value={draftColor}
              onChange={setDraftColor}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => updateBookmarkView(editing.id)}
            >
              {t("bookmarks.updateView")}
            </button>
            <div className="bookmarks-form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => closeBookmarkEdit()}
              >
                {t("bookmarks.cancel")}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={submitEdit}
              >
                {t("bookmarks.save")}
              </button>
            </div>
            <button
              type="button"
              className="btn-danger"
              onClick={() => deleteBookmark(editing.id)}
            >
              {t("bookmarks.delete")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
